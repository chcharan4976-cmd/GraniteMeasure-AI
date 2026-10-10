"""Point-cloud and mesh geometry for irregular granite blocks.

Bounding-box volume is always reported separately from irregular solid
volume. Unobserved faces are never silently closed to invent a watertight
solid that is then labelled as measured.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

try:
    import open3d as o3d  # type: ignore
except Exception:  # pragma: no cover - optional
    o3d = None

try:
    import trimesh
except Exception:  # pragma: no cover
    trimesh = None

try:
    from scipy.spatial import ConvexHull
except Exception:  # pragma: no cover
    ConvexHull = None


IRREGULAR_UNAVAILABLE = "IRREGULAR_VOLUME_UNAVAILABLE"


def statistical_outlier_filter(points: np.ndarray, k_std: float = 2.5) -> np.ndarray:
    if points is None or len(points) < 8:
        return points
    pts = np.asarray(points, dtype=np.float64)
    mean = pts.mean(axis=0)
    dist = np.linalg.norm(pts - mean, axis=1)
    mu, sigma = float(dist.mean()), float(dist.std())
    if sigma < 1e-12:
        return pts
    keep = dist <= (mu + k_std * sigma)
    filtered = pts[keep]
    return filtered if len(filtered) >= 4 else pts


def percentile_axis_filter(points: np.ndarray, lo: float = 5.0, hi: float = 95.0) -> np.ndarray:
    pts = np.asarray(points, dtype=np.float64)
    if len(pts) < 8:
        return pts
    for axis in range(3):
        q1 = np.percentile(pts[:, axis], lo)
        q3 = np.percentile(pts[:, axis], hi)
        iqr = q3 - q1
        mask = (pts[:, axis] >= q1 - 1.5 * iqr) & (pts[:, axis] <= q3 + 1.5 * iqr)
        pts = pts[mask]
        if len(pts) < 4:
            return np.asarray(points, dtype=np.float64)
    return pts


def oriented_bounding_box(points: np.ndarray) -> Optional[dict]:
    """PCA oriented bounding box. Extents are in the same units as `points`."""
    pts = np.asarray(points, dtype=np.float64)
    if len(pts) < 4:
        return None
    center = pts.mean(axis=0)
    X = pts - center
    cov = np.cov(X.T)
    if not np.all(np.isfinite(cov)):
        return None
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    axes = eigvecs[:, order]
    if np.linalg.det(axes) < 0:
        axes[:, 2] *= -1
    coords = X @ axes
    mins = coords.min(axis=0)
    maxs = coords.max(axis=0)
    extents = maxs - mins
    obb_center = center + axes @ ((mins + maxs) / 2.0)
    sorted_ext = sorted((float(extents[0]), float(extents[1]), float(extents[2])), reverse=True)
    corners_local = np.array(
        [
            [mins[0], mins[1], mins[2]],
            [maxs[0], mins[1], mins[2]],
            [maxs[0], maxs[1], mins[2]],
            [mins[0], maxs[1], mins[2]],
            [mins[0], mins[1], maxs[2]],
            [maxs[0], mins[1], maxs[2]],
            [maxs[0], maxs[1], maxs[2]],
            [mins[0], maxs[1], maxs[2]],
        ],
        dtype=np.float64,
    )
    corners_world = corners_local @ axes.T + obb_center
    return {
        "center": obb_center.tolist(),
        "axes": axes.tolist(),
        "extents": [float(extents[0]), float(extents[1]), float(extents[2])],
        "length": sorted_ext[0],
        "breadth": sorted_ext[1],
        "height": sorted_ext[2],
        "corners": corners_world.tolist(),
        "method": "PCA_OBB",
        "backend": "open3d" if o3d is not None else "numpy",
    }


def axis_aligned_bbox(points: np.ndarray) -> dict:
    pts = np.asarray(points, dtype=np.float64)
    mins = pts.min(axis=0)
    maxs = pts.max(axis=0)
    extents = maxs - mins
    sorted_ext = sorted(map(float, extents), reverse=True)
    return {
        "min": mins.tolist(),
        "max": maxs.tolist(),
        "extents": extents.tolist(),
        "length": sorted_ext[0],
        "breadth": sorted_ext[1],
        "height": sorted_ext[2],
        "method": "AABB",
    }


def convex_hull_volume(points: np.ndarray) -> dict:
    """Convex envelope volume. This is NOT the irregular solid volume."""
    pts = np.asarray(points, dtype=np.float64)
    if ConvexHull is None or len(pts) < 4:
        return {
            "available": False,
            "volume": None,
            "reason": "Convex hull library unavailable or too few points",
        }
    try:
        hull = ConvexHull(pts)
        return {
            "available": True,
            "volume": float(hull.volume),
            "area": float(hull.area),
            "kind": "CONVEX_ENVELOPE",
            "reason": (
                "Convex hull volume is an envelope around reconstructed points, "
                "not a measured irregular granite solid."
            ),
        }
    except Exception as exc:
        return {"available": False, "volume": None, "reason": str(exc)}


def evaluate_mesh_watertight(mesh_path: Optional[Path] = None, vertices=None, faces=None) -> dict:
    if trimesh is None:
        return {
            "checked": False,
            "is_watertight": False,
            "reason": "trimesh is not available",
        }
    mesh = None
    try:
        if mesh_path and Path(mesh_path).is_file():
            mesh = trimesh.load(str(mesh_path), force="mesh")
        elif vertices is not None and faces is not None:
            mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    except Exception as exc:
        return {"checked": True, "is_watertight": False, "reason": f"Mesh load failed: {exc}"}
    if mesh is None:
        return {
            "checked": True,
            "is_watertight": False,
            "reason": "No mesh was provided",
        }
    watertight = bool(getattr(mesh, "is_watertight", False))
    volume = None
    if watertight:
        try:
            volume = float(mesh.volume)
        except Exception:
            volume = None
    return {
        "checked": True,
        "is_watertight": watertight,
        "volume": volume,
        "n_vertices": int(len(mesh.vertices)) if hasattr(mesh, "vertices") else 0,
        "n_faces": int(len(mesh.faces)) if hasattr(mesh, "faces") else 0,
        "reason": None if watertight else "Mesh is not watertight; solid volume is not defensible",
    }


def estimate_surface_coverage(points: np.ndarray, obb: dict) -> dict:
    """Heuristic occupancy of the six OBB faces. Not a photometric completeness score."""
    pts = np.asarray(points, dtype=np.float64)
    axes = np.asarray(obb["axes"], dtype=np.float64)
    center = np.asarray(obb["center"], dtype=np.float64)
    extents = np.asarray(obb["extents"], dtype=np.float64)
    local = (pts - center) @ axes
    half = extents / 2.0
    band = np.maximum(half * 0.12, 1e-6)
    faces = []
    unobserved = []
    names = [
        ("+L", 0, 1.0),
        ("-L", 0, -1.0),
        ("+B", 1, 1.0),
        ("-B", 1, -1.0),
        ("+H", 2, 1.0),
        ("-H", 2, -1.0),
    ]
    for name, axis, sign in names:
        target = sign * half[axis]
        near = np.abs(local[:, axis] - target) <= band[axis]
        count = int(near.sum())
        span_ok = False
        if count >= 8:
            other = [i for i in range(3) if i != axis]
            span = local[near][:, other].max(axis=0) - local[near][:, other].min(axis=0)
            span_ok = bool(np.all(span > 0.35 * extents[other]))
        observed = count >= 8 and span_ok
        faces.append({"name": name, "nearby_points": count, "observed": observed})
        if not observed:
            unobserved.append(name)
    return {
        "faces": faces,
        "unobserved_faces": unobserved,
        "observed_face_count": 6 - len(unobserved),
        "basis": (
            "Face occupancy is a geometric heuristic on the oriented bounding box. "
            "It is not an accuracy percentage."
        ),
    }


def cm3_to_m3(volume_cm3: float) -> float:
    return float(volume_cm3) / 1_000_000.0


def bbox_volume_m3(length_cm: float, breadth_cm: float, height_cm: float) -> float:
    return (length_cm / 100.0) * (breadth_cm / 100.0) * (height_cm / 100.0)


def irregular_volume_decision(mesh_eval: dict, coverage: dict, is_dense: bool) -> dict:
    if not is_dense:
        return {
            "status": IRREGULAR_UNAVAILABLE,
            "volume_m3": None,
            "reason": (
                "Dense surface reconstruction did not succeed. Sparse points and an "
                "oriented bounding box are available; they are not a closed irregular solid."
            ),
        }
    if coverage.get("unobserved_faces"):
        return {
            "status": IRREGULAR_UNAVAILABLE,
            "volume_m3": None,
            "reason": (
                "Unobserved faces: "
                + ", ".join(coverage.get("unobserved_faces", []))
                + ". Faces were not closed to invent a watertight solid."
            ),
        }
    if not mesh_eval.get("is_watertight"):
        return {
            "status": IRREGULAR_UNAVAILABLE,
            "volume_m3": None,
            "reason": mesh_eval.get("reason") or "Mesh is not watertight",
        }
    vol = mesh_eval.get("volume")
    if vol is None or vol <= 0:
        return {
            "status": IRREGULAR_UNAVAILABLE,
            "volume_m3": None,
            "reason": "Watertight mesh volume was not a positive finite value",
        }
    return {
        "status": "MEASURED_SOLID",
        "volume_m3": float(vol) if vol > 50 else cm3_to_m3(vol),
        "reason": "Watertight mesh with observed faces; volume reported from mesh",
    }


def downsample_points(points: np.ndarray, max_points: int = 500) -> list:
    pts = np.asarray(points, dtype=np.float64)
    if len(pts) == 0:
        return []
    if len(pts) <= max_points:
        return pts.tolist()
    idx = np.linspace(0, len(pts) - 1, max_points).astype(int)
    return pts[idx].tolist()


def export_geometry_json(
    path: Path,
    points_cm: np.ndarray,
    obb: dict,
    cameras: list,
    coverage: dict,
    image_associations: list,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "units": "cm",
        "point_count_full": int(len(points_cm)),
        "points": downsample_points(points_cm),
        "obb": obb,
        "cameras": cameras,
        "coverage": coverage,
        "image_associations": image_associations,
        "is_generic_placeholder": False,
    }
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path
