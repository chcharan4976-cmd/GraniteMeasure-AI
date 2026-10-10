import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal, get_db
from app.models import (
    AnalysisJob,
    AuditLog,
    BlockImage,
    GeometryArtifact,
    GraniteBlock,
    MeasurementResult,
)
from app.services.measurement import MeasurementEngine
from app.services.pipeline_config import JOB_TIMEOUT_SEC, WORKSPACE_ROOT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="measure")

STAGES = [
    ("VALIDATING", "Validating submitted photographs"),
    ("CALIBRATING", "Detecting ArUco markers"),
    ("FEATURE_MATCHING", "Matching features / recovering pose"),
    ("RECONSTRUCTING", "Sparse reconstruction"),
    ("SCALING", "Applying verified metric scale"),
    ("MEASURING", "Oriented bounding box and volume diagnostics"),
    ("PERSISTING", "Saving results"),
]


def _json_safe(value):
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items() if k != "cleaned_points"}
    if isinstance(value, (list, tuple)):
        if len(value) > 2000:
            return [_json_safe(v) for v in value[:500]]
        return [_json_safe(v) for v in value]
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


async def _set_job(db, job, status: str, step: str):
    job.status = status
    job.current_step = step
    idx = next((i for i, s in enumerate(STAGES) if s[0] == status), None)
    job.progress_pct = int(100 * (idx + 1) / len(STAGES)) if idx is not None else job.progress_pct
    await db.commit()


async def run_analysis_job(job_id: int):
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                return

            await _set_job(db, job, "VALIDATING", "Validating images")

            img_result = await db.execute(
                select(BlockImage).where(BlockImage.block_id == job.block_id)
            )
            images = img_result.scalars().all()
            if not images:
                job.status = "FAILED"
                job.current_step = "No images found"
                job.error_message = "No images found for this block"
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

            image_paths = [img.file_path for img in images]
            workspace = str(WORKSPACE_ROOT / f"job_{job_id}")
            engine = MeasurementEngine()
            loop = asyncio.get_running_loop()

            def _run():
                def progress(status, message):
                    logger.info("job %s %s %s", job_id, status, message)

                return engine.estimate_dimensions(
                    image_paths, workspace=workspace, job_id=job_id, progress=progress
                )

            try:
                measurement_data = await asyncio.wait_for(
                    loop.run_in_executor(_executor, _run),
                    timeout=JOB_TIMEOUT_SEC,
                )
            except (asyncio.TimeoutError, FuturesTimeout):
                job.status = "FAILED"
                job.current_step = "Timed out"
                job.error_message = f"Processing exceeded {JOB_TIMEOUT_SEC}s"
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

            await _set_job(db, job, "PERSISTING", "Saving results")
            safe = _json_safe(measurement_data)

            measurement = MeasurementResult(
                block_id=job.block_id,
                job_id=job.id,
                length_cm=measurement_data.get("length_cm"),
                breadth_cm=measurement_data.get("breadth_cm"),
                height_cm=measurement_data.get("height_cm"),
                volume_m3=measurement_data.get("bbox_volume_m3") or measurement_data.get("volume_m3"),
                weight_mt=measurement_data.get("estimated_mass_mt"),
                confidence=None,
                status=measurement_data.get("status", "FAILED"),
                calibration_status=measurement_data.get("calibration_status", "NOT_CALIBRATED"),
                measurement_type=measurement_data.get("measurement_type", "NONE"),
                reconstructed_points=measurement_data.get("reconstructed_points"),
                usable_images=measurement_data.get("usable_images"),
                warnings=json.dumps(measurement_data.get("warnings", [])),
                details=json.dumps(safe),
                created_at=datetime.now(timezone.utc),
            )
            db.add(measurement)

            artifact_path = measurement_data.get("geometry_artifact")
            if artifact_path:
                db.add(
                    GeometryArtifact(
                        block_id=job.block_id,
                        job_id=job.id,
                        artifact_type="POINT_CLOUD_JSON",
                        file_path=str(artifact_path),
                        point_count=measurement_data.get("reconstructed_points"),
                        is_dense=bool(measurement_data.get("is_dense")),
                        created_at=datetime.now(timezone.utc),
                    )
                )

            block_result = await db.execute(
                select(GraniteBlock).where(GraniteBlock.id == job.block_id)
            )
            block = block_result.scalar_one_or_none()
            failed = measurement_data.get("status") == "FAILED"
            if block:
                block.status = "FAILED" if failed else "MEASURED"

            job.status = "FAILED" if failed else "COMPLETED"
            job.current_step = measurement_data.get("failure_reason") or "Complete"
            job.error_message = measurement_data.get("failure_reason") if failed else None
            job.progress_pct = 100 if not failed else job.progress_pct
            job.completed_at = datetime.now(timezone.utc)
            job.result_summary = json.dumps(
                {
                    "status": measurement_data.get("status"),
                    "calibration_status": measurement_data.get("calibration_status"),
                    "length_cm": measurement_data.get("length_cm"),
                    "breadth_cm": measurement_data.get("breadth_cm"),
                    "height_cm": measurement_data.get("height_cm"),
                    "bbox_volume_m3": measurement_data.get("bbox_volume_m3"),
                    "irregular_volume_status": measurement_data.get("irregular_volume_status"),
                    "confidence_label": measurement_data.get("confidence_label"),
                    "current_step": job.current_step,
                }
            )
            db.add(
                AuditLog(
                    action="ANALYSIS_COMPLETED" if not failed else "ANALYSIS_FAILED",
                    entity_type="AnalysisJob",
                    entity_id=job.id,
                    details=f"Analysis for block {job.block_id}: {measurement_data.get('status')}",
                    timestamp=datetime.now(timezone.utc),
                )
            )
            await db.commit()
        except Exception as exc:
            logger.exception("Analysis job %s crashed", job_id)
            try:
                result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
                job = result.scalar_one_or_none()
                if job:
                    job.status = "FAILED"
                    job.error_message = str(exc)
                    job.current_step = "Worker error"
                    job.completed_at = datetime.now(timezone.utc)
                    await db.commit()
            except Exception:
                pass


