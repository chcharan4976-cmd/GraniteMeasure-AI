from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import get_db
from app.models import Quarry, GraniteBlock
from app.schemas import QuarryCreate, QuarryUpdate, QuarryResponse

router = APIRouter(prefix="/api/v1/quarries", tags=["Quarries"])


async def _seed_default_quarries(db: AsyncSession):
    """Seed foundational Andhra Pradesh demonstration quarries if none exist."""
    res = await db.execute(select(func.count(Quarry.id)))
    count = res.scalar() or 0
    if count == 0:
        defaults = [
            Quarry(
                name="Chimakurthy Galaxy Leases #1",
                code="CHM-GLX-01",
                lease_reference="AP-PRK-GNT-2023-014",
                lease_holder="Galaxy Granites Minerals Pvt Ltd",
                location="Chimakurthy Mandal",
                district="Prakasam",
                mandal="Chimakurthy",
                village="R.L. Puram",
                granite_category="Black Galaxy Granite",
                gps_latitude=15.5841,
                gps_longitude=79.8652,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            Quarry(
                name="Khammam Jet Black Concession",
                code="KHM-JTB-02",
                lease_reference="AP-KHM-GNT-2022-088",
                lease_holder="Deccan Granites & Export Corp",
                location="Mudigonda Mandal",
                district="Khammam",
                mandal="Mudigonda",
                village="Vallabhi",
                granite_category="Jet Black Granite",
                gps_latitude=17.2472,
                gps_longitude=80.1514,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            Quarry(
                name="Tekkali Blue Star Quarry",
                code="SRK-BLU-03",
                lease_reference="AP-SRK-GNT-2024-002",
                lease_holder="Eastern Ghats Mining Ltd",
                location="Tekkali Mandal",
                district="Srikakulam",
                mandal="Tekkali",
                village="Peddasana",
                granite_category="Blue Star Granite",
                gps_latitude=18.6144,
                gps_longitude=84.2372,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
        ]
        db.add_all(defaults)
        await db.commit()


@router.get("/")
async def get_quarries(db: AsyncSession = Depends(get_db)):
    """List all quarries with live block counts."""
    await _seed_default_quarries(db)

    result = await db.execute(select(Quarry).where(Quarry.is_active == True).order_by(Quarry.id.asc()))
    quarries = result.scalars().all()

    # Query active block counts per quarry
    block_counts_res = await db.execute(
        select(GraniteBlock.quarry_id, func.count(GraniteBlock.id))
        .group_by(GraniteBlock.quarry_id)
    )
    counts_map = dict(block_counts_res.all())

    return [
        {
            "id": str(q.id),
            "name": q.name,
            "code": q.code or f"QRY-{q.id}",
            "lease_reference": q.lease_reference or "N/A",
            "lease_number": q.lease_reference or "N/A",
            "lease_holder": q.lease_holder or "Government Concession",
            "location": q.location or f"{q.village or ''}, {q.mandal or ''}".strip(", "),
            "district": q.district or "Prakasam",
            "mandal": q.mandal or "Chimakurthy",
            "village": q.village or "R.L. Puram",
            "granite_category": q.granite_category or "Black Galaxy",
            "gps_latitude": q.gps_latitude,
            "gps_longitude": q.gps_longitude,
            "is_active": q.is_active,
            "status": "ACTIVE" if q.is_active else "INACTIVE",
            "active_blocks_count": counts_map.get(q.id, 0),
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in quarries
    ]


@router.post("/")
async def create_quarry(quarry: QuarryCreate, db: AsyncSession = Depends(get_db)):
    """Register a new quarry and lease."""
    code = quarry.code or f"QRY-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
    lease_ref = quarry.lease_reference or quarry.lease_number or f"AP-GNT-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:4].upper()}"
    lease_holder = quarry.lease_holder or "Concession Leaseholder"
    location = quarry.location or f"{quarry.village or ''}, {quarry.mandal or ''}".strip(", ")

    db_quarry = Quarry(
        name=quarry.name,
        code=code,
        lease_reference=lease_ref,
        lease_holder=lease_holder,
        location=location,
        district=quarry.district or "Prakasam",
        mandal=quarry.mandal or "Chimakurthy",
        village=quarry.village,
        granite_category=quarry.granite_category or "Black Galaxy",
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
        "id": str(db_quarry.id),
        "name": db_quarry.name,
        "code": db_quarry.code,
        "lease_reference": db_quarry.lease_reference,
        "lease_number": db_quarry.lease_reference,
        "lease_holder": db_quarry.lease_holder,
        "location": db_quarry.location,
        "district": db_quarry.district,
        "mandal": db_quarry.mandal,
        "village": db_quarry.village,
        "granite_category": db_quarry.granite_category,
        "gps_latitude": db_quarry.gps_latitude,
        "gps_longitude": db_quarry.gps_longitude,
        "status": "created",
        "active_blocks_count": 0,
        "created_at": db_quarry.created_at.isoformat() if db_quarry.created_at else None,
    }


@router.get("/{quarry_id}")
async def get_quarry(quarry_id: str, db: AsyncSession = Depends(get_db)):
    """Get quarry details by ID or code."""
    query = select(Quarry)
    if quarry_id.isdigit():
        query = query.where(Quarry.id == int(quarry_id))
    else:
        query = query.where(Quarry.code == quarry_id)

    result = await db.execute(query)
    quarry = result.scalar_one_or_none()
    if not quarry:
        raise HTTPException(status_code=404, detail="Quarry not found")

    blocks_count_res = await db.execute(
        select(func.count(GraniteBlock.id)).where(GraniteBlock.quarry_id == quarry.id)
    )
    count = blocks_count_res.scalar() or 0

    return {
        "id": str(quarry.id),
        "name": quarry.name,
        "code": quarry.code,
        "lease_reference": quarry.lease_reference,
        "lease_number": quarry.lease_reference,
        "lease_holder": quarry.lease_holder or "Concession Leaseholder",
        "location": quarry.location or f"{quarry.village or ''}, {quarry.mandal or ''}".strip(", "),
        "district": quarry.district,
        "mandal": quarry.mandal,
        "village": quarry.village,
        "granite_category": quarry.granite_category,
        "gps_latitude": quarry.gps_latitude,
        "gps_longitude": quarry.gps_longitude,
        "is_active": quarry.is_active,
        "status": "ACTIVE" if quarry.is_active else "INACTIVE",
        "active_blocks_count": count,
    }


@router.put("/{quarry_id}")
async def update_quarry(quarry_id: str, quarry_in: QuarryUpdate, db: AsyncSession = Depends(get_db)):
    """Update quarry information."""
    query = select(Quarry)
    if quarry_id.isdigit():
        query = query.where(Quarry.id == int(quarry_id))
    else:
        query = query.where(Quarry.code == quarry_id)

    result = await db.execute(query)
    quarry = result.scalar_one_or_none()
    if not quarry:
        raise HTTPException(status_code=404, detail="Quarry not found")

    update_data = quarry_in.model_dump(exclude_unset=True)
    if "lease_number" in update_data and not update_data.get("lease_reference"):
        update_data["lease_reference"] = update_data["lease_number"]

    for key, value in update_data.items():
        if hasattr(quarry, key) and value is not None:
            setattr(quarry, key, value)

    await db.commit()
    await db.refresh(quarry)

    return {
        "id": str(quarry.id),
        "name": quarry.name,
        "code": quarry.code,
        "lease_reference": quarry.lease_reference,
        "lease_number": quarry.lease_reference,
        "lease_holder": quarry.lease_holder,
        "location": quarry.location,
        "district": quarry.district,
        "mandal": quarry.mandal,
        "village": quarry.village,
        "status": "ACTIVE" if quarry.is_active else "INACTIVE",
    }


@router.delete("/{quarry_id}")
async def delete_quarry(quarry_id: str, db: AsyncSession = Depends(get_db)):
    """Soft delete/deactivate a quarry."""
    query = select(Quarry)
    if quarry_id.isdigit():
        query = query.where(Quarry.id == int(quarry_id))
    else:
        query = query.where(Quarry.code == quarry_id)

    result = await db.execute(query)
    quarry = result.scalar_one_or_none()
    if not quarry:
        raise HTTPException(status_code=404, detail="Quarry not found")

    quarry.is_active = False
    await db.commit()
    return {"status": "deactivated", "id": quarry_id}
