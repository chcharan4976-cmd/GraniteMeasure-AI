from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.officer import OfficerCreate, OfficerUpdate, OfficerResponse
from app.services import officer_service

router = APIRouter(prefix="/officers", tags=["Officers"])


@router.get("", response_model=List[OfficerResponse])
@router.get("/", response_model=List[OfficerResponse], include_in_schema=False)
async def list_officers(
    role: Optional[str] = Query(None, description="Filter by role ('admin' or 'officer')"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
):
    """List officers with optional role and active status filters."""
    officers = await officer_service.list_officers(db, role=role, is_active=is_active)
    return officers


@router.get("/{id}", response_model=OfficerResponse)
async def get_officer(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get an officer by ID."""
    officer = await officer_service.get_officer(db, id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    return officer


@router.post("", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_officer(
    officer_in: OfficerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new officer identity."""
    return await officer_service.create_officer(db, officer_in)


@router.put("/{id}", response_model=OfficerResponse)
async def update_officer(
    id: str,
    officer_in: OfficerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update officer identity."""
    officer = await officer_service.update_officer(db, id, officer_in)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    return officer
