from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import hashlib
import uuid
import json
import urllib.parse
import logging
import cv2
import numpy as np

from app.database import get_db
from app.models import CaptureSession, BlockImage, GraniteBlock, ImageQualityResult
from app.ai.image_analyzer import analyze_image, compute_dhash, hamming_distance
from app.ai.granite_validator import validate_granite_evidence
from app.services.watermark_service import extract_exif_metadata, generate_evidence_watermark

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/capture", tags=["Capture"])

BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
RESULTS_DIR = STORAGE_DIR / "results"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB ceiling


async def _resolve_block(block_identifier, db: AsyncSession) -> Optional[GraniteBlock]:
    """Helper to find a GraniteBlock strictly by integer ID or string identifier."""
    if not block_identifier:
        return None

    raw_str = urllib.parse.unquote(str(block_identifier)).strip()

    # Try numeric ID
    if isinstance(block_identifier, int) or raw_str.isdigit():
        res = await db.execute(
            select(GraniteBlock).where(
                GraniteBlock.id == int(raw_str),
                (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
            )
        )
        block = res.scalar_one_or_none()
        if block:
            return block

    # Try string identifier
    res = await db.execute(
        select(GraniteBlock).where(
            GraniteBlock.identifier == raw_str,
            (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
        )
    )
    b = res.scalar_one_or_none()
    if b:
        return b

    # Case-insensitive
    res = await db.execute(
        select(GraniteBlock).where(
            GraniteBlock.identifier.ilike(raw_str),
            (GraniteBlock.is_deleted == False) | (GraniteBlock.is_deleted.is_(None)),
        )
    )
    return res.scalar_one_or_none()


@router.post("/sessions")
async def create_session(
    request: Request,
    block_id: Optional[str] = Query(None),
    officer_name: Optional[str] = Query(None),
    stage: Optional[str] = Query("RAW"),
    db: AsyncSession = Depends(get_db),
):
    """Create a new capture session for a block. Supports stage ('RAW' or 'POST_DRESSING')."""
    body_data = {}
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body_data = await request.json()
    except Exception:
        pass

    target_block_id = body_data.get("block_id") or block_id
    officer = body_data.get("officer_name") or officer_name or "Mining Officer"
    target_stage = (body_data.get("stage") or stage or "RAW").strip().upper()
    if target_stage not in ("RAW", "POST_DRESSING"):
        target_stage = "RAW"

    if not target_block_id:
        raise HTTPException(status_code=400, detail="block_id is required")

    block = await _resolve_block(target_block_id, db)
    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{target_block_id}' not found")

    session = CaptureSession(
        block_id=block.id,
        officer_name=officer,
        stage=target_stage,
        status="IN_PROGRESS",
        image_count=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(session)

    # Update block status
    if target_stage == "POST_DRESSING":
        block.status = "DRESSING_CAPTURED"
    else:
        block.status = "CAPTURING"
    await db.commit()
    await db.refresh(session)

    return {
        "id": session.id,
        "session_id": session.id,
        "block_id": block.id,
        "block_identifier": block.identifier,
        "stage": session.stage,
        "status": session.status,
        "created_at": session.created_at.isoformat(),
    }


@router.get("/sessions")
async def list_sessions(
    block_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List capture sessions, optionally filtered by block."""
    query = select(CaptureSession).order_by(CaptureSession.created_at.desc())
    if block_id:
        block = await _resolve_block(block_id, db)
        if block:
            query = query.where(CaptureSession.block_id == block.id)

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "block_id": str(s.block_id),
            "officer_name": s.officer_name,
            "status": s.status,
            "image_count": s.image_count or 0,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions
    ]


def normalize_to_jpeg_bytes(raw_bytes: bytes) -> bytes:
    """Normalizes any incoming photo (including Apple HEIC/HEIF, PNG, WebP) into standard RGB JPEG."""
    if not raw_bytes:
        return raw_bytes
    if raw_bytes.startswith(b"\xff\xd8\xff"):
        return raw_bytes  # Already standard JPEG
    try:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            pass
        from PIL import Image, ImageOps
        import io
        with Image.open(io.BytesIO(raw_bytes)) as im:
            try:
                im = ImageOps.exif_transpose(im)
            except Exception:
                pass
            rgb = im.convert("RGB")
            out = io.BytesIO()
            rgb.save(out, format="JPEG", quality=95)
            return out.getvalue()
    except Exception as e:
        logger.warning(f"Image normalization note: {e}")
        return raw_bytes


@router.post("/validate-granite")
async def validate_granite_image(
    file: UploadFile = File(...),
):
    """
    Evaluates whether an image contains authentic granite block evidence.
    Rejects selfies, documents, vehicles, screenshots, and unrelated objects.
    """
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Empty image uploaded")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds 25 MB limit")

    content = normalize_to_jpeg_bytes(content)
    result = validate_granite_evidence(content)
    return result


@router.post("/sessions/{session_id}/images")
async def upload_image(
    session_id: str,
    file: UploadFile = File(...),
    sequence_number: Optional[int] = Query(None),
    form_sequence: Optional[int] = Form(None),
    view_label: Optional[str] = Form("UNSPECIFIED"),
    gps_latitude: Optional[float] = Form(None),
    gps_longitude: Optional[float] = Form(None),
    gps_accuracy_m: Optional[float] = Form(None),
    captured_at: Optional[str] = Form(None),
    capture_source: Optional[str] = Form("CAMERA"),
    q_gps_lat: Optional[float] = Query(None),
    q_gps_lng: Optional[float] = Query(None),
    force_accept: Optional[bool] = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image to a capture session with automatic quality, duplicate rejection, and relevance analysis."""
    seq_num = form_sequence if form_sequence is not None else (sequence_number if sequence_number is not None else 0)

    # Read image contents first for validation
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds 25 MB limit")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Normalize image to standard JPEG for universal cross-platform compatibility
    content = normalize_to_jpeg_bytes(content)

    # Granite Evidence Validation (Rejects selfies, paperwork, synthetic graphics)
    validation = validate_granite_evidence(content)
    if validation.get("verdict") == "REJECTED_UNRELATED" and not force_accept:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "EVIDENCE_REJECTED_UNRELATED",
                "verdict": validation.get("verdict"),
                "message": validation.get("message_en"),
                "message_te": validation.get("message_te"),
                "reasons": validation.get("reasons", []),
            },
        )

    # Resolve session
    session = None
    if session_id.isdigit():
        res = await db.execute(select(CaptureSession).where(CaptureSession.id == int(session_id)))
        session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail=f"Capture session '{session_id}' not found")

    sha256 = hashlib.sha256(content).hexdigest()
    perceptual_hash = compute_dhash(content)

    # 1. Level A: Check EXACT DUPLICATE (cryptographic SHA-256) within this block
    dup_sha_query = await db.execute(
        select(BlockImage, CaptureSession)
        .join(CaptureSession, BlockImage.session_id == CaptureSession.id)
        .where(
            BlockImage.block_id == session.block_id,
            BlockImage.sha256 == sha256,
            BlockImage.is_duplicate == False,
        )
        .limit(1)
    )
    existing_sha_row = dup_sha_query.first()
    if existing_sha_row and not force_accept:
        existing_sha, existing_sess = existing_sha_row
        existing_sess_stage = (getattr(existing_sess, "stage", None) or "RAW").upper()
        current_stage = (session.stage or "RAW").upper()
        if current_stage == "POST_DRESSING" and existing_sess_stage != "POST_DRESSING":
            raise HTTPException(
                status_code=409,
                detail={
                    "error_code": "DUPLICATE_RAW_IMAGE_IN_POST_DRESSING",
                    "message_en": "Duplicate Photo — This image is identical to a photo already used in the RAW block session. A photograph already attached to the RAW session cannot silently become post-dressing evidence. Please capture genuine newly dressed granite photos.",
                    "message_te": "డూప్లికేట్ ఫోటో — ఈ ఫోటో ముడి గ్రానైట్ సెషన్‌లో ఇప్పటికే ఉపయోగించబడింది. దయచేసి డ్రెస్సింగ్ పూర్తయిన తాజా ఫోటోలను తీయండి.",
                    "existing_image_id": existing_sha.id,
                    "existing_sequence": existing_sha.sequence_number,
                    "sha256": sha256,
                },
            )
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "EXACT_DUPLICATE_IMAGE",
                "message_en": "Duplicate Photo — This image has already been added to this granite block.",
                "message_te": "ఈ ఫోటోను ఈ గ్రానైట్ రాయికి ఇప్పటికే జోడించారు.",
                "existing_image_id": existing_sha.id,
                "existing_sequence": existing_sha.sequence_number,
                "sha256": sha256,
            },
        )

    # 2. Level B: Check NEAR DUPLICATE (perceptual dHash, distance <= 4)
    # Compare against same stage. Treat NULL stage as RAW for comparison purposes.
    if perceptual_hash and not force_accept:
        current_stage = (session.stage or "RAW").upper()
        # Use coalesce-style comparison to handle NULL stages correctly
        from sqlalchemy import or_, and_
        if current_stage == "POST_DRESSING":
            stage_filter = CaptureSession.stage == "POST_DRESSING"
        else:
            # RAW or NULL: compare against all non-POST_DRESSING sessions
            stage_filter = or_(
                CaptureSession.stage == "RAW",
                CaptureSession.stage.is_(None),
                CaptureSession.stage.notin_(["POST_DRESSING"]),
            )
        prev_images_query = await db.execute(
            select(BlockImage)
            .join(CaptureSession, BlockImage.session_id == CaptureSession.id)
            .where(
                BlockImage.block_id == session.block_id,
                stage_filter,
                BlockImage.perceptual_hash.isnot(None),
                BlockImage.is_duplicate == False,
            )
        )
        prev_images = prev_images_query.scalars().all()
        for prev in prev_images:
            dist = hamming_distance(perceptual_hash, prev.perceptual_hash)
            if dist <= 4:
                sim_pct = round((64 - dist) / 64 * 100, 1)
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error_code": "NEAR_DUPLICATE_IMAGE",
                        "message_en": f"Near-Duplicate Photo — High visual similarity ({sim_pct}%) to existing photo #{prev.sequence_number}. Insufficient new perspective for 3D reconstruction. Please capture from a different angle or side.",
                        "message_te": f"దాదాపు ఒకేలాంటి ఫోటో — ఫోటో #{prev.sequence_number} తో {sim_pct}% పోలిక ఉంది. దయచేసి వేరే వైపు నుండి ఫోటో తీయండి.",
                        "existing_image_id": prev.id,
                        "existing_sequence": prev.sequence_number,
                        "hamming_distance": dist,
                        "similarity_pct": sim_pct,
                    },
                )

    # Resolve block to get block identifier and details
    block_res = await db.execute(select(GraniteBlock).where(GraniteBlock.id == session.block_id))
    block_obj = block_res.scalar_one_or_none()
    block_ident = block_obj.identifier if block_obj else f"BLK-{session.block_id}"

    # Extract or fallback GPS coordinates & capture timestamp
    final_lat = gps_latitude if gps_latitude is not None else q_gps_lat
    final_lng = gps_longitude if gps_longitude is not None else q_gps_lng
    final_acc = gps_accuracy_m
    final_captured_at = None
    if captured_at:
        try:
            final_captured_at = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
        except Exception:
            final_captured_at = None

    # Fallback to EXIF embedded in the image if client didn't supply coordinates or time
    exif_data = extract_exif_metadata(content)
    if final_lat is None and exif_data.get("gps_latitude") is not None:
        final_lat = exif_data.get("gps_latitude")
        final_lng = exif_data.get("gps_longitude")
    if final_captured_at is None and exif_data.get("captured_at") is not None:
        final_captured_at = exif_data.get("captured_at")
    if final_captured_at is None:
        final_captured_at = datetime.now(timezone.utc)

    # Generate persistent paths
    image_uuid = uuid.uuid4().hex
    raw_file_name = f"{image_uuid}.jpg"
    file_path = UPLOAD_DIR / raw_file_name
    file_path.write_bytes(content)

    # Generate official non-destructive evidence watermark derivative plate
    annotated_rel_path = None
    try:
        img_np = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        if img_np is not None:
            watermarked_np = generate_evidence_watermark(
                image_bgr=img_np,
                block_identifier=block_ident,
                captured_at=final_captured_at,
                gps_latitude=final_lat,
                gps_longitude=final_lng,
                gps_accuracy_m=final_acc,
                capture_source=capture_source or "CAMERA",
                evidence_id=f"EVD-{image_uuid[:6].upper()}",
            )
            watermark_filename = f"{image_uuid}_watermark.jpg"
            watermark_file_path = RESULTS_DIR / watermark_filename
            cv2.imwrite(str(watermark_file_path), watermarked_np, [cv2.IMWRITE_JPEG_QUALITY, 92])
            annotated_rel_path = f"results/{watermark_filename}"
    except Exception as wm_err:
        logger.warning(f"Watermark derivative generation note: {wm_err}")

    # Analyze image quality & ArUco markers
    try:
        quality = analyze_image(content)
        annotated_bytes = quality.pop("annotated_image_bytes", None)
        if annotated_bytes and not annotated_rel_path:
            annotated_path = RESULTS_DIR / f"{image_uuid}_annotated.jpg"
            annotated_path.write_bytes(annotated_bytes)
            annotated_rel_path = f"results/{image_uuid}_annotated.jpg"
    except Exception as e:
        quality = {
            "quality_status": "REVIEW_REQUIRED",
            "warnings": [f"Image analysis note: {str(e)}"],
            "blur_score": 75.0,
            "brightness": 128.0,
            "contrast": 60.0,
            "image_width": 1920,
            "image_height": 1080,
            "marker_count": 0,
            "detected_markers": [],
        }

    # Store in database
    block_image = BlockImage(
        session_id=session.id,
        block_id=session.block_id,
        file_path=f"uploads/{raw_file_name}",
        original_filename=file.filename or f"capture_{seq_num}.jpg",
        sha256=sha256,
        perceptual_hash=perceptual_hash,
        view_label=view_label or "UNSPECIFIED",
        file_size=len(content),
        image_width=quality.get("image_width", 1920),
        image_height=quality.get("image_height", 1080),
        sequence_number=seq_num,
        uploaded_at=datetime.now(timezone.utc),
        gps_latitude=final_lat,
        gps_longitude=final_lng,
        gps_accuracy_m=final_acc,
        captured_at=final_captured_at,
        capture_source=capture_source or "CAMERA",
        annotated_path=annotated_rel_path,
    )
    db.add(block_image)

    session.image_count = (session.image_count or 0) + 1

    await db.commit()
    await db.refresh(block_image)

    # Store quality result
    warnings_payload = {
        "warnings": quality.get("warnings", []),
        "granite_verdict": validation.get("verdict", "ACCEPTED_GRANITE_BLOCK"),
        "granite_score": validation.get("granite_score", 0.9),
    }
    quality_result = ImageQualityResult(
        image_id=block_image.id,
        is_pass=quality.get("quality_status") == "PASS",
        blur_score=quality.get("blur_score"),
        brightness=quality.get("brightness"),
        contrast=quality.get("contrast"),
        resolution_ok=quality.get("image_width", 0) >= 640,
        warnings=json.dumps(warnings_payload),
        analyzed_at=datetime.now(timezone.utc),
    )
    db.add(quality_result)
    await db.commit()

    evidence_id = f"EVD-{block_image.id:04d}"
    watermarked_url = f"/storage/{annotated_rel_path}" if annotated_rel_path else f"/storage/uploads/{raw_file_name}"

    return {
        "image_id": block_image.id,
        "evidence_id": evidence_id,
        "view_label": view_label or "UNSPECIFIED",
        "file_id": image_uuid,
        "sha256": sha256,
        "sequence_number": seq_num,
        "gps_latitude": final_lat,
        "gps_longitude": final_lng,
        "gps_accuracy_m": final_acc,
        "captured_at": final_captured_at.isoformat() if final_captured_at else None,
        "capture_source": capture_source or "CAMERA",
        "quality": {
            "status": quality.get("quality_status", "PASS"),
            "blur_score": quality.get("blur_score", 85.0),
            "brightness": quality.get("brightness", 120.0),
            "contrast": quality.get("contrast", 55.0),
            "warnings": quality.get("warnings", []),
            "marker_count": quality.get("marker_count", 0),
            "markers": quality.get("detected_markers", []),
        },
        "validation": validation,
        "annotated_url": f"/api/v1/images/{block_image.id}/annotated",
        "watermarked_url": watermarked_url,
        "file_url": f"/storage/uploads/{raw_file_name}",
    }



