import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.defect import DefectResult
from app.models import AuditLog
from app.schemas.defect import DefectCreate, DefectUpdate


async def list_defects_for_block(
    db: AsyncSession,
    block_id: str | int,
) -> List[DefectResult]:
    query = (
        select(DefectResult)
        .where(DefectResult.block_id == str(block_id))
        .order_by(DefectResult.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_defect(
    db: AsyncSession,
    defect_id: str,
) -> Optional[DefectResult]:
    result = await db.execute(select(DefectResult).where(DefectResult.id == defect_id))
    return result.scalar_one_or_none()


async def create_defect(
    db: AsyncSession,
    block_id: str | int,
    defect_in: DefectCreate,
) -> DefectResult:
    defect_id = str(uuid.uuid4())
    db_defect = DefectResult(
        id=defect_id,
        block_id=str(block_id),
        job_id=str(defect_in.job_id) if defect_in.job_id else None,
        defect_type=defect_in.defect_type.value if hasattr(defect_in.defect_type, "value") else str(defect_in.defect_type),
        severity=defect_in.severity.value if hasattr(defect_in.severity, "value") else str(defect_in.severity),
        description=defect_in.description,
        location_description=defect_in.location_description,
        image_id=str(defect_in.image_id) if defect_in.image_id else None,
        bounding_box_json=defect_in.bounding_box_json,
        affects_cutting=bool(defect_in.affects_cutting),
        is_confirmed=False,
        notes=defect_in.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_defect)

    audit = AuditLog(
        action="DEFECT_LOGGED",
        entity_type="GraniteBlock",
        entity_id=int(block_id) if str(block_id).isdigit() else 0,
        details=f"Defect {defect_in.defect_type} logged on block {block_id}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(db_defect)
    return db_defect


async def update_defect(
    db: AsyncSession,
    defect_id: str,
    defect_in: DefectUpdate,
) -> Optional[DefectResult]:
    defect = await get_defect(db, defect_id)
    if not defect:
        return None

    update_data = defect_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("defect_type", "severity") and hasattr(val, "value"):
            setattr(defect, field, val.value)
        elif field in ("job_id", "image_id") and val is not None:
            setattr(defect, field, str(val))
        else:
            setattr(defect, field, val)

    audit = AuditLog(
        action="DEFECT_UPDATED",
        entity_type="DefectResult",
        entity_id=0,
        details=f"Defect {defect_id} updated",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(defect)
    return defect


async def confirm_defect(
    db: AsyncSession,
    defect_id: str,
    confirmed_by: str,
    notes: Optional[str] = None,
) -> Optional[DefectResult]:
    defect = await get_defect(db, defect_id)
    if not defect:
        return None

    defect.is_confirmed = True
    defect.confirmed_by = confirmed_by
    if notes:
        defect.notes = f"{defect.notes}\n{notes}" if defect.notes else notes

    audit = AuditLog(
        action="DEFECT_CONFIRMED",
        entity_type="DefectResult",
        entity_id=0,
        details=f"Defect {defect_id} confirmed by {confirmed_by}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(defect)
    return defect
