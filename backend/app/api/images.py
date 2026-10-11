from pathlib import Path
from uuid import uuid4
import hashlib

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.ai.image_analyzer import analyze_image


router = APIRouter(prefix="/api/v1/images", tags=["Images"])

BASE_DIR = Path(__file__).resolve().parents[2]

UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
RESULT_DIR = BASE_DIR / "storage" / "results"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 15 * 1024 * 1024


@router.post("/analyze")
async def analyze_granite_image(
    file: UploadFile = File(...)
):
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/octet-stream",
    ]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG, WebP, and HEIC/HEIF are supported"
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds 15 MB limit"
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty"
        )

    try:
        result = analyze_image(content)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc

    image_id = uuid4().hex
    sha256 = hashlib.sha256(content).hexdigest()

    original_path = UPLOAD_DIR / f"{image_id}.bin"
    annotated_path = RESULT_DIR / f"{image_id}.jpg"

    original_path.write_bytes(content)

    annotated = result.pop("annotated_image_bytes")
    annotated_path.write_bytes(annotated)

    return {
        "image_id": image_id,
        "sha256": sha256,
        "analysis": result,
        "annotated_image_url": (
            f"/api/v1/images/{image_id}/annotated"
        )
    }


@router.get("/{image_id}/annotated")
def get_annotated_image(image_id: str):
    if (
        len(image_id) != 32
        or any(c not in "0123456789abcdef" for c in image_id)
    ):
        raise HTTPException(status_code=400, detail="Invalid image ID")

    path = RESULT_DIR / f"{image_id}.jpg"

    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Annotated image not found"
        )

    return FileResponse(
        path,
        media_type="image/jpeg"
    )
