"""Granite block segmentation module supporting OpenCV GrabCut and SAM2/MobileSAM."""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class SegmentationProvider:
    """Base interface for segmentation providers."""

    def segment(self, image_path: str, hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Perform segmentation on an image file.

        Args:
            image_path: Path to the image file.
            hints: Optional hints (e.g. bounding box, foreground points).

        Returns:
            Dictionary with segmentation results.
        """
        raise NotImplementedError


class GrabCutSegmenter(SegmentationProvider):
    """OpenCV GrabCut-based granite block segmentation."""

    def __init__(self, iterations: int = 5, margin_ratio: float = 0.1):
        self.iterations = iterations
        self.margin_ratio = margin_ratio

    def segment(self, image_path: str, hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            p = Path(image_path)
            if not p.is_file():
                logger.error("Image file does not exist: %s", image_path)
                return {"success": False, "error": f"Image file not found: {image_path}"}

            img = cv2.imread(str(p))
            if img is None:
                logger.error("Could not decode image at %s", image_path)
                return {"success": False, "error": f"Could not read image: {image_path}"}

            h, w = img.shape[:2]
            if h <= 0 or w <= 0:
                return {"success": False, "error": "Invalid image dimensions"}

            # Bounding box selection: from hints if provided, else centered margin
            if hints and "bbox" in hints:
                bbox = hints["bbox"]  # [x, y, width, height]
                rect = (int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3]))
            else:
                margin_x = max(1, int(w * self.margin_ratio))
                margin_y = max(1, int(h * self.margin_ratio))
                rect = (margin_x, margin_y, max(1, w - 2 * margin_x), max(1, h - 2 * margin_y))

            mask = np.zeros((h, w), np.uint8)
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)

            # Apply GrabCut with rectangular initialization
            try:
                cv2.grabCut(img, mask, rect, bgd_model, fgd_model, self.iterations, cv2.GC_INIT_WITH_RECT)
            except Exception as gc_err:
                logger.warning("GrabCut computation error (%s), fallback to thresholding", gc_err)
                # Fallback: simple Otsu on grayscale
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                _, binary_fallback = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                mask = np.where(binary_fallback == 255, cv2.GC_PR_FGD, cv2.GC_BGD).astype(np.uint8)

            # Foreground is where mask is GC_FGD (1) or GC_PR_FGD (3)
            binary_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

            # Morphological cleanup
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
            binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)

            # Find contours
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # Keep largest contour as the granite block
            if contours:
                largest = max(contours, key=cv2.contourArea)
                clean_mask = np.zeros_like(binary_mask)
                cv2.drawContours(clean_mask, [largest], -1, 255, -1)
                binary_mask = clean_mask
                contour_points = largest.reshape(-1, 2).tolist()
                area_ratio = float(cv2.contourArea(largest) / (h * w))
            else:
                contour_points = []
                area_ratio = 0.0

            # Determine destination for saving mask
            mask_filename = f"{p.stem}_mask.png"
            mask_path = p.parent / mask_filename
            try:
                cv2.imwrite(str(mask_path), binary_mask)
                saved_path = str(mask_path)
            except Exception as write_err:
                logger.error("Failed to write mask image: %s", write_err)
                saved_path = ""

            # Estimate confidence based on area ratio and contour quality
            if 0.1 < area_ratio < 0.9:
                confidence = min(0.85, area_ratio * 2.0)
            else:
                confidence = 0.30

            return {
                "success": True,
                "mask_path": saved_path,
                "contour_points": contour_points,
                "area_ratio": round(area_ratio, 4),
                "confidence": round(float(confidence), 3),
                "method": "opencv_grabcut",
                "image_dimensions": {"width": w, "height": h},
            }

        except Exception as exc:
            logger.exception("Segmentation failed for %s", image_path)
            return {
                "success": False,
                "error": f"Segmentation exception: {str(exc)}",
                "method": "opencv_grabcut",
            }


class SAMSegmenter(SegmentationProvider):
    """Segment Anything Model provider (requires external inference service)."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url
        self.available = endpoint_url is not None and len(endpoint_url.strip()) > 0
        self.fallback = GrabCutSegmenter()

    def segment(self, image_path: str, hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.available:
            logger.info("SAM inference endpoint not configured; using GrabCut fallback")
            res = self.fallback.segment(image_path, hints)
            res["fallback_used"] = True
            res["requested_method"] = "sam2"
            return res

        # Try calling SAM inference API
        try:
            import urllib.request
            import json

            with open(image_path, "rb") as f:
                img_data = f.read()

            req = urllib.request.Request(
                f"{self.endpoint_url.rstrip('/')}/segment",
                data=img_data,
                headers={"Content-Type": "application/octet-stream"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    data["method"] = "sam2"
                    return data
        except Exception as exc:
            logger.warning("SAM endpoint call failed (%s); falling back to GrabCut", exc)

        res = self.fallback.segment(image_path, hints)
        res["fallback_used"] = True
        res["requested_method"] = "sam2"
        return res


def get_segmenter(provider: str = "auto") -> SegmentationProvider:
    """Factory to get appropriate segmentation provider."""
    sam_url = os.environ.get("SAM_INFERENCE_URL")

    if (provider == "sam" or (provider == "auto" and sam_url)) and sam_url:
        return SAMSegmenter(sam_url)

    # Default to OpenCV GrabCut
    return GrabCutSegmenter()
