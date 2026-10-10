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
    district: Optional[str] = None
    mandal: Optional[str] = None
    village: Optional[str] = None
    granite_category: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    operator_id: Optional[int] = None


class QuarryResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    lease_reference: Optional[str] = None
    district: Optional[str] = None
    mandal: Optional[str] = None
    village: Optional[str] = None
    granite_category: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    is_active: bool = True
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
    quarry_id: int
    block_type: str
    status: str
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    observations: Optional[str] = None
    registered_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


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
