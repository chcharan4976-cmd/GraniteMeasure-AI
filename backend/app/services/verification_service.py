import json
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ManualVerification, PhysicalReference, GraniteBlock, AuditLog
from app.schemas.dispatch import ManualVerificationCreate


async def create_verification(
    db: AsyncSession,
    block_id: str | int,
    verif_in: ManualVerificationCreate,
) -> dict:
    int_block_id = int(block_id) if str(block_id).isdigit() else 0

    # Also record physical reference if dimensions or weight were supplied
    pref_id = None
    if (
        verif_in.measured_length_cm is not None
        or verif_in.measured_breadth_cm is not None
        or verif_in.measured_height_cm is not None
        or verif_in.measured_weight_tonnes is not None
    ):
        pref = PhysicalReference(
            block_id=int_block_id,
            tape_length_cm=verif_in.measured_length_cm,
            tape_breadth_cm=verif_in.measured_breadth_cm,
            tape_height_cm=verif_in.measured_height_cm,
            weight_mt=verif_in.measured_weight_tonnes,
            recorded_by=verif_in.verified_by,
            notes=f"[{verif_in.verification_type}] {verif_in.notes or ''}".strip(),
            created_at=datetime.now(timezone.utc),
        )
        db.add(pref)
        await db.flush()
        pref_id = pref.id

    remarks_data = {
        "verification_type": (
            verif_in.verification_type.value
            if hasattr(verif_in.verification_type, "value")
            else str(verif_in.verification_type)
        ),
        "measured_length_cm": verif_in.measured_length_cm,
        "measured_breadth_cm": verif_in.measured_breadth_cm,
        "measured_height_cm": verif_in.measured_height_cm,
        "measured_weight_tonnes": verif_in.measured_weight_tonnes,
        "instrument_details": verif_in.instrument_details,
        "notes": verif_in.notes,
        "verified_by_name": verif_in.verified_by,
        "reference_id": pref_id,
    }

    verif = ManualVerification(
        block_id=int_block_id,
        verification_status="VERIFIED",
        remarks=json.dumps(remarks_data),
        verified_at=datetime.now(timezone.utc),
    )
    db.add(verif)

    # Update block status to VERIFIED
    blk_res = await db.execute(select(GraniteBlock).where(GraniteBlock.id == int_block_id))
    block = blk_res.scalar_one_or_none()
    if block:
        block.status = "VERIFIED"

    audit = AuditLog(
        action="BLOCK_VERIFIED",
        entity_type="GraniteBlock",
        entity_id=int_block_id,
        details=f"Block manual verification completed by {verif_in.verified_by}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(verif)

    return {
        "id": str(verif.id),
        "block_id": str(block_id),
        "verification_type": remarks_data["verification_type"],
        "measured_length_cm": verif_in.measured_length_cm,
        "measured_breadth_cm": verif_in.measured_breadth_cm,
        "measured_height_cm": verif_in.measured_height_cm,
        "measured_weight_tonnes": verif_in.measured_weight_tonnes,
        "verified_by": verif_in.verified_by,
        "instrument_details": verif_in.instrument_details,
        "notes": verif_in.notes,
        "created_at": verif.verified_at,
    }


async def list_verifications(
    db: AsyncSession,
    block_id: str | int,
) -> List[dict]:
    int_block_id = int(block_id) if str(block_id).isdigit() else 0
    query = (
        select(ManualVerification)
        .where(ManualVerification.block_id == int_block_id)
        .order_by(ManualVerification.verified_at.desc())
    )
    result = await db.execute(query)
    verifs = result.scalars().all()

    items = []
    for v in verifs:
        info = {}
        if v.remarks:
            try:
                info = json.loads(v.remarks)
            except Exception:
                info = {"notes": v.remarks}

        items.append(
            {
                "id": str(v.id),
                "block_id": str(block_id),
                "verification_type": info.get("verification_type", "MANUAL_MEASUREMENT"),
                "measured_length_cm": info.get("measured_length_cm"),
                "measured_breadth_cm": info.get("measured_breadth_cm"),
                "measured_height_cm": info.get("measured_height_cm"),
                "measured_weight_tonnes": info.get("measured_weight_tonnes"),
                "verified_by": info.get("verified_by_name", str(v.verified_by or "Officer")),
                "instrument_details": info.get("instrument_details"),
                "notes": info.get("notes"),
                "created_at": v.verified_at,
            }
        )
    return items
