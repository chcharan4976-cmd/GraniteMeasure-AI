from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.defect import (
    DefectCreate,
    DefectUpdate,
    DefectConfirmRequest,
    DefectResponse,
)
from app.services import defect_service

router = APIRouter(tags=["Defects"])


@router.get("/blocks/{block_id}/defects", response_model=List[DefectResponse])
async def list_defects_for_block(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all detected and reported defects for a specific granite block."""
    return await defect_service.list_defects_for_block(db, block_id)


@router.post(
    "/blocks/{block_id}/defects",
    response_model=DefectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_defect(
    block_id: str,
    defect_in: DefectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Log a new defect for a granite block."""
    return await defect_service.create_defect(db, block_id, defect_in)


@router.put("/defects/{id}", response_model=DefectResponse)
async def update_defect(
    id: str,
    defect_in: DefectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update defect details."""
    defect = await defect_service.update_defect(db, id, defect_in)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@router.post("/defects/{id}/confirm", response_model=DefectResponse)
async def confirm_defect(
    id: str,
    confirm_in: DefectConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Officially confirm a defect and record the verifying officer."""
    defect = await defect_service.confirm_defect(
        db, id, confirmed_by=confirm_in.confirmed_by, notes=confirm_in.notes
    )
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect
