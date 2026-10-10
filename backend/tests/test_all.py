"""Comprehensive test suite for GraniteMeasure AI backend."""
import pytest
import numpy as np
import cv2
from io import BytesIO
from fastapi.testclient import TestClient

from app.main import app
from app.services.seigniorage import SeigniorageEngine
from app.services.measurement import MeasurementEngine
from app.ai.image_analyzer import analyze_image


client = TestClient(app)


def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["application"] == "GraniteMeasure AI"
    assert data["status"] == "running"


def test_health_check():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_auth_login():
    res = client.post("/api/v1/auth/login", json={
        "username": "officer",
        "password": "officer123",
        "role": "Officer"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["username"] == "officer"
    assert data["role"] == "Officer"


def test_quarry_creation_and_listing():
    create_res = client.post("/api/v1/quarries/", json={
        "name": "Chimakurthy Galaxy Quarry",
        "code": "CGQ-001",
        "district": "Prakasam",
        "mandal": "Chimakurthy",
        "village": "R.L. Puram",
        "granite_category": "Black Galaxy"
    })
    assert create_res.status_code == 200
    assert create_res.json()["status"] == "created"

    list_res = client.get("/api/v1/quarries/")
    assert list_res.status_code == 200
    quarries = list_res.json()
    assert len(quarries) >= 1
    assert any(q["name"] == "Chimakurthy Galaxy Quarry" for q in quarries)


def test_block_registration_and_retrieval():
    block_res = client.post("/api/v1/blocks/", json={
        "quarry_id": 1,
        "color_group": "Black Galaxy",
        "identifier": "TEST-BLK-001",
        "block_type": "RAW",
        "gps_latitude": 15.782,
        "gps_longitude": 79.584,
        "observations": "Field test block"
    })
    assert block_res.status_code == 200
    block_data = block_res.json()
    block_id = block_data["id"]
    assert block_data["identifier"] == "TEST-BLK-001"

    get_res = client.get(f"/api/v1/blocks/{block_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["identifier"] == "TEST-BLK-001"
    assert detail["color_group"] == "Black Galaxy"


def test_seigniorage_rates_endpoint():
    res = client.get("/api/v1/seigniorage/rates")
    assert res.status_code == 200
    data = res.json()
    assert "rates" in data
    assert len(data["rates"]) == 5
    # Verify challenge rates
    rates_map = {r["color_group"]: r for r in data["rates"]}
    assert rates_map["Black Galaxy"]["above_gangsaw_rate"] == 1830.0
    assert rates_map["Black Galaxy"]["below_gangsaw_rate"] == 1530.0
    assert rates_map["Other Black Granite"]["above_gangsaw_rate"] == 1520.0
    assert rates_map["Other Black Granite"]["below_gangsaw_rate"] == 1300.0


def test_seigniorage_engine_classification():
    engine = SeigniorageEngine()

    # Above Gangsaw (challenge text): > 270 cm AND > 150 cm
    res_above = engine.calculate_assessment("Black Galaxy", 280.0, 160.0, 120.0)
    assert res_above["is_above_gangsaw"] is True
    assert res_above["classification"] == "Above Gangsaw"
    assert res_above["rate_per_mt"] == 1830.0
    assert res_above["mass_kind"] == "DENSITY_ESTIMATE"
    # Volume: 2.8 * 1.6 * 1.2 = 5.376 m³
    # Mass: 5.376 * 2.75 = 14.784 MT
    # Amount: 14.784 * 1830 = 27054.72
    assert pytest.approx(res_above["volume_m3"], 0.01) == 5.376
    assert pytest.approx(res_above["total_amount"], 1.0) == 27054.72

    # Below Gangsaw: below length or width
    res_below = engine.calculate_assessment("Black Galaxy", 250.0, 140.0, 100.0)
    assert res_below["is_above_gangsaw"] is False
    assert res_below["classification"] == "Below Gangsaw"
    assert res_below["rate_per_mt"] == 1530.0

    # Boundary: exactly 270 x 150 cm is Below Gangsaw under strict greater-than
    res_boundary = engine.calculate_assessment("Black Galaxy", 270.0, 150.0, 100.0)
    assert res_boundary["is_above_gangsaw"] is False
    assert res_boundary["classification"] == "Below Gangsaw"

    # Mixed edge: 280 x 149 cm -> Below Gangsaw
    res_mixed = engine.calculate_assessment("Black Galaxy", 280.0, 149.0, 100.0)
    assert res_mixed["is_above_gangsaw"] is False

    # 280 x 150.0: width is not strictly greater than 150 -> Below
    res_eq_width = engine.calculate_assessment("Black Galaxy", 280.0, 150.0, 100.0)
    assert res_eq_width["is_above_gangsaw"] is False


def test_opencv_image_analyzer():
    # Create a synthetic test image with ArUco marker
    img = np.ones((600, 800, 3), dtype=np.uint8) * 120
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(dictionary, 0, 150)
    img[100:250, 100:250] = cv2.cvtColor(marker, cv2.COLOR_GRAY2BGR)

    _, encoded = cv2.imencode(".jpg", img)
    result = analyze_image(encoded.tobytes())

    assert result["image_width"] == 800
    assert result["image_height"] == 600
    assert result["marker_count"] >= 1
    assert result["detected_markers"][0]["id"] == 0
    assert "annotated_image_bytes" in result


def test_dashboard_endpoint():
    res = client.get("/api/v1/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "total_blocks" in data
    assert "pending_analysis" in data
    assert "completed_measurements" in data
    assert data["total_blocks"] >= 1


def test_report_endpoint():
    # Test report for block 1
    res = client.get("/api/v1/reports/1")
    assert res.status_code == 200
    report = res.json()
    assert "report_title" in report
    assert "block" in report
    assert "disclaimer" in report
    assert "audit_trail" in report
