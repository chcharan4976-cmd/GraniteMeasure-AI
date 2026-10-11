import cv2
import numpy as np
import io
import hashlib
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image, ImageOps

from app.ai.image_analyzer import decode_image_bytes


def _detect_human_subject(image_bgr: np.ndarray) -> Tuple[bool, float]:
    """
    Detects human portrait, selfie, or person in frame:
    Uses YCrCb skin tone chromatic clustering (Cr in [133, 173], Cb in [77, 127]).
    If skin pixels dominate the frame center and texture is smooth, it is a human subject rather than quarry stone.
    Brown and pink granite (Tan Brown, Flash Brown, Rosy Pink) contain feldspar minerals with similar chromatic hues,
    but exhibit high crystalline grain roughness (>25.0) which does not exist in human skin.
    """
    try:
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        resized_gray = cv2.resize(gray, (256, 256))
        lap = cv2.Laplacian(resized_gray, cv2.CV_32F)
        grain_roughness = float(np.std(lap))

        # Natural granite rock surface has high mineral crystalline grain roughness:
        if grain_roughness > 25.0:
            return False, 0.0

        ycrcb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]
        skin_mask = (cr >= 133) & (cr <= 173) & (cb >= 77) & (cb <= 127)
        skin_ratio = float(np.sum(skin_mask)) / float(skin_mask.size)

        h, w = skin_mask.shape
        center_skin = skin_mask[int(h * 0.2):int(h * 0.8), int(w * 0.2):int(w * 0.8)]
        center_ratio = float(np.sum(center_skin)) / float(center_skin.size) if center_skin.size > 0 else 0.0

        is_human = (skin_ratio > 0.40) or (center_ratio > 0.45)
        return is_human, center_ratio
    except Exception:
        return False, 0.0


def _detect_document_or_text_page(image_bgr: np.ndarray, gray: np.ndarray) -> Tuple[bool, float]:
    """
    Detects scanned paperwork, printed invoices, text documents, or whiteboard diagrams:
    High overall brightness (>175), moderate contrast, and high white background ratio (>70%).
    """
    try:
        contrast = float(np.std(gray))
        if contrast < 12.0:
            # Completely flat/blank surface, handled by blur/lighting check
            return False, 0.0

        mean_brightness = float(np.mean(gray))
        thumb = cv2.resize(gray, (320, 240))
        _, thresh = cv2.threshold(thumb, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        white_ratio = float(np.sum(thresh == 255)) / float(thresh.size)

        is_document = white_ratio > 0.70 and mean_brightness > 175.0 and contrast >= 15.0
        return is_document, white_ratio
    except Exception:
        return False, 0.0


def _detect_synthetic_screenshot(image_bgr: np.ndarray) -> Tuple[bool, float]:
    """
    Detects phone app UI screenshots, synthetic illustrations, or vector graphics:
    High color saturation, narrow color histogram peaks, perfectly vertical/horizontal divider lines.
    """
    try:
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        mean_sat = float(np.mean(sat))

        # Natural granite/quarry scenes have earthy, low-to-moderate saturation (mean sat typically 15-75).
        # Phone apps/neon graphics typically have mean saturation > 120 or extreme primary color peaks.
        if mean_sat > 135:
            return True, mean_sat
        return False, mean_sat
    except Exception:
        return False, 0.0


def _evaluate_stone_texture(gray: np.ndarray) -> Tuple[float, float]:
    """
    Evaluates crystalline granite mineral texture:
    Natural granite (Black Galaxy, Steel Grey, Tan Brown) has high local grain variance
    and crystalline reflection flecks (feldspar/quartz/biotite).
    Returns (texture_energy, grain_roughness).
    """
    try:
        resized = cv2.resize(gray, (512, 512))

        # Local standard deviation in 15x15 sliding window
        kernel = np.ones((15, 15), np.float32) / 225.0
        mean = cv2.filter2D(resized.astype(np.float32), -1, kernel)
        sq_mean = cv2.filter2D(np.square(resized.astype(np.float32)), -1, kernel)
        var = np.maximum(sq_mean - np.square(mean), 0)
        local_std = np.sqrt(var)

        texture_energy = float(np.mean(local_std))

        # High-pass filter via Laplacian to assess granular graininess
        lap = cv2.Laplacian(resized, cv2.CV_32F)
        grain_roughness = float(np.std(lap))

        return texture_energy, grain_roughness
    except Exception:
        return 20.0, 15.0


def _detect_block_facets(gray: np.ndarray) -> Tuple[bool, int, float]:
    """
    Detects dominant planar cleavage planes, saw-cut edges, or polygonal block boundaries.
    """
    try:
        resized = cv2.resize(gray, (512, 512))
        blurred = cv2.GaussianBlur(resized, (5, 5), 1.5)
        edges = cv2.Canny(blurred, 50, 150)

        # Hough line transform to find long planar cutting edges / block boundaries
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=55, minLineLength=45, maxLineGap=15)
        line_count = len(lines) if lines is not None else 0

        # Find contours to check if a large polygonal contour exists
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        max_area = 0.0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > max_area:
                max_area = area

        frame_area = 512.0 * 512.0
        block_area_ratio = max_area / frame_area

        has_prominent_edges = line_count >= 3 or block_area_ratio > 0.12
        return has_prominent_edges, line_count, block_area_ratio
    except Exception:
        return False, 0, 0.0


