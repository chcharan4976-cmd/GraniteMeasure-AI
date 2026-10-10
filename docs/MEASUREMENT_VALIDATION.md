# GraniteMeasure AI — Measurement Validation Record

Last updated: 2026-10-10 (Phase 2 verification session)

This file records **what was actually run**, not intended capability.
Algorithmic unit tests are **not** field accuracy.

## Verdict

**Real irregular granite volume has not been validated against physical measurements.**

No independently photographed quarry block, tape-measure log, or weighbridge ticket is bundled in this repository. `GET /api/v1/validation/{block_id}` currently always returns `field_dataset_available: false`.

A tape-measure rectangular prism (L × B × H) is **not** ground truth for an irregular solid. Density × bounding-box volume is **not** a weighbridge mass.

## What was executed (2026-10-10)

| Check | Command / method | Result |
|-------|------------------|--------|
| Backend pytest | `backend\.venv\Scripts\pytest.exe -v tests\` | **25 passed, 5 failed**, 1 warning, 25.16s |
| TypeScript | `mobile\node_modules\.bin\tsc.cmd --noEmit` | **Exit 0** (0 errors) |
| Expo diagnostics | `npx expo-doctor` (expo-doctor 1.20.4) | **14/17 passed, 3 failed**, exit 1 |
| FastAPI startup | `uvicorn app.main:app --host 127.0.0.1 --port 8000` | **Started**; `/` returns version `0.2.0` |
| Health / tools | `GET /api/v1/health` | `healthy`; COLMAP unavailable; Open3D false; trimesh true |
| Measurement API | `GET /api/v1/measurements/` | Empty list (0 stored measurements) |
| Missing measurement | `GET /api/v1/measurements/{new_block}` | **404** (no invented centimetres) |
| Geometry failure | `GET /api/v1/measurements/{id}/geometry` | `available: false`, no placeholder cube |
| Job without photos | `POST /api/v1/analysis/jobs?block_id=…` | Job **FAILED**: `No images found for this block` |
| Tape reference API | `POST /api/v1/validation/{id}/reference` | Recorded after live `create_all` |
| COLMAP binary | `Get-Command colmap`, candidate paths, `shutil.which` | **Not installed** |
| pycolmap | import in venv | **ModuleNotFoundError** |
| Open3D | `geometry.o3d` | **Not installed** |
| trimesh / ConvexHull | import | **Present** |

## Pytest detail

### Passed (25)

`test_all.py`: root, health, auth login, seigniorage rates, seigniorage engine classification, OpenCV image analyzer, dashboard, report.

`test_measurement_pipeline.py`: missing marker; incorrect marker size changes apparent 2D scale; invalid image load → FAILED / NOT_CALIBRATED; insufficient overlap → FAILED; too few images without marker → FAILED; single image with marker **withholds centimetres**; uncalibrated reconstruction **withholds centimetres**; OBB extents on a synthetic box; incomplete geometry does not invent solid volume; watertight mesh check (trimesh); unit conversion; tape-vs-measured comparison **function** (synthetic numbers); gangsaw strict `>`; job status without images; COLMAP status honesty; health tools; weighbridge mass not overwritten by density.

### Failed (5)

| Test | Cause |
|------|--------|
| `test_quarry_creation_and_listing` | `UNIQUE constraint failed: quarries.code` (`CGQ-001`) — tests write the **persistent** `storage/granitemeasure.db` |
| `test_block_registration_and_retrieval` | `UNIQUE constraint failed: granite_blocks.identifier` (`TEST-BLK-001`) — same persistent DB |
| `test_valid_metric_scaling_from_triangulated_marker` | `scale_to_cm` was `8.05e-11` instead of `~1.0` (triangulation / `w` handling, not a field photo) |
| `test_real_model_retrieval_unavailable_without_artifact` | `no such table: geometry_artifacts` under TestClient (table **did** exist after later uvicorn `create_all`) |
| `test_validation_reference_roundtrip` | `no such table: physical_references` under TestClient (table **did** exist after later uvicorn `create_all`) |

## Calibration and geometry failure handling

Verified in pytest (algorithmic) and/or live HTTP:

- Missing ArUco → `detected: false`.
- Unreadable file → measurement `FAILED`, `NOT_CALIBRATED`, centimetres null.
- Two unmatched noise images → `FAILED` (overlap / reconstruction wording).
- One photo, even with a marker → centimetres **withheld** (`PARTIAL` or `FAILED`, `NOT_CALIBRATED`).
- Reconstruction without verified 3D marker scale → centimetres **withheld**; `irregular_volume_status` = `IRREGULAR_VOLUME_UNAVAILABLE`.
- Incomplete synthetic surfaces → irregular volume **not** invented by closing faces.
- Live geometry endpoint without an artifact → `available: false` and explicit “do not show a placeholder cube”.
- Live analysis with no images → job `FAILED` with `No images found for this block`.

**Not verified:** recovering a correct centimetre scale from triangulated marker corners (the synthetic stereo test failed). **Not verified:** failure behaviour on real quarry photographs.

## COLMAP installation (this host, 2026-10-10)

| Probe | Result |
|-------|--------|
| `shutil.which("colmap")` | `None` |
| `C:\Program Files\COLMAP\bin\colmap.exe` | Missing |
| `C:\COLMAP\bin\colmap.exe` | Missing |
| `%USERPROFILE%\COLMAP\bin\colmap.exe` | Missing |
| `pycolmap` | Not installed |
| Health payload | `"available": false` |

OpenCV stereo is the only reconstruction path that can run on this machine. Dense MVS was not run. Open3D is not installed.

## Physical / field validation

| Item | Status |
|------|--------|
| Printed ArUco of known millimetre size used on a real block | **Not done in this session** |
| Multi-view photos of an irregular granite block | **Not in repo** |
| Tape L/B/H compared to photogrammetry on the same stone | **Not done** (API can store a reference; no measured result to compare) |
| Displacement / water volume of irregular solid | **Not done** |
| Weighbridge mass vs density estimate | **Not done** |
| COLMAP sparse/dense on field set | **Impossible here** (binary absent) |

Do not treat:

- bounding-box volume as irregular solid volume
- convex hull volume as measured granite volume
- `progress_pct` as reconstruction completeness
- confidence labels as certified uncertainty
- challenge seigniorage rates as certified current law

## What would constitute first real validation

1. Print ArUco DICT_4X4 with a **measured** edge length; record that length in the session.
2. Capture overlapping views of a **real** irregular block, including undersides if claiming solid volume.
3. Independent tape L, B, H (and note that this is still a rectangular envelope).
4. Optional: weighbridge mass.
5. Run the pipeline **without** inventing centimetres if scale fails.
6. Record absolute and relative errors in this file. Irregular volume remains unavailable until a watertight, observed-face mesh exists.
