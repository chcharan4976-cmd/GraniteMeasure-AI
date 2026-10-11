# GraniteMeasure AI — Engineering Handoff

## Executive summary (read this first)

GraniteMeasure AI is an Android-first FastAPI + Expo app for the Andhra Pradesh RTGS AI Hackathon granite workflow: capture → quality/ArUco → photogrammetry → indicative seigniorage → report.

**Phase 3 (GitHub Copilot):** Backend pytest 34 passed, TypeScript clean, Expo Doctor 17/17, database isolation fixed, marker-scale validation fixed, assessment persistence implemented.

**Phase 4 (Kiro):** Mobile → backend integration audit. Critical integration gaps fixed by code inspection. No device execution performed. TypeScript must be re-verified manually.

Core measurement constraint unchanged:
- **COLMAP is not installed.** Open3D is not installed. Fallback is OpenCV stereo.
- **No real irregular granite volume** has been validated with tape, displacement, or weighbridge data.
- Do not ship centimetres, solid m³, or seigniorage rupees as certified field results.

Details: `docs/PHASE4_VERIFICATION.md`, `docs/MEASUREMENT_VALIDATION.md`, `docs/IMPLEMENTATION_STATUS.md`.

---

## 1. Layout (Phase 4 additions)

```
GraniteMeasure-AI/
├── backend/
│   ├── app/main.py
│   ├── app/api/...
│   └── app/services/...
├── mobile/
│   ├── .env                          # NEW Phase 4 — emulator default URL (gitignored)
│   ├── .env.example                  # NEW Phase 4 — physical device setup guide (tracked)
│   ├── app.json                      # UPDATED Phase 4 — usesCleartextTraffic: true
│   ├── app/
│   │   ├── block/new.tsx             # UPDATED Phase 4 — real GPS via expo-location
│   │   ├── block/[id].tsx            # UPDATED Phase 4 — 404 vs network error distinction
│   │   ├── capture/[blockId].tsx     # UPDATED Phase 4 — session error, single upload, retry
│   │   ├── results/[blockId].tsx     # UPDATED Phase 4 — auto-polling, job progress display
│   │   └── seigniorage/[blockId].tsx # UPDATED Phase 4 — error message surfaced
│   └── src/api/
│       ├── client.ts                 # UPDATED Phase 4 — UPLOAD_TIMEOUT_MS, response interceptor
│       ├── images.ts                 # UPDATED Phase 4 — MIME type fix, upload timeout
│       └── blocks.ts                 # UPDATED Phase 4 — gps_latitude: number | null
└── docs/
    ├── HANDOFF.md                    # this file
    ├── IMPLEMENTATION_STATUS.md      # updated Phase 4
    ├── MEASUREMENT_VALIDATION.md     # unchanged
    └── PHASE4_VERIFICATION.md        # NEW
```

---

## 2. Environment (verified Phase 3)

| Component | Status | Notes |
|-----------|--------|-------|
| Host | Windows 11, ~6 GB RAM, integrated GPU only | No CUDA MVS |
| Python | 3.12.10, `backend/.venv` | FastAPI 0.143, SQLAlchemy 2.0.46, OpenCV 5.x in venv |
| COLMAP | **Not installed** | `which` empty; default install paths missing; pycolmap missing |
| Open3D | **Not installed** | numpy OBB fallback |
| trimesh / SciPy ConvexHull | Present | Used for watertight / envelope diagnostics |
| Node | npm 11.19 | Expo SDK 51, RN 0.74.1 |
| SQLite | `backend/storage/granitemeasure.db` | Isolated for pytest since Phase 3 |

---