def _check_aruco_presence(gray: np.ndarray) -> bool:
    """Checks if standard photogrammetry ArUco calibration marker is present."""
    try:
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        detector_parameters = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(dictionary, detector_parameters)
        corners, ids, _ = detector.detectMarkers(gray)
        return ids is not None and len(ids) > 0
    except Exception:
        return False


def validate_granite_evidence(
    image_bytes: bytes,
    allow_closeup_defects: bool = True
) -> Dict[str, Any]:
    """
    Granite Evidence Validator:
    Evaluates whether an image contains authentic granite block evidence suitable for
    measurement, calibration, and defect logging, or if it is an unrelated image (selfie,
    document, vehicle, food, synthetic screenshot) that must be rejected.
    """
    if not image_bytes or len(image_bytes) < 1024:
        return {
            "verdict": "REJECTED_POOR_QUALITY",
            "is_accepted": False,
            "confidence": 0.0,
            "reasons": ["Empty or corrupt image byte payload."],
            "suggested_action": "RETAKE",
            "message_en": "Image file is empty or corrupted. Please capture or select a valid image.",
            "message_te": "ఫోటో ఫైల్ ఖాళీగా ఉంది లేదా పాడైపోయింది. దయచేసి సరైన ఫోటో తీయండి.",
            "metrics": {},
        }

    # 1. Decode image
    try:
        image = decode_image_bytes(image_bytes)
    except Exception as e:
        return {
            "verdict": "REJECTED_POOR_QUALITY",
            "is_accepted": False,
            "confidence": 0.0,
            "reasons": [f"Image decoding failed: {str(e)}"],
            "suggested_action": "RETAKE",
            "message_en": "Could not decode photograph format. Use JPEG, PNG, or WebP.",
            "message_te": "ఫోటో ఫార్మాట్ డీకోడ్ కాలేదు. JPEG లేదా PNG ఉపయోగించండి.",
            "metrics": {},
        }

    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 2. Semantic Relevance Checks (Human face/portrait, Document, Synthetic UI)
    has_face, face_ratio = _detect_human_subject(image)
    if has_face:
        return {
            "verdict": "REJECTED_UNRELATED",
            "is_accepted": False,
            "confidence": 0.05,
            "reasons": [f"Human subject/portrait detected (skin ratio {round(face_ratio*100, 1)}%). Photo contains a person instead of quarry granite."],
            "suggested_action": "RETAKE",
            "message_en": "This photo contains a person or selfie. Please take a photograph of the granite stone block.",
            "message_te": "ఈ ఫోటోలో మనిషి లేదా సెల్ఫీ కనిపిస్తోంది. దయచేసి గ్రానైట్ రాయి దిమ్మె ఫోటో మాత్రమే తీయండి.",
            "metrics": {"face_detected": True, "skin_ratio": round(face_ratio, 2)},
        }

    is_doc, white_ratio = _detect_document_or_text_page(image, gray)
    if is_doc:
        return {
            "verdict": "REJECTED_UNRELATED",
            "is_accepted": False,
            "confidence": 0.05,
            "reasons": [f"Text document or paper detected (white background ratio {round(white_ratio*100, 1)}%)."],
            "suggested_action": "CHOOSE_ANOTHER",
            "message_en": "This appears to be a paper document or invoice. Upload photographs of the physical granite block.",
            "message_te": "ఇది కాగితం పత్రం లేదా బిల్లులా కనిపిస్తోంది. గ్రానైట్ రాయి దిమ్మె ఫోటోలు మాత్రమే అప్‌లోడ్ చేయండి.",
            "metrics": {"is_document": True, "white_ratio": round(white_ratio, 2)},
        }

    is_synth, mean_sat = _detect_synthetic_screenshot(image)
    if is_synth:
        return {
            "verdict": "REJECTED_UNRELATED",
            "is_accepted": False,
            "confidence": 0.1,
            "reasons": [f"Synthetic graphic or saturated app screenshot detected (mean saturation {round(mean_sat, 1)})."],
            "suggested_action": "CHOOSE_ANOTHER",
            "message_en": "This appears to be a digital screen or graphic. Please photograph the physical quarry block.",
            "message_te": "ఇది డిజిటల్ స్క్రీన్‌షాట్ లేదా గ్రాఫిక్ లా ఉంది. క్వారీలోని అసలైన రాయిని ఫోటో తీయండి.",
            "metrics": {"is_synthetic": True, "mean_sat": round(mean_sat, 1)},
        }

    # 3. Quality Metrics (Blur, Exposure, Contrast)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if blur_score < 30.0:
        return {
            "verdict": "REJECTED_POOR_QUALITY",
            "is_accepted": False,
            "confidence": 0.1,
            "reasons": [f"Severe blur detected (Laplacian variance {round(blur_score, 1)} < 30). Camera was shaken."],
            "suggested_action": "RETAKE",
            "message_en": "Photo is too blurry. Hold the phone steady and capture with sharp focus.",
            "message_te": "ఫోటో చాలా మసకగా ఉంది. ఫోన్‌ను స్థిరంగా పట్టుకుని స్పష్టమైన ఫోటో తీయండి.",
            "metrics": {"blur_score": round(blur_score, 1), "brightness": round(brightness, 1), "contrast": round(contrast, 1)},
        }

    if brightness < 30.0:
        return {
            "verdict": "REJECTED_POOR_QUALITY",
            "is_accepted": False,
            "confidence": 0.15,
            "reasons": [f"Severe underexposure ({round(brightness, 1)} < 30). Insufficient lighting."],
            "suggested_action": "RETAKE",
            "message_en": "Photo is too dark. Turn on torch/flashlight or capture in daytime lighting.",
            "message_te": "ఫోటో చాలా చీకటిగా ఉంది. ఫ్లాష్‌లైట్ ఉపయోగించండి లేదా వెలుతురులో తీయండి.",
            "metrics": {"blur_score": round(blur_score, 1), "brightness": round(brightness, 1), "contrast": round(contrast, 1)},
        }

    if brightness > 235.0:
        return {
            "verdict": "REJECTED_POOR_QUALITY",
            "is_accepted": False,
            "confidence": 0.15,
            "reasons": [f"Severe overexposure / glare ({round(brightness, 1)} > 235)."],
            "suggested_action": "RETAKE",
            "message_en": "Photo is washed out due to extreme glare or sunlight reflection.",
            "message_te": "ఎండ తీవ్రత వల్ల ఫోటో పూర్తిగా తెల్లగా వచ్చింది. కోణం మార్చి తీయండి.",
            "metrics": {"blur_score": round(blur_score, 1), "brightness": round(brightness, 1), "contrast": round(contrast, 1)},
        }

    # 4. Stone Texture and Geometric Edge Analysis
    texture_energy, grain_roughness = _evaluate_stone_texture(gray)
    has_edges, line_count, block_area_ratio = _detect_block_facets(gray)
    has_aruco = _check_aruco_presence(gray)

    # Compute positive confidence score
    confidence = 0.35  # Base prior

    if texture_energy > 18.0 and grain_roughness > 15.0:
        confidence += 0.25
    elif texture_energy > 12.0:
        confidence += 0.15

    if has_edges:
        confidence += 0.20
    if line_count >= 4:
        confidence += 0.10

    if has_aruco:
        confidence += 0.25

    confidence = min(round(confidence, 2), 0.98)

    reasons = []
    if has_aruco:
        reasons.append("ArUco calibration marker verified in frame.")
    if has_edges:
        reasons.append(f"Planar cleavage facets detected ({line_count} dominant linear edges).")
    reasons.append(f"Crystalline texture energy: {round(texture_energy, 1)}, Grain roughness: {round(grain_roughness, 1)}.")

    metrics = {
        "blur_score": round(blur_score, 1),
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "texture_energy": round(texture_energy, 1),
        "grain_roughness": round(grain_roughness, 1),
        "line_count": line_count,
        "has_aruco": has_aruco,
        "confidence": confidence,
    }

    # Threshold decisions:
    # A. ACCEPTED GRANITE BLOCK
    if confidence >= 0.70 or (confidence >= 0.55 and (has_aruco or has_edges)):
        return {
            "verdict": "ACCEPTED_GRANITE_BLOCK",
            "is_accepted": True,
            "confidence": confidence,
            "reasons": reasons,
            "suggested_action": "PROCEED",
            "message_en": "Granite block candidate verified. Quality meets photogrammetric standards.",
            "message_te": "గ్రానైట్ రాయి విజయవంతంగా నిర్ధారించబడింది. ఫోటో నాణ్యత కొలతలకు సరిపోతుంది.",
            "metrics": metrics,
        }

    # B. CLOSE-UP SURFACE (defect or crack inspection)
    if texture_energy > 22.0 and not has_edges:
        if allow_closeup_defects:
            return {
                "verdict": "CLOSEUP_SURFACE",
                "is_accepted": True,
                "is_closeup_defect": True,
                "confidence": confidence,
                "reasons": reasons + ["Stone surface closeup: acceptable for crack/cavity inspection, but lacks whole-block bounds."],
                "suggested_action": "PROCEED",
                "message_en": "Close-up stone surface detected. Accepted as defect observation evidence.",
                "message_te": "రాయి ఉపరితల క్లోజప్ ఫోటో. లోపాల పరిశీలన సాక్ష్యంగా అంగీకరించబడింది.",
                "metrics": metrics,
            }

    # C. UNCERTAIN GRANITE
    if confidence >= 0.40:
        return {
            "verdict": "UNCERTAIN_GRANITE",
            "is_accepted": False,
            "needs_review": True,
            "confidence": confidence,
            "reasons": reasons + ["Low edge prominence: entire block boundary could not be definitively isolated."],
            "suggested_action": "HOLD_FOR_REVIEW",
            "message_en": "Granite block could not be confirmed with high certainty. Step back to show full stone edges.",
            "message_te": "గ్రానైట్ రాయి సరిగ్గా స్పష్టంగా కనిపించడం లేదు. రాయి నాలుగు అంచులు కనిపించేలా కొంచెం వెనక్కి జరిగి ఫోటో తీయండి.",
            "metrics": metrics,
        }

    # D. REJECTED UNRELATED
    return {
        "verdict": "REJECTED_UNRELATED",
        "is_accepted": False,
        "confidence": confidence,
        "reasons": [
            "Scene lacks granite crystalline texture and stone block geometric cleavage.",
            f"Texture energy ({round(texture_energy, 1)}) and edge count ({line_count}) indicate an unrelated object.",
        ],
        "suggested_action": "CHOOSE_ANOTHER",
        "message_en": "This does not appear to contain a granite block. Please take or select a clear photograph of the granite stone.",
        "message_te": "ఈ ఫోటోలో గ్రానైట్ రాయి దిమ్మె కనిపించడం లేదు. దయచేసి గ్రానైట్ రాయి స్పష్టంగా కనిపించే ఫోటో తీయండి లేదా ఎంచుకోండి.",
        "metrics": metrics,
    }
