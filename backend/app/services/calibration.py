"""ArUco metric calibration and scale recovery.

A marker detected in a single photograph does not make a multi-view
reconstruction metric. Scale is applied only when marker corners can be
reconstructed in 3D from calibrated (or jointly estimated) cameras, or
when PnP poses from known marker geometry are available in two views.
"""

from __future__ import annotations

import logging
from typing import Optional

import cv2
import numpy as np

from app.services.pipeline_config import DEFAULT_MARKER_SIZE_CM

logger = logging.getLogger(__name__)

ARUCO_DICT_ID = cv2.aruco.DICT_4X4_50


def _detector() -> cv2.aruco.ArucoDetector:
    dictionary = cv2.aruco.getPredefinedDictionary(ARUCO_DICT_ID)
    params = cv2.aruco.DetectorParameters()
    return cv2.aruco.ArucoDetector(dictionary, params)


def estimate_intrinsics(image: np.ndarray, exif: Optional[dict] = None) -> dict:
    """Approximate camera matrix.

    If EXIF focal length in millimetres and sensor width are unavailable,
    focal length is approximated as max(image width, height). This is an
    engineering estimate, not a laboratory calibration.
    """
    h, w = image.shape[:2]
    focal = float(max(h, w))
    source = "IMAGE_SIZE_HEURISTIC"
    if exif:
        focal_mm = exif.get("FocalLength")
        sensor_w = exif.get("FocalPlaneXResolution")
        if focal_mm and sensor_w:
            try:
                focal = float(focal_mm) * (w / float(sensor_w))
                source = "EXIF_APPROXIMATION"
            except (TypeError, ValueError, ZeroDivisionError):
                pass
    K = np.array(
        [[focal, 0.0, w / 2.0], [0.0, focal, h / 2.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    dist = np.zeros(5, dtype=np.float64)
    return {
        "K": K,
        "dist_coeffs": dist,
        "width": w,
        "height": h,
        "intrinsics_source": source,
        "notes": (
            "Intrinsics are not from a chessboard calibration board. "
            "Lens distortion is treated as zero unless a calibrated profile is supplied."
        ),
    }


def detect_markers(
    image: np.ndarray,
    marker_size_cm: float = DEFAULT_MARKER_SIZE_CM,
) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    corners, ids, _rejected = _detector().detectMarkers(gray)
    if ids is None or len(ids) == 0:
        return {
            "detected": False,
            "marker_count": 0,
            "markers": [],
            "apparent_scale_px_per_cm": None,
            "marker_size_cm_assumed": marker_size_cm,
            "scale_source": None,
        }

    markers = []
    apparent_scales = []
    for marker_id, marker_corners in zip(ids.flatten(), corners):
        pts = marker_corners.reshape(4, 2).astype(np.float64)
        edge_px = [
            float(np.linalg.norm(pts[i] - pts[(i + 1) % 4])) for i in range(4)
        ]
        avg_edge = float(np.mean(edge_px))
        apparent = avg_edge / marker_size_cm if marker_size_cm > 0 else None
        if apparent:
            apparent_scales.append(apparent)
        markers.append(
            {
                "id": int(marker_id),
                "corners_px": pts.tolist(),
                "edge_lengths_px": [round(x, 3) for x in edge_px],
                "avg_edge_px": round(avg_edge, 3),
                "apparent_scale_px_per_cm": round(apparent, 4) if apparent else None,
                "physical_edge_cm_assumed": marker_size_cm,
                "physical_edge_source": "CONFIGURED_MARKER_SIZE",
            }
        )

    return {
        "detected": True,
        "marker_count": len(markers),
        "markers": markers,
        "apparent_scale_px_per_cm": round(float(np.mean(apparent_scales)), 4)
        if apparent_scales
        else None,
        "marker_size_cm_assumed": marker_size_cm,
        "scale_source": "2D_APPARENT_ONLY",
        "warning": (
            "Apparent px/cm is a 2D image-plane quantity. It is not a 3D "
            "reconstruction scale unless marker corners are recovered in 3D."
        ),
    }


def marker_object_points_cm(marker_size_cm: float) -> np.ndarray:
    """Planar marker corners in centimetres, Z=0, centred on origin."""
    s = marker_size_cm / 2.0
    return np.array(
        [[-s, s, 0.0], [s, s, 0.0], [s, -s, 0.0], [-s, -s, 0.0]],
        dtype=np.float64,
    )


def solve_pnp_marker(
    marker_corners_px: np.ndarray,
    K: np.ndarray,
    dist: np.ndarray,
    marker_size_cm: float,
) -> Optional[dict]:
    obj = marker_object_points_cm(marker_size_cm)
    img = np.asarray(marker_corners_px, dtype=np.float64).reshape(4, 2)
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_IPPE_SQUARE)
    if not ok:
        ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return None
    projected, _ = cv2.projectPoints(obj, rvec, tvec, K, dist)
    projected = projected.reshape(-1, 2)
    residual_px = float(np.mean(np.linalg.norm(projected - img, axis=1)))
    R, _ = cv2.Rodrigues(rvec)
    return {
        "R": R,
        "t": tvec.reshape(3),
        "rvec": rvec.reshape(3),
        "reprojection_residual_px": residual_px,
    }


def triangulate_points(
    pts1: np.ndarray,
    pts2: np.ndarray,
    P1: np.ndarray,
    P2: np.ndarray,
) -> np.ndarray:
    pts1 = np.asarray(pts1, dtype=np.float64).reshape(-1, 2)
    pts2 = np.asarray(pts2, dtype=np.float64).reshape(-1, 2)
    homog = cv2.triangulatePoints(P1, P2, pts1.T, pts2.T)
    xyz = (homog[:3] / np.clip(homog[3], 1e-12, None)).T
    return xyz


def metric_scale_from_marker_pair(
    corners1_px: np.ndarray,
    corners2_px: np.ndarray,
    P1: np.ndarray,
    P2: np.ndarray,
    marker_size_cm: float,
) -> Optional[dict]:
    """Recover a 3D scale factor so reconstructed marker edges match the known size."""
    xyz = triangulate_points(corners1_px, corners2_px, P1, P2)
    if xyz.shape[0] != 4 or not np.all(np.isfinite(xyz)):
        return None
    edges = np.array(
        [np.linalg.norm(xyz[(i + 1) % 4] - xyz[i]) for i in range(4)],
        dtype=np.float64,
    )
    mean_edge = float(np.mean(edges))
    if mean_edge < 1e-9:
        return None
    scale = marker_size_cm / mean_edge
    edges_cm = edges * scale
    residual_cm = float(np.std(edges_cm))
    diagonals = [
        float(np.linalg.norm(xyz[2] - xyz[0]) * scale),
        float(np.linalg.norm(xyz[3] - xyz[1]) * scale),
    ]
    return {
        "scale_to_cm": scale,
        "reconstructed_edge_mean_units": mean_edge,
        "marker_size_cm": marker_size_cm,
        "marker_size_source": "CONFIGURED_MARKER_SIZE",
        "edge_lengths_cm": edges_cm.tolist(),
        "scale_residual_cm": residual_cm,
        "diagonal_lengths_cm": diagonals,
        "corners_3d_cm": (xyz * scale).tolist(),
    }


def pose_rotation_delta_deg(R_a: np.ndarray, R_b: np.ndarray) -> float:
    R_rel = R_a.T @ R_b
    trace = np.clip((np.trace(R_rel) - 1.0) / 2.0, -1.0, 1.0)
    return float(np.degrees(np.arccos(trace)))
