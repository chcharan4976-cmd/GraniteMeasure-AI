from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CutTypeEnum(str, Enum):
    PLANAR_CUT = "PLANAR_CUT"
    SURFACE_DRESS = "SURFACE_DRESS"
    CORNER_REMOVAL = "CORNER_REMOVAL"
    DEFECT_AVOIDANCE = "DEFECT_AVOIDANCE"


class CuttingPlanStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    EXECUTED = "EXECUTED"


class CuttingOperationCreate(BaseModel):
    operation_order: Optional[int] = 1
    cut_type: CutTypeEnum
    description: str
    plane_normal_json: Optional[str] = None
    plane_offset: Optional[float] = None
    material_removed_m3: Optional[float] = None
    reason: str


class CuttingOperationResponse(BaseModel):
    id: str
    plan_id: str
    operation_order: int
    cut_type: str
    description: str
    plane_normal_json: Optional[str] = None
    plane_offset: Optional[float] = None
    material_removed_m3: Optional[float] = None
    reason: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CuttingPlanCreate(BaseModel):
    block_id: Optional[str] = None
    plan_name: str
    status: Optional[CuttingPlanStatusEnum] = CuttingPlanStatusEnum.DRAFT
    target_length_cm: Optional[float] = None
    target_breadth_cm: Optional[float] = None
    target_height_cm: Optional[float] = None
    original_volume_m3: Optional[float] = None
    dressed_volume_m3: Optional[float] = None
    removed_volume_m3: Optional[float] = None
    recovery_ratio: Optional[float] = None
    wastage_ratio: Optional[float] = None
    optimization_method: Optional[str] = None
    plan_data_json: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    operations: Optional[List[CuttingOperationCreate]] = []


class CuttingPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    status: Optional[CuttingPlanStatusEnum] = None
    target_length_cm: Optional[float] = None
    target_breadth_cm: Optional[float] = None
    target_height_cm: Optional[float] = None
    original_volume_m3: Optional[float] = None
    dressed_volume_m3: Optional[float] = None
    removed_volume_m3: Optional[float] = None
    recovery_ratio: Optional[float] = None
    wastage_ratio: Optional[float] = None
    optimization_method: Optional[str] = None
    plan_data_json: Optional[str] = None
    notes: Optional[str] = None


class CuttingPlanResponse(BaseModel):
    id: str
    block_id: str
    plan_name: str
    status: str
    target_length_cm: Optional[float] = None
    target_breadth_cm: Optional[float] = None
    target_height_cm: Optional[float] = None
    original_volume_m3: Optional[float] = None
    dressed_volume_m3: Optional[float] = None
    removed_volume_m3: Optional[float] = None
    recovery_ratio: Optional[float] = None
    wastage_ratio: Optional[float] = None
    optimization_method: Optional[str] = None
    plan_data_json: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    operations: List[CuttingOperationResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CuttingPlanList(BaseModel):
    items: List[CuttingPlanResponse]
    total: int


class DressingPlanGenerateRequest(BaseModel):
    objective: Optional[str] = "MAXIMIZE_RECTANGULAR_YIELD"  # MAXIMIZE_RECTANGULAR_YIELD, MINIMIZE_MATERIAL_REMOVAL, DEFECT_AVOIDANCE
    target_length_cm: Optional[float] = None
    target_breadth_cm: Optional[float] = None
    target_height_cm: Optional[float] = None
    custom_margin_cm: Optional[float] = 3.0
