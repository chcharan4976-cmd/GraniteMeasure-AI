from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard Aggregations"])


@router.get("/admin")
async def get_admin_dashboard_stats(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Comprehensive executive analytics for administrators."""
    return await dashboard_service.get_admin_dashboard(db)


@router.get("/officer")
async def get_officer_dashboard_stats(
    quarry_id: Optional[int] = Query(None, description="Optional quarry ID filter"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Operational inspection queue and verification metrics for mining officers."""
    return await dashboard_service.get_officer_dashboard(db, quarry_id=quarry_id)
