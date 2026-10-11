"""Pydantic schemas for GraniteMeasure AI API."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    OFFICER = "Officer"
    QUARRY_OPERATOR = "Quarry Operator"
    SUPERVISOR = "Supervisor"
    ADMIN = "Admin"


# ---- Auth ----
class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: str
    full_name: Optional[str] = None


# ---- User ----
class UserCreate(BaseModel):
    username: str
    password: str
    role: RoleEnum
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    is_active: bool
    model_config = {"from_attributes": True}


# ---- Quarry ----
class QuarryCreate(BaseModel):
    name: str
    code: Optional[str] = None
    lease_reference: Optional[str] = None
    lease_number: Optional[str] = None
    lease_holder: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = "Prakasam"
    mandal: Optional[str] = "Chimakurthy"
    village: Optional[str] = None
    granite_category: Optional[str] = "Black Galaxy"
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    operator_id: Optional[int] = None
    status: Optional[str] = "ACTIVE"


class QuarryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    lease_reference: Optional[str] = None
    lease_number: Optional[str] = None
    lease_holder: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    mandal: Optional[str] = None
    village: Optional[str] = None
    granite_category: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: Optional[bool] = None


class QuarryResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    lease_reference: Optional[str] = None
    lease_number: Optional[str] = None
    lease_holder: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    mandal: Optional[str] = None
    village: Optional[str] = None
    granite_category: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: bool = True
    active_blocks_count: Optional[int] = 0
    status: Optional[str] = "ACTIVE"
    model_config = {"from_attributes": True}


# ---- Block ----
class BlockCreate(BaseModel):
    identifier: Optional[str] = None
    quarry_id: int
    color_group: str
    block_type: Optional[str] = "RAW"
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    observations: Optional[str] = None


class BlockResponse(BaseModel):
    id: int
    identifier: str
    color_group: str
    quarry_id: Optional[int] = None
    block_type: str
    status: str
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    observations: Optional[str] = None
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    registered_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class BlockArchiveRequest(BaseModel):
    reason: Optional[str] = "Archived by mining officer"


class BlockDeleteRequest(BaseModel):
    confirm_identifier: Optional[str] = None
    reason: Optional[str] = "Administrative block deletion"
    force_hard_delete: bool = False


class BulkBlockActionRequest(BaseModel):
    block_ids: List[str]
    reason: Optional[str] = "Bulk administrative action"
    force_hard_delete: bool = False


# ---- Capture ----
class CaptureSessionCreate(BaseModel):
    block_id: int
    officer_name: Optional[str] = None


class CaptureSessionResponse(BaseModel):
    id: int
    block_id: int
    status: str
    image_count: int
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ---- Analysis ----
class AnalysisJobCreate(BaseModel):
    block_id: int
    session_id: Optional[int] = None


class AnalysisJobResponse(BaseModel):
    id: int
    block_id: int
    status: str
    current_step: str
    progress_pct: int
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ---- Measurement ----
class MeasurementResponse(BaseModel):
    id: int
    block_id: int
    length_cm: Optional[float] = None
    breadth_cm: Optional[float] = None
    height_cm: Optional[float] = None
    volume_m3: Optional[float] = None
    weight_mt: Optional[float] = None
    confidence: Optional[float] = None
    status: str
    calibration_status: str
    measurement_type: str
    reconstructed_points: Optional[int] = None
    usable_images: Optional[int] = None
    warnings: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ---- Dashboard Stats ----
class DashboardStats(BaseModel):
    total_blocks: int = 0
    pending_analysis: int = 0
    completed_measurements: int = 0
    needs_verification: int = 0
    recent_blocks: List[dict] = []


# ---- Officer Schemas ----
from app.schemas.officer import (
    OfficerBase,
    OfficerCreate,
    OfficerUpdate,
    OfficerResponse,
    OfficerList,
)

# ---- Defect Schemas ----
from app.schemas.defect import (
    DefectTypeEnum,
    DefectSeverityEnum,
    DefectCreate,
    DefectUpdate,
    DefectConfirmRequest,
    DefectResponse,
    DefectList,
)

# ---- Cutting Schemas ----
from app.schemas.cutting import (
    CutTypeEnum,
    CuttingPlanStatusEnum,
    CuttingOperationCreate,
    CuttingOperationResponse,
    CuttingPlanCreate,
    CuttingPlanUpdate,
    CuttingPlanResponse,
    CuttingPlanList,
    DressingPlanGenerateRequest,
)

# ---- Dispatch & Verification Schemas ----
from app.schemas.dispatch import (
    ApprovalEventTypeEnum,
    DispatchStatusEnum,
    VerificationTypeEnum,
    ApprovalEventCreate,
    ApprovalEventResponse,
    ApprovalEventList,
    DispatchRecordCreate,
    DispatchRecordUpdate,
    DispatchRecordResponse,
    DispatchRecordList,
    ManualVerificationCreate,
    ManualVerificationResponse,
    ManualVerificationList,
)

# ---- Audit Schemas ----
from app.schemas.audit import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogList,
)

