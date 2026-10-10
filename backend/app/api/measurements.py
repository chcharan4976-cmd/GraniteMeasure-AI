import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GeometryArtifact, GraniteBlock, MeasurementResult

router = APIRouter(prefix="/api/v1/measurements", tags=["Measurements"])


def _parse_json(raw, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _serialize(measurement: MeasurementResult) -> dict:
    details = _parse_json(measurement.details, {})
    warnings = _parse_json(measurement.warnings, [])
    if isinstance(warnings, str):
        warnings = [warnings]
    return {
        "id": measurement.id,
        "block_id": measurement.block_id,
        "job_id": measurement.job_id,
        "length_cm": measurement.length_cm,
        "breadth_cm": measurement.breadth_cm,
        "height_cm": measurement.height_cm,
        "volume_m3": measurement.volume_m3,
        "bbox_volume_m3": details.get("bbox_volume_m3", measurement.volume_m3),
        "irregular_volume_m3": details.get("irregular_volume_m3"),
        "irregular_volume_status": details.get(
            "irregular_volume_status", "IRREGULAR_VOLUME_UNAVAILABLE"
        ),
        "irregular_volume_reason": details.get("irregular_volume_reason"),
        "weight_mt": measurement.weight_mt,
        "estimated_mass_mt": details.get("estimated_mass_mt", measurement.weight_mt),
        "mass_source": details.get("mass_source"),
        "confidence": measurement.confidence,
        "confidence_label": details.get("confidence_label"),
        "confidence_basis": details.get("confidence_basis"),
        "status": measurement.status,
        "calibration_status": measurement.calibration_status,
        "measurement_type": measurement.measurement_type,
        "reconstructed_points": measurement.reconstructed_points,
        "registered_cameras": details.get("registered_cameras"),
        "usable_images": measurement.usable_images,
        "total_images": details.get("total_images"),
        "scale_residual_cm": details.get("scale_residual_cm"),
        "marker_size_cm": details.get("marker_size_cm"),
        "marker_size_source": details.get("marker_size_source"),
        "coverage": details.get("coverage"),
        "is_dense": details.get("is_dense", False),
        "geometry_available": bool(details.get("geometry_artifact")),
        "warnings": warnings,
        "details": details,
        "created_at": measurement.created_at.isoformat() if measurement.created_at else None,
    }


async def _latest_measurement(db: AsyncSession, block_id: int):
    result = await db.execute(
        select(MeasurementResult)
        .where(MeasurementResult.block_id == block_id)
        .order_by(MeasurementResult.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/{block_id}")
async def get_measurement(block_id: int, db: AsyncSession = Depends(get_db)):
    measurement = await _latest_measurement(db, block_id)
    if not measurement:
        raise HTTPException(status_code=404, detail="No measurement found for this block")
    return _serialize(measurement)


@router.get("/{block_id}/geometry")
async def get_geometry(block_id: int, db: AsyncSession = Depends(get_db)):
    block = (
        await db.execute(select(GraniteBlock).where(GraniteBlock.id == block_id))
    ).scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    art = (
        await db.execute(
            select(GeometryArtifact)
            .where(GeometryArtifact.block_id == block_id)
            .order_by(GeometryArtifact.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not art:
        measurement = await _latest_measurement(db, block_id)
        details = _parse_json(measurement.details, {}) if measurement else {}
        path = details.get("geometry_artifact")
        if not path:
            return {
                "available": False,
                "reason": "No reconstructed geometry artifact. Viewer should show unavailable, not a placeholder cube.",
            }
    else:
        path = art.file_path

    file_path = Path(path)
    if not file_path.is_file():
        return {
            "available": False,
            "reason": "Geometry file is missing from disk.",
            "expected_path": str(file_path),
        }
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    payload["available"] = True
    payload["artifact_path"] = str(file_path)
    return payload


@router.get("/")
async def list_measurements(db: AsyncSession = Depends(get_db)):
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
            "calibration_status": m.calibration_status,
            "confidence": m.confidence,
        }
        for m in measurements
    ]
