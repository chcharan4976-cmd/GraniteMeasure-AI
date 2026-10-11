from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.dispatch import (
    ManualVerificationCreate,
    ManualVerificationResponse,
)
from app.services import verification_service

router = APIRouter(tags=["Manual Verification"])


@router.post(
    "/blocks/{block_id}/verification",
    response_model=ManualVerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_verification(
    block_id: str,
    verif_in: ManualVerificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Record manual ground truth verification (tape/weighbridge/field inspection)."""
    return await verification_service.create_verification(db, block_id, verif_in)


@router.get(
    "/blocks/{block_id}/verification",
    response_model=List[ManualVerificationResponse],
)
async def list_verifications(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List manual inspection verifications for a granite block."""
    return await verification_service.list_verifications(db, block_id)
