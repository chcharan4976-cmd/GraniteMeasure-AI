"""Runtime configuration for the measurement pipeline.

Values can be overridden with environment variables. None of these
constants imply certified field accuracy.
"""

from __future__ import annotations

import os
from pathlib import Path


def _float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


# Known physical ArUco marker edge length used for metric scale.
# Every reported centimetre must trace back to this value (or a per-session override).
DEFAULT_MARKER_SIZE_CM = _float("GRANITE_MARKER_SIZE_CM", 10.0)

# Longest image edge used during reconstruction. Originals are kept on disk.
MAX_IMAGE_EDGE = _int("GRANITE_MAX_IMAGE_EDGE", 1600)

# Hard cap for a single analysis job (CPU photogrammetry).
JOB_TIMEOUT_SEC = _int("GRANITE_JOB_TIMEOUT_SEC", 180)

# Free disk required before reconstructing.
MIN_FREE_DISK_MB = _int("GRANITE_MIN_FREE_DISK_MB", 200)

# Minimum good ORB matches after ratio test + RANSAC.
MIN_PAIR_INLIERS = _int("GRANITE_MIN_PAIR_INLIERS", 30)

# Minimum triangulated points after depth filtering.
MIN_RECONSTRUCTED_POINTS = _int("GRANITE_MIN_RECONSTRUCTED_POINTS", 20)

# Assumed granite density used ONLY for indicative mass estimates.
# Never treat this as a weighbridge measurement.
ASSUMED_DENSITY_KG_M3 = _float("GRANITE_ASSUMED_DENSITY_KG_M3", 2750.0)

# Challenge text: Above Gangsaw if > 270 cm × 150 cm; Below if ≤ 270 cm × 150 cm.
# Mode "strict_gt" implements that wording. "gte" is the previous (incorrect) rule.
GANGSAW_MODE = os.environ.get("GRANITE_GANGSAW_MODE", "strict_gt").strip().lower()
GANGSAW_LENGTH_CM = _float("GRANITE_GANGSAW_LENGTH_CM", 270.0)
GANGSAW_WIDTH_CM = _float("GRANITE_GANGSAW_WIDTH_CM", 150.0)

# How plan dimensions are chosen for gangsaw classification.
# "sorted_length_breadth" uses the two submitted plan values sorted descending,
# ignoring height. Mixed orientations remain pending departmental confirmation.
GANGSAW_ORIENTATION_RULE = os.environ.get(
    "GRANITE_GANGSAW_ORIENTATION_RULE", "sorted_length_breadth"
)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
STORAGE_ROOT = BACKEND_ROOT / "storage"
WORKSPACE_ROOT = STORAGE_ROOT / "workspaces"
GEOMETRY_ROOT = STORAGE_ROOT / "geometry"

COLMAP_BIN = os.environ.get("COLMAP_BIN", "").strip() or None
