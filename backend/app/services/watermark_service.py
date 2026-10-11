"""Evidence metadata extraction and non-destructive watermark plate generator.

Extracts embedded capture timestamp and GPS coordinates from photograph EXIF.
Generates a verified photographic evidence derivative with a semi-transparent
information plate watermark, while strictly preserving the pristine original.
"""

import io
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)


def _convert_to_degrees(value) -> Optional[float]:
    """Helper to convert the GPS coordinates stored in the EXIF to degrees in float format."""
    try:
        if isinstance(value, (int, float)):
            return float(value)
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return None


def extract_exif_metadata(image_bytes: bytes) -> Dict[str, Any]:
    """Extracts original capture timestamp and GPS coordinates from image EXIF bytes."""
    meta: Dict[str, Any] = {
        "captured_at": None,
        "gps_latitude": None,
        "gps_longitude": None,
        "has_gps": False,
        "make": None,
        "model": None,
    }
    if not image_bytes:
        return meta

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        exif_raw = pil_img.getexif()
        if not exif_raw:
            return meta

        exif: Dict[str, Any] = {}
        for tag, value in exif_raw.items():
            decoded = ExifTags.TAGS.get(tag, str(tag))
            exif[decoded] = value

        # Try to read DateTimeOriginal or DateTime
        dt_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if dt_str:
            try:
                # Standard EXIF format: "YYYY:MM:DD HH:MM:SS"
                parsed_dt = datetime.strptime(str(dt_str)[:19], "%Y:%m:%d %H:%M:%S")
                meta["captured_at"] = parsed_dt.replace(tzinfo=timezone.utc)
            except Exception:
                pass

        meta["make"] = exif.get("Make")
        meta["model"] = exif.get("Model")

        # Extract GPS Info
        gps_info = exif.get("GPSInfo")
        if gps_info:
            gps_tags = {}
            for t in gps_info:
                sub_decoded = ExifTags.GPSTAGS.get(t, str(t))
                gps_tags[sub_decoded] = gps_info[t]

            lat_val = gps_tags.get("GPSLatitude")
            lat_ref = gps_tags.get("GPSLatitudeRef", "N")
            lng_val = gps_tags.get("GPSLongitude")
            lng_ref = gps_tags.get("GPSLongitudeRef", "E")

            if lat_val and lng_val:
                lat = _convert_to_degrees(lat_val)
                lng = _convert_to_degrees(lng_val)
                if lat is not None and lng is not None:
                    if str(lat_ref).upper() == "S":
                        lat = -lat
                    if str(lng_ref).upper() == "W":
                        lng = -lng
                    meta["gps_latitude"] = round(lat, 6)
                    meta["gps_longitude"] = round(lng, 6)
                    meta["has_gps"] = True
    except Exception as e:
        logger.debug("EXIF extraction notice: %s", e)

    return meta


def generate_evidence_watermark(
    image_bgr: np.ndarray,
    block_identifier: str,
    captured_at: Optional[datetime],
    gps_latitude: Optional[float],
    gps_longitude: Optional[float],
    gps_accuracy_m: Optional[float],
    capture_source: str,
    evidence_id: str,
) -> np.ndarray:
    """Creates a non-destructive annotated derivative with an official evidence plate.

    Does not overwrite or modify the original image array.
    """
    canvas = image_bgr.copy()
    h, w = canvas.shape[:2]

    # Calculate proportional scale
    scale = max(0.5, min(w / 1280.0, 1.2))
    font_scale = 0.55 * scale
    thickness = max(1, int(1.5 * scale))
    plate_height = int(68 * scale)

    # Coordinates string
    if gps_latitude is not None and gps_longitude is not None:
        acc_text = f" (±{int(gps_accuracy_m)}m)" if gps_accuracy_m else ""
        gps_text = f"GPS: {gps_latitude:.5f}, {gps_longitude:.5f}{acc_text}"
    else:
        gps_text = "GPS: GPS unavailable — location not recorded"

    # Time string
    if captured_at:
        time_text = captured_at.strftime("%Y-%m-%d %H:%M:%S UTC")
    else:
        time_text = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    source_tag = capture_source.upper() if capture_source else "CAMERA"

    # Semi-transparent dark plate along the bottom
    overlay = canvas.copy()
    cv2.rectangle(overlay, (0, h - plate_height), (w, h), (10, 15, 20), -1)
    alpha = 0.82
    cv2.addWeighted(overlay, alpha, canvas, 1 - alpha, 0, canvas)

    # Distinct top line accent border on the plate
    cv2.line(canvas, (0, h - plate_height), (w, h - plate_height), (16, 185, 129), max(1, int(2 * scale)))

    # Brand badge
    brand_text = "GRANITEMEASURE AI"
    cv2.putText(
        canvas,
        brand_text,
        (int(14 * scale), int(h - plate_height + 24 * scale)),
        cv2.FONT_HERSHEY_DUPLEX,
        font_scale * 1.05,
        (16, 185, 129),
        thickness + 1,
        cv2.LINE_AA,
    )

    # Line 1: Block ID & Evidence ID & Source
    line1 = f"BLOCK: {block_identifier}  |  EVD: {evidence_id}  |  SRC: {source_tag}"
    cv2.putText(
        canvas,
        line1,
        (int(230 * scale), int(h - plate_height + 24 * scale)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale * 0.9,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )

    # Line 2: Timestamp & GPS Coordinates
    line2 = f"CAPTURED: {time_text}  |  {gps_text}"
    cv2.putText(
        canvas,
        line2,
        (int(14 * scale), int(h - plate_height + 52 * scale)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale * 0.85,
        (220, 225, 230),
        thickness,
        cv2.LINE_AA,
    )

    return canvas
