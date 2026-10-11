from typing import Dict, Any, List
import re

KNOWLEDGE_BASE = [
    {
        "keywords": ["gangsaw", "classification", "above gangsaw", "below gangsaw", "threshold", "rule"],
        "topic": "Gangsaw Classification Rule",
        "answer": (
            "Under the Granite Conservation and Development Rules (GCDR), granite blocks are classified "
            "as 'Above Gangsaw' if both sorted plan dimensions strictly exceed 270 cm in length and 150 cm in width "
            "(Length > 270 cm AND Width > 150 cm). If either dimension is less than or equal to this threshold "
            "(≤ 270 cm × 150 cm), the block is classified as 'Below Gangsaw'."
        ),
        "citations": ["GCDR Departmental Guidelines", "Tamil Nadu / AP Minor Mineral Concession Rules"],
    },
    {
        "keywords": ["aruco", "marker", "calibration", "scale", "metric", "centimetre", "cm"],
        "topic": "ArUco Metric Calibration",
        "answer": (
            "Metric scale is established using high-contrast ArUco fiducial markers of known physical dimensions "
            "(default 10.0 cm edge). The system detects corners to sub-pixel accuracy, calculates pixels-per-centimeter "
            "ratio, and applies metric scaling to the reconstructed 3D point cloud."
        ),
        "citations": ["OpenCV ArUco Module", "GraniteMeasure Photogrammetry Pipeline Spec"],
    },
    {
        "keywords": ["defect", "crack", "fracture", "chip", "cavity", "cutting", "waste"],
        "topic": "Defect Detection & Cutting Optimization",
        "answer": (
            "Identified block defects include FRACTURE, CRACK, CHIP, CAVITY, PROTRUSION, and STRUCTURAL UNCERTAINTY. "
            "When defects affect cutting, the automated cutting planner plans planar cuts and surface dressings "
            "to maximize rectangular recovery ratio while eliminating structural fault zones prior to gangsaw sawing."
        ),
        "citations": ["Stone Processing & Cutting Manual", "Defect Avoidance Algorithm"],
    },
    {
        "keywords": ["density", "weight", "mass", "tonnes", "weighbridge", "mt"],
        "topic": "Density & Mass Estimation",
        "answer": (
            "Indicative mass is calculated using an assumed standard granite density of 2,750 kg/m³ "
            "(2.75 MT/m³) multiplied by bounding box or mesh volume. For legal transit passes and dispatch, "
            "certified weighbridge records take precedence over photogrammetric volumetric estimates."
        ),
        "citations": ["Bureau of Indian Standards (IS 1121)", "Mine Dispatch Procedure"],
    },
    {
        "keywords": ["rate", "seigniorage", "black galaxy", "kashmir white", "tan brown", "tax", "royalty"],
        "topic": "Seigniorage Fee Assessment",
        "answer": (
            "Seigniorage fee is calculated as: Weight (MT) × Rate per MT for the corresponding color group and gangsaw classification. "
            "Premium varieties like Black Galaxy command higher royalty rates when Above Gangsaw than commercial varieties."
        ),
        "citations": ["State Mineral Revenue Department Rate Schedule v2024.1"],
    },
]


def answer_query(query: str, block_context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    cleaned = query.lower().strip()

    # Search knowledge base by matching keywords
    best_match = None
    best_score = 0
    for entry in KNOWLEDGE_BASE:
        score = sum(1 for kw in entry["keywords"] if kw in cleaned)
        if score > best_score:
            best_score = score
            best_match = entry

    if best_match and best_score > 0:
        response_text = best_match["answer"]
        topic = best_match["topic"]
        citations = best_match["citations"]
    else:
        topic = "General GraniteMeasure AI Inquiries"
        response_text = (
            "GraniteMeasure AI assists mining officers with multi-view 3D reconstruction, "
            "ArUco-based metric scale recovery, defect classification, cutting optimization, "
            "and indicative seigniorage assessment according to statutory gangsaw thresholds."
        )
        citations = ["GraniteMeasure AI System Architecture"]

    # Append block specific context if provided
    context_note = None
    if block_context:
        dims = f"{block_context.get('length_cm', '?')} × {block_context.get('breadth_cm', '?')} × {block_context.get('height_cm', '?')} cm"
        context_note = f"Queried in context of block {block_context.get('identifier', 'N/A')} (Dimensions: {dims})."

    return {
        "query": query,
        "topic": topic,
        "answer": response_text,
        "citations": citations,
        "context_applied": context_note,
        "deterministic": True,
    }
