from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import get_db
from app.models import GraniteBlock, Quarry, CaptureSession, MeasurementResult, AuditLog
from app.schemas import BlockCreate, BlockResponse

router = APIRouter(prefix="/api/v1/blocks", tags=["Blocks"])


@router.get("/")
async def get_blocks(
    quarry_id: Optional[int] = None,
    color_group: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all granite blocks, optionally filtered by quarry or color group."""
    query = select(GraniteBlock)
    if quarry_id:
        query = query.where(GraniteBlock.quarry_id == quarry_id)
    if color_group:
        query = query.where(GraniteBlock.color_group == color_group)
    query = query.order_by(GraniteBlock.registered_at.desc())

    result = await db.execute(query)
    blocks = result.scalars().all()

    return [
        {
            "id": b.id,
            "identifier": b.identifier,
            "color_group": b.color_group,
            "quarry_id": b.quarry_id,
            "registered_at": b.registered_at.isoformat() if b.registered_at else None,
            "status": b.status,
            "gps_latitude": b.gps_latitude,
            "gps_longitude": b.gps_longitude,
        }
        for b in blocks
    ]


@router.post("/")
async def create_block(block: BlockCreate, db: AsyncSession = Depends(get_db)):
    """Register a new granite block."""
    # Generate unique identifier if not provided
    identifier = block.identifier or f"BLK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    db_block = GraniteBlock(
        identifier=identifier,
        color_group=block.color_group,
        quarry_id=block.quarry_id,
        status="REGISTERED",
        gps_latitude=block.gps_latitude,
        gps_longitude=block.gps_longitude,
        observations=block.observations,
        block_type=block.block_type or "RAW",
        registered_at=datetime.now(timezone.utc),
    )
    db.add(db_block)
    await db.commit()
    await db.refresh(db_block)

    # Audit log
    audit = AuditLog(
        action="BLOCK_REGISTERED",
        entity_type="GraniteBlock",
        entity_id=db_block.id,
        details=f"Block {identifier} registered for quarry {block.quarry_id}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    await db.commit()

    return {
        "id": db_block.id,
        "identifier": db_block.identifier,
        "color_group": db_block.color_group,
        "quarry_id": db_block.quarry_id,
        "status": db_block.status,
        "registered_at": db_block.registered_at.isoformat(),
    }


@router.get("/{block_id}")
async def get_block(block_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed block information."""
    result = await db.execute(
        select(GraniteBlock).where(GraniteBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    meas_result = await db.execute(
        select(MeasurementResult)
        .where(MeasurementResult.block_id == block_id)
        .order_by(MeasurementResult.created_at.desc())
        .limit(1)
    )
    measurement = meas_result.scalar_one_or_none()

    # Get capture sessions
    sess_result = await db.execute(
        select(CaptureSession).where(CaptureSession.block_id == block_id)
    )
    sessions = sess_result.scalars().all()

    return {
        "id": block.id,
        "identifier": block.identifier,
        "color_group": block.color_group,
        "quarry_id": block.quarry_id,
        "status": block.status,
        "block_type": block.block_type,
        "gps_latitude": block.gps_latitude,
        "gps_longitude": block.gps_longitude,
        "observations": block.observations,
        "registered_at": block.registered_at.isoformat() if block.registered_at else None,
        "capture_sessions": len(sessions),
        "measurement": {
            "id": measurement.id,
            "length_cm": measurement.length_cm,
            "breadth_cm": measurement.breadth_cm,
            "height_cm": measurement.height_cm,
            "volume_m3": measurement.volume_m3,
            "weight_mt": measurement.weight_mt,
            "confidence": measurement.confidence,
            "status": measurement.status,
            "calibration_status": measurement.calibration_status,
        } if measurement else None,
    }


@router.get("/{block_id}/summary")
async def get_block_summary(block_id: int, db: AsyncSession = Depends(get_db)):
    """Get a summary suitable for the mobile results screen."""
    result = await db.execute(
        select(GraniteBlock).where(GraniteBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    meas_result = await db.execute(
        select(MeasurementResult)
        .where(MeasurementResult.block_id == block_id)
        .order_by(MeasurementResult.created_at.desc())
        .limit(1)
    )
    measurement = meas_result.scalar_one_or_none()

    return {
        "block_id": block.id,
        "identifier": block.identifier,
        "color_group": block.color_group,
        "status": block.status,
        "has_measurement": measurement is not None,
        "measurement_status": measurement.status if measurement else "NOT_MEASURED",
    }
