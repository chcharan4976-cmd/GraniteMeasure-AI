"""Compare reconstructed dimensions with independently tape-measured references.

Rectangular tape volume is not ground truth for irregular stone volume.
"""

from __future__ import annotations

from typing import Optional


def relative_error(measured: Optional[float], reference: Optional[float]) -> Optional[float]:
    if measured is None or reference is None or reference == 0:
        return None
    return abs(measured - reference) / abs(reference)


def compare_dimensions(
    measured: dict,
    reference: dict,
) -> dict:
    pairs = [
        ("length_cm", measured.get("length_cm"), reference.get("tape_length_cm")),
        ("breadth_cm", measured.get("breadth_cm"), reference.get("tape_breadth_cm")),
        ("height_cm", measured.get("height_cm"), reference.get("tape_height_cm")),
    ]
    dimensions = []
    for name, meas, ref in pairs:
        abs_err = abs(meas - ref) if meas is not None and ref is not None else None
        dimensions.append(
            {
                "name": name,
                "measured_cm": meas,
                "reference_cm": ref,
                "absolute_error_cm": abs_err,
                "relative_error": relative_error(meas, ref),
            }
        )

    tape_volume_m3 = None
    if all(reference.get(k) for k in ("tape_length_cm", "tape_breadth_cm", "tape_height_cm")):
        tape_volume_m3 = (
            (reference["tape_length_cm"] / 100.0)
            * (reference["tape_breadth_cm"] / 100.0)
            * (reference["tape_height_cm"] / 100.0)
        )

    mass_comparison = None
    if reference.get("weight_mt") is not None:
        mass_comparison = {
            "weighbridge_mt": reference.get("weight_mt"),
            "density_estimated_mt": measured.get("estimated_mass_mt"),
            "note": (
                "Weighbridge mass is independent of density assumptions. "
                "Do not treat density-based mass as a physical weighing."
            ),
        }

    return {
        "dimensions": dimensions,
        "bbox_volume_m3_measured": measured.get("bbox_volume_m3"),
        "tape_rectangular_volume_m3": tape_volume_m3,
        "irregular_volume_m3_measured": measured.get("irregular_volume_m3"),
        "volume_note": (
            "Tape L×B×H is a rectangular prism estimate. It is not definitive "
            "ground truth for irregular granite volume."
        ),
        "mass_comparison": mass_comparison,
        "marker_size_cm_verified": reference.get("marker_size_cm_verified"),
        "marker_size_cm_used": measured.get("marker_size_cm"),
    }
