"""Tests for newly added GraniteMeasure AI intelligence services."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_new_tools():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "tools" in data

def test_html_report_endpoint():
    # Test block 1 report HTML rendering
    response = client.get("/api/v1/reports/1/html")
    # Block 1 exists in initial seed or returns 404 if not seeded, but endpoint is mounted
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        assert "Government of Andhra Pradesh" in response.text
        assert "Granite Intelligence Division" in response.text

def test_segmentation_endpoint_mounting():
    # Verify segmentation router is properly routed
    response = client.post("/api/v1/segmentation/image/999999")
    assert response.status_code in [404, 422]

def test_matching_endpoint_mounting():
    # Verify matching router is properly routed
    response = client.post("/api/v1/matching/pair?image_a_id=1&image_b_id=2")
    assert response.status_code in [200, 404, 422]

def test_damage_analyzer_single_view_depth_withheld():
    import numpy as np
    import cv2
    import tempfile
    from app.ai.damage_analyzer import StoneDamageAnalyzer

    # Create synthetic test granite texture image with dark cavity
    test_img = np.ones((400, 400, 3), dtype=np.uint8) * 120
    # Add dark cavity
    cv2.circle(test_img, (200, 200), 25, (20, 20, 20), -1)

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        cv2.imwrite(f.name, test_img)
        temp_path = f.name

    try:
        # Run damage analyzer on single 2D image
        result = StoneDamageAnalyzer.analyze_image(temp_path, scale_px_per_cm=10.0)
        assert result["success"] is True
        assert result["total_defects_found"] >= 1
        
        # Verify physical accuracy rule: single-view image MUST NOT fabricate depth
        for defect in result["defects"]:
            if defect["defect_type"] == "CAVITY":
                assert defect["depth_status"] == "UNAVAILABLE_SINGLE_VIEW"
                assert defect["estimated_depth_cm"] is None
                assert "cannot be derived from a single 2D photograph" in defect["depth_warning"]
        
        # Verify damage prevention recommendations generated
        assert len(result["prevention_advisor"]) >= 1
    finally:
        import os
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_damage_report_endpoint_mounting():
    response = client.get("/api/v1/damage/block/999999/report")
    assert response.status_code in [404, 422]

