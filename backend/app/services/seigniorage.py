"""
Seigniorage Assessment Engine for Andhra Pradesh Granite Mining.

Rates are configured from the AP RTGS AI Hackathon challenge specification.
These rates are challenge-configured and NOT independently certified as current law.

Challenge size rule (verbatim):
  Above Gangsaw: > 270 cm × 150 cm
  Below Gangsaw: ≤ 270 cm × 150 cm

The previous implementation used ≥, which classified the exact 270 × 150 cm
boundary as Above Gangsaw. The default is now strict greater-than
(`GRANITE_GANGSAW_MODE=strict_gt`). Mixed dimensions and rotated orientations
use a documented, configurable rule pending departmental confirmation.
"""

from typing import Optional

from app.services.pipeline_config import (
    ASSUMED_DENSITY_KG_M3,
    GANGSAW_LENGTH_CM,
    GANGSAW_MODE,
    GANGSAW_ORIENTATION_RULE,
    GANGSAW_WIDTH_CM,
)


class SeigniorageEngine:
    """Engine for calculating indicative seigniorage assessment."""

    RATES = {
        "Black Galaxy": {"above": 1830.0, "below": 1530.0},
        "Other Black Granite": {"above": 1520.0, "below": 1300.0},
        "Specified Colour Granite Group 1": {"above": 1660.0, "below": 1410.0},
        "Specified Colour Granite Group 2": {"above": 1360.0, "below": 1200.0},
        "Other Colour Granite": {"above": 940.0, "below": 720.0},
    }

    ALIASES = {
        "Black Galaxy": "Black Galaxy",
        "Other Black": "Other Black Granite",
        "Colour Group 1": "Specified Colour Granite Group 1",
        "Colour Group 2": "Specified Colour Granite Group 2",
        "Other Colour": "Other Colour Granite",
        "Color Group 1": "Specified Colour Granite Group 1",
        "Color Group 2": "Specified Colour Granite Group 2",
        "Other Color": "Other Colour Granite",
    }

    GANGSAW_LENGTH_CM = GANGSAW_LENGTH_CM
    GANGSAW_WIDTH_CM = GANGSAW_WIDTH_CM
    DEFAULT_DENSITY = ASSUMED_DENSITY_KG_M3

    DISCLAIMER = (
        "This is an indicative assessment using challenge-configured rates. "
        "These rates have NOT been independently certified as current law. "
        "Above Gangsaw is classified as length > 270 cm AND width > 150 cm "
        "(strict greater-than; the 270 × 150 cm boundary is Below Gangsaw). "
        "Plan-dimension orientation uses the configured rule "
        f"'{GANGSAW_ORIENTATION_RULE}' pending departmental confirmation. "
        "Density-based mass is an assumption, not a weighbridge measurement. "
        "Official assessment requires authorized government verification."
    )

    rate_version = "AP-RTGS-Hackathon-Challenge-2026-v1"

    def _resolve_category(self, color_group: str) -> str:
        if color_group in self.RATES:
            return color_group
        if color_group in self.ALIASES:
            return self.ALIASES[color_group]
        return "Other Colour Granite"

    @staticmethod
    def plan_dimensions(length_cm: float, width_cm: float) -> tuple[float, float]:
        """Select plan axes for classification.

        Default rule sorts the two submitted plan values descending so a
        rotated photo does not change the pair. Height is never substituted.
        Departmental confirmation is still required for mixed-orientation cases.
        """
        if GANGSAW_ORIENTATION_RULE == "as_submitted":
            return float(length_cm), float(width_cm)
        dims = sorted([float(length_cm), float(width_cm)], reverse=True)
        return dims[0], dims[1]

    @staticmethod
    def is_above_gangsaw(length_cm: float, width_cm: float) -> bool:
        """Above Gangsaw only when both plan dimensions exceed the thresholds.

        strict_gt (default, challenge wording): L > 270 AND W > 150
        gte (legacy): L >= 270 AND W >= 150
        """
        major, minor = SeigniorageEngine.plan_dimensions(length_cm, width_cm)
        if GANGSAW_MODE in ("gte", "greater_or_equal", "inclusive"):
            return major >= GANGSAW_LENGTH_CM and minor >= GANGSAW_WIDTH_CM
        return major > GANGSAW_LENGTH_CM and minor > GANGSAW_WIDTH_CM

    def calculate_assessment(
        self,
        color_group: str,
        length_cm: float,
        width_cm: float,
        height_cm: float,
        weight_mt: Optional[float] = None,
        density_kg_m3: float = DEFAULT_DENSITY,
        volume_basis: str = "BOUNDING_BOX",
    ) -> dict:
        resolved_category = self._resolve_category(color_group)
        is_above = self.is_above_gangsaw(length_cm, width_cm)
        volume_m3 = (length_cm / 100) * (width_cm / 100) * (height_cm / 100)

        if weight_mt is not None and weight_mt > 0:
            actual_weight_mt = weight_mt
            weight_source = "WEIGHBRIDGE"
            mass_kind = "VERIFIED_WEIGHBRIDGE"
        else:
            weight_kg = volume_m3 * density_kg_m3
            actual_weight_mt = weight_kg / 1000.0
            weight_source = (
                f"DENSITY_ESTIMATE (assumed {density_kg_m3} kg/m³ on {volume_basis} volume)"
            )
            mass_kind = "DENSITY_ESTIMATE"

        rate_info = self.RATES.get(resolved_category, self.RATES["Other Colour Granite"])
        rate_per_mt = rate_info["above"] if is_above else rate_info["below"]
        classification = "Above Gangsaw" if is_above else "Below Gangsaw"
        total_amount = round(rate_per_mt * actual_weight_mt, 2)

        return {
            "color_group": resolved_category,
            "is_above_gangsaw": is_above,
            "classification": classification,
            "classification_rule": {
                "mode": GANGSAW_MODE,
                "orientation_rule": GANGSAW_ORIENTATION_RULE,
                "length_threshold_cm": GANGSAW_LENGTH_CM,
                "width_threshold_cm": GANGSAW_WIDTH_CM,
                "description": (
                    "Above Gangsaw if sorted plan dimensions are strictly greater than "
                    f"{GANGSAW_LENGTH_CM} cm × {GANGSAW_WIDTH_CM} cm"
                    if GANGSAW_MODE == "strict_gt"
                    else "Above Gangsaw if sorted plan dimensions are ≥ 270 cm × 150 cm (legacy)"
                ),
                "pending_departmental_confirmation": True,
            },
            "volume_m3": round(volume_m3, 4),
            "volume_basis": volume_basis,
            "weight_mt": round(actual_weight_mt, 4),
            "weight_source": weight_source,
            "mass_kind": mass_kind,
            "rate_per_mt": rate_per_mt,
            "total_amount": total_amount,
            "rate_version": self.rate_version,
            "indicative": True,
        }

    def get_all_rates(self) -> list:
        rates = []
        for category, rate_info in self.RATES.items():
            rates.append(
                {
                    "color_group": category,
                    "above_gangsaw_rate": rate_info["above"],
                    "below_gangsaw_rate": rate_info["below"],
                    "unit": "₹/MT",
                }
            )
        return rates
