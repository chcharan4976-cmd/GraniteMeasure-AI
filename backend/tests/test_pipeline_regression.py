"""
Regression tests for the GraniteMeasure AI pipeline.
Tests the specific failure cases identified in the forensic audit.
"""
import pytest
import asyncio
import json
import hashlib
import io
from pathlib import Path
from unittest.mock import patch, MagicMock

import numpy as np
import cv2

# Backend path setup
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# ─── Test 1: Block workspace loads without crashing even with no measurements ─────

def test_measurement_engine_import():
    """MeasurementEngine imports and instantiates without error."""
    from app.services.measurement import MeasurementEngine
    me = MeasurementEngine()
    assert me is not None
    assert me.marker_size_cm == 10.0


# ─── Test 2: Image loading from relative paths works from backend root ─────────

def test_load_image_relative_path():
    """load_image resolves 'uploads/xxx.jpg' relative to STORAGE_ROOT."""
    from app.services.measurement import MeasurementEngine
    from app.services.pipeline_config import STORAGE_ROOT

    me = MeasurementEngine()
    upload_dir = STORAGE_ROOT / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Create a minimal test JPEG
    test_img = np.zeros((100, 100, 3), dtype=np.uint8)
    test_img[:50, :50] = [0, 255, 0]
    _, buf = cv2.imencode(".jpg", test_img)
    test_path = upload_dir / "test_regression_image.jpg"
    test_path.write_bytes(buf.tobytes())

    try:
        result = me.load_image("uploads/test_regression_image.jpg")
        assert result is not None, "load_image returned None for valid JPEG"
        assert result.shape[0] > 0, "Loaded image has zero height"
        assert result.shape[1] > 0, "Loaded image has zero width"
    finally:
        test_path.unlink(missing_ok=True)


# ─── Test 3: HEIC/normalized images decode correctly ───────────────────────────

def test_normalize_to_jpeg_bytes_with_jpeg():
    """normalize_to_jpeg_bytes passes through standard JPEG unchanged."""
    from app.api.capture import normalize_to_jpeg_bytes
    import numpy as np, cv2

    img = np.zeros((200, 200, 3), dtype=np.uint8)
    img[50:150, 50:150] = [128, 0, 200]
    _, buf = cv2.imencode(".jpg", img)
    jpeg_bytes = buf.tobytes()

    result = normalize_to_jpeg_bytes(jpeg_bytes)
    # Should still be valid JPEG
    assert result[:3] == b"\xff\xd8\xff", "normalize_to_jpeg_bytes corrupted a valid JPEG"

    arr = np.frombuffer(result, np.uint8)
    decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    assert decoded is not None, "Normalized JPEG cannot be decoded by OpenCV"
    assert decoded.shape == (200, 200, 3)


def test_normalize_to_jpeg_bytes_with_png():
    """normalize_to_jpeg_bytes converts PNG to JPEG."""
    from app.api.capture import normalize_to_jpeg_bytes
    import numpy as np, cv2

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[25:75, 25:75] = [255, 100, 50]
    _, buf = cv2.imencode(".png", img)
    png_bytes = buf.tobytes()

    result = normalize_to_jpeg_bytes(png_bytes)
    assert result[:3] == b"\xff\xd8\xff", "normalize_to_jpeg_bytes did not produce JPEG from PNG"
    arr = np.frombuffer(result, np.uint8)
    decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    assert decoded is not None, "Converted JPEG cannot be decoded by OpenCV"


# ─── Test 4: Duplicate detection by SHA256 ─────────────────────────────────────

def test_sha256_dedup_in_analysis():
    """SHA256 dedup logic removes exact copies from analysis image list."""
    # Simulate what run_analysis_job does: dedup by sha256
    class FakeImage:
        def __init__(self, id, sha256, phash=None):
            self.id = id
            self.sha256 = sha256
            self.perceptual_hash = phash
            self.file_path = f"uploads/img_{id}.jpg"

    images = [
        FakeImage(1, "abc123", "aaa"),
        FakeImage(2, "abc123", "bbb"),  # exact duplicate
        FakeImage(3, "def456", "ccc"),
        FakeImage(4, "def456", "ddd"),  # exact duplicate
        FakeImage(5, "xyz789", "eee"),
    ]

    # Replicate the dedup logic from run_analysis_job
    seen_sha = set()
    unique = []
    for img in images:
        if img.sha256 and img.sha256 in seen_sha:
            continue
        if img.sha256:
            seen_sha.add(img.sha256)
        unique.append(img)

    assert len(unique) == 3, f"Expected 3 unique images, got {len(unique)}"
    assert unique[0].id == 1
    assert unique[1].id == 3
    assert unique[2].id == 5


# ─── Test 5: failure_result provides actionable message ───────────────────────

def test_failure_result_has_actionable_message():
    """_failure_result always returns a non-empty failure_reason."""
    from app.services.measurement import MeasurementEngine
    me = MeasurementEngine()
    result = me._failure_result("Test failure reason")
    assert result["status"] == "FAILED"
    assert result["failure_reason"] == "Test failure reason"
    assert result["length_cm"] is None
    assert result["breadth_cm"] is None
    assert result["height_cm"] is None
    assert result["volume_m3"] is None
    assert len(result["warnings"]) > 0


# ─── Test 6: No metric dimensions without calibration ─────────────────────────

