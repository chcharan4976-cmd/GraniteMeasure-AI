import pytest
import numpy as np
import cv2
import io
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ai.image_analyzer import decode_image_bytes, compute_dhash, analyze_image


def _create_sample_jpeg_bytes() -> bytes:
    img = np.random.randint(50, 200, (300, 300, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def test_pillow_heif_registration():
    import pillow_heif
    assert pillow_heif is not None


def test_decode_image_bytes_jpeg_and_png():
    img_bytes = _create_sample_jpeg_bytes()
    decoded = decode_image_bytes(img_bytes)
    assert isinstance(decoded, np.ndarray)
    assert decoded.shape == (300, 300, 3)

    # Test PNG bytes via Pillow fallback
    pil_img = Image.new("RGB", (120, 120), color=(100, 150, 200))
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    decoded_png = decode_image_bytes(buf.getvalue())
    assert isinstance(decoded_png, np.ndarray)
    assert decoded_png.shape == (120, 120, 3)


def test_compute_dhash_and_analysis():
    img_bytes = _create_sample_jpeg_bytes()
    dhash = compute_dhash(img_bytes)
    assert len(dhash) == 16
    assert isinstance(dhash, str)

    analysis = analyze_image(img_bytes)
    assert "quality_status" in analysis
    assert "blur_score" in analysis


@pytest.mark.asyncio
async def test_images_analyze_accepts_heic_content_type():
    img_bytes = _create_sample_jpeg_bytes()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Send with image/heic content type
        response = await client.post(
            "/api/v1/images/analyze",
            files={"file": ("granite_test.heic", img_bytes, "image/heic")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "image_id" in data
        assert "analysis" in data
