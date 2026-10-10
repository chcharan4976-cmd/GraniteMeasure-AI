"""
Granite Block Measurement Engine using OpenCV.

This engine provides image-based measurement using:
1. ArUco marker detection for metric scale calibration
2. ORB feature matching for multi-view correspondence
3. Essential matrix estimation for relative camera pose
4. Triangulation for 3D point recovery
5. Bounding box computation for block dimensions

Limitations (documented honestly):
- No COLMAP available on this machine
- No GPU for dense reconstruction
- Stereo pair reconstruction only (not full SfM)
- Requires visible ArUco markers for metric calibration
- Bounding box dimensions, not true irregular volume
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional
import hashlib
import logging

logger = logging.getLogger(__name__)


class MeasurementEngine:
    """OpenCV-based granite block measurement engine."""

    # Default ArUco dictionary
    ARUCO_DICT = cv2.aruco.DICT_4X4_50

    # Default marker physical size in centimeters
    DEFAULT_MARKER_SIZE_CM = 10.0

    # Minimum feature matches for reliable estimation
    MIN_MATCHES = 30

    # Default granite density
    DEFAULT_DENSITY_KG_M3 = 2750.0

    def __init__(self, marker_size_cm: float = DEFAULT_MARKER_SIZE_CM):
        self.marker_size_cm = marker_size_cm
        self.orb = cv2.ORB_create(nfeatures=2000)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(self.ARUCO_DICT)
        self.aruco_params = cv2.aruco.DetectorParameters()
        self.aruco_detector = cv2.aruco.ArucoDetector(
            self.aruco_dict, self.aruco_params
        )

    def load_image(self, path: str) -> Optional[np.ndarray]:
        """Load and validate an image file."""
        img = cv2.imread(path)
        if img is None:
            # Try reading as bytes
            p = Path(path)
            if p.suffix == '.bin':
                data = p.read_bytes()
                arr = np.frombuffer(data, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img

    def detect_markers(self, image: np.ndarray) -> dict:
        """Detect ArUco markers and compute pixel-per-cm scale."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        corners, ids, rejected = self.aruco_detector.detectMarkers(gray)

        if ids is None or len(ids) == 0:
            return {
                "detected": False,
                "marker_count": 0,
                "scale_px_per_cm": None,
                "markers": [],
            }

        markers = []
        scales = []

        for marker_id, marker_corners in zip(ids.flatten(), corners):
            pts = marker_corners.reshape(4, 2)
            edge_lengths_px = [
                float(np.linalg.norm(pts[i] - pts[(i + 1) % 4]))
                for i in range(4)
            ]
            avg_edge_px = np.mean(edge_lengths_px)
            scale = avg_edge_px / self.marker_size_cm
            scales.append(scale)

            markers.append({
                "id": int(marker_id),
                "corners_px": pts.tolist(),
                "avg_edge_px": round(float(avg_edge_px), 2),
                "scale_px_per_cm": round(float(scale), 4),
            })

        avg_scale = float(np.mean(scales))

        return {
            "detected": True,
            "marker_count": len(markers),
            "scale_px_per_cm": round(avg_scale, 4),
            "markers": markers,
        }

    def match_features(
        self, img1: np.ndarray, img2: np.ndarray
    ) -> dict:
        """Match ORB features between two images."""
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        kp1, des1 = self.orb.detectAndCompute(gray1, None)
        kp2, des2 = self.orb.detectAndCompute(gray2, None)

        if des1 is None or des2 is None:
            return {"matches": 0, "inliers": 0, "points1": [], "points2": []}

        # Use knnMatch with ratio test
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

        # Find fundamental matrix with RANSAC
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
        """Estimate camera intrinsic matrix from image dimensions."""
        h, w = image.shape[:2]
        focal = max(h, w)  # Approximate focal length
        cx, cy = w / 2, h / 2
        K = np.array([
            [focal, 0, cx],
            [0, focal, cy],
            [0, 0, 1],
        ], dtype=np.float64)
        return K

    def triangulate_points(
        self,
        pts1: np.ndarray,
        pts2: np.ndarray,
        K: np.ndarray,
        R: np.ndarray,
        t: np.ndarray,
    ) -> np.ndarray:
        """Triangulate 3D points from two views."""
        P1 = K @ np.hstack([np.eye(3), np.zeros((3, 1))])
        P2 = K @ np.hstack([R, t])

        points_4d = cv2.triangulatePoints(P1, P2, pts1.T, pts2.T)
        points_3d = (points_4d[:3] / points_4d[3]).T

        return points_3d

    def compute_dimensions(self, points_3d: np.ndarray) -> dict:
        """Compute bounding box dimensions from 3D points."""
        if len(points_3d) < 4:
            return None

        # Filter outliers using IQR
        for axis in range(3):
            q1 = np.percentile(points_3d[:, axis], 10)
            q3 = np.percentile(points_3d[:, axis], 90)
            iqr = q3 - q1
            mask = (points_3d[:, axis] >= q1 - 1.5 * iqr) & (
                points_3d[:, axis] <= q3 + 1.5 * iqr
            )
            points_3d = points_3d[mask]

        if len(points_3d) < 4:
            return None

        mins = points_3d.min(axis=0)
        maxs = points_3d.max(axis=0)
        extents = maxs - mins

        # Sort dimensions: length >= breadth >= height
        dims = sorted(extents, reverse=True)

        return {
            "raw_extents": extents.tolist(),
            "length": float(dims[0]),
            "breadth": float(dims[1]),
            "height": float(dims[2]),
            "point_count": len(points_3d),
            "bbox_min": mins.tolist(),
            "bbox_max": maxs.tolist(),
        }

    def estimate_dimensions(self, image_paths: list) -> dict:
        """
        Estimate block dimensions from a set of images.

        This is the main entry point for measurement.
        Returns honest results with confidence assessment.
        """
        if not image_paths:
            return self._failure_result("No images provided")

        # Load images
        images = []
        for path in image_paths:
            img = self.load_image(path)
            if img is not None:
                images.append((path, img))

        if len(images) == 0:
            return self._failure_result("No valid images could be loaded")

        # Step 1: Detect markers in all images for calibration
        calibration_results = []
        best_scale = None
        for path, img in images:
            marker_result = self.detect_markers(img)
            calibration_results.append({
                "image": str(path),
                **marker_result,
            })
            if marker_result["detected"] and marker_result["scale_px_per_cm"]:
                if best_scale is None:
                    best_scale = marker_result["scale_px_per_cm"]
                else:
                    best_scale = (best_scale + marker_result["scale_px_per_cm"]) / 2

        # Step 2: Feature matching between image pairs
        if len(images) < 2:
            # Single image - can only provide rough 2D estimate
            if best_scale:
                img = images[0][1]
                h, w = img.shape[:2]
                # Very rough estimate from single image - clearly mark as unreliable
                return {
                    "status": "PARTIAL",
                    "confidence": 0.15,
                    "length_cm": round(w / best_scale, 1),
                    "breadth_cm": None,
                    "height_cm": None,
                    "volume_m3": None,
                    "weight_mt": None,
                    "calibration_status": "SINGLE_IMAGE_ONLY",
                    "measurement_type": "SINGLE_IMAGE_2D",
                    "usable_images": 1,
                    "total_images": len(image_paths),
                    "calibration_details": calibration_results,
                    "warnings": [
                        "Only one image available - cannot compute 3D dimensions",
                        "Length estimate is from 2D projection only",
                    ],
                }
            else:
                return self._failure_result(
                    "Single image without calibration marker - cannot measure",
                    calibration_details=calibration_results,
                )

        # Step 3: Multi-view reconstruction
        K = self.estimate_camera_matrix(images[0][1])
        best_result = None
        best_inliers = 0
        match_results = []

        # Try all image pairs
        for i in range(len(images)):
            for j in range(i + 1, min(len(images), i + 5)):  # Limit pairs
                match = self.match_features(images[i][1], images[j][1])
                match_results.append({
                    "pair": f"{i}-{j}",
                    "matches": match["matches"],
                    "inliers": match["inliers"],
                })

                if match["inliers"] < self.MIN_MATCHES:
                    continue

                pts1 = np.array(match["points1"])
                pts2 = np.array(match["points2"])
                mask = np.array(match["mask"]).astype(bool)
                pts1_inlier = pts1[mask]
                pts2_inlier = pts2[mask]

                # Recover essential matrix and pose
                try:
                    E, e_mask = cv2.findEssentialMat(
                        pts1_inlier, pts2_inlier, K, method=cv2.RANSAC
                    )
                    if E is None:
                        continue

                    _, R, t, pose_mask = cv2.recoverPose(
                        E, pts1_inlier, pts2_inlier, K
                    )

                    # Triangulate
                    points_3d = self.triangulate_points(
                        pts1_inlier, pts2_inlier, K, R, t
                    )

                    # Filter points with positive depth
                    valid = points_3d[:, 2] > 0
                    points_3d = points_3d[valid]

                    if len(points_3d) > best_inliers:
                        best_inliers = len(points_3d)
                        best_result = points_3d
                except Exception as e:
                    logger.warning(f"Pose recovery failed for pair {i}-{j}: {e}")
                    continue

        if best_result is None or len(best_result) < 10:
            return self._failure_result(
                "Insufficient feature matches for 3D reconstruction",
                calibration_details=calibration_results,
                match_details=match_results,
            )

        # Step 4: Compute dimensions
        dims = self.compute_dimensions(best_result)
        if dims is None:
            return self._failure_result(
                "Could not compute dimensions from reconstructed points",
                calibration_details=calibration_results,
            )

        # Step 5: Apply metric scale
        if best_scale and best_scale > 0:
            length_cm = round(dims["length"] / best_scale, 1)
            breadth_cm = round(dims["breadth"] / best_scale, 1)
            height_cm = round(dims["height"] / best_scale, 1)
            calibration_status = "CALIBRATED"
            confidence = min(0.85, 0.4 + (best_inliers / 500))
        else:
            # Relative dimensions only - no metric scale
            length_cm = round(dims["length"], 1)
            breadth_cm = round(dims["breadth"], 1)
            height_cm = round(dims["height"], 1)
            calibration_status = "NOT_CALIBRATED"
            confidence = min(0.4, 0.1 + (best_inliers / 500))

        # Volume and weight
        volume_m3 = round(
            (length_cm / 100) * (breadth_cm / 100) * (height_cm / 100), 4
        )
        weight_mt = round(volume_m3 * self.DEFAULT_DENSITY_KG_M3 / 1000, 4)

        warnings = []
        if calibration_status == "NOT_CALIBRATED":
            warnings.append("Metric calibration is not verified - dimensions are relative only")
        if best_inliers < 50:
            warnings.append("Low number of reconstructed points - measurement may be unreliable")
        if len(images) < 5:
            warnings.append("Fewer than 5 images - limited coverage of block surfaces")

        return {
            "status": "MEASURED" if calibration_status == "CALIBRATED" else "ESTIMATED",
            "confidence": round(confidence, 2),
            "length_cm": length_cm,
            "breadth_cm": breadth_cm,
            "height_cm": height_cm,
            "volume_m3": volume_m3,
            "weight_mt": weight_mt,
            "density_assumption_kg_m3": self.DEFAULT_DENSITY_KG_M3,
            "calibration_status": calibration_status,
            "measurement_type": "STEREO_RECONSTRUCTION",
            "reconstructed_points": best_inliers,
            "usable_images": len(images),
            "total_images": len(image_paths),
            "image_pairs_tested": len(match_results),
            "calibration_details": calibration_results,
            "match_details": match_results,
            "bounding_box": dims,
            "warnings": warnings,
        }

    def _failure_result(self, reason: str, **extra) -> dict:
        """Return a standardized failure result."""
        result = {
            "status": "FAILED",
            "confidence": 0.0,
            "length_cm": None,
            "breadth_cm": None,
            "height_cm": None,
            "volume_m3": None,
            "weight_mt": None,
            "calibration_status": "NOT_CALIBRATED",
            "measurement_type": "NONE",
            "failure_reason": reason,
            "warnings": [reason],
        }
        result.update(extra)
        return result
