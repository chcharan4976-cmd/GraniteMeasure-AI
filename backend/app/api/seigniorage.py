from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.services.seigniorage import SeigniorageEngine

router = APIRouter(prefix="/api/v1/seigniorage", tags=["Seigniorage"])


class SeigniorageRequest(BaseModel):
    color_group: str = Field(..., description="Granite category e.g. 'Black Galaxy'")
    length_cm: float = Field(..., gt=0, description="Length in centimeters")
    width_cm: float = Field(..., gt=0, description="Width/breadth in centimeters")
    height_cm: float = Field(..., gt=0, description="Height in centimeters")
    weight_mt: Optional[float] = Field(None, gt=0, description="Weighed mass in metric tonnes")
    density_kg_m3: float = Field(default=2750, description="Granite density in kg/m³")
    block_id: Optional[str] = None
    measurement_source: str = Field(default="ESTIMATED", description="MEASURED or ESTIMATED")


class SeigniorageResponse(BaseModel):
    color_group: str
    length_cm: float
    width_cm: float
    height_cm: float
    volume_m3: float
    volume_basis: str
    weight_mt: float
    weight_source: str
    mass_kind: str
    is_above_gangsaw: bool
    classification: str
    classification_rule: dict
    rate_per_mt: float
    indicative_seigniorage: float
    rate_version: str
    measurement_source: str
    indicative: bool
    disclaimer: str


@router.get("/rates")
async def get_rates():
    """Get all configured seigniorage rates."""
    engine = SeigniorageEngine()
    return {
        "rates": engine.get_all_rates(),
        "classification_threshold": {
            "length_cm": 270,
            "width_cm": 150,
            "mode": "strict_gt",
            "description": (
                "Above Gangsaw if sorted plan dimensions are strictly greater than "
                "270 cm × 150 cm. The 270 × 150 cm boundary is Below Gangsaw. "
                "Mixed / rotated orientations use sorted length/breadth pending departmental confirmation."
            ),
        },
        "rate_version": engine.rate_version,
        "disclaimer": engine.DISCLAIMER
    }


@router.post("/calculate", response_model=SeigniorageResponse)
async def calculate_assessment(request: SeigniorageRequest):
    """Calculate indicative seigniorage assessment for a granite block."""
    engine = SeigniorageEngine()
    result = engine.calculate_assessment(
        color_group=request.color_group,
        length_cm=request.length_cm,
        width_cm=request.width_cm,
        height_cm=request.height_cm,
        weight_mt=request.weight_mt,
        density_kg_m3=request.density_kg_m3,
    )
    return SeigniorageResponse(
        color_group=result["color_group"],
        length_cm=request.length_cm,
        width_cm=request.width_cm,
        height_cm=request.height_cm,
        volume_m3=result["volume_m3"],
        volume_basis=result["volume_basis"],
        weight_mt=result["weight_mt"],
        weight_source=result["weight_source"],
        mass_kind=result["mass_kind"],
        is_above_gangsaw=result["is_above_gangsaw"],
        classification=result["classification"],
        classification_rule=result["classification_rule"],
        rate_per_mt=result["rate_per_mt"],
        indicative_seigniorage=result["total_amount"],
        rate_version=engine.rate_version,
        measurement_source=request.measurement_source,
        indicative=True,
        disclaimer=engine.DISCLAIMER,
    )
