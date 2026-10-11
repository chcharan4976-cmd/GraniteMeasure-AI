import pytest
import asyncio
import os
import json
import numpy as np
import cv2
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from app.main import app


def _generate_realistic_views():
    """Generates 3 multi-view photographs of a granite block with ArUco calibration and rich feature points."""
    rng = np.random.default_rng(101)
    base = rng.integers(60, 200, (600, 800, 3), dtype=np.uint8)
    for i in range(12):
        cv2.circle(base, (100 + i * 50, 150 + (i % 3) * 70), 20 + i * 2, (30, 40, 50), -1)
        cv2.rectangle(base, (120 + i * 40, 300), (150 + i * 40, 350), (200, 210, 220), -1)

    # Defect simulation (crack line)
    cv2.line(base, (220, 240), (370, 260), (10, 10, 10), 3)

    # ArUco marker for calibration
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(dictionary, 0, 120)
    base[100:220, 100:220] = cv2.cvtColor(marker, cv2.COLOR_GRAY2BGR)

    # 3 distinct camera perspectives
    v1 = base.copy()
    M1 = np.float32([[1.0, 0.05, -20], [-0.03, 1.0, 10]])
    v2 = cv2.warpAffine(base, M1, (800, 600))
    M2 = np.float32([[0.98, -0.04, 30], [0.04, 0.98, -15]])
    v3 = cv2.warpAffine(base, M2, (800, 600))

    return [
        cv2.imencode(".jpg", v1)[1].tobytes(),
        cv2.imencode(".jpg", v2)[1].tobytes(),
        cv2.imencode(".jpg", v3)[1].tobytes(),
    ]


@pytest.mark.asyncio
async def test_complete_e2e_evidence_analysis_and_workspace():
    """Verifies complete end-to-end pipeline from block registration, GPS evidence upload,
    watermarking, AI multi-model analysis, and full 11-stage Workspace aggregation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Register block
        block_identifier = "AP-E2E-BLK-999"
        create_resp = await client.post("/api/v1/blocks/", json={
            "identifier": block_identifier,
            "color_group": "Black Galaxy",
            "block_type": "RAW",
            "quarry_id": 1,
            "observations": "Bench extraction test block",
            "gps_latitude": 15.8942,
            "gps_longitude": 79.9831,
        })
        assert create_resp.status_code == 200, create_resp.text
        block_data = create_resp.json()
        numeric_id = block_data["id"]
        assert block_data["identifier"] == block_identifier

        # Step 2: Open capture session
        session_resp = await client.post(f"/api/v1/capture/sessions?block_id={numeric_id}")
        assert session_resp.status_code == 200, session_resp.text
        session_id = session_resp.json()["session_id"]

        # Step 3: Upload 3 multi-view evidence images with GPS coordinates
        views_meta = [
            ("FRONT", 15.894201, 79.983105),
            ("LEFT", 15.894205, 79.983110),
            ("TOP", 15.894210, 79.983115),
        ]
        image_bytes_list = _generate_realistic_views()

        uploaded_images = []
        for idx, ((view_label, lat, lon), img_bytes) in enumerate(zip(views_meta, image_bytes_list), start=1):
            upload_resp = await client.post(
                f"/api/v1/capture/sessions/{session_id}/images",
                files={"file": (f"{view_label.lower()}_angle.jpg", img_bytes, "image/jpeg")},
                data={
                    "view_label": view_label,
                    "form_sequence": idx,
                    "gps_latitude": lat,
                    "gps_longitude": lon,
                    "gps_accuracy_m": 2.5,
                    "capture_source": "IOS_CAMERA",
                    "captured_at": "2026-10-11T14:30:00Z",
                },
            )
            assert upload_resp.status_code == 200, upload_resp.text
            res_json = upload_resp.json()
            assert res_json["view_label"] == view_label
            assert res_json["evidence_id"] is not None
            assert res_json["gps_latitude"] == pytest.approx(lat, abs=1e-4)
            assert res_json["gps_longitude"] == pytest.approx(lon, abs=1e-4)
            assert res_json["watermarked_url"] is not None
            uploaded_images.append(res_json)

        assert len(uploaded_images) == 3

        # Step 4: Verify session reflects evidence metadata and images
        get_sess = await client.get(f"/api/v1/capture/sessions/{session_id}")
        assert get_sess.status_code == 200
        sess_data = get_sess.json()
        assert sess_data["image_count"] == 3
        assert len(sess_data["images"]) == 3
        for img in sess_data["images"]:
            assert img["evidence_id"] is not None
            assert img["watermarked_url"] is not None
            assert img["gps_latitude"] is not None
            assert img["capture_source"] == "IOS_CAMERA"

        # Step 5: Start AI Analysis Job for block
        job_resp = await client.post("/api/v1/analysis/jobs", json={
            "block_id": block_identifier,
            "session_id": session_id,
        })
        assert job_resp.status_code == 200, job_resp.text
        job_data = job_resp.json()
        job_id = job_data["job_id"]
        assert job_data["status"] in ("PENDING", "COMPLETED")

        # Poll job status until complete (or call run_analysis_job if running inside async loop)
        for _ in range(30):
            job_check = await client.get(f"/api/v1/analysis/jobs/{job_id}")
            assert job_check.status_code == 200
            current_status = job_check.json().get("status")
            if current_status in ("COMPLETED", "FAILED"):
                assert current_status == "COMPLETED", job_check.json()
                break
            await asyncio.sleep(0.5)

        # Step 6: Verify Workspace Hub by string identifier (and numeric id)
        ws_by_str = await client.get(f"/api/v1/blocks/{block_identifier}/workspace")
        assert ws_by_str.status_code == 200, ws_by_str.text
        workspace = ws_by_str.json()

        # Check block info
        assert workspace["block"]["identifier"] == block_identifier
        assert workspace["block"]["status"] == "MEASURED"

        # Check measurements
        assert workspace["measurement"] is not None
        meas = workspace["measurement"]
        assert meas["length_m"] > 0
        assert meas["breadth_m"] > 0
        assert meas["height_m"] > 0
        assert meas["gross_volume_m3"] > 0
        assert meas["estimated_tonnage"] > 0

        # Check defects
        assert workspace["defects"] is not None
        assert workspace["defects"]["count"] >= 0

        # Check cutting plan
        assert workspace["cutting_plan"] is not None
        cutting = workspace["cutting_plan"]
        assert cutting["original_volume_m3"] > 0
        assert cutting["dressed_volume_m3"] > 0
        assert cutting["recovery_ratio"] > 0

        # Check seigniorage assessment
        assert workspace["seigniorage"] is not None
        seig = workspace["seigniorage"]
        assert seig["calculated_fee_inr"] > 0
        assert seig["tonnage_used"] > 0

        # Check engineering advisory
        assert "advisory" in workspace
        assert isinstance(workspace["advisory"], list)

        # Check audit trail
        assert len(workspace["audit_trail"]) >= 1

        # Also verify lookup by numeric ID yields identical block
        ws_by_num = await client.get(f"/api/v1/blocks/{numeric_id}/workspace")
        assert ws_by_num.status_code == 200
        assert ws_by_num.json()["block"]["identifier"] == block_identifier
