import pytest
import numpy as np
import cv2
import io
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ai.granite_validator import validate_granite_evidence


def _create_synthetic_stone_image_bytes(with_aruco: bool = True) -> bytes:
    """Creates a synthetic image with realistic granite grain texture and ArUco marker."""
    img = np.random.normal(loc=110, scale=35, size=(600, 800)).astype(np.uint8)
    img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    # Draw planar stone block edges
    cv2.rectangle(img_bgr, (100, 100), (700, 500), (30, 30, 30), 4)
    cv2.line(img_bgr, (100, 100), (250, 40), (20, 20, 20), 3)
    cv2.line(img_bgr, (700, 100), (750, 40), (20, 20, 20), 3)
    cv2.line(img_bgr, (250, 40), (750, 40), (20, 20, 20), 3)

    if with_aruco:
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        marker_img = cv2.aruco.generateImageMarker(dictionary, 0, 120)
        marker_bgr = cv2.cvtColor(marker_img, cv2.COLOR_GRAY2BGR)
        img_bgr[320:440, 160:280] = marker_bgr

    ok, buf = cv2.imencode(".jpg", img_bgr)
    return buf.tobytes()


def _create_synthetic_document_image_bytes() -> bytes:
    """Creates a synthetic white document with black text lines."""
    img = np.full((800, 600, 3), 255, dtype=np.uint8)
    for y in range(80, 720, 30):
        cv2.line(img, (60, y), (540, y), (20, 20, 20), 2)
    ok, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def _create_synthetic_phone_screenshot_bytes() -> bytes:
    """Creates a high-saturation synthetic UI screenshot (pure neon colors)."""
    img = np.zeros((800, 400, 3), dtype=np.uint8)
    img[:, :] = (255, 0, 255)  # Pure magenta
    cv2.rectangle(img, (0, 0), (400, 80), (0, 255, 255), -1)  # Pure yellow header
    ok, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def test_validator_accepts_granite_block():
    img_bytes = _create_synthetic_stone_image_bytes(with_aruco=True)
    res = validate_granite_evidence(img_bytes)
    assert res["is_accepted"] is True
    assert res["verdict"] == "ACCEPTED_GRANITE_BLOCK"
    assert res["confidence"] >= 0.70


def test_validator_rejects_document():
    img_bytes = _create_synthetic_document_image_bytes()
    res = validate_granite_evidence(img_bytes)
    assert res["is_accepted"] is False
    assert res["verdict"] == "REJECTED_UNRELATED"
    assert "document" in str(res["reasons"]).lower() or "text" in str(res["reasons"]).lower()


def test_validator_rejects_synthetic_screenshot():
    img_bytes = _create_synthetic_phone_screenshot_bytes()
    res = validate_granite_evidence(img_bytes)
    assert res["is_accepted"] is False
    assert res["verdict"] == "REJECTED_UNRELATED"
    assert "synthetic" in str(res["reasons"]).lower() or "saturation" in str(res["reasons"]).lower()


def test_validator_rejects_severe_blur():
    # Uniform gray image has 0 Laplacian variance
    img = np.full((400, 400, 3), 128, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    res = validate_granite_evidence(buf.tobytes())
    assert res["is_accepted"] is False
    assert res["verdict"] == "REJECTED_POOR_QUALITY"


@pytest.mark.asyncio
async def test_validate_granite_api_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        img_bytes = _create_synthetic_stone_image_bytes(with_aruco=True)
        files = {"file": ("stone.jpg", img_bytes, "image/jpeg")}
        resp = await client.post("/api/v1/capture/validate-granite", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["verdict"] == "ACCEPTED_GRANITE_BLOCK"
        assert data["is_accepted"] is True
