from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DefectTypeEnum(str, Enum):
    FRACTURE = "FRACTURE"
    CRACK = "CRACK"
    CHIP = "CHIP"
    CAVITY = "CAVITY"
    PROTRUSION = "PROTRUSION"
    DISCOLORATION = "DISCOLORATION"
    STRUCTURAL_UNCERTAINTY = "STRUCTURAL_UNCERTAINTY"


class DefectSeverityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DefectCreate(BaseModel):
    block_id: Optional[str] = None
    job_id: Optional[str] = None
    defect_type: DefectTypeEnum
    severity: DefectSeverityEnum
    description: str
    location_description: Optional[str] = None
    image_id: Optional[str] = None
    bounding_box_json: Optional[str] = None
    affects_cutting: Optional[bool] = False
    notes: Optional[str] = None


class DefectUpdate(BaseModel):
    defect_type: Optional[DefectTypeEnum] = None
    severity: Optional[DefectSeverityEnum] = None
    description: Optional[str] = None
    location_description: Optional[str] = None
    image_id: Optional[str] = None
    bounding_box_json: Optional[str] = None
    affects_cutting: Optional[bool] = None
    is_confirmed: Optional[bool] = None
    confirmed_by: Optional[str] = None
    notes: Optional[str] = None


class DefectConfirmRequest(BaseModel):
    confirmed_by: str
    notes: Optional[str] = None


class DefectResponse(BaseModel):
    id: str
    block_id: str
    job_id: Optional[str] = None
    defect_type: str
    severity: str
    description: str
    location_description: Optional[str] = None
    image_id: Optional[str] = None
    bounding_box_json: Optional[str] = None
    affects_cutting: bool
    is_confirmed: bool
    confirmed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DefectList(BaseModel):
    items: List[DefectResponse]
    total: int
