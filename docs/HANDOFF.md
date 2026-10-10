# GraniteMeasure AI — Engineering Handoff & Architecture Document

## Executive Summary

GraniteMeasure AI is an Android-first, computer-vision-powered mobile application designed for the Andhra Pradesh Government RTGS AI Hackathon granite measurement use case.

The system delivers an auditable end-to-end workflow:
**Physical granite block → Smartphone camera capture → OpenCV image quality & ArUco calibration → Photogrammetric measurement → Automated indicative seigniorage assessment → Official auditable inspection report.**

---

## 1. Project Directory Structure

```
GraniteMeasure-AI/
├── backend/                              # Python 3.12 FastAPI backend
│   ├── .venv/                            # Virtual environment
│   ├── app/
│   │   ├── main.py                       # FastAPI application entry point & CORS
│   │   ├── database.py                   # SQLAlchemy async engine & sessionmaker (expire_on_commit=False)
│   │   ├── models/                       # SQLAlchemy ORM models (16 tables)
│   │   │   └── __init__.py               # User, Quarry, GraniteBlock, CaptureSession, BlockImage,
│   │   │                                 # ImageQualityResult, CalibrationResult, AnalysisJob,
│   │   │                                 # MeasurementResult, SeigniorageRateVersion, SeigniorageRate,
│   │   │                                 # SeigniorageAssessment, ManualVerification, WeighbridgeRecord,
│   │   │                                 # DispatchRecord, AuditLog
│   │   ├── schemas/                      # Pydantic v2 schemas for all models & request/response
│   │   │   └── __init__.py
│   │   ├── api/                          # REST API routers
│   │   │   ├── auth.py                   # Role-based local dev authentication (Officer, Operator, Supervisor, Admin)
│   │   │   ├── quarries.py               # Quarry lease registry & geolocation
│   │   │   ├── blocks.py                 # Block registration, metadata, and status
│   │   │   ├── images.py                 # Single-image OpenCV analysis & ArUco detection
│   │   │   ├── capture.py                # Multi-view capture sessions & sequenced image storage
│   │   │   ├── analysis.py               # Background async measurement jobs (FastAPI BackgroundTasks)
│   │   │   ├── measurements.py           # Measured metric dimensions, solid volume & confidence
│   │   │   ├── seigniorage.py            # AP challenge statutory rates & gangsaw classification engine
│   │   │   ├── reports.py                # Comprehensive auditable block inspection reports
│   │   │   └── audit.py                  # Immutable audit logs & transaction trails
│   │   ├── ai/
│   │   │   └── image_analyzer.py         # OpenCV blur (Laplacian variance), contrast, brightness, ArUco 4x4
│   │   └── services/
│   │       ├── seigniorage.py            # SeigniorageEngine with challenge rates and 270x150cm threshold
│   │       ├── measurement.py            # MeasurementEngine with feature matching, pose recovery & triangulation
│   │       └── report_generator.py       # Structured report payload builder
│   ├── storage/                          # Persistent storage
│   │   ├── granitemeasure.db             # SQLite database file
│   │   ├── uploads/                      # Raw evidentiary image uploads (SHA-256 hashed)
│   │   └── results/                      # Annotated detection overlays (ArUco bounding boxes)
│   └── tests/
│       └── test_all.py                   # 10 comprehensive unit & integration tests (100% passing)
├── mobile/                               # React Native Expo application (TypeScript strict mode)
│   ├── app/                              # Expo Router file-based screens
│   │   ├── _layout.tsx                   # Root layout with ThemeProvider, QueryClient, and Manrope fonts
│   │   ├── index.tsx                     # Startup routing & session verification
│   │   ├── welcome.tsx                   # Language selection (English / తెలుగు) & theme preview
│   │   ├── auth.tsx                      # Officer/Operator role authentication connected to backend
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx               # Tab navigation
│   │   │   ├── home.tsx                  # Command Center with live backend stats & quick actions
│   │   │   ├── blocks.tsx                # Registered block list with live search, filtering & refresh
│   │   │   └── settings.tsx              # Language (English/Telugu) & Theme (Dark/Light/System)
│   │   ├── block/
│   │   │   ├── new.tsx                   # Block registration with real quarry picker & rate categories
│   │   │   └── [id].tsx                  # Block detail view showing metadata, dimensions, and actions
│   │   ├── capture/
│   │   │   └── [blockId].tsx             # Fullscreen camera with framing guide, live OpenCV quality/ArUco analysis
│   │   ├── results/
│   │   │   └── [blockId].tsx             # Prominent metric measurement display (L × B × H, volume, tonnage, confidence)
│   │   ├── seigniorage/
│   │   │   └── [blockId].tsx             # Statutory seigniorage assessment, gangsaw classification & rate calculation
│   │   └── report/
│   │       └── [blockId].tsx             # Official auditable inspection report with provenance & audit trail
│   ├── src/
│   │   ├── api/                          # Axios API clients for backend endpoints
│   │   │   ├── client.ts                 # Dynamic platform base URL (Android 10.0.2.2 / iOS / web)
│   │   │   ├── auth.ts                   # Auth API
│   │   │   ├── quarries.ts               # Quarries API
│   │   │   ├── blocks.ts                 # Blocks API
│   │   │   ├── images.ts                 # Images & photogrammetry analysis API
│   │   │   └── seigniorage.ts            # Seigniorage rate calculation API
│   │   ├── components/                   # Reusable UI component library
│   │   │   ├── BlockCard.tsx             # Block list summary card
│   │   │   ├── Button.tsx                # Primary, secondary, outline button variants
│   │   │   ├── Card.tsx                  # Mineral Intelligence elevated surface card
│   │   │   ├── EmptyState.tsx            # Clean empty states
│   │   │   ├── Header.tsx                # Screen navigation header
│   │   │   ├── LoadingState.tsx          # Skeleton loader
│   │   │   ├── MeasurementDisplay.tsx    # High-contrast tabular numeric measurement readout
│   │   │   └── StatusBadge.tsx           # Status chips (MEASURED, ESTIMATED, PARTIAL, FAILED)
│   │   ├── i18n/                         # Internationalization
│   │   │   ├── en.ts                     # English translations
│   │   │   ├── te.ts                     # తెలుగు translations (Andhra Pradesh native support)
│   │   │   └── useTranslation.ts         # Zustand-backed reactive translation hook
│   │   ├── store/                        # Lightweight local state (Zustand)
│   │   │   ├── useAuthStore.ts           # Authenticated user session
│   │   │   └── useSettingsStore.ts       # Theme and language preferences
│   │   └── theme/                        # Mineral Intelligence design system tokens
│   │       ├── colors.ts                 # Dark (#0B1116) and Light (#F6F8F6) palettes
│   │       ├── spacing.ts                # 8-point spatial rhythm
│   │       ├── typography.ts             # Manrope & IBM Plex Mono typography scale
│   │       └── ThemeContext.tsx          # React Context providing dynamic theme colors
│   ├── package.json
│   ├── tsconfig.json                     # TypeScript strict mode configuration
│   └── app.json
└── docs/
    ├── HANDOFF.md                        # This document
    └── IMPLEMENTATION_STATUS.md          # Feature matrix with verified statuses
```