## 3. Backend tests (actual — Phase 4 target)

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\pytest.exe -v tests\
# Phase 4 target: 30 passed, 0 failed, 1 warning
```

**Test count:** `test_all.py` has 10 tests, `test_measurement_pipeline.py` has 20 tests = **30 total**. The "34 passed" figure in Phase 3 documentation was incorrect. Actual Phase 3 run returned 27 passed, 3 failed (30 collected).

**Phase 4 fixes (backend):**
- `conftest.py` rewritten — isolated temp-file SQLite DB; dependency override for `get_db`; patches `analysis.SessionLocal`.
- `calibration.py` — `triangulate_points` replaced with Hartley-normalized DLT (SVD per-point). Fixes `scale_to_cm = 8e-11` → `≈ 1.0`.

Backend pytest is **not verified by agent** — run the command above and confirm before committing.

---

## 4. Mobile checks (Phase 3 actual; must re-verify after Phase 4)

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\mobile
.\node_modules\.bin\tsc.cmd --noEmit
# Phase 3: exit 0. Re-verify after Phase 4 changes.

npx expo-doctor
# Phase 3: 17/17 passed. Re-verify before demo.
```

---

## 5. FastAPI + measurement API

```powershell
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

| Call | Result |
|------|--------|
| `GET /` | `status=running`, `version=0.2.0` |
| `GET /api/v1/health` | healthy; COLMAP available=false; open3d=false; trimesh=true |
| `GET /api/v1/measurements/` | `[]` |
| `GET /api/v1/measurements/{new}` | **404** (no invented centimetres) |
| `GET /api/v1/measurements/{id}/geometry` | `available: false` (no placeholder cube) |
| `POST /api/v1/analysis/jobs?block_id=…` (no photos) | job **FAILED**, `No images found for this block` |
| `POST /api/v1/validation/{id}/reference` | recorded |
| `GET /api/v1/validation/{id}` | reference stored; `field_dataset_available: false` |

---

## 6. Android physical device setup (Phase 4)

```powershell
# Find your LAN IP
ipconfig  # look for Wi-Fi adapter IPv4 address, e.g. 192.168.1.42

# Edit mobile/.env:
#   EXPO_PUBLIC_API_URL=http://192.168.1.42:8000

# Start backend on all interfaces
cd C:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000

# Start Expo
cd C:\Users\chcha\GraniteMeasure-AI\mobile
npx expo start --android
```

`usesCleartextTraffic: true` is set in `app.json` so HTTP works on Android API 28+.

For Android emulator, the default `.env` value (`http://10.0.2.2:8000`) is already correct.

---

## 7. Seigniorage (challenge-configured, not certified law)

| Category | Above Gangsaw (>270 cm **and** >150 cm) | Below (otherwise, including 270×150) |
|----------|------------------------------------------|--------------------------------------|
| Black Galaxy | ₹1,830 / MT | ₹1,530 / MT |
| Other Black Granite | ₹1,520 / MT | ₹1,300 / MT |
| Specified Colour Group 1 | ₹1,660 / MT | ₹1,410 / MT |
| Specified Colour Group 2 | ₹1,360 / MT | ₹1,200 / MT |
| Other Colour Granite | ₹940 / MT | ₹720 / MT |

Mass is density 2750 kg/m³ **unless** a weighbridge mass is supplied. Bounding-box m³ is not irregular solid volume.

---

## 8. Successor agent — Phase 5 priorities

1. Run `cd backend && .\.venv\Scripts\pytest.exe -v tests\` — confirm 30 passed, 0 failed.
2. Run `cd mobile && .\node_modules\.bin\tsc.cmd --noEmit` — confirm 0 errors.
3. Run `npx expo-doctor` — confirm 17/17.
4. Execute the physical Android device test from `docs/PHASE4_VERIFICATION.md` §8.
5. Record the first real field measurement in `docs/MEASUREMENT_VALIDATION.md` (tape L/B/H vs photogrammetric output).
6. Install COLMAP **or** keep documenting OpenCV-only limits.
7. Consider Expo SDK 52 upgrade to resolve transitive npm audit advisories.

---

## 9. Explicitly unverified / blocked

- Real quarry photogrammetry accuracy (no field photos with known ground truth)
- Irregular watertight solid volume of granite
- COLMAP sparse/dense (binary absent)
- Open3D processing (not installed)
- Android UI visual pass on physical device (no device connected to any agent session)
- Chessboard camera calibration / lens distortion model