@router.post("/jobs")
async def start_job(
    block_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    job = AnalysisJob(
        block_id=block_id,
        status="PENDING",
        current_step="Queued",
        progress_pct=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(job)
    block.status = "ANALYZING"
    await db.commit()
    await db.refresh(job)
    background_tasks.add_task(run_analysis_job, job.id)
    return {
        "job_id": job.id,
        "block_id": block_id,
        "status": job.status,
        "current_step": job.current_step,
        "timeout_sec": JOB_TIMEOUT_SEC,
        "message": "Analysis job started. Poll GET /api/v1/analysis/jobs/{id} for named stages.",
        "progress_note": (
            "progress_pct is an ordinal stage index, not reconstruction completeness."
        ),
    }


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    summary = None
    if job.result_summary:
        try:
            summary = json.loads(job.result_summary)
        except json.JSONDecodeError:
            summary = {"raw": job.result_summary}
    return {
        "id": job.id,
        "block_id": job.block_id,
        "status": job.status,
        "current_step": job.current_step,
        "progress_pct": job.progress_pct,
        "progress_note": "Ordinal processing stage, not a completeness or accuracy percentage.",
        "error_message": job.error_message,
        "result_summary": summary,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/")
async def list_jobs(block_id: int | None = None, db: AsyncSession = Depends(get_db)):
    query = select(AnalysisJob).order_by(AnalysisJob.created_at.desc())
    if block_id is not None:
        query = query.where(AnalysisJob.block_id == block_id)
    result = await db.execute(query)
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "block_id": j.block_id,
            "status": j.status,
            "current_step": j.current_step,
            "progress_pct": j.progress_pct,
            "error_message": j.error_message,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]
