import cv2
import numpy as np


def analyze_image(image_bytes: bytes):
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to decode image")

    height, width = image.shape[:2]

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    blur_score = float(
        cv2.Laplacian(gray, cv2.CV_64F).var()
    )

    warnings = []

    if width < 640 or height < 480:
        warnings.append("Image resolution is too low")

    if brightness < 45:
        warnings.append("Image is too dark")

    if brightness > 220:
        warnings.append("Image may be overexposed")

    if contrast < 25:
        warnings.append("Image has low contrast")

    if blur_score < 70:
        warnings.append("Image may be blurry")

    dictionary = cv2.aruco.getPredefinedDictionary(
        cv2.aruco.DICT_4X4_50
    )

    detector_parameters = cv2.aruco.DetectorParameters()

    detector = cv2.aruco.ArucoDetector(
        dictionary,
        detector_parameters
    )

    corners, ids, rejected = detector.detectMarkers(gray)

    annotated = image.copy()

    detected_markers = []

    if ids is not None:
        cv2.aruco.drawDetectedMarkers(
            annotated, corners, ids
        )

        for marker_id, marker_corners in zip(
            ids.flatten(), corners
        ):
            points = marker_corners.reshape(4, 2)

            edge_lengths = [
                float(np.linalg.norm(
                    points[i] - points[(i + 1) % 4]
                ))
                for i in range(4)
            ]

            detected_markers.append({
                "id": int(marker_id),
                "corners_px": points.tolist(),
                "average_edge_px": round(
                    float(np.mean(edge_lengths)), 2
                )
            })

    ok, encoded = cv2.imencode(".jpg", annotated)

    if not ok:
        raise ValueError("Unable to encode annotated image")

    return {
        "image_width": width,
        "image_height": height,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "blur_score": round(blur_score, 2),
        "quality_status": (
            "PASS" if not warnings else "REVIEW_REQUIRED"
        ),
        "warnings": warnings,
        "detected_markers": detected_markers,
        "marker_count": len(detected_markers),
        "metric_calibration_status": "NOT_CALIBRATED",
        "annotated_image_bytes": encoded.tobytes()
    }
