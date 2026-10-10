from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import AuditLog

router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


@router.get("/")
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get audit logs, optionally filtered by entity."""
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "user_id": log.user_id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]


@router.get("/block/{block_id}")
async def get_block_audit(block_id: int, db: AsyncSession = Depends(get_db)):
    """Get audit trail for a specific block."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_id == block_id)
        .order_by(AuditLog.timestamp)
    )
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
