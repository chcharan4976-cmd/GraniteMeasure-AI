from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any

from app.models import (
    GraniteBlock,
    Quarry,
    AnalysisJob,
    MeasurementResult,
    SeigniorageAssessment,
    DispatchRecord,
    AuditLog,
)
from app.models.defect import DefectResult
from app.models.dispatch import ApprovalEvent


async def get_admin_dashboard(db: AsyncSession) -> Dict[str, Any]:
    # Total quarries
    q_total = (await db.execute(select(func.count(Quarry.id)))).scalar() or 0
    q_active = (await db.execute(select(func.count(Quarry.id)).where(Quarry.is_active == True))).scalar() or 0

    # Blocks
    total_blocks = (await db.execute(select(func.count(GraniteBlock.id)))).scalar() or 0
    verified_blocks = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "VERIFIED"))
    ).scalar() or 0
    measured_blocks = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "MEASURED"))
    ).scalar() or 0
    analyzing_blocks = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "ANALYZING"))
    ).scalar() or 0

    # Jobs
    total_jobs = (await db.execute(select(func.count(AnalysisJob.id)))).scalar() or 0
    completed_jobs = (
        await db.execute(select(func.count(AnalysisJob.id)).where(AnalysisJob.status == "COMPLETED"))
    ).scalar() or 0
    failed_jobs = (
        await db.execute(select(func.count(AnalysisJob.id)).where(AnalysisJob.status == "FAILED"))
    ).scalar() or 0

    # Seigniorage
    total_seigniorage = (
        await db.execute(select(func.sum(SeigniorageAssessment.indicative_amount)))
    ).scalar() or 0.0
    total_tonnes = (
        await db.execute(select(func.sum(SeigniorageAssessment.weight_mt)))
    ).scalar() or 0.0

    # Dispatches
    active_dispatches = (
        await db.execute(select(func.count(DispatchRecord.id)).where(DispatchRecord.status != "CANCELLED"))
    ).scalar() or 0

    # Defects
    total_defects = (await db.execute(select(func.count(DefectResult.id)))).scalar() or 0
    critical_defects = (
        await db.execute(select(func.count(DefectResult.id)).where(DefectResult.severity == "CRITICAL"))
    ).scalar() or 0

    # Recent blocks
    recent_blocks = (
        (await db.execute(select(GraniteBlock).order_by(GraniteBlock.registered_at.desc()).limit(5)))
        .scalars()
        .all()
    )

    # Recent activity
    recent_logs = (
        (await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10)))
        .scalars()
        .all()
    )

    return {
        "role": "admin",
        "quarries": {"total": q_total, "active": q_active},
        "blocks": {
            "total": total_blocks,
            "measured": measured_blocks,
            "verified": verified_blocks,
            "analyzing": analyzing_blocks,
        },
        "analysis_jobs": {
            "total": total_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
        },
        "revenue_indicative": {
            "total_amount_inr": round(float(total_seigniorage), 2),
            "total_weight_mt": round(float(total_tonnes), 2),
        },
        "dispatches": {"total_active": active_dispatches},
        "defects": {"total": total_defects, "critical": critical_defects},
        "recent_blocks": [
            {
                "id": b.id,
                "identifier": b.identifier,
                "color_group": b.color_group,
                "status": b.status,
                "registered_at": b.registered_at.isoformat() if b.registered_at else None,
            }
            for b in recent_blocks
        ],
        "recent_activity": [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "details": l.details,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            }
            for l in recent_logs
        ],
    }


async def get_officer_dashboard(
    db: AsyncSession, quarry_id: Optional[int] = None
) -> Dict[str, Any]:
    # Query filters
    b_query = select(GraniteBlock)
    if quarry_id:
        b_query = b_query.where(GraniteBlock.quarry_id == quarry_id)

    total_blocks = (await db.execute(select(func.count(GraniteBlock.id)))).scalar() or 0
    needs_verification = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "MEASURED"))
    ).scalar() or 0
    verified_count = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "VERIFIED"))
    ).scalar() or 0
    registered_pending_capture = (
        await db.execute(select(func.count(GraniteBlock.id)).where(GraniteBlock.status == "REGISTERED"))
    ).scalar() or 0

    # Recent blocks waiting for field inspection/verification
    pending_items = (
        (
            await db.execute(
                select(GraniteBlock)
                .where(GraniteBlock.status.in_(["MEASURED", "REGISTERED"]))
                .order_by(GraniteBlock.registered_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )

    # Pending approvals
    recent_approvals = (
        (await db.execute(select(ApprovalEvent).order_by(ApprovalEvent.created_at.desc()).limit(5)))
        .scalars()
        .all()
    )

    return {
        "role": "officer",
        "quarry_filter_id": quarry_id,
        "summary": {
            "total_blocks": total_blocks,
            "needs_verification": needs_verification,
            "verified": verified_count,
            "pending_capture": registered_pending_capture,
        },
        "queue": [
            {
                "id": b.id,
                "identifier": b.identifier,
                "color_group": b.color_group,
                "status": b.status,
                "registered_at": b.registered_at.isoformat() if b.registered_at else None,
            }
            for b in pending_items
        ],
        "recent_approvals": [
            {
                "id": a.id,
                "block_id": a.block_id,
                "event_type": a.event_type,
                "performed_by": a.performed_by,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_approvals
        ],
    }
