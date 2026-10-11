"""pytest configuration for GraniteMeasure AI backend.

Adds the backend package root to sys.path and provides an isolated,
temporary SQLite database for every test session so tests never read
or write the real operator database at storage/granitemeasure.db.
"""

from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _run(coro):
    """Run a coroutine synchronously in a fully isolated asyncio context.

    Uses asyncio.run() which on Python 3.12 / Windows (ProactorEventLoop)
    correctly tears down the IOCP completion port and all associated Win32
    thread handles before returning.  The earlier approach of manually calling
    loop.close() left the ProactorEventLoop's internal IOCP thread in an
    indeterminate state, which corrupted the TLS (Thread-Local Storage) slots
    that OpenCV 5.x's bundled TBB thread pool uses to identify its workers.
    That corruption caused STATUS_DLL_NOT_FOUND (0xc000070a) / "Unknown C++
    exception" in the first cv2 parallel operation after the fixture ran.
    """
    return asyncio.run(coro)


@pytest.fixture(scope="session", autouse=True)
def _opencv_single_thread():
    """Force OpenCV to use a single thread throughout the test session.

    OpenCV 5.x on Windows uses a TBB (Intel Threading Building Blocks) thread
    pool for parallel image operations (cvtColor, Laplacian, ORB, etc.).  TBB
    identifies its workers via Win32 Thread-Local Storage slots.  If those
    slots are disturbed by asyncio ProactorEventLoop IOCP threads being created
    and destroyed (as happens in the DB isolation fixture), TBB raises a native
    C++ exception that surfaces as 0xc000070a / "Unknown C++ exception".

    cv2.setNumThreads(1) disables TBB parallelism entirely for this process,
    making all OpenCV operations run on the calling thread.  This is safe for
    tests: results are identical, just slightly slower.

    This fixture runs BEFORE _isolated_database (alphabetical order within the
    same scope level — 'o' < 'i' is false, but pytest runs autouse fixtures in
    definition order within the same file, so we place this one first).
    """
    import cv2 as _cv2
    _cv2.setNumThreads(1)
    yield
    # Restore default thread count after the session (polite, not strictly necessary)
    _cv2.setNumThreads(0)  # 0 = restore OpenCV's own default


@pytest.fixture(scope="session", autouse=True)
def _isolated_database():
    """Replace the application DB engine with a per-session temp-file SQLite.

    Why a temp file rather than :memory:?
    aiosqlite opens a new OS-level connection per async session. In-memory
    SQLite databases are private to each connection, so tables created in the
    setup coroutine are invisible to subsequent TestClient requests. A named
    temp file shares the same on-disk state across all connections.

    This fixture:
      1. Creates a temp .db file and a matching async engine.
      2. Calls Base.metadata.create_all to provision all tables.
      3. Monkey-patches app.database (engine, SessionLocal) so every module
         that imports from app.database gets the test engine.
      4. Registers a FastAPI dependency override for get_db.
      5. Cleans up and restores originals after all tests finish.

    The real storage/granitemeasure.db is NEVER opened or modified.
    """
    # -- import application modules after sys.path is set --
    from app import database as db_module
    import app.models  # noqa: F401 — ensures all ORM classes register with Base

    # Create isolated temp database
    tmp_fd, tmp_path = tempfile.mkstemp(suffix="_test.db", prefix="granitemeasure_")
    os.close(tmp_fd)

    test_url = f"sqlite+aiosqlite:///{tmp_path}"
    test_engine = create_async_engine(test_url, echo=False)
    TestSessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
        expire_on_commit=False,
    )

    # Patch module-level objects that API routers import at startup
    original_engine = db_module.engine
    original_session_local = db_module.SessionLocal

    db_module.engine = test_engine
    db_module.SessionLocal = TestSessionLocal

    # analysis.py imports SessionLocal by name — patch its local reference too
    # so background analysis jobs use the test DB if they happen to run.
    try:
        from app.api import analysis as analysis_module
        original_analysis_session = analysis_module.SessionLocal
        analysis_module.SessionLocal = TestSessionLocal
    except Exception:
        original_analysis_session = None
        analysis_module = None

    # Create all tables in the temp DB
    async def _create_tables():
        async with test_engine.begin() as conn:
            await conn.run_sync(db_module.Base.metadata.create_all)

    _run(_create_tables())

    # Override FastAPI's get_db dependency so TestClient requests use the
    # test session factory (handles the lifespan that calls create_all too)
    async def _get_test_db():
        async with TestSessionLocal() as session:
            yield session

    try:
        from app.main import app as fastapi_app
        from app.database import get_db
        fastapi_app.dependency_overrides[get_db] = _get_test_db
    except Exception as exc:  # pragma: no cover
        print(f"[conftest] Could not patch dependency override: {exc}")

    yield  # ---- all tests run here ----

    # Teardown: restore originals, dispose engine, delete temp file
    try:
        from app.main import app as fastapi_app
        from app.database import get_db
        fastapi_app.dependency_overrides.pop(get_db, None)
    except Exception:
        pass

    if analysis_module is not None and original_analysis_session is not None:
        analysis_module.SessionLocal = original_analysis_session

    db_module.engine = original_engine
    db_module.SessionLocal = original_session_local

    async def _dispose():
        await test_engine.dispose()

    _run(_dispose())

    try:
        os.unlink(tmp_path)
    except OSError:
        pass
