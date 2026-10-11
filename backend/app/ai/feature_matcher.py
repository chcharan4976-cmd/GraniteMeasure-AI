"""Multi-view feature matching for granite photogrammetry."""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class FeatureMatchResult:
    """Result of matching two images."""

    def __init__(self):
        self.image_a_id: str = ""
        self.image_b_id: str = ""
        self.keypoints_a: int = 0
        self.keypoints_b: int = 0
        self.raw_matches: int = 0
        self.verified_inliers: int = 0
        self.inlier_ratio: float = 0.0
        self.fundamental_matrix: Optional[np.ndarray] = None
        self.match_points_a: List[Tuple[float, float]] = []
        self.match_points_b: List[Tuple[float, float]] = []
        self.status: str = "pending"  # pending, matched, insufficient, failed
        self.rejection_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "image_a_id": self.image_a_id,
            "image_b_id": self.image_b_id,
            "keypoints_a": self.keypoints_a,
            "keypoints_b": self.keypoints_b,
            "raw_matches": self.raw_matches,
            "verified_inliers": self.verified_inliers,
            "inlier_ratio": round(self.inlier_ratio, 4),
            "match_points_a": self.match_points_a[:50],  # Limit for API payload size
            "match_points_b": self.match_points_b[:50],
            "status": self.status,
            "rejection_reason": self.rejection_reason,
        }


class ORBFeatureMatcher:
    """ORB-based feature matching with geometric verification."""

    def __init__(self, max_features: int = 2500, ratio_thresh: float = 0.75, min_inliers: int = 30):
        self.max_features = max_features
        self.ratio_thresh = ratio_thresh
        self.min_inliers = min_inliers
        self.orb = cv2.ORB_create(nfeatures=max_features)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING)

    def extract_features(
        self, image_path: str, max_dim: int = 1600
    ) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], Tuple[int, int]]:
        """Extract ORB keypoints and descriptors from an image.

        Returns:
            Tuple of (keypoint_coordinates (N, 2), descriptors, (width, height)).
        """
        try:
            p = Path(image_path)
            if not p.is_file():
                logger.error("Image file not found: %s", image_path)
                return None, None, (0, 0)

            img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
            if img is None:
                logger.error("Could not read image as grayscale: %s", image_path)
                return None, None, (0, 0)

            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
                h, w = img.shape[:2]

            kps, descs = self.orb.detectAndCompute(img, None)
            if kps is None or descs is None or len(kps) == 0:
                return None, None, (w, h)

            kp_array = np.array([[kp.pt[0], kp.pt[1]] for kp in kps], dtype=np.float32)
            return kp_array, descs, (w, h)

        except Exception as exc:
            logger.exception("Error extracting features from %s: %s", image_path, exc)
            return None, None, (0, 0)

    def match_pair(
        self,
        image_a_path: str,
        image_b_path: str,
        image_a_id: str = "",
        image_b_id: str = "",
    ) -> FeatureMatchResult:
        """Match features between two images with geometric verification."""
        result = FeatureMatchResult()
        result.image_a_id = str(image_a_id)
        result.image_b_id = str(image_b_id)

        kps_a, descs_a, _ = self.extract_features(image_a_path)
        kps_b, descs_b, _ = self.extract_features(image_b_path)

        if kps_a is None or kps_b is None:
            result.status = "failed"
            result.rejection_reason = "Could not extract features from one or both images"
            return result

        result.keypoints_a = len(kps_a)
        result.keypoints_b = len(kps_b)

        if descs_a is None or descs_b is None or len(descs_a) < 10 or len(descs_b) < 10:
            result.status = "insufficient"
            result.rejection_reason = f"Too few features: {len(kps_a)} and {len(kps_b)}"
            return result

        # KNN matching with ratio test
        try:
            raw_matches = self.bf.knnMatch(descs_a, descs_b, k=2)
        except Exception as match_err:
            result.status = "failed"
            result.rejection_reason = f"Matching error: {str(match_err)}"
            return result

        good_matches = []
        for m_pair in raw_matches:
            if len(m_pair) == 2:
                m, n = m_pair
                if m.distance < self.ratio_thresh * n.distance:
                    good_matches.append(m)

        result.raw_matches = len(good_matches)

        if len(good_matches) < self.min_inliers:
            result.status = "insufficient"
            result.rejection_reason = (
                f"Only {len(good_matches)} ratio-tested matches (need {self.min_inliers})"
            )
            return result

        # Geometric verification with RANSAC
        pts_a = np.array([kps_a[m.queryIdx] for m in good_matches], dtype=np.float64)
        pts_b = np.array([kps_b[m.trainIdx] for m in good_matches], dtype=np.float64)

        try:
            F, mask = cv2.findFundamentalMat(pts_a, pts_b, cv2.FM_RANSAC, 3.0, 0.99)
        except Exception as ransac_err:
            result.status = "failed"
            result.rejection_reason = f"RANSAC computation failed: {str(ransac_err)}"
            return result

        if mask is None or F is None:
            result.status = "failed"
            result.rejection_reason = "Could not compute fundamental matrix"
            return result

        inlier_mask = mask.ravel().astype(bool)
        result.verified_inliers = int(np.sum(inlier_mask))
        result.inlier_ratio = result.verified_inliers / len(good_matches) if good_matches else 0.0
        result.fundamental_matrix = F

        # Extract inlier match coordinates for visualization
        inlier_pts_a = pts_a[inlier_mask]
        inlier_pts_b = pts_b[inlier_mask]
        result.match_points_a = [(float(p[0]), float(p[1])) for p in inlier_pts_a]
        result.match_points_b = [(float(p[0]), float(p[1])) for p in inlier_pts_b]

        if result.verified_inliers < self.min_inliers:
            result.status = "insufficient"
            result.rejection_reason = (
                f"Only {result.verified_inliers} geometric inliers (need {self.min_inliers})"
            )
        else:
            result.status = "matched"

        return result

    def match_session(self, image_paths: List[str], image_ids: List[str]) -> Dict[str, Any]:
        """Match all pairs in a capture session."""
        n = len(image_paths)
        pair_results = []
        connectivity = {str(img_id): [] for img_id in image_ids}

        for i in range(n):
            for j in range(i + 1, n):
                result = self.match_pair(
                    image_paths[i],
                    image_paths[j],
                    str(image_ids[i]),
                    str(image_ids[j]),
                )
                pair_results.append(result.to_dict())
                if result.status == "matched":
                    connectivity[str(image_ids[i])].append(str(image_ids[j]))
                    connectivity[str(image_ids[j])].append(str(image_ids[i]))

        total_pairs = n * (n - 1) // 2 if n >= 2 else 0
        matched_pairs = sum(1 for r in pair_results if r["status"] == "matched")

        return {
            "total_images": n,
            "total_pairs": total_pairs,
            "matched_pairs": matched_pairs,
            "match_ratio": round(matched_pairs / total_pairs, 3) if total_pairs > 0 else 0.0,
            "connectivity": connectivity,
            "pair_results": pair_results,
            "sufficient_coverage": matched_pairs >= max(1, n - 1),  # At minimum a spanning tree
        }
