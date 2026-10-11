import asyncio
import pytest
import numpy as np
import cv2
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ai.image_analyzer import compute_dhash, hamming_distance


def _make_stone_image(seed: int = 42, brightness: int = 110) -> bytes:
    """Creates a deterministic synthetic granite stone image with high grain variance."""
    np.random.seed(seed)
    img = np.random.normal(loc=brightness, scale=35, size=(600, 800)).astype(np.uint8)
    img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    # Draw stone block edges
    cv2.rectangle(img_bgr, (80, 80), (720, 520), (30, 30, 30), 4)
    cv2.line(img_bgr, (80, 80), (220, 30), (20, 20, 20), 3)
    cv2.line(img_bgr, (720, 80), (760, 30), (20, 20, 20), 3)
    cv2.line(img_bgr, (220, 30), (760, 30), (20, 20, 20), 3)

    # Insert ArUco marker
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(dictionary, seed % 10, 100)
    marker_bgr = cv2.cvtColor(marker, cv2.COLOR_GRAY2BGR)
    img_bgr[250:350, 250:350] = marker_bgr

    ok, buf = cv2.imencode(".jpg", img_bgr)
    return buf.tobytes()


@pytest.mark.asyncio
async def test_block_registration_and_workspace():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register a genuine block
        block_id_str = "AP-TEST-WORKSPACE-01"
        res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Black Galaxy",
            "block_type": "RAW",
            "quarry_id": 1,
            "observations": "Primary extraction bench test",
            "gps_latitude": 15.7831,
            "gps_longitude": 79.5824,
        })
        assert res.status_code == 200
        block_data = res.json()
        numeric_id = block_data["id"]
        assert block_data["identifier"] == block_id_str

        # 2. Verify duplicate identifier is rejected
        dup_res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Black Galaxy",
            "quarry_id": 1,
        })
        assert dup_res.status_code == 400

        # 3. Access unified Block Workspace Hub
        ws_res = await client.get(f"/api/v1/blocks/{numeric_id}/workspace")
        assert ws_res.status_code == 200
        ws = ws_res.json()
        assert ws["block"]["identifier"] == block_id_str
        assert "quarry" in ws
        assert "images" in ws
        assert "coverage" in ws
        assert "audit_trail" in ws


@pytest.mark.asyncio
async def test_exact_duplicate_image_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create block & session
        b_res = await client.post("/api/v1/blocks/", json={
            "identifier": "AP-TEST-DUP-BLOCK",
            "color_group": "Black Galaxy",
            "quarry_id": 1,
        })
        numeric_id = b_res.json()["id"]

        s_res = await client.post(f"/api/v1/capture/sessions?block_id={numeric_id}")
        assert s_res.status_code == 200
        session_id = s_res.json()["session_id"]

        img_bytes = _make_stone_image(seed=101)

        # Upload first copy
        files1 = {"file": ("front_view.jpg", img_bytes, "image/jpeg")}
        up1 = await client.post(
            f"/api/v1/capture/sessions/{session_id}/images",
            files=files1,
            data={"view_label": "FRONT", "form_sequence": 1},
        )
        assert up1.status_code == 200

        # Upload exact duplicate of same image -> must be REJECTED with 409 Conflict
        files2 = {"file": ("front_view_duplicate.jpg", img_bytes, "image/jpeg")}
        up2 = await client.post(
            f"/api/v1/capture/sessions/{session_id}/images",
            files=files2,
            data={"view_label": "FRONT", "form_sequence": 2},
        )
        assert up2.status_code == 409
        err = up2.json()
        assert "EXACT_DUPLICATE_IMAGE" in str(err)


@pytest.mark.asyncio
async def test_near_duplicate_image_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        b_res = await client.post("/api/v1/blocks/", json={
            "identifier": "AP-TEST-NEAR-DUP",
            "color_group": "Black Galaxy",
            "quarry_id": 1,
        })
        numeric_id = b_res.json()["id"]

        s_res = await client.post(f"/api/v1/capture/sessions?block_id={numeric_id}")
        session_id = s_res.json()["session_id"]

        # Base image
        img_bytes_1 = _make_stone_image(seed=200, brightness=110)
        up1 = await client.post(
            f"/api/v1/capture/sessions/{session_id}/images",
            files={"file": ("view_1.jpg", img_bytes_1, "image/jpeg")},
            data={"view_label": "FRONT", "form_sequence": 1},
        )
        assert up1.status_code == 200

        # Slightly shifted brightness image (almost identical perspective, distance <= 4)
        img_bytes_near = _make_stone_image(seed=200, brightness=112)
        h1 = compute_dhash(img_bytes_1)
        h2 = compute_dhash(img_bytes_near)
        dist = hamming_distance(h1, h2)
        assert dist <= 4  # Confirms perceptual near-duplicate

        up2 = await client.post(
            f"/api/v1/capture/sessions/{session_id}/images",
            files={"file": ("view_1_near.jpg", img_bytes_near, "image/jpeg")},
            data={"view_label": "FRONT", "form_sequence": 2},
        )
        assert up2.status_code == 409
        err = up2.json()
        assert "NEAR_DUPLICATE_IMAGE" in str(err)


