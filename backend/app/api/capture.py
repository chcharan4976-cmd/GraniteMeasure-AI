from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import uuid

from app.database import get_db
from app.models import CaptureSession, BlockImage, GraniteBlock, ImageQualityResult
from app.ai.image_analyzer import analyze_image

router = APIRouter(prefix="/api/v1/capture", tags=["Capture"])

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 15 * 1024 * 1024


@router.post("/sessions")
async def create_session(block_id: int, officer_name: str = "Officer", db: AsyncSession = Depends(get_db)):
    """Create a new capture session for a block."""
    # Verify block exists
    result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    session = CaptureSession(
        block_id=block_id,
        officer_name=officer_name,
        status="IN_PROGRESS",
        image_count=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(session)

    # Update block status
    block.status = "CAPTURING"
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "block_id": block_id,
        "status": session.status,
        "created_at": session.created_at.isoformat(),
    }


@router.post("/sessions/{session_id}/images")
async def upload_image(
    session_id: int,
    file: UploadFile = File(...),
    sequence_number: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Upload an image to a capture session."""
    # Verify session
    result = await db.execute(select(CaptureSession).where(CaptureSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Capture session not found")

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP are supported")

    # Read and validate size
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds 15 MB limit")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Save file
    image_id = uuid.uuid4().hex
    sha256 = hashlib.sha256(content).hexdigest()
    file_path = UPLOAD_DIR / f"{image_id}.bin"
    file_path.write_bytes(content)

    # Run image quality analysis
    try:
        quality = analyze_image(content)
        annotated_bytes = quality.pop("annotated_image_bytes")
        # Save annotated version
        annotated_path = BASE_DIR / "storage" / "results" / f"{image_id}.jpg"
        annotated_path.parent.mkdir(parents=True, exist_ok=True)
        annotated_path.write_bytes(annotated_bytes)
    except ValueError:
        quality = {"quality_status": "FAILED", "warnings": ["Could not analyze image"]}

    # Save to DB
    block_image = BlockImage(
        session_id=session_id,
        block_id=session.block_id,
        file_path=str(file_path),
        original_filename=file.filename,
        sha256=sha256,
        file_size=len(content),
        image_width=quality.get("image_width"),
        image_height=quality.get("image_height"),
        sequence_number=sequence_number,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(block_image)

    # Save quality result
    quality_result = ImageQualityResult(
        image_id=0,  # Will update after commit
        is_pass=quality.get("quality_status") == "PASS",
        blur_score=quality.get("blur_score"),
        brightness=quality.get("brightness"),
        contrast=quality.get("contrast"),
        resolution_ok=quality.get("image_width", 0) >= 640,
        warnings=str(quality.get("warnings", [])),
        analyzed_at=datetime.now(timezone.utc),
    )

    # Update session image count
    session.image_count = (session.image_count or 0) + 1

    await db.commit()
    await db.refresh(block_image)

    # Update quality result with actual image id
    quality_result.image_id = block_image.id
    db.add(quality_result)
    await db.commit()

    return {
        "image_id": block_image.id,
        "file_id": image_id,
        "sha256": sha256,
        "sequence_number": sequence_number,
        "quality": {
            "status": quality.get("quality_status", "UNKNOWN"),
            "blur_score": quality.get("blur_score"),
            "brightness": quality.get("brightness"),
            "contrast": quality.get("contrast"),
            "warnings": quality.get("warnings", []),
            "marker_count": quality.get("marker_count", 0),
            "markers": quality.get("detected_markers", []),
        },
        "annotated_url": f"/api/v1/images/{image_id}/annotated",
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get capture session details with image list."""
    result = await db.execute(select(CaptureSession).where(CaptureSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    img_result = await db.execute(
        select(BlockImage).where(BlockImage.session_id == session_id).order_by(BlockImage.sequence_number)
    )
    images = img_result.scalars().all()

    return {
        "id": session.id,
        "block_id": session.block_id,
        "status": session.status,
        "image_count": session.image_count,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "images": [
            {
                "id": img.id,
                "sequence_number": img.sequence_number,
                "sha256": img.sha256,
                "file_size": img.file_size,
                "width": img.image_width,
                "height": img.image_height,
                "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
            }
            for img in images
        ],
    }


@router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a capture session as complete."""
    result = await db.execute(select(CaptureSession).where(CaptureSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "COMPLETED"
    session.completed_at = datetime.now(timezone.utc)

    # Update block status
    block_result = await db.execute(select(GraniteBlock).where(GraniteBlock.id == session.block_id))
    block = block_result.scalar_one_or_none()
    if block:
        block.status = "CAPTURED"

    await db.commit()
    return {"status": "completed", "image_count": session.image_count}
