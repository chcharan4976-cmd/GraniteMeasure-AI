from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.database import get_db
from app.models import Quarry
from app.schemas import QuarryCreate, QuarryResponse

router = APIRouter(prefix="/api/v1/quarries", tags=["Quarries"])


@router.get("/")
async def get_quarries(db: AsyncSession = Depends(get_db)):
    """List all quarries."""
    result = await db.execute(select(Quarry).where(Quarry.is_active == True))
    quarries = result.scalars().all()
    return [
        {
            "id": q.id,
            "name": q.name,
            "code": q.code,
            "lease_reference": q.lease_reference,
            "district": q.district,
            "mandal": q.mandal,
            "village": q.village,
            "granite_category": q.granite_category,
            "gps_latitude": q.gps_latitude,
            "gps_longitude": q.gps_longitude,
            "is_active": q.is_active,
        }
        for q in quarries
    ]


@router.post("/")
async def create_quarry(quarry: QuarryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new quarry."""
    db_quarry = Quarry(
        name=quarry.name,
        code=quarry.code,
        lease_reference=quarry.lease_reference,
        district=quarry.district,
        mandal=quarry.mandal,
        village=quarry.village,
        granite_category=quarry.granite_category,
        gps_latitude=quarry.gps_latitude,
        gps_longitude=quarry.gps_longitude,
        operator_id=quarry.operator_id,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_quarry)
    await db.commit()
    await db.refresh(db_quarry)

    return {
        "id": db_quarry.id,
        "name": db_quarry.name,
        "code": db_quarry.code,
        "status": "created",
    }


@router.get("/{quarry_id}")
async def get_quarry(quarry_id: int, db: AsyncSession = Depends(get_db)):
    """Get quarry details."""
    result = await db.execute(select(Quarry).where(Quarry.id == quarry_id))
    quarry = result.scalar_one_or_none()
    if not quarry:
        raise HTTPException(status_code=404, detail="Quarry not found")

    return {
        "id": quarry.id,
        "name": quarry.name,
        "code": quarry.code,
        "lease_reference": quarry.lease_reference,
        "district": quarry.district,
        "mandal": quarry.mandal,
        "village": quarry.village,
        "granite_category": quarry.granite_category,
        "gps_latitude": quarry.gps_latitude,
        "gps_longitude": quarry.gps_longitude,
        "is_active": quarry.is_active,
    }
