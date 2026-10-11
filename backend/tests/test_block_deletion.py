import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app import database
from app.models import GraniteBlock, DispatchRecord, AuditLog
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_block_deletion_flow():
    """Verify end-to-end deletion flow: DELETE, POST /delete alias, soft-delete, audit log."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register a test block
        block_id_str = "BLK-TEST-DELETE-001"
        res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Black Galaxy",
            "block_type": "RAW",
            "quarry_id": 1,
            "observations": "Disposable block for deletion testing",
            "gps_latitude": 15.5869,
            "gps_longitude": 79.8705,
        })
        assert res.status_code == 200
        block_data = res.json()
        numeric_id = block_data["id"]
        assert block_data["identifier"] == block_id_str

        # 2. Check block appears in active list
        list_res = await client.get("/api/v1/blocks/")
        assert list_res.status_code == 200
        identifiers = [b["identifier"] for b in list_res.json()]
        assert block_id_str in identifiers

        # 3. Soft-delete via DELETE /api/v1/blocks/{id}
        del_res = await client.delete(
            f"/api/v1/blocks/{block_id_str}",
            params={"reason": "Administrative disposable test block"}
        )
        assert del_res.status_code == 200
        del_json = del_res.json()
        assert del_json["status"] == "success"
        assert del_json.get("is_deleted") is True

        # 4. Verify block is removed from active list
        list_res2 = await client.get("/api/v1/blocks/")
        assert list_res2.status_code == 200
        identifiers2 = [b["identifier"] for b in list_res2.json()]
        assert block_id_str not in identifiers2

        # 5. Verify idempotent deletion (deleting again returns 200 success)
        del_again = await client.delete(f"/api/v1/blocks/{block_id_str}")
        assert del_again.status_code == 200

        # 6. Verify audit log entry was created
        async with database.SessionLocal() as db:
            from sqlalchemy import select
            stmt = select(AuditLog).where(
                AuditLog.entity_id == int(numeric_id),
                AuditLog.action == "BLOCK_DELETED"
            )
            res_audit = await db.execute(stmt)
            logs = res_audit.scalars().all()
            assert len(logs) >= 1
            assert "Administrative" in (logs[0].details or "")


@pytest.mark.asyncio
async def test_block_deletion_via_post_alias():
    """Verify POST /api/v1/blocks/{id}/delete works identically (resolves HTTP 405 on cloud edge proxies)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        block_id_str = "BLK-TEST-DELETE-POST-002"
        res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Steel Grey",
            "block_type": "RAW",
            "quarry_id": 1,
        })
        assert res.status_code == 200

        # Delete via POST alias
        del_res = await client.post(
            f"/api/v1/blocks/{block_id_str}/delete",
            json={"reason": "Proxy compatible deletion test"}
        )
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"


@pytest.mark.asyncio
async def test_protected_block_deletion_returns_409_conflict():
    """Verify block with protected transit pass / dispatch cannot be deleted and returns HTTP 409 Conflict."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create block
        block_id_str = "BLK-TEST-PROTECTED-003"
        res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Tan Brown",
            "block_type": "DRESSED",
            "quarry_id": 1,
        })
        assert res.status_code == 200
        block_data = res.json()
        numeric_id = block_data["id"]

        # Add a protected dispatch record in the DB
        async with database.SessionLocal() as db:
            dispatch = DispatchRecord(
                block_id=numeric_id,
                vehicle_number="AP27-TU-9999",
                transit_pass_ref="TP-AP-2026-9999",
                destination="Chennai Port",
                status="IN_TRANSIT",
                created_at=datetime.now(timezone.utc),
            )
            db.add(dispatch)
            await db.commit()

        # Attempt to delete -> Must return HTTP 409 Conflict
        del_res = await client.delete(f"/api/v1/blocks/{block_id_str}")
        assert del_res.status_code == 409
        detail = del_res.json().get("detail", "")
        assert "transit pass" in detail.lower() or "conflict" in detail.lower()
