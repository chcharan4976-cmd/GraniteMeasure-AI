"""API routes for Stone Damage Intelligence, Cavity Analysis, and Damage Prevention Advisor."""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import GraniteBlock, BlockImage, CalibrationResult, AnalysisJob
from app.models.defect import DefectResult
from app.ai.damage_analyzer import StoneDamageAnalyzer
from app.api.blocks import _resolve_block_obj

router = APIRouter(prefix="/api/v1/damage", tags=["Damage Intelligence"])


@router.post("/analyze-image/{image_id}")
async def analyze_image_damage(image_id: int, db: AsyncSession = Depends(get_db)):
    """Detect surface cavities, cracks, and chips in a single captured photo."""
    img_res = await db.execute(select(BlockImage).where(BlockImage.id == image_id))
    image = img_res.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Resolve image path
    storage_dir = Path(__file__).resolve().parents[2] / "storage"
    candidates = [
        Path(image.file_path),
        storage_dir / "uploads" / f"{image.id}.bin",
        storage_dir / "uploads" / Path(image.file_path).name,
        storage_dir / image.file_path,
    ]
    img_path = next((str(p) for p in candidates if p.is_file()), None)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image file not present on storage volume")

    # Get calibration scale if session exists
    cal_res = await db.execute(
        select(CalibrationResult).where(CalibrationResult.session_id == image.session_id)
    )
    calib = cal_res.scalars().first()
    scale = calib.scale_px_per_cm if (calib and calib.marker_detected) else None

    result = StoneDamageAnalyzer.analyze_image(img_path, scale_px_per_cm=scale)
    result["image_id"] = image.id
    result["block_id"] = image.block_id
    return result


@router.post("/block/{block_id}/analyze")
async def analyze_block_damage(block_id: str, db: AsyncSession = Depends(get_db)):
    """Run comprehensive Stone Damage Intelligence across all photos of a block."""
    block = await _resolve_block_obj(block_id, db)
    if not block:
        raise HTTPException(status_code=404, detail=f"Granite block '{block_id}' not found")

    # Fetch images
    img_res = await db.execute(
        select(BlockImage).where(BlockImage.block_id == block.id).order_by(BlockImage.sequence_number)
    )
    images = img_res.scalars().all()
    if not images:
        raise HTTPException(status_code=400, detail="No photographic evidence registered for block")

    # Fetch calibration
    cal_res = await db.execute(
        select(CalibrationResult)
        .where(CalibrationResult.session_id == images[0].session_id)
        .order_by(CalibrationResult.created_at.desc())
    )
    calib = cal_res.scalars().first()
    scale = calib.scale_px_per_cm if (calib and calib.marker_detected) else None

    storage_dir = Path(__file__).resolve().parents[2] / "storage"
    aggregated_defects = []
    prevention_recommendations = []

    for img in images:
        candidates = [
            Path(img.file_path),
            storage_dir / "uploads" / f"{img.id}.bin",
            storage_dir / "uploads" / Path(img.file_path).name,
            storage_dir / img.file_path,
        ]
        img_path = next((str(p) for p in candidates if p.is_file()), None)
        if not img_path:
            continue

        analysis = StoneDamageAnalyzer.analyze_image(img_path, scale_px_per_cm=scale)
        if analysis.get("success"):
            for defect in analysis.get("defects", []):
                defect["image_id"] = img.id
                aggregated_defects.append(defect)

                # Persist to DefectResult ORM table if not already saved
                existing = await db.execute(
                    select(DefectResult).where(
                        DefectResult.block_id == str(block_id),
                        DefectResult.location_description == defect.get("location_description"),
                    )
                )
                if not existing.scalar_one_or_none():
                    orm_defect = DefectResult(
                        block_id=str(block_id),
                        defect_type=defect.get("defect_type", "CAVITY"),
                        severity=defect.get("severity", "MEDIUM"),
                        description=defect.get("notes") or defect.get("depth_warning") or "Surface anomaly",
                        location_description=defect.get("location_description"),
                        image_id=str(img.id),
                        bounding_box_json=json.dumps(defect.get("bounding_box", {})),
                        affects_cutting=defect.get("affects_cutting", False),
                        notes=json.dumps({
                            "opening_width_cm": defect.get("opening_width_cm"),
                            "opening_length_cm": defect.get("opening_length_cm"),
                            "opening_area_cm2": defect.get("opening_area_cm2"),
                            "depth_status": defect.get("depth_status"),
                            "estimated_depth_cm": defect.get("estimated_depth_cm"),
                            "depth_warning": defect.get("depth_warning"),
                        }),
                    )
                    db.add(orm_defect)

            for rec in analysis.get("prevention_advisor", []):
                if rec not in prevention_recommendations:
                    prevention_recommendations.append(rec)

    await db.commit()

    return {
        "block_id": block_id,
        "total_images_analyzed": len(images),
        "total_defects_found": len(aggregated_defects),
        "defects": aggregated_defects,
        "damage_prevention_advisor": prevention_recommendations,
        "depth_measurement_policy": (
            "Metric physical depth is marked UNAVAILABLE for single-view 2D images. "
            "Depths are only derived when multi-view triangulation or physical gauges confirm depth."
        ),
    }


