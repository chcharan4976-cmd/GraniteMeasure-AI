"""Granite block measurement pipeline.

Captured images → quality checks → calibration evidence → feature matching
→ pose recovery → optional COLMAP SfM → metric scale from reconstructed
ArUco corners → oriented bounding box → honest volume reporting.

This engine does not treat a rectangular bounding box as the irregular
stone volume, and it does not invent centimetres without a verified 3D scale.
"""

from __future__ import annotations

import hashlib
import logging
import shutil
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

from app.services import calibration as calib
from app.services import geometry as geom
from app.services.colmap_runner import colmap_status, run_sparse_reconstruction
from app.services.pipeline_config import (
    ASSUMED_DENSITY_KG_M3,
    DEFAULT_MARKER_SIZE_CM,
    GEOMETRY_ROOT,
    JOB_TIMEOUT_SEC,
    MAX_IMAGE_EDGE,
    MIN_FREE_DISK_MB,
    MIN_PAIR_INLIERS,
    MIN_RECONSTRUCTED_POINTS,
    WORKSPACE_ROOT,
)

logger = logging.getLogger(__name__)

ProgressCb = Optional[Callable[[str, str], None]]


class MeasurementEngine:
    """OpenCV (+ optional COLMAP / Open3D) granite measurement engine."""

    ARUCO_DICT = cv2.aruco.DICT_4X4_50
    DEFAULT_MARKER_SIZE_CM = DEFAULT_MARKER_SIZE_CM
    MIN_MATCHES = MIN_PAIR_INLIERS
    DEFAULT_DENSITY_KG_M3 = ASSUMED_DENSITY_KG_M3

    def __init__(self, marker_size_cm: float = DEFAULT_MARKER_SIZE_CM):
        self.marker_size_cm = marker_size_cm
        self.orb = cv2.ORB_create(nfeatures=2500)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(self.ARUCO_DICT)
        self.aruco_params = cv2.aruco.DetectorParameters()
        self.aruco_detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.aruco_params)

    def load_image(self, path: str) -> Optional[np.ndarray]:
        img = cv2.imread(path)
        if img is None:
            p = Path(path)
            if p.is_file():
                data = p.read_bytes()
                arr = np.frombuffer(data, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img

    def resize_for_processing(self, image: np.ndarray, max_edge: int = MAX_IMAGE_EDGE) -> np.ndarray:
        h, w = image.shape[:2]
        scale = min(1.0, max_edge / float(max(h, w)))
        if scale >= 1.0:
            return image
        return cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    def detect_markers(self, image: np.ndarray) -> dict:
        return calib.detect_markers(image, self.marker_size_cm)

    def match_features(self, img1: np.ndarray, img2: np.ndarray) -> dict:
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        kp1, des1 = self.orb.detectAndCompute(gray1, None)
        kp2, des2 = self.orb.detectAndCompute(gray2, None)
        if des1 is None or des2 is None:
            return {"matches": 0, "inliers": 0, "points1": [], "points2": []}

        matches = self.bf.knnMatch(des1, des2, k=2)
        good_matches = []
        for m_pair in matches:
            if len(m_pair) == 2:
                m, n = m_pair
                if m.distance < 0.75 * n.distance:
                    good_matches.append(m)

        if len(good_matches) < 8:
            return {
                "matches": len(good_matches),
                "inliers": 0,
                "points1": [],
                "points2": [],
            }

        pts1 = np.float32([kp1[m.queryIdx].pt for m in good_matches])
        pts2 = np.float32([kp2[m.trainIdx].pt for m in good_matches])
        F, mask = cv2.findFundamentalMat(pts1, pts2, cv2.FM_RANSAC, 3.0)
        if mask is None:
            inlier_count = 0
        else:
            inlier_count = int(mask.sum())
        return {
            "matches": len(good_matches),
            "inliers": inlier_count,
            "points1": pts1.tolist(),
            "points2": pts2.tolist(),
            "fundamental_matrix": F.tolist() if F is not None else None,
            "mask": mask.flatten().tolist() if mask is not None else None,
        }

    def estimate_camera_matrix(self, image: np.ndarray) -> np.ndarray:
        return calib.estimate_intrinsics(image)["K"]

    def triangulate_points(self, pts1, pts2, K, R, t) -> np.ndarray:
        P1 = K @ np.hstack([np.eye(3), np.zeros((3, 1))])
        P2 = K @ np.hstack([R, t.reshape(3, 1)])
        return calib.triangulate_points(pts1, pts2, P1, P2)

    def compute_dimensions(self, points_3d: np.ndarray) -> dict:
        cleaned = geom.percentile_axis_filter(geom.statistical_outlier_filter(points_3d))
        obb = geom.oriented_bounding_box(cleaned)
        if obb is None:
            return None
        aabb = geom.axis_aligned_bbox(cleaned)
        return {
            "raw_extents": obb["extents"],
            "length": obb["length"],
            "breadth": obb["breadth"],
            "height": obb["height"],
            "point_count": len(cleaned),
            "bbox_min": aabb["min"],
            "bbox_max": aabb["max"],
            "obb": obb,
            "cleaned_points": cleaned,
        }

    def estimate_dimensions(
        self,
        image_paths: list,
        workspace: Optional[str] = None,
        job_id: Optional[int] = None,
        progress: ProgressCb = None,
    ) -> dict:
        def step(status: str, message: str):
            if progress:
                progress(status, message)
            logger.info("%s: %s", status, message)

        if not image_paths:
            return self._failure_result("No images provided")

        try:
            self._assert_disk_space()
        except RuntimeError as exc:
            return self._failure_result(str(exc))

        step("VALIDATING", "Validating submitted photographs")
        loaded = []
        invalid = []
        for path in image_paths:
            img = self.load_image(path)
            if img is None:
                invalid.append({"path": str(path), "reason": "UNREADABLE_IMAGE"})
                continue
            h, w = img.shape[:2]
            if w < 64 or h < 64:
                invalid.append({"path": str(path), "reason": "INVALID_IMAGE_TOO_SMALL"})
                continue
            processed = self.resize_for_processing(img)
            loaded.append({"path": str(path), "original": img, "image": processed})

        if not loaded:
            return self._failure_result(
                "No valid images could be loaded",
                invalid_images=invalid,
                total_images=len(image_paths),
                usable_images=0,
            )

        step("CALIBRATING", "Detecting ArUco markers and recording scale evidence")
        calibration_results = []
        marker_views = []
        for item in loaded:
            marker_result = self.detect_markers(item["image"])
            calibration_results.append({"image": item["path"], **marker_result})
            if marker_result["detected"] and marker_result["markers"]:
                marker_views.append(
                    {
                        "path": item["path"],
                        "image": item["image"],
                        "markers": marker_result["markers"],
                    }
                )

        colmap_info = colmap_status()
        ws = Path(workspace) if workspace else (WORKSPACE_ROOT / f"job_{job_id or 'adhoc'}")
        ws.mkdir(parents=True, exist_ok=True)

        reconstruction = None
        if len(loaded) >= 3 and colmap_info["available"]:
            step("RECONSTRUCTING", "Running COLMAP sparse reconstruction")
            reconstruction = self._try_colmap([item["path"] for item in loaded], ws)

        if reconstruction is None:
            step("FEATURE_MATCHING", "Matching features and recovering stereo pose")
            reconstruction = self._opencv_stereo(loaded, marker_views)

        if reconstruction.get("status") == "FAILED":
            reconstruction.update(
                {
                    "calibration_details": calibration_results,
                    "colmap": colmap_info,
                    "total_images": len(image_paths),
                    "usable_images": len(loaded),
                    "invalid_images": invalid,
                    "marker_size_cm": self.marker_size_cm,
                    "marker_size_source": "CONFIGURED_MARKER_SIZE",
                }
            )
            return reconstruction

        step("SCALING", "Applying verified metric scale from reconstructed marker corners")
        scaled = self._apply_metric_scale(reconstruction, marker_views, loaded)

        step("MEASURING", "Computing oriented bounding box and volume diagnostics")
        return self._finalize(
            scaled,
            calibration_results=calibration_results,
            colmap_info=colmap_info,
            invalid=invalid,
            total_images=len(image_paths),
            usable_images=len(loaded),
            job_id=job_id,
            image_paths=[item["path"] for item in loaded],
        )

    def _try_colmap(self, paths: list[str], workspace: Path) -> Optional[dict]:
        result = run_sparse_reconstruction(workspace, paths, MAX_IMAGE_EDGE)
        if not result.get("ok"):
            logger.info("COLMAP unavailable or failed: %s", result.get("reason"))
            return None
        points = np.asarray(result["points"], dtype=np.float64)
        if len(points) < MIN_RECONSTRUCTED_POINTS:
            return None
        return {
            "status": "OK",
            "engine": "COLMAP",
            "points": points,
            "cameras": result.get("cameras", []),
            "registered_cameras": result.get("registered_cameras", 0),
            "P1": None,
            "P2": None,
            "pair_indices": None,
            "match_details": [{"source": "COLMAP", "num_points": len(points)}],
            "is_dense": bool(result.get("is_dense")),
            "colmap_raw": {k: v for k, v in result.items() if k != "points"},
        }

    def _opencv_stereo(self, loaded: list, marker_views: list) -> dict:
        if len(loaded) < 2:
            if marker_views:
                return {
                    "status": "PARTIAL",
                    "confidence": None,
                    "confidence_label": "INSUFFICIENT",
                    "confidence_basis": "Only one usable image; 3D reconstruction is impossible.",
                    "length_cm": None,
                    "breadth_cm": None,
                    "height_cm": None,
                    "bbox_volume_m3": None,
                    "irregular_volume_m3": None,
                    "irregular_volume_status": "IRREGULAR_VOLUME_UNAVAILABLE",
                    "volume_m3": None,
                    "weight_mt": None,
                    "estimated_mass_mt": None,
                    "calibration_status": "NOT_CALIBRATED",
                    "measurement_type": "SINGLE_IMAGE_2D",
                    "usable_images": 1,
                    "warnings": [
                        "Only one image available — cannot compute 3D dimensions.",
                        "A 2D ArUco detection does not produce metric block dimensions.",
                    ],
                    "failure_reason": None,
                }
            return self._failure_result(
                "Single image without a calibration marker — cannot measure",
            )

        K = self.estimate_camera_matrix(loaded[0]["image"])
        best = None
        match_results = []
        insufficient_overlap = True

        for i in range(len(loaded)):
            for j in range(i + 1, min(len(loaded), i + 6)):
                match = self.match_features(loaded[i]["image"], loaded[j]["image"])
                match_results.append(
                    {"pair": f"{i}-{j}", "matches": match["matches"], "inliers": match["inliers"]}
                )
                if match["inliers"] < self.MIN_MATCHES:
                    continue
                insufficient_overlap = False
                pts1 = np.array(match["points1"])
                pts2 = np.array(match["points2"])
                mask = np.array(match["mask"]).astype(bool)
                pts1_in = pts1[mask]
                pts2_in = pts2[mask]
                try:
                    E, _ = cv2.findEssentialMat(pts1_in, pts2_in, K, method=cv2.RANSAC)
                    if E is None:
                        continue
                    _, R, t, _ = cv2.recoverPose(E, pts1_in, pts2_in, K)
                    points_3d = self.triangulate_points(pts1_in, pts2_in, K, R, t)
                    valid = (points_3d[:, 2] > 0) & np.all(np.isfinite(points_3d), axis=1)
                    points_3d = points_3d[valid]
                    if best is None or len(points_3d) > len(best["points"]):
                        P1 = K @ np.hstack([np.eye(3), np.zeros((3, 1))])
                        P2 = K @ np.hstack([R, t.reshape(3, 1)])
                        best = {
                            "points": points_3d,
                            "R": R,
                            "t": t.reshape(3),
                            "K": K,
                            "P1": P1,
                            "P2": P2,
                            "pair": (i, j),
                            "inliers": int(match["inliers"]),
                        }
                except Exception as exc:
                    logger.warning("Pose recovery failed for pair %s-%s: %s", i, j, exc)

        if best is None or len(best["points"]) < MIN_RECONSTRUCTED_POINTS:
            reason = (
                "Insufficient photo overlap for reconstruction"
                if insufficient_overlap
                else "Failed camera reconstruction — too few triangulated points"
            )
            return self._failure_result(
                reason,
                match_details=match_results,
                registered_cameras=0,
                reconstructed_points=0 if best is None else len(best["points"]),
            )

        cameras = [
            {"image_index": best["pair"][0], "R": np.eye(3).tolist(), "t": [0, 0, 0]},
            {
                "image_index": best["pair"][1],
                "R": best["R"].tolist(),
                "t": best["t"].tolist(),
            },
        ]
        return {
            "status": "OK",
            "engine": "OPENCV_STEREO",
            "points": best["points"],
            "cameras": cameras,
            "registered_cameras": 2,
            "P1": best["P1"],
            "P2": best["P2"],
            "pair_indices": best["pair"],
            "match_details": match_results,
            "is_dense": False,
            "inliers": best["inliers"],
            "K": best["K"],
        }

    def _apply_metric_scale(self, reconstruction: dict, marker_views: list, loaded: list) -> dict:
        if reconstruction.get("status") != "OK":
            return reconstruction

        scale_info = None
        pair = reconstruction.get("pair_indices")
        P1, P2 = reconstruction.get("P1"), reconstruction.get("P2")

        if (
            pair is not None
            and P1 is not None
            and P2 is not None
            and reconstruction.get("engine") == "OPENCV_STEREO"
        ):
            i, j = pair
            path_i, path_j = loaded[i]["path"], loaded[j]["path"]
            det_i = next((m for m in marker_views if m["path"] == path_i), None)
            det_j = next((m for m in marker_views if m["path"] == path_j), None)
            if det_i and det_j:
                ids_i = {m["id"]: m for m in det_i["markers"]}
                shared = [m for m in det_j["markers"] if m["id"] in ids_i]
                if shared:
                    m2 = shared[0]
                    m1 = ids_i[m2["id"]]
                    scale_info = calib.metric_scale_from_marker_pair(
                        np.array(m1["corners_px"]),
                        np.array(m2["corners_px"]),
                        P1,
                        P2,
                        self.marker_size_cm,
                    )

        points = np.asarray(reconstruction["points"], dtype=np.float64)
        if scale_info is None:
            reconstruction["points_cm"] = None
            reconstruction["points_units"] = "relative"
            reconstruction["calibration_status"] = "NOT_CALIBRATED"
            reconstruction["scale_info"] = {
                "applied": False,
                "reason": (
                    "No 3D marker scale could be recovered. A marker in one image "
                    "does not metricise the reconstruction. Dimensions are relative only."
                ),
            }
            reconstruction["relative_points"] = points
            return reconstruction

        scale = scale_info["scale_to_cm"]
        reconstruction["points_cm"] = points * scale
        reconstruction["points_units"] = "cm"
        reconstruction["calibration_status"] = "CALIBRATED"
        reconstruction["scale_info"] = {**scale_info, "applied": True}
        if scale_info.get("scale_residual_cm", 0) > 1.5:
            reconstruction.setdefault("scale_warnings", []).append(
                f"Marker edge residual after scale is {scale_info['scale_residual_cm']:.2f} cm"
            )
        return reconstruction

    def _finalize(
        self,
        reconstruction: dict,
        calibration_results: list,
        colmap_info: dict,
        invalid: list,
        total_images: int,
        usable_images: int,
        job_id: Optional[int],
        image_paths: list,
    ) -> dict:
        if reconstruction.get("status") == "PARTIAL":
            reconstruction.update(
                {
                    "calibration_details": calibration_results,
                    "colmap": colmap_info,
                    "total_images": total_images,
                    "usable_images": usable_images,
                    "invalid_images": invalid,
                    "marker_size_cm": self.marker_size_cm,
                    "marker_size_source": "CONFIGURED_MARKER_SIZE",
                }
            )
            return reconstruction
        if reconstruction.get("status") != "OK":
            return reconstruction

        calibrated = reconstruction.get("calibration_status") == "CALIBRATED"
        points = reconstruction.get("points_cm")
        units = "cm"
        if points is None:
            points = reconstruction.get("relative_points")
            units = "relative"

        dims = self.compute_dimensions(points)
        if dims is None:
            return self._failure_result(
                "Could not compute an oriented bounding box from reconstructed points",
                calibration_details=calibration_results,
                reconstructed_points=len(points) if points is not None else 0,
            )

        cleaned = dims["cleaned_points"]
        length, breadth, height = dims["length"], dims["breadth"], dims["height"]
        if calibrated:
            length_cm = round(float(length), 1)
            breadth_cm = round(float(breadth), 1)
            height_cm = round(float(height), 1)
        else:
            length_cm = breadth_cm = height_cm = None

        bbox_volume = (
            geom.bbox_volume_m3(length_cm, breadth_cm, height_cm) if calibrated else None
        )
        hull = geom.convex_hull_volume(cleaned)
        coverage = geom.estimate_surface_coverage(cleaned, dims["obb"])
        mesh_eval = geom.evaluate_mesh_watertight()
        irregular = geom.irregular_volume_decision(
            mesh_eval, coverage, is_dense=bool(reconstruction.get("is_dense"))
        )

        estimated_mass = None
        if bbox_volume is not None:
            estimated_mass = round(bbox_volume * self.DEFAULT_DENSITY_KG_M3 / 1000.0, 4)

        warnings = list(reconstruction.get("scale_warnings") or [])
        warnings.append(
            "Bounding-box volume is the oriented box around reconstructed points, "
            "not the irregular stone volume."
        )
        warnings.append(irregular["reason"])
        if not calibrated:
            warnings.append("NOT_CALIBRATED — centimetre dimensions are withheld.")
        if usable_images < 5:
            warnings.append("Fewer than 5 images — surface coverage is likely incomplete.")
        if reconstruction.get("engine") == "OPENCV_STEREO":
            warnings.append(
                "Reconstruction used an OpenCV stereo pair, not a full multi-view SfM model."
            )
        if not colmap_info.get("available"):
            warnings.append("COLMAP is not installed on this host.")

        n_points = int(len(cleaned))
        n_cam = int(reconstruction.get("registered_cameras") or 0)
        residual = None
        if reconstruction.get("scale_info", {}).get("applied"):
            residual = reconstruction["scale_info"].get("scale_residual_cm")
        label, basis = self._confidence(calibrated, n_cam, n_points, residual, coverage)

        geometry_path = None
        if calibrated:
            export_id = job_id or hashlib.sha1("".join(image_paths).encode()).hexdigest()[:12]
            geometry_path = str(
                geom.export_geometry_json(
                    GEOMETRY_ROOT / f"{export_id}.json",
                    cleaned,
                    {
                        **{k: v for k, v in dims["obb"].items() if k != "axes" or True},
                        "length_cm": length_cm,
                        "breadth_cm": breadth_cm,
                        "height_cm": height_cm,
                        "units": "cm",
                    },
                    reconstruction.get("cameras") or [],
                    coverage,
                    [{"path": p, "index": i} for i, p in enumerate(image_paths)],
                )
            )

        status = "MEASURED" if calibrated else "ESTIMATED"
        return {
            "status": status,
            "confidence": None,
            "confidence_label": label,
            "confidence_basis": basis,
            "length_cm": length_cm,
            "breadth_cm": breadth_cm,
            "height_cm": height_cm,
            "volume_m3": bbox_volume,
            "bbox_volume_m3": bbox_volume,
            "irregular_volume_m3": irregular["volume_m3"],
            "irregular_volume_status": irregular["status"],
            "irregular_volume_reason": irregular["reason"],
            "convex_hull": hull,
            "weight_mt": None,
            "estimated_mass_mt": estimated_mass,
            "mass_source": (
                f"DENSITY_ESTIMATE (assumed {self.DEFAULT_DENSITY_KG_M3} kg/m³ applied to bounding-box volume)"
                if estimated_mass is not None
                else None
            ),
            "density_assumption_kg_m3": self.DEFAULT_DENSITY_KG_M3,
            "calibration_status": reconstruction.get("calibration_status"),
            "measurement_type": reconstruction.get("engine"),
            "reconstructed_points": n_points,
            "registered_cameras": n_cam,
            "usable_images": usable_images,
            "total_images": total_images,
            "invalid_images": invalid,
            "image_pairs_tested": len(reconstruction.get("match_details") or []),
            "calibration_details": calibration_results,
            "match_details": reconstruction.get("match_details"),
            "scale_info": reconstruction.get("scale_info"),
            "scale_residual_cm": residual,
            "marker_size_cm": self.marker_size_cm,
            "marker_size_source": "CONFIGURED_MARKER_SIZE",
            "coverage": coverage,
            "mesh": mesh_eval,
            "is_dense": bool(reconstruction.get("is_dense")),
            "colmap": colmap_info,
            "geometry_artifact": geometry_path,
            "bounding_box": {
                "length": length_cm if calibrated else length,
                "breadth": breadth_cm if calibrated else breadth,
                "height": height_cm if calibrated else height,
                "units": units,
                "obb": dims["obb"],
            },
            "warnings": warnings,
            "job_timeout_sec": JOB_TIMEOUT_SEC,
        }

    def _confidence(self, calibrated, n_cam, n_points, residual, coverage) -> tuple[str, str]:
        unobserved = coverage.get("unobserved_faces") or []
        if not calibrated or n_cam < 2 or n_points < 40:
            label = "LOW"
        elif residual is not None and residual > 1.0:
            label = "LOW"
        elif n_points >= 200 and n_cam >= 4 and not unobserved:
            label = "MODERATE"
        elif n_points >= 80 and n_cam >= 2:
            label = "MODERATE"
        else:
            label = "LOW"
        basis = (
            f"Evidence label {label} is based on calibration="
            f"{'yes' if calibrated else 'no'}, registered_cameras={n_cam}, "
            f"reconstructed_points={n_points}, scale_residual_cm={residual}, "
            f"unobserved_faces={unobserved}. It is not an accuracy percentage "
            f"and is not a certified measurement uncertainty."
        )
        return label, basis

    def _assert_disk_space(self):
        WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
        free = shutil.disk_usage(WORKSPACE_ROOT).free
        if free < MIN_FREE_DISK_MB * 1024 * 1024:
            raise RuntimeError(
                f"Insufficient disk space ({free / (1024 * 1024):.0f} MB free; "
                f"{MIN_FREE_DISK_MB} MB required)"
            )

    def _failure_result(self, reason: str, **extra) -> dict:
        result = {
            "status": "FAILED",
            "confidence": None,
            "confidence_label": "NONE",
            "confidence_basis": reason,
            "length_cm": None,
            "breadth_cm": None,
            "height_cm": None,
            "volume_m3": None,
            "bbox_volume_m3": None,
            "irregular_volume_m3": None,
            "irregular_volume_status": "IRREGULAR_VOLUME_UNAVAILABLE",
            "weight_mt": None,
            "estimated_mass_mt": None,
            "calibration_status": "NOT_CALIBRATED",
            "measurement_type": "NONE",
            "failure_reason": reason,
            "warnings": [reason],
        }
        result.update(extra)
        return result
