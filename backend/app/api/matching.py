import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BlockImage
from app.ai.feature_matcher import ORBFeatureMatcher

router = APIRouter(prefix="/api/v1/matching", tags=["Matching"])


class MatchPairRequest(BaseModel):
    image_a_id: Optional[str] = None
    image_b_id: Optional[str] = None


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


@router.post("/pair")
async def match_pair(
    payload: Optional[MatchPairRequest] = None,
    image_a_id: Optional[str] = Query(None),
    image_b_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Match features between two images with geometric verification."""
    target_a_id = (payload.image_a_id if payload and payload.image_a_id else None) or image_a_id
    target_b_id = (payload.image_b_id if payload and payload.image_b_id else None) or image_b_id

    if not target_a_id or not target_b_id:
        raise HTTPException(status_code=400, detail="Both image_a_id and image_b_id are required")

    try:
        int_a = int(target_a_id)
        int_b = int(target_b_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="image_a_id and image_b_id must be valid integers")

    result_a = await db.execute(select(BlockImage).where(BlockImage.id == int_a))
    result_b = await db.execute(select(BlockImage).where(BlockImage.id == int_b))
    img_a = result_a.scalar_one_or_none()
    img_b = result_b.scalar_one_or_none()

    if not img_a or not img_b:
        raise HTTPException(status_code=404, detail="One or both images not found")

    path_a = _resolve_image_path(img_a.file_path)
    path_b = _resolve_image_path(img_b.file_path)

    if not path_a or not path_b:
        raise HTTPException(status_code=404, detail="Image files not found on disk")

    matcher = ORBFeatureMatcher()
    result = matcher.match_pair(path_a, path_b, str(img_a.id), str(img_b.id))
    return result.to_dict()


@router.post("/session/{session_id}")
async def match_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Match all image pairs in a capture session."""
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
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 images for matching")

    resolved_paths = []
    ids = []
    missing_ids = []

    for img in images:
        p = _resolve_image_path(img.file_path)
        if p:
            resolved_paths.append(p)
            ids.append(str(img.id))
        else:
            missing_ids.append(img.id)

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"{len(missing_ids)} image file(s) not found on disk: {missing_ids}",
        )

    matcher = ORBFeatureMatcher()
    session_result = matcher.match_session(resolved_paths, ids)
    return session_result
