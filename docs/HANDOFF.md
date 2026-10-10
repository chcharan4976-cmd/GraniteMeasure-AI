# GraniteMeasure AI — Engineering Handoff

## Executive summary (read this first)

GraniteMeasure AI is an Android-first FastAPI + Expo app for the Andhra Pradesh RTGS AI Hackathon granite workflow: capture → quality/ArUco → photogrammetry → indicative seigniorage → report.

**Phase 2 verification on 2026-10-10 did not complete the measurement problem.**

- Backend pytest: **25 passed, 5 failed** (not 10/10).
- FastAPI **does start** (v0.2.0) and measurement/geometry APIs **fail closed** when there is no reconstruction.
- **COLMAP is not installed.** Open3D is not installed. Fallback is OpenCV stereo.
- **No real irregular granite volume** has been validated with tape, displacement, or weighbridge data.
- Mobile `tsc --noEmit` is clean; `expo-doctor` reports **3 failed checks**.
- Do not ship centimetres, solid m³, or seigniorage rupees as certified field results.

Details: `docs/MEASUREMENT_VALIDATION.md`, `docs/IMPLEMENTATION_STATUS.md`.

---

## 1. Layout (Phase 2 additions)

```
GraniteMeasure-AI/
├── backend/
│   ├── app/main.py                 # FastAPI 0.2.0, health reports tool availability
│   ├── app/api/validation.py       # Tape/weighbridge reference vs measurement
│   ├── app/services/
│   │   ├── measurement.py          # OpenCV stereo + optional COLMAP; withhold unscaled cm
│   │   ├── calibration.py          # ArUco + triangulated marker scale
│   │   ├── geometry.py             # OBB, coverage, watertight / irregular volume gate
│   │   ├── colmap_runner.py        # Honest COLMAP discovery; no fake success
│   │   ├── pipeline_config.py      # Marker size, timeouts, gangsaw mode
│   │   ├── validation.py           # Error vs tape (not field proof)
│   │   └── seigniorage.py          # strict_gt 270×150, density vs weighbridge
│   └── tests/
│       ├── test_all.py
│       └── test_measurement_pipeline.py
├── mobile/
│   ├── app/geometry/[blockId].tsx
│   └── src/components/GeometryViewer.tsx   # Unavailable ≠ generic cube
└── docs/
    ├── HANDOFF.md
    ├── IMPLEMENTATION_STATUS.md
    └── MEASUREMENT_VALIDATION.md
```

---

## 2. Environment (verified 2026-10-10)

| Component | Status | Notes |
|-----------|--------|-------|
| Host | Windows 11, ~6 GB RAM, integrated GPU only | No CUDA MVS |
| Python | 3.12.10, `backend/.venv` | FastAPI 0.143, SQLAlchemy 2.0.46, OpenCV 5.x in venv |
| COLMAP | **Not installed** | `which` empty; default install paths missing; pycolmap missing |
| Open3D | **Not installed** | numpy OBB fallback |
| trimesh / SciPy ConvexHull | Present | Used for watertight / envelope diagnostics |
| Node | npm 11.19 | Expo SDK 51, RN 0.74.1 |
| SQLite | `backend/storage/granitemeasure.db` | **Not** isolated for pytest; `*.db` gitignored |

---

## 3. Backend tests (actual)

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\pytest.exe -v tests\
```

```
================== 5 failed, 25 passed, 1 warning in 25.16s ===================
```

Failed:

1. `test_quarry_creation_and_listing` — unique `quarries.code`
2. `test_block_registration_and_retrieval` — unique `granite_blocks.identifier`
3. `test_valid_metric_scaling_from_triangulated_marker` — `scale_to_cm == 8.05e-11` (expected ~1)
4. `test_real_model_retrieval_unavailable_without_artifact` — missing `geometry_artifacts` under TestClient
5. `test_validation_reference_roundtrip` — missing `physical_references` under TestClient

After a real uvicorn start, `create_all` created those two tables (confirmed by sqlite listing and live validation POST). Pytest still should not share the operator database.

---

## 4. Mobile checks (actual)

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\mobile
.\node_modules\.bin\tsc.cmd --noEmit
# TSC_EXIT=0

npx expo-doctor
# 14/17 passed, 3 failed, exit 1
```

Expo doctor failures:

- Missing `./assets/icon.png`, `splash.png`, `adaptive-icon.png`
- Missing peer deps `expo-constants`, `expo-linking` (required by expo-router)
- Version skew: `react-native` 0.74.1 vs expected 0.74.5; image-picker / safe-area / typescript vs SDK 51 pins

Android emulator / Expo Go visual pass was **not** run in this verification session.

---

## 5. FastAPI + measurement API (actual)

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

| Call | Result |
|------|--------|
| `GET /` | `status=running`, `version=0.2.0` |
| `GET /api/v1/health` | healthy; COLMAP available=false; open3d=false; trimesh=true |
| `GET /api/v1/measurements/` | `[]` |
| `GET /api/v1/measurements/{new}` | **404** |
| `GET /api/v1/measurements/{id}/geometry` | `available: false` (no placeholder cube) |
| `POST /api/v1/analysis/jobs?block_id=…` (no photos) | job **FAILED**, `No images found for this block` |
| `POST /api/v1/validation/{id}/reference` | recorded |
| `GET /api/v1/validation/{id}` | reference stored; `field_dataset_available: false` |

---

## 6. Seigniorage (challenge-configured, not certified law)

| Category | Above Gangsaw (>270 cm **and** >150 cm) | Below (otherwise, including 270×150) |
|----------|------------------------------------------|--------------------------------------|
| Black Galaxy | ₹1,830 / MT | ₹1,530 / MT |
| Other Black Granite | ₹1,520 / MT | ₹1,300 / MT |
| Specified Colour Group 1 | ₹1,660 / MT | ₹1,410 / MT |
| Specified Colour Group 2 | ₹1,360 / MT | ₹1,200 / MT |
| Other Colour Granite | ₹940 / MT | ₹720 / MT |

Mass is density 2750 kg/m³ **unless** a weighbridge mass is supplied. Bounding-box m³ is not irregular solid volume.

---

## 7. How to run

Backend:

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

Mobile:

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\mobile
npx expo start
```

---

## 8. Successor agent — GitHub Copilot Free priorities

1. Point pytest at a temp SQLite file and call `Base.metadata.create_all` in fixtures so unique keys and new tables do not depend on the operator DB.
2. Fix `metric_scale_from_marker_pair` / `triangulate_points` (`w` clip exploding coordinates); require a sane scale or return `None`.
3. Install COLMAP **or** keep documenting OpenCV-only limits; never fake COLMAP success.
4. Collect a real multi-view set with a measured ArUco edge and tape L/B/H; fill `MEASUREMENT_VALIDATION.md`. Do not call bbox volume irregular volume.
5. Restore Expo assets; `npx expo install expo-constants expo-linking`; align SDK 51 package versions.
6. Do not add features until (1)–(2) are green and a field dataset exists.

---

## 9. Explicitly unverified / blocked

- Real quarry photogrammetry accuracy
- Irregular watertight solid volume of granite
- COLMAP sparse/dense
- Open3D processing
- Android UI this session
- Chessboard camera calibration / lens distortion model