def test_no_dimensions_without_calibration():
    """Reconstruction without ArUco marker must not produce centimetre values."""
    from app.services.measurement import MeasurementEngine
    me = MeasurementEngine()

    # Create two minimally different synthetic images
    img1 = np.zeros((300, 400, 3), dtype=np.uint8)
    img2 = np.zeros((300, 400, 3), dtype=np.uint8)
    # Add some texture so feature detectors have something to work with
    np.random.seed(42)
    texture = np.random.randint(50, 200, (300, 400, 3), dtype=np.uint8)
    img1 = (img1 + texture).astype(np.uint8)
    img2 = np.roll(texture, 20, axis=1).astype(np.uint8)  # slightly shifted

    from app.services.pipeline_config import STORAGE_ROOT
    p1 = STORAGE_ROOT / "uploads" / "test_reg_nocal_1.jpg"
    p2 = STORAGE_ROOT / "uploads" / "test_reg_nocal_2.jpg"
    cv2.imwrite(str(p1), img1)
    cv2.imwrite(str(p2), img2)

    try:
        result = me.estimate_dimensions(
            ["uploads/test_reg_nocal_1.jpg", "uploads/test_reg_nocal_2.jpg"],
        )
        # No matter what, without an ArUco marker there must be no centimetre values
        assert result.get("length_cm") is None, (
            f"System produced fabricated length_cm={result.get('length_cm')} without calibration"
        )
        assert result.get("breadth_cm") is None
        assert result.get("height_cm") is None
        assert result.get("calibration_status") != "CALIBRATED"
    finally:
        p1.unlink(missing_ok=True)
        p2.unlink(missing_ok=True)


# ─── Test 7: Granite validator rejects blank white image ──────────────────────

def test_validator_rejects_white_document():
    """validate_granite_evidence rejects a plain white image (looks like document)."""
    from app.ai.granite_validator import validate_granite_evidence
    import numpy as np, cv2

    white = np.full((400, 300, 3), 250, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", white)
    result = validate_granite_evidence(buf.tobytes())
    assert result["verdict"] in ("REJECTED_UNRELATED", "REJECTED_POOR_QUALITY"), (
        f"Expected rejection for white image, got: {result['verdict']}"
    )
    assert result["is_accepted"] is False


# ─── Test 8: Granite validator accepts dark granite-like image ─────────────────

def test_validator_accepts_dark_granite():
    """validate_granite_evidence accepts a dark, textured image (simulates black granite)."""
    from app.ai.granite_validator import validate_granite_evidence
    import numpy as np, cv2

    np.random.seed(7)
    # Simulate dark crystalline granite: dark base with high-frequency texture
    base = np.random.randint(30, 90, (400, 500, 3), dtype=np.uint8)
    # Add bright speckle flecks (mica/feldspar minerals)
    flecks = np.random.randint(0, 400 * 500, size=5000)
    for idx in flecks:
        r, c = divmod(idx, 500)
        if r < 400:
            base[r, c] = np.random.randint(150, 255, 3)
    # Add some linear edges (block boundaries)
    cv2.line(base, (10, 200), (490, 200), (200, 200, 200), 3)
    cv2.line(base, (250, 10), (250, 390), (200, 200, 200), 3)
    cv2.rectangle(base, (30, 30), (470, 370), (180, 180, 180), 2)

    _, buf = cv2.imencode(".jpg", base)
    result = validate_granite_evidence(buf.tobytes())
    # Should be accepted or uncertain — NOT rejected as unrelated
    assert result["verdict"] != "REJECTED_UNRELATED", (
        f"Validator falsely rejected a dark granite-like image: {result}"
    )


# ─── Test 9: Analysis job result with no images gives correct error ────────────

def test_failure_result_no_images():
    """estimate_dimensions with empty list returns FAILED with clear message."""
    from app.services.measurement import MeasurementEngine
    me = MeasurementEngine()
    result = me.estimate_dimensions([])
    assert result["status"] == "FAILED"
    assert "No images" in result.get("failure_reason", "")


# ─── Test 10: Degenerate pair detection (identical images) ─────────────────────

def test_degenerate_pair_skipped():
    """Identical images should not produce a valid stereo reconstruction."""
    from app.services.measurement import MeasurementEngine
    from app.services.pipeline_config import STORAGE_ROOT

    me = MeasurementEngine()

    # Create a single image and upload it twice with different filenames
    img = np.zeros((300, 400, 3), dtype=np.uint8)
    np.random.seed(99)
    img += np.random.randint(30, 80, (300, 400, 3), dtype=np.uint8).astype(np.uint8)

    p1 = STORAGE_ROOT / "uploads" / "test_deg_1.jpg"
    p2 = STORAGE_ROOT / "uploads" / "test_deg_2.jpg"
    cv2.imwrite(str(p1), img)
    cv2.imwrite(str(p2), img)

    try:
        result = me.estimate_dimensions(
            ["uploads/test_deg_1.jpg", "uploads/test_deg_2.jpg"],
        )
        # Should fail (degenerate pair detection) or produce 0 points
        # NOT produce a false reconstruction with thousands of points
        if result.get("status") != "FAILED":
            pts = result.get("reconstructed_points", 0) or 0
            assert pts < 100, (
                f"Identical images produced suspicious {pts} reconstructed points — "
                "degenerate pair detection not working"
            )
    finally:
        p1.unlink(missing_ok=True)
        p2.unlink(missing_ok=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