@router.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get capture session details with image list, quality metrics, and granite validation verdicts."""
    session = None
    if session_id.isdigit():
        res = await db.execute(select(CaptureSession).where(CaptureSession.id == int(session_id)))
        session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    img_result = await db.execute(
        select(BlockImage).where(BlockImage.session_id == session.id).order_by(BlockImage.sequence_number)
    )
    images = img_result.scalars().all()

    image_list = []
    for img in images:
        q_res = await db.execute(
            select(ImageQualityResult)
            .where(ImageQualityResult.image_id == img.id)
            .order_by(ImageQualityResult.analyzed_at.desc())
            .limit(1)
        )
        quality_row = q_res.scalar_one_or_none()
        warnings = []
        granite_verdict = "ACCEPTED_GRANITE_BLOCK"
        granite_score = 0.92
        if quality_row and quality_row.warnings:
            try:
                parsed = json.loads(quality_row.warnings)
                if isinstance(parsed, dict):
                    warnings = parsed.get("warnings", [])
                    granite_verdict = parsed.get("granite_verdict", "ACCEPTED_GRANITE_BLOCK")
                    granite_score = parsed.get("granite_score", 0.92)
                elif isinstance(parsed, list):
                    warnings = parsed
            except Exception:
                warnings = [quality_row.warnings]

        watermarked_url = (
            f"/storage/{img.annotated_path}"
            if img.annotated_path
            else (f"/storage/{img.file_path}" if not img.file_path.startswith("/") else img.file_path)
        )
        image_list.append({
            "id": str(img.id),
            "evidence_id": f"EVD-{img.id:04d}",
            "sequence_number": img.sequence_number,
            "sha256": img.sha256,
            "file_size": img.file_size,
            "file_path": img.file_path,
            "file_url": f"/storage/{img.file_path}" if not img.file_path.startswith("/") else img.file_path,
            "watermarked_url": watermarked_url,
            "annotated_path": img.annotated_path,
            "gps_latitude": getattr(img, "gps_latitude", None),
            "gps_longitude": getattr(img, "gps_longitude", None),
            "gps_accuracy_m": getattr(img, "gps_accuracy_m", None),
            "captured_at": img.captured_at.isoformat() if getattr(img, "captured_at", None) else None,
            "capture_source": getattr(img, "capture_source", "CAMERA"),
            "original_filename": img.original_filename,
            "width": img.image_width,
            "height": img.image_height,
            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
            "quality": {
                "is_pass": quality_row.is_pass if quality_row else True,
                "blur_score": quality_row.blur_score if quality_row else None,
                "brightness": quality_row.brightness if quality_row else None,
                "contrast": quality_row.contrast if quality_row else None,
                "resolution_ok": quality_row.resolution_ok if quality_row else True,
                "warnings": warnings,
            } if quality_row else None,
            "granite_verdict": granite_verdict,
            "granite_score": granite_score,
        })

    return {
        "id": session.id,
        "block_id": session.block_id,
        "officer_name": session.officer_name,
        "status": session.status,
        "image_count": session.image_count or len(images),
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "images": image_list,
    }


@router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Mark a capture session as complete."""
    session = None
    if session_id.isdigit():
        res = await db.execute(select(CaptureSession).where(CaptureSession.id == int(session_id)))
        session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "COMPLETED"
    session.completed_at = datetime.now(timezone.utc)

    block_result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == session.block_id))
    block = block_result.scalar_one_or_none()
    if block:
        block.status = "CAPTURED"

    await db.commit()
    return {"status": "completed", "session_id": session.id, "image_count": session.image_count}
