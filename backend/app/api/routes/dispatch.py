from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.dispatch import (
    ApprovalEventCreate,
    ApprovalEventResponse,
    DispatchRecordCreate,
    DispatchRecordUpdate,
    DispatchRecordResponse,
)
from app.services import dispatch_service

router = APIRouter(tags=["Dispatch & Approvals"])


# ---- Approval Events ----
@router.post(
    "/blocks/{block_id}/approval-events",
    response_model=ApprovalEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_approval_event(
    block_id: str,
    event_in: ApprovalEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """Record a block state approval/review event."""
    return await dispatch_service.create_approval_event(db, block_id, event_in)


@router.get(
    "/blocks/{block_id}/approval-events",
    response_model=List[ApprovalEventResponse],
)
async def list_approval_events(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all approval history for a granite block."""
    return await dispatch_service.list_approval_events(db, block_id)


# ---- Dispatch Records ----
@router.post(
    "/dispatch",
    response_model=DispatchRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dispatch(
    dispatch_in: DispatchRecordCreate,
    db: AsyncSession = Depends(get_db),
):
    """Generate a legal transit dispatch record."""
    d = await dispatch_service.create_dispatch(db, dispatch_in)
    return DispatchRecordResponse(
        id=str(d.id),
        block_id=str(d.block_id),
        dispatch_number=d.transit_pass_ref or f"DSP-{d.id}",
        vehicle_number=d.vehicle_number or "",
        destination=d.destination or "",
        dispatch_date=d.dispatch_date,
        weight_tonnes=float(d.weighbridge_ref) if d.weighbridge_ref and d.weighbridge_ref.replace('.', '', 1).isdigit() else None,
        status=d.status or "CREATED",
        qr_reference=d.transit_pass_ref,
        created_at=d.created_at,
    )


@router.get("/dispatch", response_model=List[DispatchRecordResponse])
async def list_dispatches(
    limit: int = Query(default=100, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List dispatches."""
    items = await dispatch_service.list_dispatches(db, limit=limit, offset=offset)
    return [
        DispatchRecordResponse(
            id=str(d.id),
            block_id=str(d.block_id),
            dispatch_number=d.transit_pass_ref or f"DSP-{d.id}",
            vehicle_number=d.vehicle_number or "",
            destination=d.destination or "",
            dispatch_date=d.dispatch_date,
            weight_tonnes=float(d.weighbridge_ref) if d.weighbridge_ref and d.weighbridge_ref.replace('.', '', 1).isdigit() else None,
            status=d.status or "CREATED",
            qr_reference=d.transit_pass_ref,
            created_at=d.created_at,
        )
        for d in items
    ]


@router.get("/dispatch/{id}", response_model=DispatchRecordResponse)
async def get_dispatch(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get dispatch record by ID."""
    d = await dispatch_service.get_dispatch(db, id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    return DispatchRecordResponse(
        id=str(d.id),
        block_id=str(d.block_id),
        dispatch_number=d.transit_pass_ref or f"DSP-{d.id}",
        vehicle_number=d.vehicle_number or "",
        destination=d.destination or "",
        dispatch_date=d.dispatch_date,
        weight_tonnes=float(d.weighbridge_ref) if d.weighbridge_ref and d.weighbridge_ref.replace('.', '', 1).isdigit() else None,
        status=d.status or "CREATED",
        qr_reference=d.transit_pass_ref,
        created_at=d.created_at,
    )


@router.put("/dispatch/{id}", response_model=DispatchRecordResponse)
async def update_dispatch(
    id: str,
    dispatch_in: DispatchRecordUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update dispatch status or destination."""
    d = await dispatch_service.update_dispatch(db, id, dispatch_in)
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    return DispatchRecordResponse(
        id=str(d.id),
        block_id=str(d.block_id),
        dispatch_number=d.transit_pass_ref or f"DSP-{d.id}",
        vehicle_number=d.vehicle_number or "",
        destination=d.destination or "",
        dispatch_date=d.dispatch_date,
        weight_tonnes=float(d.weighbridge_ref) if d.weighbridge_ref and d.weighbridge_ref.replace('.', '', 1).isdigit() else None,
        status=d.status or "CREATED",
        qr_reference=d.transit_pass_ref,
        created_at=d.created_at,
    )