@router.get("/block/{block_id}/report")
async def get_block_damage_report(block_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full Stone Damage Intelligence report for a block."""
    block = await _resolve_block_obj(block_id, db)
    if not block:
        raise HTTPException(status_code=404, detail=f"Granite block '{block_id}' not found")

    def_res = await db.execute(
        select(DefectResult).where(
            (DefectResult.block_id == str(block.id)) | (DefectResult.block_id == block.identifier)
        )
    )
    defects = def_res.scalars().all()

    # Determine analysis job status
    job_res = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.block_id == block.id)
        .order_by(AnalysisJob.created_at.desc())
        .limit(1)
    )
    latest_job = job_res.scalar_one_or_none()

    formatted = []
    total_missing_volume_cm3 = 0.0

    for d in defects:
        details = {}
        if d.notes:
            try:
                details = json.loads(d.notes)
            except Exception:
                details = {}

        formatted.append({
            "id": d.id,
            "defect_type": d.defect_type,
            "severity": d.severity,
            "description": d.description,
            "location_description": d.location_description,
            "image_id": d.image_id,
            "bounding_box": json.loads(d.bounding_box_json) if d.bounding_box_json else None,
            "affects_cutting": d.affects_cutting,
            "is_confirmed": d.is_confirmed,
            "opening_width_cm": details.get("opening_width_cm"),
            "opening_length_cm": details.get("opening_length_cm"),
            "opening_area_cm2": details.get("opening_area_cm2"),
            "depth_status": details.get("depth_status", "UNAVAILABLE_SINGLE_VIEW"),
            "estimated_depth_cm": details.get("estimated_depth_cm"),
            "depth_warning": details.get("depth_warning"),
        })

    # If no defects persisted, run lightweight static analysis
    advisor = StoneDamageAnalyzer._generate_damage_prevention_recommendations(formatted)

    if latest_job is None and len(formatted) == 0:
        analysis_status = "NOT_RUN"
    elif latest_job and latest_job.status in ("PENDING", "VALIDATING", "CALIBRATING", "FEATURE_MATCHING", "RECONSTRUCTING", "SCALING", "MEASURING", "PERSISTING"):
        analysis_status = "IN_PROGRESS"
    elif latest_job and latest_job.status == "FAILED":
        analysis_status = "FAILED"
    else:
        analysis_status = "COMPLETED"

    return {
        "block_id": block.id,
        "block_identifier": block.identifier,
        "analysis_status": analysis_status,
        "job_id": latest_job.id if latest_job else None,
        "current_step": latest_job.current_step if latest_job else None,
        "error_message": latest_job.error_message if latest_job else None,
        "total_defects": len(formatted),
        "defects": formatted,
        "total_missing_volume_cm3": total_missing_volume_cm3,
        "prevention_advisor": advisor,
        "accuracy_statement": (
            "Cavity surface areas are photogrammetrically scaled via ArUco reference markers. "
            "Physical depth is strictly withheld when only single-perspective 2D imagery is available. "
            "Structural integrity assessment applies solely to processed visible surfaces."
        ),
    }
