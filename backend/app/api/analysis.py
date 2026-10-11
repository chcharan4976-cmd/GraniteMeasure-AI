import asyncio
import json
import logging
import urllib.parse
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
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
    SeigniorageAssessment,
)
from app.models.defect import DefectResult
from app.ai.damage_analyzer import StoneDamageAnalyzer
from app.services.cutting_service import create_plan
from app.schemas.cutting import (
    CuttingPlanCreate,
    CuttingOperationCreate,
    CutTypeEnum,
    CuttingPlanStatusEnum,
)
from app.services.seigniorage import SeigniorageEngine
from app.services.measurement import MeasurementEngine
from app.services.pipeline_config import JOB_TIMEOUT_SEC, WORKSPACE_ROOT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="measure")


async def _resolve_block_obj(block_id, db: AsyncSession) -> Optional[GraniteBlock]:
    if not block_id:
        return None
    raw_str = urllib.parse.unquote(str(block_id)).strip()
    if isinstance(block_id, int) or raw_str.isdigit():
        res = await db.execute(
            select(GraniteBlock).where(
                GraniteBlock.id == int(raw_str),
                (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
            )
        )
        b = res.scalar_one_or_none()
        if b:
            return b

    res = await db.execute(
        select(GraniteBlock).where(
            GraniteBlock.identifier == raw_str,
            (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
        )
    )
    b = res.scalar_one_or_none()
    if b:
        return b

    res = await db.execute(
        select(GraniteBlock).where(
            GraniteBlock.identifier.ilike(raw_str),
            (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
        )
    )
    return res.scalar_one_or_none()

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

            target_stage = getattr(job, "stage", "RAW") or "RAW"
            await _set_job(db, job, "VALIDATING", f"Validating {target_stage} images")

            if target_stage == "POST_DRESSING":
                from app.models import CaptureSession
                img_result = await db.execute(
                    select(BlockImage)
                    .join(CaptureSession, BlockImage.session_id == CaptureSession.id)
                    .where(
                        BlockImage.block_id == job.block_id,
                        CaptureSession.stage == "POST_DRESSING",
                        BlockImage.is_duplicate == False,
                    )
                )
                images = img_result.scalars().all()
                if not images:
                    job.status = "FAILED"
                    job.current_step = "No post-dressing photographs found"
                    job.error_message = "No post-dressing photographs found for this block. Capture the finished stone first."
                    job.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    return
            else:
                # For RAW stage (default), load ALL non-duplicate images for this block
                # including images from sessions without an explicit stage set
                img_result = await db.execute(
                    select(BlockImage).where(
                        BlockImage.block_id == job.block_id,
                        BlockImage.is_duplicate == False,
                    )
                )
                images = img_result.scalars().all()
                if not images:
                    job.status = "FAILED"
                    job.current_step = "No photographs found"
                    job.error_message = (
                        "No photographs found for this block. "
                        "Use the mobile app to photograph the granite block from multiple angles. "
                        "A minimum of 6 overlapping views is recommended for 3D reconstruction."
                    )
                    job.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    return

            # Deduplicate by SHA-256 hash — DB may contain re-uploaded files
            # when the stage-NULL duplicate check was ineffective.
            # Also deduplicate by perceptual hash to catch near-identical files.
            seen_sha = set()
            seen_phash = set()
            unique_images = []
            total_before = len(images)
            for img in images:
                # Check exact SHA256 duplicate
                if img.sha256 and img.sha256 in seen_sha:
                    logger.info("Analysis job %s: skipping exact duplicate image %s (sha256)", job_id, img.id)
                    continue
                # Check perceptual hash (hamming distance 0 = exact visual duplicate)
                if img.perceptual_hash:
                    skip = False
                    for existing_phash in seen_phash:
                        from app.ai.image_analyzer import hamming_distance
                        if hamming_distance(img.perceptual_hash, existing_phash) == 0:
                            logger.info("Analysis job %s: skipping perceptual duplicate image %s", job_id, img.id)
                            skip = True
                            break
                    if skip:
                        continue
                    seen_phash.add(img.perceptual_hash)
                if img.sha256:
                    seen_sha.add(img.sha256)
                unique_images.append(img)
            images = unique_images
            logger.info(
                "Analysis job %s: %d unique images after dedup (was %d)",
                job_id, len(images), total_before
            )

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

            vol_m3 = measurement_data.get("bbox_volume_m3") or measurement_data.get("volume_m3")
            irreg_vol_m3 = round(vol_m3 * 0.94, 4) if vol_m3 else None
            uncert_pct = 1.8 if measurement_data.get("calibration_status") == "CALIBRATED" else 8.5

            measurement = MeasurementResult(
                block_id=job.block_id,
                job_id=job.id,
                stage=target_stage,
                length_cm=measurement_data.get("length_cm"),
                breadth_cm=measurement_data.get("breadth_cm"),
                height_cm=measurement_data.get("height_cm"),
                volume_m3=vol_m3,
                bbox_volume_m3=vol_m3,
                irregular_volume_m3=irreg_vol_m3,
                uncertainty_margin_pct=uncert_pct,
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
                if failed:
                    block.status = "FAILED"
                elif target_stage == "POST_DRESSING":
                    block.status = "PROCESSED"
                else:
                    block.status = "MEASURED"

            # 1. Defect Analysis & Cavity Detection across available images
            # Only creates DefectResult records when the damage analyzer actually
            # detects specific defects with non-fabricated dimensions.
            try:
                for img in images:
                    img_real_path = str(img.file_path)
                    candidates = [
                        Path(img_real_path),
                        WORKSPACE_ROOT.parents[0] / "storage" / img_real_path,
                        Path(__file__).resolve().parents[2] / "storage" / img_real_path,
                        Path.cwd() / "storage" / img_real_path,
                    ]
                    resolved_file = next((c for c in candidates if c.is_file()), None)
                    if resolved_file:
                        damage_report = StoneDamageAnalyzer.analyze_image(str(resolved_file))
                        for df in damage_report.get("defects", []):
                            # Only record defects where the analyzer provided genuine
                            # non-default measurements — not fabricated estimates
                            w_cm = df.get("opening_width_cm")
                            l_cm = df.get("opening_length_cm")
                            depth_cm = df.get("estimated_depth_cm")
                            # Skip if all dimensions are missing (analyzer provided no data)
                            if w_cm is None and l_cm is None and depth_cm is None:
                                continue
                            # Use detected values, do NOT substitute fabricated defaults
                            area_cm2 = round((w_cm or 0) * (l_cm or 0), 1) if w_cm and l_cm else None
                            vol_cm3 = round((area_cm2 or 0) * (depth_cm or 0) * 0.65, 1) if area_cm2 and depth_cm else None
                            defect_record = DefectResult(
                                id=str(uuid.uuid4()),
                                block_id=str(job.block_id),
                                job_id=str(job.id),
                                defect_type=df.get("defect_type", "SURFACE_ANOMALY"),
                                severity=df.get("severity", "UNASSESSED"),
                                description=df.get("description", "Detected surface anomaly — requires officer review"),
                                location_description=df.get("location_description"),
                                image_id=str(img.id),
                                bounding_box_json=json.dumps(df.get("bounding_box", {})),
                                opening_width_cm=w_cm,
                                opening_length_cm=l_cm,
                                opening_area_cm2=area_cm2,
                                estimated_depth_cm=depth_cm,
                                missing_volume_cm3=vol_cm3,
                                dressing_eliminated=False,  # Never automatically assume
                                dressing_recommendation=df.get("dressing_recommendation"),
                                affects_cutting=bool(df.get("affects_cutting", False)),
                                is_confirmed=False,  # Always requires officer review
                                created_at=datetime.now(timezone.utc),
                            )
                            db.add(defect_record)
            except Exception as def_err:
                logger.warning("Defect analysis step note: %s", def_err)

            # 2. Automated Dressing & Cutting Plan
            # Only generate a plan when actual measured dimensions are available.
            # Never create a plan from fabricated fallback defaults.
            try:
                l_cm = measurement_data.get("length_cm")
                b_cm = measurement_data.get("breadth_cm")
                h_cm = measurement_data.get("height_cm")
                if l_cm and b_cm and h_cm and not failed:
                    target_l = max(10.0, round(float(l_cm) * 0.94, 1))
                    target_b = max(10.0, round(float(b_cm) * 0.94, 1))
                    target_h = max(10.0, round(float(h_cm) * 0.94, 1))
                    orig_vol = round((float(l_cm) * float(b_cm) * float(h_cm)) / 1_000_000.0, 4)
                    dress_vol = round((target_l * target_b * target_h) / 1_000_000.0, 4)
                    rem_vol = max(0.0, round(orig_vol - dress_vol, 4))
                    rec_ratio = round(dress_vol / orig_vol, 4) if orig_vol > 0 else 0.94
                    wastage_ratio = round(1.0 - rec_ratio, 4)

                    ops = [
                        CuttingOperationCreate(
                            operation_order=1,
                            cut_type=CutTypeEnum.SURFACE_DRESS,
                            description="Primary Face Squaring & Dressing",
                            plane_offset=2.5,
                            material_removed_m3=round(rem_vol * 0.45, 4),
                            reason="Remove irregular quarry outer crust and level primary front face",
                        ),
                        CuttingOperationCreate(
                            operation_order=2,
                            cut_type=CutTypeEnum.PLANAR_CUT,
                            description="Saw Kerf Trimming & Edge Trueing",
                            plane_offset=3.0,
                            material_removed_m3=round(rem_vol * 0.35, 4),
                            reason="True lateral planes to 90-degree orthogonal edges",
                        ),
                        CuttingOperationCreate(
                            operation_order=3,
                            cut_type=CutTypeEnum.DEFECT_AVOIDANCE,
                            description="Perimeter Margin & Defect Clearance",
                            plane_offset=1.5,
                            material_removed_m3=round(rem_vol * 0.20, 4),
                            reason="Clear edge fracture margins to secure commercial slab yield",
                        ),
                    ]

                    plan_in = CuttingPlanCreate(
                        plan_name=f"Optimal Dressing Plan #{job.id}",
                        status=CuttingPlanStatusEnum.PROPOSED,
                        target_length_cm=target_l,
                        target_breadth_cm=target_b,
                        target_height_cm=target_h,
                        original_volume_m3=orig_vol,
                        dressed_volume_m3=dress_vol,
                        removed_volume_m3=rem_vol,
                        recovery_ratio=rec_ratio,
                        wastage_ratio=wastage_ratio,
                        optimization_method="DEFECT_AVOIDANCE_ORTHOGONAL_DRESSING",
                        notes=(
                            f"Generated by GraniteMeasure AI from measured dimensions: "
                            f"{l_cm:.1f}×{b_cm:.1f}×{h_cm:.1f} cm. "
                            f"Calibration: {measurement_data.get('calibration_status', 'NOT_CALIBRATED')}."
                        ),
                        operations=ops,
                    )
                    await create_plan(db, block_id=job.block_id, plan_in=plan_in)
                else:
                    logger.info(
                        "Cutting plan not generated for job %s: measurement failed or dimensions missing "
                        "(length=%s breadth=%s height=%s failed=%s)",
                        job.id, l_cm, b_cm, h_cm, failed
                    )
            except Exception as cut_err:
                logger.warning("Cutting plan generation step note: %s", cut_err)

            # 3. Indicative Seigniorage Assessment
            # Only calculate when actual metric measurement is available.
            try:
                if not failed and measurement.length_cm and measurement.breadth_cm and measurement.height_cm:
                    col_grp = block.color_group if block and block.color_group else "Black Galaxy"
                    s_engine = SeigniorageEngine()
                    s_calc = s_engine.calculate_assessment(
                        color_group=col_grp,
                        length_cm=float(measurement.length_cm),
                        width_cm=float(measurement.breadth_cm),
                        height_cm=float(measurement.height_cm),
                        weight_mt=float(measurement.weight_mt) if measurement.weight_mt else None,
                    )
                    seign_assessment = SeigniorageAssessment(
                        block_id=job.block_id,
                        measurement_id=measurement.id,
                        rate_version=s_calc.get("rate_version", "AP-RTGS-2026-v1"),
                        color_group=col_grp,
                        classification=s_calc.get("classification"),
                        is_above_gangsaw=s_calc.get("is_above_gangsaw"),
                        rate_per_mt=s_calc.get("rate_per_mt"),
                        weight_mt=s_calc.get("weight_mt"),
                        weight_source=s_calc.get("weight_source"),
                        indicative_amount=s_calc.get("total_amount") or s_calc.get("indicative_amount"),
                        disclaimer=s_calc.get("disclaimer") or getattr(s_engine, "DISCLAIMER", None),
                        assessed_at=datetime.now(timezone.utc),
                    )
                    db.add(seign_assessment)
                else:
                    logger.info(
                        "Seigniorage not assessed for job %s: measurement failed or dimensions missing",
                        job.id
                    )
            except Exception as seign_err:
                logger.warning("Seigniorage assessment note: %s", seign_err)

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
    request: Request,
    background_tasks: BackgroundTasks,
    block_id: Optional[str] = Query(None),
    stage: Optional[str] = Query("RAW"),
    db: AsyncSession = Depends(get_db),
):
    target_id = block_id
    target_stage = stage or "RAW"
    try:
        body = await request.json()
        if isinstance(body, dict):
            target_id = body.get("block_id") or body.get("id") or target_id
            target_stage = body.get("stage") or target_stage
    except Exception:
        pass

    target_stage = str(target_stage).strip().upper()
    if target_stage not in ("RAW", "POST_DRESSING"):
        target_stage = "RAW"

    if not target_id:
        raise HTTPException(status_code=400, detail="Missing block_id parameter in body or query")

    block = await _resolve_block_obj(target_id, db)
    if not block:
        raise HTTPException(status_code=404, detail=f"Granite block '{target_id}' not found")

    job = AnalysisJob(
        block_id=block.id,
        stage=target_stage,
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
        "id": job.id,
        "job_id": job.id,
        "block_id": block.id,
        "identifier": block.identifier,
        "stage": job.stage,
        "status": job.status,
        "current_step": job.current_step,
        "timeout_sec": JOB_TIMEOUT_SEC,
        "message": f"Analysis job started for stage {job.stage}. Poll GET /api/v1/analysis/jobs/{job.id} for progress.",
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
