from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.audit import AuditLogResponse
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogResponse])
@router.get("/", response_model=List[AuditLogResponse], include_in_schema=False)
async def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. GraniteBlock, CuttingPlan)"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve system audit logs with optional filters."""
    logs = await audit_service.list_audit_logs(
        db, entity_type=entity_type, entity_id=entity_id, limit=limit, offset=offset
    )
    return [
        AuditLogResponse(
            id=str(log.id),
            entity_type=log.entity_type or "System",
            entity_id=str(log.entity_id or "0"),
            action=log.action,
            performed_by=str(log.user_id) if log.user_id else None,
            details=log.details,
            created_at=log.timestamp,
        )
        for log in logs
    ]


@router.get("/{entity_type}/{entity_id}", response_model=List[AuditLogResponse])
async def get_entity_audit(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the full chronological audit trail for a specific entity."""
    logs = await audit_service.get_entity_audit(db, entity_type, entity_id)
    return [
        AuditLogResponse(
            id=str(log.id),
            entity_type=log.entity_type or entity_type,
            entity_id=str(log.entity_id or entity_id),
            action=log.action,
            performed_by=str(log.user_id) if log.user_id else None,
            details=log.details,
            created_at=log.timestamp,
        )
        for log in logs
    ]
