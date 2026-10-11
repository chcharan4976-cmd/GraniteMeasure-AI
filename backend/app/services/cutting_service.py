import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cutting import CuttingPlan, CuttingOperation
from app.models import AuditLog, GraniteBlock, MeasurementResult
from app.schemas.cutting import CuttingPlanCreate, CuttingPlanUpdate, CuttingOperationCreate


async def list_plans_for_block(
    db: AsyncSession,
    block_id: str | int,
) -> List[CuttingPlan]:
    query = (
        select(CuttingPlan)
        .options(selectinload(CuttingPlan.operations))
        .where(CuttingPlan.block_id == str(block_id))
        .order_by(CuttingPlan.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_plan(
    db: AsyncSession,
    plan_id: str,
) -> Optional[CuttingPlan]:
    query = (
        select(CuttingPlan)
        .options(selectinload(CuttingPlan.operations))
        .where(CuttingPlan.id == plan_id)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_plan(
    db: AsyncSession,
    block_id: str | int,
    plan_in: CuttingPlanCreate,
) -> CuttingPlan:
    plan_id = str(uuid.uuid4())

    # If original volume not provided, attempt to fetch from latest block measurement
    original_volume = plan_in.original_volume_m3
    if original_volume is None:
        meas_res = await db.execute(
            select(MeasurementResult)
            .where(MeasurementResult.block_id == (int(block_id) if str(block_id).isdigit() else 0))
            .order_by(MeasurementResult.created_at.desc())
            .limit(1)
        )
        meas = meas_res.scalar_one_or_none()
        if meas and meas.volume_m3:
            original_volume = meas.volume_m3

    dressed_vol = plan_in.dressed_volume_m3
    if dressed_vol is None and plan_in.target_length_cm and plan_in.target_breadth_cm and plan_in.target_height_cm:
        dressed_vol = round(
            (plan_in.target_length_cm / 100.0)
            * (plan_in.target_breadth_cm / 100.0)
            * (plan_in.target_height_cm / 100.0),
            4,
        )

    removed_vol = plan_in.removed_volume_m3
    if removed_vol is None and original_volume and dressed_vol:
        removed_vol = max(0.0, round(original_volume - dressed_vol, 4))

    recovery_ratio = plan_in.recovery_ratio
    wastage_ratio = plan_in.wastage_ratio
    if recovery_ratio is None and original_volume and dressed_vol and original_volume > 0:
        recovery_ratio = round(dressed_vol / original_volume, 4)
        wastage_ratio = round(1.0 - recovery_ratio, 4)

    db_plan = CuttingPlan(
        id=plan_id,
        block_id=str(block_id),
        plan_name=plan_in.plan_name,
        status=plan_in.status.value if hasattr(plan_in.status, "value") else str(plan_in.status or "DRAFT"),
        target_length_cm=plan_in.target_length_cm,
        target_breadth_cm=plan_in.target_breadth_cm,
        target_height_cm=plan_in.target_height_cm,
        original_volume_m3=original_volume,
        dressed_volume_m3=dressed_vol,
        removed_volume_m3=removed_vol,
        recovery_ratio=recovery_ratio,
        wastage_ratio=wastage_ratio,
        optimization_method=plan_in.optimization_method or "DEFECT_AVOIDANCE_BOUNDING_BOX",
        plan_data_json=plan_in.plan_data_json,
        notes=plan_in.notes,
        created_by=plan_in.created_by,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_plan)

    # Add any operations included in create
    if plan_in.operations:
        for idx, op in enumerate(plan_in.operations):
            db_op = CuttingOperation(
                id=str(uuid.uuid4()),
                plan_id=plan_id,
                operation_order=op.operation_order or (idx + 1),
                cut_type=op.cut_type.value if hasattr(op.cut_type, "value") else str(op.cut_type),
                description=op.description,
                plane_normal_json=op.plane_normal_json,
                plane_offset=op.plane_offset,
                material_removed_m3=op.material_removed_m3,
                reason=op.reason,
                created_at=datetime.now(timezone.utc),
            )
            db.add(db_op)

    audit = AuditLog(
        action="CUTTING_PLAN_CREATED",
        entity_type="GraniteBlock",
        entity_id=int(block_id) if str(block_id).isdigit() else 0,
        details=f"Cutting plan '{plan_in.plan_name}' created for block {block_id}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    return await get_plan(db, plan_id)  # Returns with operations eager-loaded


async def update_plan(
    db: AsyncSession,
    plan_id: str,
    plan_in: CuttingPlanUpdate,
) -> Optional[CuttingPlan]:
    plan = await get_plan(db, plan_id)
    if not plan:
        return None

    update_data = plan_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "status" and hasattr(val, "value"):
            setattr(plan, field, val.value)
        else:
            setattr(plan, field, val)

    plan.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action="CUTTING_PLAN_UPDATED",
        entity_type="CuttingPlan",
        entity_id=0,
        details=f"Cutting plan {plan_id} updated",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(plan)
    return plan


async def add_operation(
    db: AsyncSession,
    plan_id: str,
    op_in: CuttingOperationCreate,
) -> Optional[CuttingOperation]:
    plan = await get_plan(db, plan_id)
    if not plan:
        return None

    op_id = str(uuid.uuid4())
    db_op = CuttingOperation(
        id=op_id,
        plan_id=plan_id,
        operation_order=op_in.operation_order or (len(plan.operations) + 1),
        cut_type=op_in.cut_type.value if hasattr(op_in.cut_type, "value") else str(op_in.cut_type),
        description=op_in.description,
        plane_normal_json=op_in.plane_normal_json,
        plane_offset=op_in.plane_offset,
        material_removed_m3=op_in.material_removed_m3,
        reason=op_in.reason,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_op)

    audit = AuditLog(
        action="CUTTING_OP_ADDED",
        entity_type="CuttingPlan",
        entity_id=0,
        details=f"Operation {op_in.cut_type} added to plan {plan_id}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(db_op)
    return db_op


async def approve_plan(
    db: AsyncSession,
    plan_id: str,
    approved_by: Optional[str] = None,
) -> Optional[CuttingPlan]:
    plan = await get_plan(db, plan_id)
    if not plan:
        return None

    plan.status = "APPROVED"
    plan.updated_at = datetime.now(timezone.utc)
    if approved_by:
        plan.notes = f"{plan.notes or ''}\nApproved by: {approved_by}".strip()

    audit = AuditLog(
        action="CUTTING_PLAN_APPROVED",
        entity_type="CuttingPlan",
        entity_id=0,
        details=f"Cutting plan {plan_id} approved by {approved_by or 'System'}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(plan)
    return plan
