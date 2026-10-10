import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import MeasurementResult, GraniteBlock

router = APIRouter(prefix="/api/v1/measurements", tags=["Measurements"])


@router.get("/{block_id}")
async def get_measurement(block_id: int, db: AsyncSession = Depends(get_db)):
    """Get measurement results for a block."""
    result = await db.execute(
        select(MeasurementResult).where(MeasurementResult.block_id == block_id)
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="No measurement found for this block")

    warnings = []
    if measurement.warnings:
        try:
            warnings = json.loads(measurement.warnings)
        except (json.JSONDecodeError, TypeError):
            warnings = [measurement.warnings]

    return {
        "id": measurement.id,
        "block_id": measurement.block_id,
        "length_cm": measurement.length_cm,
        "breadth_cm": measurement.breadth_cm,
        "height_cm": measurement.height_cm,
        "volume_m3": measurement.volume_m3,
        "weight_mt": measurement.weight_mt,
        "confidence": measurement.confidence,
        "status": measurement.status,
        "calibration_status": measurement.calibration_status,
        "measurement_type": measurement.measurement_type,
        "reconstructed_points": measurement.reconstructed_points,
        "usable_images": measurement.usable_images,
        "warnings": warnings,
        "created_at": measurement.created_at.isoformat() if measurement.created_at else None,
    }


@router.get("/")
async def list_measurements(db: AsyncSession = Depends(get_db)):
    """List all measurements."""
    result = await db.execute(
        select(MeasurementResult).order_by(MeasurementResult.created_at.desc())
    )
    measurements = result.scalars().all()
    return [
        {
            "id": m.id,
            "block_id": m.block_id,
            "length_cm": m.length_cm,
            "breadth_cm": m.breadth_cm,
            "height_cm": m.height_cm,
            "status": m.status,
            "confidence": m.confidence,
        }
        for m in measurements
    ]
