import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.officer import Officer
from app.schemas.officer import OfficerCreate, OfficerUpdate
from app.models import AuditLog


async def list_officers(
    db: AsyncSession,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Officer]:
    query = select(Officer)
    if role:
        query = query.where(Officer.role == role)
    if is_active is not None:
        query = query.where(Officer.is_active == is_active)
    query = query.order_by(Officer.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_officer(db: AsyncSession, officer_id: str) -> Optional[Officer]:
    result = await db.execute(select(Officer).where(Officer.id == officer_id))
    return result.scalar_one_or_none()


async def create_officer(db: AsyncSession, officer_in: OfficerCreate) -> Officer:
    officer_id = str(uuid.uuid4())
    db_officer = Officer(
        id=officer_id,
        name=officer_in.name,
        designation=officer_in.designation or "Mining Officer",
        employee_id=officer_in.employee_id,
        phone=officer_in.phone,
        email=officer_in.email,
        assigned_quarry_id=str(officer_in.assigned_quarry_id) if officer_in.assigned_quarry_id else None,
        role=officer_in.role or "officer",
        is_active=officer_in.is_active if officer_in.is_active is not None else True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_officer)

    audit = AuditLog(
        action="CREATE",
        entity_type="Officer",
        entity_id=0,
        details=f"Officer {officer_in.name} created",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(db_officer)
    return db_officer


async def update_officer(
    db: AsyncSession, officer_id: str, officer_in: OfficerUpdate
) -> Optional[Officer]:
    officer = await get_officer(db, officer_id)
    if not officer:
        return None

    update_data = officer_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "assigned_quarry_id" and val is not None:
            setattr(officer, field, str(val))
        else:
            setattr(officer, field, val)

    officer.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action="UPDATE",
        entity_type="Officer",
        entity_id=0,
        details=f"Officer {officer.name} updated",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(officer)
    return officer
