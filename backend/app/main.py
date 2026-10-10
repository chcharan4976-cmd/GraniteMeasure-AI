from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.database import engine, Base
import app.models  # Register all models
from app.api import images, auth, quarries, blocks, capture, analysis, measurements, seigniorage, reports, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="GraniteMeasure AI",
    description="AI-Based Granite Block Measurement and Automated Seigniorage Assessment",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS - allow mobile app connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # PoC: allow all origins for mobile dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(auth.router)
app.include_router(quarries.router)
app.include_router(blocks.router)
app.include_router(images.router)
app.include_router(capture.router)
app.include_router(analysis.router)
app.include_router(measurements.router)
app.include_router(seigniorage.router)
app.include_router(reports.router)
app.include_router(audit.router)

# Serve storage files
STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def root():
    return {
        "application": "GraniteMeasure AI",
        "status": "running",
        "version": "0.1.0",
        "message": "GraniteMeasure AI backend is operational",
        "docs": "/docs",
    }


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "granite-measurement-api",
        "version": "0.1.0",
    }


@app.get("/api/v1/dashboard")
async def dashboard_stats():
    """Get dashboard statistics for the mobile command center."""
    from sqlalchemy import select, func
    from app.database import SessionLocal
    from app.models import GraniteBlock, AnalysisJob, MeasurementResult

    async with SessionLocal() as db:
        # Total blocks
        total_result = await db.execute(select(func.count(GraniteBlock.id)))
        total_blocks = total_result.scalar() or 0

        # Pending analysis
        pending_result = await db.execute(
            select(func.count(AnalysisJob.id)).where(
                AnalysisJob.status.in_(["PENDING", "VALIDATING", "FEATURE_MATCHING", "RECONSTRUCTING", "MEASURING"])
            )
        )
        pending = pending_result.scalar() or 0

        # Completed measurements
        completed_result = await db.execute(
            select(func.count(MeasurementResult.id)).where(
                MeasurementResult.status.in_(["MEASURED", "ESTIMATED"])
            )
        )
        completed = completed_result.scalar() or 0

        # Needs verification
        verify_result = await db.execute(
            select(func.count(GraniteBlock.id)).where(
                GraniteBlock.status == "MEASURED"
            )
        )
        needs_verification = verify_result.scalar() or 0

        # Recent blocks
        recent_result = await db.execute(
            select(GraniteBlock).order_by(GraniteBlock.registered_at.desc()).limit(10)
        )
        recent = recent_result.scalars().all()

        return {
            "total_blocks": total_blocks,
            "pending_analysis": pending,
            "completed_measurements": completed,
            "needs_verification": needs_verification,
            "recent_blocks": [
                {
                    "id": b.id,
                    "identifier": b.identifier,
                    "color_group": b.color_group,
                    "status": b.status,
                    "registered_at": b.registered_at.isoformat() if b.registered_at else None,
                }
                for b in recent
            ],
        }
