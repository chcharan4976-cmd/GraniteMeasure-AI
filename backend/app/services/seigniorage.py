"""
Seigniorage Assessment Engine for Andhra Pradesh Granite Mining.

Rates are configured from the AP RTGS AI Hackathon challenge specification.
These rates are challenge-configured and NOT independently certified as current law.
The classification threshold (270cm × 150cm) is from the challenge specification.
"""

from typing import Optional


class SeigniorageEngine:
    """Engine for calculating indicative seigniorage assessment."""

    # Challenge-configured rates (₹ per Metric Tonne)
    RATES = {
        "Black Galaxy": {"above": 1830.0, "below": 1530.0},
        "Other Black Granite": {"above": 1520.0, "below": 1300.0},
        "Specified Colour Granite Group 1": {"above": 1660.0, "below": 1410.0},
        "Specified Colour Granite Group 2": {"above": 1360.0, "below": 1200.0},
        "Other Colour Granite": {"above": 940.0, "below": 720.0},
    }

    # Short aliases for convenience
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

    # Classification threshold from challenge specification
    GANGSAW_LENGTH_CM = 270.0
    GANGSAW_WIDTH_CM = 150.0

    # Default granite density (kg/m³) - typical for granite
    DEFAULT_DENSITY = 2750.0

    DISCLAIMER = (
        "This is an indicative assessment using challenge-configured rates. "
        "These rates have NOT been independently certified as current law. "
        "The 270cm × 150cm classification threshold is from the challenge specification. "
        "Official assessment requires authorized government verification."
    )

    rate_version = "AP-RTGS-Hackathon-Challenge-2026-v1"

    def _resolve_category(self, color_group: str) -> str:
        """Resolve category name including aliases."""
        if color_group in self.RATES:
            return color_group
        if color_group in self.ALIASES:
            return self.ALIASES[color_group]
        return "Other Colour Granite"  # Default fallback

    @staticmethod
    def is_above_gangsaw(length_cm: float, width_cm: float) -> bool:
        """
        Classify block as above or below gangsaw size.
        
        Per challenge specification: Above gangsaw if length >= 270cm AND width >= 150cm.
        Note: The challenge specifies this threshold but does not define how
        ambiguous orientations or mixed threshold cases are legally classified.
        """
        dims = sorted([length_cm, width_cm], reverse=True)
        return dims[0] >= SeigniorageEngine.GANGSAW_LENGTH_CM and dims[1] >= SeigniorageEngine.GANGSAW_WIDTH_CM

    def calculate_assessment(
        self,
        color_group: str,
        length_cm: float,
        width_cm: float,
        height_cm: float,
        weight_mt: Optional[float] = None,
        density_kg_m3: float = DEFAULT_DENSITY,
    ) -> dict:
        """
        Calculate indicative seigniorage assessment.
        
        Args:
            color_group: Granite category name
            length_cm: Block length in centimeters
            width_cm: Block width/breadth in centimeters  
            height_cm: Block height in centimeters
            weight_mt: Actual weighed mass in metric tonnes (if available)
            density_kg_m3: Granite density for volume-based weight estimation
            
        Returns:
            Assessment details including classification, rate, and amount
        """
        resolved_category = self._resolve_category(color_group)
        is_above = self.is_above_gangsaw(length_cm, width_cm)

        # Calculate volume in cubic meters
        volume_m3 = (length_cm / 100) * (width_cm / 100) * (height_cm / 100)

        # Determine weight
        if weight_mt is not None and weight_mt > 0:
            actual_weight_mt = weight_mt
            weight_source = "WEIGHED"
        else:
            # Estimate from volume and density
            weight_kg = volume_m3 * density_kg_m3
            actual_weight_mt = weight_kg / 1000.0
            weight_source = f"ESTIMATED (density={density_kg_m3} kg/m³)"

        # Get rate
        rate_info = self.RATES.get(resolved_category, self.RATES["Other Colour Granite"])
        rate_per_mt = rate_info["above"] if is_above else rate_info["below"]
        classification = "Above Gangsaw" if is_above else "Below Gangsaw"

        # Calculate assessment
        total_amount = round(rate_per_mt * actual_weight_mt, 2)

        return {
            "color_group": resolved_category,
            "is_above_gangsaw": is_above,
            "classification": classification,
            "volume_m3": round(volume_m3, 4),
            "weight_mt": round(actual_weight_mt, 4),
            "weight_source": weight_source,
            "rate_per_mt": rate_per_mt,
            "total_amount": total_amount,
            "rate_version": self.rate_version,
        }

    def get_all_rates(self) -> list:
        """Get all configured rates as a list."""
        rates = []
        for category, rate_info in self.RATES.items():
            rates.append({
                "color_group": category,
                "above_gangsaw_rate": rate_info["above"],
                "below_gangsaw_rate": rate_info["below"],
                "unit": "₹/MT",
            })
        return rates
