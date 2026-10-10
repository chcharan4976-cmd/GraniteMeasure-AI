from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GraniteBlock, PhysicalReference
from app.api.measurements import _latest_measurement, _serialize
from app.services.validation import compare_dimensions

router = APIRouter(prefix="/api/v1/validation", tags=["Validation"])


class ReferenceIn(BaseModel):
    tape_length_cm: Optional[float] = Field(None, gt=0)
    tape_breadth_cm: Optional[float] = Field(None, gt=0)
    tape_height_cm: Optional[float] = Field(None, gt=0)
    marker_size_cm_verified: Optional[float] = Field(None, gt=0)
    weight_mt: Optional[float] = Field(None, gt=0)
    recorded_by: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{block_id}/reference")
async def record_reference(
    block_id: int, payload: ReferenceIn, db: AsyncSession = Depends(get_db)
):
    block = (
        await db.execute(select(GraniteBlock).where(GraniteBlock.id == block_id))
    ).scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    rec = PhysicalReference(
        block_id=block_id,
        tape_length_cm=payload.tape_length_cm,
        tape_breadth_cm=payload.tape_breadth_cm,
        tape_height_cm=payload.tape_height_cm,
        marker_size_cm_verified=payload.marker_size_cm_verified,
        weight_mt=payload.weight_mt,
        recorded_by=payload.recorded_by,
        notes=payload.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return {"id": rec.id, "block_id": block_id, "status": "recorded"}


@router.get("/{block_id}")
async def get_comparison(block_id: int, db: AsyncSession = Depends(get_db)):
    ref = (
        await db.execute(
            select(PhysicalReference)
            .where(PhysicalReference.block_id == block_id)
            .order_by(PhysicalReference.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    measurement = await _latest_measurement(db, block_id)
    measured = _serialize(measurement) if measurement else {}
    reference = None
    if ref:
        reference = {
            "id": ref.id,
            "tape_length_cm": ref.tape_length_cm,
            "tape_breadth_cm": ref.tape_breadth_cm,
            "tape_height_cm": ref.tape_height_cm,
            "marker_size_cm_verified": ref.marker_size_cm_verified,
            "weight_mt": ref.weight_mt,
            "recorded_by": ref.recorded_by,
            "notes": ref.notes,
            "created_at": ref.created_at.isoformat() if ref.created_at else None,
        }
    comparison = None
    if ref and measurement:
        comparison = compare_dimensions(
            {
                "length_cm": measured.get("length_cm"),
                "breadth_cm": measured.get("breadth_cm"),
                "height_cm": measured.get("height_cm"),
                "bbox_volume_m3": measured.get("bbox_volume_m3"),
                "irregular_volume_m3": measured.get("irregular_volume_m3"),
                "estimated_mass_mt": measured.get("estimated_mass_mt"),
                "marker_size_cm": measured.get("marker_size_cm"),
            },
            reference,
        )
    return {
        "block_id": block_id,
        "measurement": measured or None,
        "reference": reference,
        "comparison": comparison,
        "field_dataset_available": False,
        "note": (
            "No independently photographed field block is bundled with this repository. "
            "Algorithmic tests are not field-accuracy claims."
        ),
    }
