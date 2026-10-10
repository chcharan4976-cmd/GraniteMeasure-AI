"""Focused tests for calibration, geometry, jobs, and classification.

These tests are algorithmic. They do not constitute field measurement accuracy.
No independently photographed quarry block is bundled in this repository.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.calibration import metric_scale_from_marker_pair, detect_markers
from app.services.geometry import (
    bbox_volume_m3,
    cm3_to_m3,
    evaluate_mesh_watertight,
    irregular_volume_decision,
    oriented_bounding_box,
    statistical_outlier_filter,
)
from app.services.measurement import MeasurementEngine
from app.services.seigniorage import SeigniorageEngine
from app.services.validation import compare_dimensions
from app.services.colmap_runner import colmap_status

client = TestClient(app)
TMP = Path(__file__).resolve().parent / "_tmp"
TMP.mkdir(exist_ok=True)


def _write_jpeg(name: str, image: np.ndarray) -> str:
    path = TMP / name
    cv2.imwrite(str(path), image)
    return str(path)


def _noise_image(seed: int, size=(480, 640)) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 255, (*size, 3), dtype=np.uint8)


def _marker_image(marker_px: int = 160) -> np.ndarray:
    img = np.full((600, 800, 3), 140, dtype=np.uint8)
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(dictionary, 0, marker_px)
    y, x = 80, 80
    img[y : y + marker_px, x : x + marker_px] = cv2.cvtColor(marker, cv2.COLOR_GRAY2BGR)
    return img


def test_missing_marker():
    img = _noise_image(1)
    result = detect_markers(img, marker_size_cm=10.0)
    assert result["detected"] is False
    assert result["marker_count"] == 0


def test_incorrect_marker_size_changes_apparent_scale():
    img = _marker_image(160)
    a = detect_markers(img, marker_size_cm=10.0)
    b = detect_markers(img, marker_size_cm=5.0)
    assert a["detected"] and b["detected"]
    assert a["apparent_scale_px_per_cm"] != b["apparent_scale_px_per_cm"]
    assert pytest.approx(b["apparent_scale_px_per_cm"] / a["apparent_scale_px_per_cm"], rel=0.05) == 2.0


def test_invalid_image_load():
    engine = MeasurementEngine()
    bogus = TMP / "not_an_image.bin"
    bogus.write_bytes(b"this is not an image")
    result = engine.estimate_dimensions([str(bogus)])
    assert result["status"] == "FAILED"
    assert result["calibration_status"] == "NOT_CALIBRATED"


def test_insufficient_photo_overlap():
    p1 = _write_jpeg("noise1.jpg", _noise_image(2))
    p2 = _write_jpeg("noise2.jpg", _noise_image(99))
    result = MeasurementEngine().estimate_dimensions([p1, p2])
    assert result["status"] == "FAILED"
    assert "overlap" in result["failure_reason"].lower() or "reconstruction" in result["failure_reason"].lower()


def test_failed_camera_reconstruction_too_few_images_without_marker():
    p1 = _write_jpeg("solo.jpg", _noise_image(3))
    result = MeasurementEngine().estimate_dimensions([p1])
    assert result["status"] == "FAILED"
    assert result["calibration_status"] == "NOT_CALIBRATED"


def test_single_image_with_marker_withholds_centimetres():
    p1 = _write_jpeg("solo_marker.jpg", _marker_image())
    result = MeasurementEngine().estimate_dimensions([p1])
    assert result["status"] in ("PARTIAL", "FAILED")
    assert result["length_cm"] is None
    assert result["breadth_cm"] is None
    assert result["height_cm"] is None
    assert result["calibration_status"] == "NOT_CALIBRATED"


def test_uncalibrated_reconstruction_withholds_centimetres():
    """Two copies of a textured image without a marker must not invent centimetres."""
    rng = np.random.default_rng(7)
    base = rng.integers(30, 220, (500, 700, 3), dtype=np.uint8)
    cv2.rectangle(base, (80, 80), (520, 380), (90, 90, 90), -1)
    cv2.rectangle(base, (120, 120), (480, 340), (160, 140, 120), -1)
    shifted = np.roll(base, 18, axis=1)
    p1 = _write_jpeg("box_a.jpg", base)
    p2 = _write_jpeg("box_b.jpg", shifted)
    result = MeasurementEngine().estimate_dimensions([p1, p2])
    if result["status"] in ("MEASURED", "ESTIMATED"):
        assert result["calibration_status"] == "NOT_CALIBRATED"
        assert result["length_cm"] is None
        assert result["irregular_volume_status"] == "IRREGULAR_VOLUME_UNAVAILABLE"
    else:
        assert result["status"] == "FAILED"
        assert result["length_cm"] is None


def test_valid_metric_scaling_from_triangulated_marker():
    K = np.array([[800.0, 0, 400.0], [0, 800.0, 300.0], [0, 0, 1.0]])
    P1 = K @ np.hstack([np.eye(3), np.zeros((3, 1))])
    t = np.array([[12.0], [0.0], [0.0]])
    P2 = K @ np.hstack([np.eye(3), t])
    size = 10.0
    obj = np.array(
        [[0.0, 5.0, 80.0], [10.0, 5.0, 80.0], [10.0, -5.0, 80.0], [0.0, -5.0, 80.0]]
    )
    def project(P, X):
        homog = np.c_[X, np.ones(len(X))].T
        proj = P @ homog
        return (proj[:2] / proj[2]).T

    scale = metric_scale_from_marker_pair(project(P1, obj), project(P2, obj), P1, P2, size)
    assert scale is not None
    assert scale["scale_to_cm"] == pytest.approx(1.0, rel=0.05)
    assert scale["scale_residual_cm"] < 0.25
    assert scale["marker_size_source"] == "CONFIGURED_MARKER_SIZE"


def test_oriented_bounding_box_extents():
    xs, ys, zs = np.meshgrid(
        np.linspace(0, 40, 12), np.linspace(0, 18, 10), np.linspace(0, 9, 8)
    )
    pts = np.column_stack([xs.ravel(), ys.ravel(), zs.ravel()]).astype(np.float64)
    pts = statistical_outlier_filter(pts)
    obb = oriented_bounding_box(pts)
    assert obb is not None
    assert obb["length"] == pytest.approx(40, rel=0.08)
    assert obb["breadth"] == pytest.approx(18, rel=0.08)
    assert obb["height"] == pytest.approx(9, rel=0.12)


def test_incomplete_geometry_does_not_invent_solid_volume():
    # Points only on three faces of a box
    face = []
    for x in np.linspace(0, 20, 15):
        for y in np.linspace(0, 10, 10):
            face.append([x, y, 0])
        for z in np.linspace(0, 8, 8):
            face.append([x, 0, z])
    for y in np.linspace(0, 10, 10):
        for z in np.linspace(0, 8, 8):
            face.append([0, y, z])
    pts = np.array(face, dtype=np.float64)
    obb = oriented_bounding_box(pts)
    coverage = {
        "unobserved_faces": ["+H", "-B"],
        "observed_face_count": 4,
    }
    mesh = evaluate_mesh_watertight()
    decision = irregular_volume_decision(mesh, coverage, is_dense=False)
    assert decision["status"] == "IRREGULAR_VOLUME_UNAVAILABLE"
    assert decision["volume_m3"] is None
    assert obb is not None


def test_watertight_mesh_validation():
    try:
        import trimesh
    except ImportError:
        pytest.skip("trimesh missing")
    box = trimesh.creation.box(extents=(2, 1, 0.5))
    eval_ok = evaluate_mesh_watertight(vertices=box.vertices, faces=box.faces)
    assert eval_ok["is_watertight"] is True
    open_faces = box.faces[:-2]
    eval_open = evaluate_mesh_watertight(vertices=box.vertices, faces=open_faces)
    assert eval_open["is_watertight"] is False


def test_unit_conversion():
    assert cm3_to_m3(1_000_000) == pytest.approx(1.0)
    assert bbox_volume_m3(100, 100, 100) == pytest.approx(1.0)


def test_measurement_accuracy_comparison():
    comparison = compare_dimensions(
        {
            "length_cm": 252.0,
            "breadth_cm": 148.0,
            "height_cm": 90.0,
            "bbox_volume_m3": 3.36,
            "irregular_volume_m3": None,
            "estimated_mass_mt": 9.24,
            "marker_size_cm": 10.0,
        },
        {
            "tape_length_cm": 250.0,
            "tape_breadth_cm": 150.0,
            "tape_height_cm": 90.0,
            "marker_size_cm_verified": 10.0,
            "weight_mt": 8.9,
        },
    )
    length = comparison["dimensions"][0]
    assert length["absolute_error_cm"] == pytest.approx(2.0)
    assert length["relative_error"] == pytest.approx(2.0 / 250.0)
    assert "not definitive" in comparison["volume_note"].lower()
    assert comparison["mass_comparison"]["weighbridge_mt"] == 8.9


def test_classification_thresholds_strict_gt():
    engine = SeigniorageEngine()
    assert engine.is_above_gangsaw(271.0, 151.0) is True
    assert engine.is_above_gangsaw(270.0, 150.0) is False
    assert engine.is_above_gangsaw(400.0, 150.0) is False
    assert engine.is_above_gangsaw(269.0, 200.0) is False
    # Rotated submission of 160 x 280 should still classify using sorted plan dims
    assert engine.is_above_gangsaw(160.0, 280.0) is True


def test_api_processing_status_without_images():
    block = client.post(
        "/api/v1/blocks/",
        json={
            "quarry_id": 1,
            "color_group": "Black Galaxy",
            "identifier": f"JOB-STATUS-{uuid.uuid4().hex[:8]}",
            "block_type": "RAW",
        },
    )
    assert block.status_code == 200
    block_id = block.json()["id"]
    started = client.post(f"/api/v1/analysis/jobs?block_id={block_id}")
    assert started.status_code == 200
    job_id = started.json()["job_id"]
    status = client.get(f"/api/v1/analysis/jobs/{job_id}")
    assert status.status_code == 200
    body = status.json()
    assert body["status"] in ("PENDING", "VALIDATING", "FAILED", "COMPLETED")
    assert "progress_note" in body
    listed = client.get(f"/api/v1/analysis/?block_id={block_id}")
    assert listed.status_code == 200
    assert any(j["id"] == job_id for j in listed.json())


def test_real_model_retrieval_unavailable_without_artifact():
    block = client.post(
        "/api/v1/blocks/",
        json={
            "quarry_id": 1,
            "color_group": "Other Colour Granite",
            "identifier": f"GEO-NONE-{uuid.uuid4().hex[:8]}",
            "block_type": "RAW",
        },
    )
    block_id = block.json()["id"]
    geo = client.get(f"/api/v1/measurements/{block_id}/geometry")
    assert geo.status_code == 200
    assert geo.json()["available"] is False


def test_validation_reference_roundtrip():
    block = client.post(
        "/api/v1/blocks/",
        json={
            "quarry_id": 1,
            "color_group": "Black Galaxy",
            "identifier": f"TAPE-REF-{uuid.uuid4().hex[:8]}",
            "block_type": "RAW",
        },
    )
    block_id = block.json()["id"]
    rec = client.post(
        f"/api/v1/validation/{block_id}/reference",
        json={
            "tape_length_cm": 240,
            "tape_breadth_cm": 140,
            "tape_height_cm": 80,
            "marker_size_cm_verified": 10,
            "recorded_by": "Officer",
        },
    )
    assert rec.status_code == 200
    cmp = client.get(f"/api/v1/validation/{block_id}")
    assert cmp.status_code == 200
    data = cmp.json()
    assert data["reference"]["tape_length_cm"] == 240
    assert data["field_dataset_available"] is False


def test_colmap_status_is_honest():
    info = colmap_status()
    assert "available" in info
    assert info["available"] in (True, False)


def test_health_reports_tools():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    tools = res.json()["tools"]
    assert "colmap" in tools
    assert "trimesh" in tools


def test_weighbridge_mass_not_overwritten_by_density():
    engine = SeigniorageEngine()
    res = engine.calculate_assessment(
        "Black Galaxy", 280, 160, 120, weight_mt=10.0
    )
    assert res["mass_kind"] == "VERIFIED_WEIGHBRIDGE"
    assert res["weight_mt"] == pytest.approx(10.0)
    assert res["weight_source"] == "WEIGHBRIDGE"
