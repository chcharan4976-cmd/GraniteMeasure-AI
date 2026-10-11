from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.cutting import (
    CuttingPlanCreate,
    CuttingPlanUpdate,
    CuttingPlanResponse,
    CuttingOperationCreate,
    CuttingOperationResponse,
)
from app.services import cutting_service

router = APIRouter(tags=["Cutting Plans"])


class ApproveRequest(BaseModel):
    approved_by: Optional[str] = None


@router.get("/blocks/{block_id}/cutting-plans", response_model=List[CuttingPlanResponse])
async def list_plans_for_block(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List cutting and dressing plans for a block."""
    return await cutting_service.list_plans_for_block(db, block_id)


@router.post(
    "/blocks/{block_id}/cutting-plans",
    response_model=CuttingPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan_for_block(
    block_id: str,
    plan_in: CuttingPlanCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new cutting and dressing plan for a block."""
    return await cutting_service.create_plan(db, block_id, plan_in)


@router.get("/cutting-plans/{id}", response_model=CuttingPlanResponse)
async def get_cutting_plan(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a cutting plan along with its ordered operations."""
    plan = await cutting_service.get_plan(db, id)
    if not plan:
        raise HTTPException(status_code=404, detail="Cutting plan not found")
    return plan


@router.put("/cutting-plans/{id}", response_model=CuttingPlanResponse)
async def update_cutting_plan(
    id: str,
    plan_in: CuttingPlanUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update cutting plan properties."""
    plan = await cutting_service.update_plan(db, id, plan_in)
    if not plan:
        raise HTTPException(status_code=404, detail="Cutting plan not found")
    return plan


@router.post(
    "/cutting-plans/{id}/operations",
    response_model=CuttingOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_operation_to_plan(
    id: str,
    op_in: CuttingOperationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a cut or dress operation step to a cutting plan."""
    op = await cutting_service.add_operation(db, id, op_in)
    if not op:
        raise HTTPException(status_code=404, detail="Cutting plan not found")
    return op


@router.post("/cutting-plans/{id}/approve", response_model=CuttingPlanResponse)
async def approve_cutting_plan(
    id: str,
    body: Optional[ApproveRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Approve a cutting plan for execution."""
    approved_by = body.approved_by if body else None
    plan = await cutting_service.approve_plan(db, id, approved_by=approved_by)
    if not plan:
        raise HTTPException(status_code=404, detail="Cutting plan not found")
    return plan
