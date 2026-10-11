import io
import cv2
import numpy as np
from PIL import Image, ImageOps

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass



def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Robust image decoding supporting OpenCV and Pillow with EXIF orientation."""
    if not image_bytes:
        raise ValueError("Image bytes are empty")

    # 1. Try OpenCV fast buffer decode
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is not None:
        return image

    # 2. Fallback to Pillow (handles progressive JPEGs, HEIF/TIFF, EXIF transposition)
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        rgb = pil_img.convert("RGB")
        image = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
        return image
    except Exception as e:
        raise ValueError(f"Unable to decode image: {str(e)}")


def compute_dhash(image_bytes: bytes, hash_size: int = 8) -> str:
    """Compute 64-bit difference hash (dHash) for fast near-duplicate image detection."""
    image = decode_image_bytes(image_bytes)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Resize to (hash_size + 1, hash_size), i.e., 9x8 for 64 bits
    resized = cv2.resize(gray, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    # Compare adjacent columns
    difference = resized[:, 1:] > resized[:, :-1]
    # Convert bool array to integer bit sequence then hex
    bits = difference.flatten()
    decimal_val = 0
    for bit in bits:
        decimal_val = (decimal_val << 1) | int(bit)
    return f"{decimal_val:016x}"


def hamming_distance(hash1: str, hash2: str) -> int:
    """Calculate the bit-level Hamming distance between two hex hashes."""
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 64
    val1 = int(hash1, 16)
    val2 = int(hash2, 16)
    return bin(val1 ^ val2).count("1")


def analyze_image(image_bytes: bytes):
    """Analyze image for focus/blur, exposure, contrast, and ArUco metric markers."""
    image = decode_image_bytes(image_bytes)

    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    warnings = []

    if width < 640 or height < 480:
        warnings.append("Image resolution is below 640x480 recommendation")

    if brightness < 45:
        warnings.append("Image is too dark (underexposed)")

    if brightness > 220:
        warnings.append("Image may be overexposed / glare detected")

    if contrast < 25:
        warnings.append("Image has low contrast")

    if blur_score < 70:
        warnings.append("Image may be blurry (Laplacian variance < 70)")

    # ArUco marker detection
    detected_markers = []
    annotated = image.copy()

    try:
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        detector_parameters = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(dictionary, detector_parameters)
        corners, ids, rejected = detector.detectMarkers(gray)

        if ids is not None and len(ids) > 0:
            cv2.aruco.drawDetectedMarkers(annotated, corners, ids)
            for marker_id, marker_corners in zip(ids.flatten(), corners):
                points = marker_corners.reshape(4, 2)
                edge_lengths = [
                    float(np.linalg.norm(points[i] - points[(i + 1) % 4]))
                    for i in range(4)
                ]
                detected_markers.append({
                    "id": int(marker_id),
                    "corners_px": points.tolist(),
                    "average_edge_px": round(float(np.mean(edge_lengths)), 2),
                })
    except Exception as aruco_err:
        warnings.append(f"ArUco scan warning: {str(aruco_err)}")

    # Encode annotated image
    ok, encoded = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        # Fallback to re-encoding raw image
        ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])

    encoded_bytes = encoded.tobytes() if ok else image_bytes

    return {
        "image_width": width,
        "image_height": height,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "blur_score": round(blur_score, 2),
        "quality_status": "PASS" if not warnings else "REVIEW_REQUIRED",
        "warnings": warnings,
        "detected_markers": detected_markers,
        "marker_count": len(detected_markers),
        "metric_calibration_status": "CALIBRATED" if detected_markers else "NOT_CALIBRATED",
        "annotated_image_bytes": encoded_bytes,
    }