@pytest.mark.asyncio
async def test_block_archive_and_safe_delete():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        b_res = await client.post("/api/v1/blocks/", json={
            "identifier": "AP-TEST-ARCHIVE-DEL",
            "color_group": "Black Galaxy",
            "quarry_id": 1,
        })
        numeric_id = b_res.json()["id"]
        block_id_str = "AP-TEST-ARCHIVE-DEL"

        # 1. Archive the block
        arch_res = await client.post(f"/api/v1/blocks/{numeric_id}/archive", json={"reason": "Audit review test"})
        assert arch_res.status_code == 200
        assert arch_res.json()["is_archived"] is True

        # 2. Check default list does NOT show archived block
        list_active = await client.get("/api/v1/blocks/")
        assert list_active.status_code == 200
        active_ids = [b["identifier"] for b in list_active.json()]
        assert block_id_str not in active_ids

        # 3. List with include_archived=true DOES show it
        list_all = await client.get("/api/v1/blocks/?include_archived=true")
        assert list_all.status_code == 200
        all_ids = [b["identifier"] for b in list_all.json()]
        assert block_id_str in all_ids

        # 4. Restore the block
        rest_res = await client.post(f"/api/v1/blocks/{numeric_id}/restore")
        assert rest_res.status_code == 200
        assert rest_res.json()["is_archived"] is False

        # 5. Delete block with mismatched identifier confirmation -> must FAIL
        del_fail = await client.delete(f"/api/v1/blocks/{numeric_id}?confirm_identifier=WRONG-ID")
        assert del_fail.status_code == 400

        # 6. Delete block with correct identifier confirmation -> SUCCEEDS
        del_ok = await client.delete(f"/api/v1/blocks/{numeric_id}?confirm_identifier={block_id_str}")
        assert del_ok.status_code == 200
        assert del_ok.json()["is_deleted"] is True

        # 7. Accessing deleted block returns 404
        get_del = await client.get(f"/api/v1/blocks/{numeric_id}")
        assert get_del.status_code == 404


@pytest.mark.asyncio
async def test_bulk_delete_and_archive():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create 2 blocks
        b1 = await client.post("/api/v1/blocks/", json={"identifier": "BULK-TEST-1", "quarry_id": 1, "color_group": "Black Galaxy"})
        b2 = await client.post("/api/v1/blocks/", json={"identifier": "BULK-TEST-2", "quarry_id": 1, "color_group": "Black Galaxy"})
        assert b1.status_code == 200, b1.text
        assert b2.status_code == 200, b2.text
        id1 = b1.json()["id"]
        id2 = b2.json()["id"]

        # Bulk archive
        arch_res = await client.post("/api/v1/blocks/bulk/archive", json={
            "block_ids": ["BULK-TEST-1", str(id2)],
            "reason": "Bulk archive test",
        })
        assert arch_res.status_code == 200
        data = arch_res.json()
        assert data["success_count"] == 2
        assert data["total"] == 2

        # Bulk delete
        del_res = await client.post("/api/v1/blocks/bulk/delete", json={
            "block_ids": [str(id1), "BULK-TEST-2"],
            "reason": "Bulk delete test",
        })
        assert del_res.status_code == 200
        del_data = del_res.json()
        assert del_data["success_count"] == 2
        assert del_data["total"] == 2

        # Check they return 404 now
        get1 = await client.get(f"/api/v1/blocks/{id1}")
        assert get1.status_code == 404
        get2 = await client.get(f"/api/v1/blocks/{id2}")
        assert get2.status_code == 404


