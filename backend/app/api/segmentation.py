import os
from pathlib import Path
from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BlockImage, CaptureSession
from app.ai.segmentation import get_segmenter

router = APIRouter(prefix="/api/v1/segmentation", tags=["Segmentation"])


def _resolve_image_path(stored_path: str) -> Optional[str]:
    """Resolve stored image file path to an existing absolute file path."""
    p = Path(stored_path)
    if p.is_file():
        return str(p)

    storage_dir = Path(os.environ.get("STORAGE_DIR", Path(__file__).resolve().parents[2] / "storage"))
    candidate = storage_dir / stored_path
    if candidate.is_file():
        return str(candidate)

    base_dir = Path(__file__).resolve().parents[2]
    candidate2 = base_dir / stored_path
    if candidate2.is_file():
        return str(candidate2)

    return None


@router.post("/image/{image_id}")
async def segment_image(
    image_id: str,
    hints: Optional[Dict[str, Any]] = Body(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Run segmentation on a single block image."""
    try:
        int_id = int(image_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image_id, integer required")

    result = await db.execute(select(BlockImage).where(BlockImage.id == int_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    image_path = _resolve_image_path(image.file_path)
    if not image_path:
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    segmenter = get_segmenter()
    seg_result = segmenter.segment(image_path, hints=hints)
    seg_result["image_id"] = image.id
    return seg_result


@router.post("/session/{session_id}")
async def segment_session(
    session_id: str,
    hints: Optional[Dict[str, Any]] = Body(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Run segmentation on all images in a capture session."""
    try:
        int_session = int(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id, integer required")

    result = await db.execute(
        select(BlockImage)
        .where(BlockImage.session_id == int_session)
        .order_by(BlockImage.sequence_number)
    )
    images = result.scalars().all()
    if not images:
        raise HTTPException(status_code=404, detail="No images found for session")

    segmenter = get_segmenter()
    results = []
    for img in images:
        image_path = _resolve_image_path(img.file_path)
        if image_path:
            seg = segmenter.segment(image_path, hints=hints)
            seg["image_id"] = img.id
            results.append(seg)
        else:
            results.append({
                "image_id": img.id,
                "success": False,
                "error": "Image file not found on disk",
            })

    return {"session_id": int_session, "results": results}