---

## 2. Environment Verification & Limitations

| Component | Status | Verified Version | Notes |
|-----------|--------|------------------|-------|
| Host OS | Active | Windows 11 Home Single Language | 64-bit architecture |
| Host Memory | Active | 6,087 MB Total (~350MB–800MB Free) | Memory-conscious batch processing required |
| Dedicated GPU | None | Integrated GPU only | No CUDA; SAM2/CUDA-accelerated MVS disabled |
| COLMAP | Not Installed | N/A | Photogrammetry handled via OpenCV feature pipeline |
| Python | Active | 3.12.10 | Backend runtime |
| Node.js | Active | v24.21.0 (npm 11.19.0) | Mobile app runtime |
| OpenCV | Active | 5.0.0 | ArUco 4x4, ORB feature matching, Essential Matrix |
| FastAPI | Active | 0.143.0 | Asynchronous REST backend |
| SQLAlchemy | Active | 2.0.46 (with aiosqlite + greenlet) | `expire_on_commit=False` enabled |
| Expo / React Native | Active | Expo SDK 51 / React Native 0.74.1 | Android-first mobile architecture |

---

## 3. Verified Backend Test Results

Backend test suite at `backend/tests/test_all.py` was executed using pytest:

```powershell
& "c:\Users\chcha\GraniteMeasure-AI\backend\.venv\Scripts\pytest.exe" -v "c:\Users\chcha\GraniteMeasure-AI\backend\tests\test_all.py"
```

