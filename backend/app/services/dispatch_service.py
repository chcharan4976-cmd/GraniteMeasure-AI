import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dispatch import ApprovalEvent
from app.models import DispatchRecord, GraniteBlock, AuditLog
from app.schemas.dispatch import (
    ApprovalEventCreate,
    DispatchRecordCreate,
    DispatchRecordUpdate,
)


async def create_approval_event(
    db: AsyncSession,
    block_id: str | int,
    event_in: ApprovalEventCreate,
) -> ApprovalEvent:
    event_id = str(uuid.uuid4())
    event_type_str = event_in.event_type.value if hasattr(event_in.event_type, "value") else str(event_in.event_type)

    event = ApprovalEvent(
        id=event_id,
        block_id=str(block_id),
        event_type=event_type_str,
        from_status=event_in.from_status,
        to_status=event_in.to_status,
        performed_by=event_in.performed_by,
        role=event_in.role,
        notes=event_in.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)

    # If status change is specified, update GraniteBlock status
    if event_in.to_status:
        blk_res = await db.execute(
            select(GraniteBlock).where(GraniteBlock.id == (int(block_id) if str(block_id).isdigit() else 0))
        )
        blk = blk_res.scalar_one_or_none()
        if blk:
            blk.status = event_in.to_status

    audit = AuditLog(
        action=f"APPROVAL_{event_type_str}",
        entity_type="GraniteBlock",
        entity_id=int(block_id) if str(block_id).isdigit() else 0,
        details=f"Approval event {event_type_str} by {event_in.performed_by or 'User'}: {event_in.notes or ''}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(event)
    return event


async def list_approval_events(
    db: AsyncSession,
    block_id: str | int,
) -> List[ApprovalEvent]:
    query = (
        select(ApprovalEvent)
        .where(ApprovalEvent.block_id == str(block_id))
        .order_by(ApprovalEvent.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_dispatch(
    db: AsyncSession,
    dispatch_in: DispatchRecordCreate,
) -> DispatchRecord:
    transit_ref = dispatch_in.qr_reference or dispatch_in.dispatch_number or f"DISP-{uuid.uuid4().hex[:8].upper()}"
    status_str = dispatch_in.status.value if hasattr(dispatch_in.status, "value") else str(dispatch_in.status or "CREATED")

    db_dispatch = DispatchRecord(
        block_id=int(dispatch_in.block_id) if str(dispatch_in.block_id).isdigit() else 0,
        dispatch_date=dispatch_in.dispatch_date or datetime.now(timezone.utc),
        vehicle_number=dispatch_in.vehicle_number,
        transit_pass_ref=transit_ref,
        weighbridge_ref=str(dispatch_in.weight_tonnes) if dispatch_in.weight_tonnes is not None else None,
        destination=dispatch_in.destination,
        status=status_str,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_dispatch)

    audit = AuditLog(
        action="DISPATCH_CREATED",
        entity_type="DispatchRecord",
        entity_id=int(dispatch_in.block_id) if str(dispatch_in.block_id).isdigit() else 0,
        details=f"Dispatch to {dispatch_in.destination} on vehicle {dispatch_in.vehicle_number}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(db_dispatch)
    return db_dispatch


async def list_dispatches(
    db: AsyncSession,
    limit: int = 100,
    offset: int = 0,
) -> List[DispatchRecord]:
    query = (
        select(DispatchRecord)
        .order_by(DispatchRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_dispatch(
    db: AsyncSession,
    dispatch_id: int | str,
) -> Optional[DispatchRecord]:
    d_id = int(dispatch_id) if str(dispatch_id).isdigit() else 0
    result = await db.execute(select(DispatchRecord).where(DispatchRecord.id == d_id))
    return result.scalar_one_or_none()


async def update_dispatch(
    db: AsyncSession,
    dispatch_id: int | str,
    dispatch_in: DispatchRecordUpdate,
) -> Optional[DispatchRecord]:
    dispatch = await get_dispatch(db, dispatch_id)
    if not dispatch:
        return None

    update_data = dispatch_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "status" and hasattr(val, "value"):
            dispatch.status = val.value
        elif field == "vehicle_number" and val is not None:
            dispatch.vehicle_number = val
        elif field == "destination" and val is not None:
            dispatch.destination = val
        elif field == "dispatch_date" and val is not None:
            dispatch.dispatch_date = val
        elif field == "weight_tonnes" and val is not None:
            dispatch.weighbridge_ref = str(val)
        elif field == "qr_reference" and val is not None:
            dispatch.transit_pass_ref = val

    audit = AuditLog(
        action="DISPATCH_UPDATED",
        entity_type="DispatchRecord",
        entity_id=dispatch.id,
        details=f"Dispatch {dispatch.id} status updated to {dispatch.status}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(dispatch)
    return dispatch
