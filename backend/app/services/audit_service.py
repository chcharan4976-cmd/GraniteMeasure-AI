from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def list_audit_logs(
    db: AsyncSession,
    entity_type: Optional[str] = None,
    entity_id: Optional[str | int] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[AuditLog]:
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        int_id = int(entity_id) if str(entity_id).isdigit() else 0
        query = query.where(AuditLog.entity_id == int_id)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_entity_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: str | int,
) -> List[AuditLog]:
    int_id = int(entity_id) if str(entity_id).isdigit() else 0
    query = (
        select(AuditLog)
        .where(AuditLog.entity_type == entity_type)
        .where(AuditLog.entity_id == int_id)
        .order_by(AuditLog.timestamp.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())