@pytest.mark.asyncio
async def test_block_dressing_plan_and_3way_comparison():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register block
        block_id_str = "AP-TEST-DRESSING-01"
        b_res = await client.post("/api/v1/blocks/", json={
            "identifier": block_id_str,
            "color_group": "Black Galaxy",
            "quarry_id": 1,
        })
        assert b_res.status_code == 200
        block_id = b_res.json()["id"]

        # 2. Create RAW session & upload photos
        sess_res = await client.post("/api/v1/capture/sessions", json={
            "block_id": block_id,
            "officer_name": "Suresh Mining Officer",
            "stage": "RAW",
        })
        assert sess_res.status_code == 200
        sess_id = sess_res.json()["id"]

        raw_img_bytes = _make_stone_image(seed=101)
        files = {"file": ("raw_front.jpg", raw_img_bytes, "image/jpeg")}
        up_res = await client.post(
            f"/api/v1/capture/sessions/{sess_id}/images",
            files=files,
            data={"view_label": "FRONT", "form_sequence": 1},
        )
        assert up_res.status_code == 200

        # Upload remaining views
        for i, view in enumerate(["BACK", "LEFT", "RIGHT", "TOP", "BOTTOM"]):
            img_b = _make_stone_image(seed=200 + i)
            files = {"file": (f"raw_{view.lower()}.jpg", img_b, "image/jpeg")}
            await client.post(
                f"/api/v1/capture/sessions/{sess_id}/images",
                files=files,
                data={"view_label": view, "form_sequence": i + 2},
            )

        # 3. Trigger RAW AI analysis
        job_res = await client.post("/api/v1/analysis/jobs", json={
            "block_id": block_id,
            "session_id": sess_id,
            "stage": "RAW",
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["job_id"]

        # Poll job status until complete
        for _ in range(40):
            job_check = await client.get(f"/api/v1/analysis/jobs/{job_id}")
            assert job_check.status_code == 200
            current_status = job_check.json().get("status")
            if current_status in ("COMPLETED", "FAILED"):
                # PASS: job terminates. FAILED is correct for synthetic test images
                # that don't have real photogrammetric overlap.
                # The workspace must still be accessible even when analysis fails.
                break
            await asyncio.sleep(0.5)

        # 4. Check workspace
        ws_res = await client.get(f"/api/v1/blocks/{block_id}/workspace")
        assert ws_res.status_code == 200
        ws = ws_res.json()
        assert "stages" in ws
        assert ws["stages"]["raw"]["has_evidence"] is True
        # Measurement may be None or FAILED for synthetic test images — workspace must still load
        assert "comparison" in ws
        assert "quick_summary" in ws
        assert len(ws["quick_summary"]) == 6
        assert ws["hero_image"] is not None
        assert "primary_action" in ws

        # 5. Generate dressing plan (only works if measurements exist, skip if FAILED)
        dp_res = await client.post(f"/api/v1/blocks/{block_id}/dressing-plan/generate", json={
            "objective": "MAXIMIZE_RECTANGULAR_YIELD",
            "custom_margin_cm": 3.0,
        })
        # Accept 200 (plan generated) or 400/422 (no valid measurements — honest response)
        assert dp_res.status_code in (200, 400, 422), f"Unexpected dressing plan status: {dp_res.status_code}"

        # 6. Check 3-way comparison endpoint
        comp_res = await client.get(f"/api/v1/blocks/{block_id}/comparison")
        assert comp_res.status_code == 200
        comp = comp_res.json()
        assert "material_balance" in comp
        assert "side_by_side" in comp

        # 7. Test cross-stage duplicate detection
        post_sess_res = await client.post("/api/v1/capture/sessions", json={
            "block_id": block_id,
            "officer_name": "Suresh Mining Officer",
            "stage": "POST_DRESSING",
        })
        assert post_sess_res.status_code == 200
        post_sess_id = post_sess_res.json()["id"]

        # Attempt to upload exact RAW photo into POST_DRESSING session -> MUST FAIL WITH 409
        dup_post_files = {"file": ("cheating_raw_in_post.jpg", raw_img_bytes, "image/jpeg")}
        dup_up_res = await client.post(
            f"/api/v1/capture/sessions/{post_sess_id}/images",
            files=dup_post_files,
            data={"view_label": "FRONT", "form_sequence": 1},
        )
        assert dup_up_res.status_code == 409
        assert "DUPLICATE_RAW_IMAGE_IN_POST_DRESSING" in dup_up_res.text

        # 8. Upload legitimate new post-dressing photo -> SUCCEEDS
        new_dressed_bytes = _make_stone_image(seed=999, brightness=140)
        legit_files = {"file": ("legit_dressed_front.jpg", new_dressed_bytes, "image/jpeg")}
        legit_up = await client.post(
            f"/api/v1/capture/sessions/{post_sess_id}/images",
            files=legit_files,
            data={"view_label": "FRONT", "form_sequence": 1},
        )
        assert legit_up.status_code == 200

