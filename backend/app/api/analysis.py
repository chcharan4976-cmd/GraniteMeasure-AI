import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.database import get_db, SessionLocal
from app.models import AnalysisJob, GraniteBlock, BlockImage, CaptureSession, MeasurementResult, AuditLog
from app.services.measurement import MeasurementEngine

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])


async def run_analysis_job(job_id: int):
    """Background task to run measurement analysis."""
    async with SessionLocal() as db:
        try:
            # Get job
            result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                return

            # Update status
            job.status = "VALIDATING"
            job.current_step = "Validating images"
            job.progress_pct = 10
            await db.commit()

            # Get images for this block
            img_result = await db.execute(
                select(BlockImage).where(BlockImage.block_id == job.block_id)
            )
            images = img_result.scalars().all()

            if not images:
                job.status = "FAILED"
                job.error_message = "No images found for this block"
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

            # Feature matching
            job.current_step = "Feature matching"
            job.progress_pct = 30
            await db.commit()

            # Run measurement engine
            engine = MeasurementEngine()
            image_paths = [img.file_path for img in images]

            job.current_step = "Measuring dimensions"
            job.progress_pct = 60
            await db.commit()

            measurement_data = engine.estimate_dimensions(image_paths)

            job.current_step = "Saving results"
            job.progress_pct = 90
            await db.commit()

            # Save measurement result
            measurement = MeasurementResult(
                block_id=job.block_id,
                job_id=job.id,
                length_cm=measurement_data.get("length_cm"),
                breadth_cm=measurement_data.get("breadth_cm"),
                height_cm=measurement_data.get("height_cm"),
                volume_m3=measurement_data.get("volume_m3"),
                weight_mt=measurement_data.get("weight_mt"),
                confidence=measurement_data.get("confidence", 0),
                status=measurement_data.get("status", "FAILED"),
                calibration_status=measurement_data.get("calibration_status", "NOT_CALIBRATED"),
                measurement_type=measurement_data.get("measurement_type", "NONE"),
                reconstructed_points=measurement_data.get("reconstructed_points"),
                usable_images=measurement_data.get("usable_images"),
                warnings=json.dumps(measurement_data.get("warnings", [])),
                details=json.dumps(measurement_data),
                created_at=datetime.now(timezone.utc),
            )
            db.add(measurement)

            # Update block status
            block_result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == job.block_id))
            block = block_result.scalar_one_or_none()
            if block:
                if measurement_data.get("status") == "MEASURED":
                    block.status = "MEASURED"
                elif measurement_data.get("status") in ("ESTIMATED", "PARTIAL"):
                    block.status = "MEASURED"
                else:
                    block.status = "FAILED"

            # Complete job
            job.status = "COMPLETED"
            job.current_step = "Complete"
            job.progress_pct = 100
            job.completed_at = datetime.now(timezone.utc)
            job.result_summary = json.dumps({
                "status": measurement_data.get("status"),
                "length_cm": measurement_data.get("length_cm"),
                "breadth_cm": measurement_data.get("breadth_cm"),
                "height_cm": measurement_data.get("height_cm"),
                "confidence": measurement_data.get("confidence"),
            })

            # Audit
            audit = AuditLog(
                action="ANALYSIS_COMPLETED",
                entity_type="AnalysisJob",
                entity_id=job.id,
                details=f"Analysis completed for block {job.block_id}: {measurement_data.get('status')}",
                timestamp=datetime.now(timezone.utc),
            )
            db.add(audit)
            await db.commit()

        except Exception as e:
            # Mark job as failed
            try:
                result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
                job = result.scalar_one_or_none()
                if job:
                    job.status = "FAILED"
                    job.error_message = str(e)
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
    """Start an analysis job for a block."""
    # Verify block exists
    result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Create job
    job = AnalysisJob(
        block_id=block_id,
        status="PENDING",
        current_step="Queued",
        progress_pct=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(job)

    # Update block status
    block.status = "ANALYZING"

    await db.commit()
    await db.refresh(job)

    # Start background analysis
    background_tasks.add_task(run_analysis_job, job.id)

    return {
        "job_id": job.id,
        "block_id": block_id,
        "status": job.status,
        "message": "Analysis job started",
    }


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Get analysis job status."""
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.id,
        "block_id": job.block_id,
        "status": job.status,
        "current_step": job.current_step,
        "progress_pct": job.progress_pct,
        "error_message": job.error_message,
        "result_summary": json.loads(job.result_summary) if job.result_summary else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """List all analysis jobs."""
    result = await db.execute(select(AnalysisJob).order_by(AnalysisJob.created_at.desc()))
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "block_id": j.block_id,
            "status": j.status,
            "progress_pct": j.progress_pct,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]