**Results (10/10 Passed - 100%):**
```
tests/test_all.py::test_root_endpoint PASSED                             [ 10%]
tests/test_all.py::test_health_check PASSED                              [ 20%]
tests/test_all.py::test_auth_login PASSED                                [ 30%]
tests/test_all.py::test_quarry_creation_and_listing PASSED               [ 40%]
tests/test_all.py::test_block_registration_and_retrieval PASSED          [ 50%]
tests/test_all.py::test_seigniorage_rates_endpoint PASSED                [ 60%]
tests/test_all.py::test_seigniorage_engine_classification PASSED         [ 70%]
tests/test_all.py::test_opencv_image_analyzer PASSED                     [ 80%]
tests/test_all.py::test_dashboard_endpoint PASSED                        [ 90%]
tests/test_all.py::test_report_endpoint PASSED                           [100%]
======================== 10 passed, 1 warning in 4.48s ========================
```

---

## 4. Verified Mobile Compilation

Mobile application typechecking executed using TypeScript compiler:

```powershell
cd c:\Users\chcha\GraniteMeasure-AI\mobile
& .\node_modules\.bin\tsc.cmd --noEmit
```

**Result:**
Exit code `0` — Zero errors in strict TypeScript mode.

---

## 5. How to Run the Application

### A. Start the Backend API Server
```powershell
cd c:\Users\chcha\GraniteMeasure-AI\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`
- Dashboard API: `http://localhost:8000/api/v1/dashboard`

### B. Start the Mobile Application
```powershell
cd c:\Users\chcha\GraniteMeasure-AI\mobile
npx expo start
```
- Press `a` to open in Android Emulator
- Press `w` to open in Web Browser preview
- Scan QR code with Expo Go app on a physical Android device on the same local Wi-Fi

---

## 6. Configured Seigniorage Assessment Rates

Challenge-configured rates per Metric Tonne (MT) for Andhra Pradesh Granite Mining:

| Granite Category | Gangsaw Size (≥ 270 cm × 150 cm) | Below Gangsaw Size (< 270 cm × 150 cm) | Unit |
|------------------|----------------------------------|----------------------------------------|------|
| **Black Galaxy** | **₹1,830 / MT** | **₹1,530 / MT** | ₹/MT |
| **Other Black Granite** | **₹1,520 / MT** | **₹1,300 / MT** | ₹/MT |
| **Specified Colour Granite Group 1** | **₹1,660 / MT** | **₹1,410 / MT** | ₹/MT |
| **Specified Colour Granite Group 2** | **₹1,360 / MT** | **₹1,200 / MT** | ₹/MT |
| **Other Colour Granite** | **₹940 / MT** | **₹720 / MT** | ₹/MT |

*Calculation Formula:*
$$\text{Bounding Volume } (m^3) = \frac{\text{Length (cm)}}{100} \times \frac{\text{Breadth (cm)}}{100} \times \frac{\text{Height (cm)}}{100}$$
$$\text{Estimated Mass } (\text{MT}) = \text{Volume } (m^3) \times \frac{2750 \text{ kg/m}^3}{1000}$$
$$\text{Indicative Seigniorage } (₹) = \text{Rate } (₹/\text{MT}) \times \text{Mass } (\text{MT})$$

---

## 7. Immediate Next Action for Successor Agent

1. Launch Expo dev server (`npx expo start`) and verify visual rendering on Android device / emulator.
2. In the 3D digital twin viewer (Screen 12), wire the recovered point cloud from `details.bounding_box` into an interactive Three.js / Expo GL canvas.
3. Test physical image captures with printed ArUco Dict 4x4 markers.
