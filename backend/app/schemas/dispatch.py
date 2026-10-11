from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ApprovalEventTypeEnum(str, Enum):
    SUBMITTED = "SUBMITTED"
    OFFICER_REVIEW = "OFFICER_REVIEW"
    ADMIN_REVIEW = "ADMIN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETURNED = "RETURNED"


class DispatchStatusEnum(str, Enum):
    CREATED = "CREATED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class VerificationTypeEnum(str, Enum):
    WEIGHBRIDGE = "WEIGHBRIDGE"
    MANUAL_MEASUREMENT = "MANUAL_MEASUREMENT"
    FIELD_INSPECTION = "FIELD_INSPECTION"


# ---- Approval Event ----
class ApprovalEventCreate(BaseModel):
    block_id: Optional[str] = None
    event_type: ApprovalEventTypeEnum
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    performed_by: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None


class ApprovalEventResponse(BaseModel):
    id: str
    block_id: str
    event_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    performed_by: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalEventList(BaseModel):
    items: List[ApprovalEventResponse]
    total: int


# ---- Dispatch Record ----
class DispatchRecordCreate(BaseModel):
    block_id: str
    assessment_id: Optional[str] = None
    approval_id: Optional[str] = None
    dispatch_number: Optional[str] = None
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    origin_quarry_id: Optional[str] = None
    destination: str
    dispatch_date: Optional[datetime] = None
    weight_tonnes: Optional[float] = None
    status: Optional[DispatchStatusEnum] = DispatchStatusEnum.CREATED
    qr_reference: Optional[str] = None
    notes: Optional[str] = None


class DispatchRecordUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    destination: Optional[str] = None
    dispatch_date: Optional[datetime] = None
    weight_tonnes: Optional[float] = None
    status: Optional[DispatchStatusEnum] = None
    qr_reference: Optional[str] = None
    notes: Optional[str] = None


class DispatchRecordResponse(BaseModel):
    id: str
    block_id: str
    assessment_id: Optional[str] = None
    approval_id: Optional[str] = None
    dispatch_number: str
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    origin_quarry_id: Optional[str] = None
    destination: str
    dispatch_date: Optional[datetime] = None
    weight_tonnes: Optional[float] = None
    status: str
    qr_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DispatchRecordList(BaseModel):
    items: List[DispatchRecordResponse]
    total: int


# ---- Manual Verification ----
class ManualVerificationCreate(BaseModel):
    block_id: Optional[str] = None
    verification_type: VerificationTypeEnum = VerificationTypeEnum.MANUAL_MEASUREMENT
    measured_length_cm: Optional[float] = None
    measured_breadth_cm: Optional[float] = None
    measured_height_cm: Optional[float] = None
    measured_weight_tonnes: Optional[float] = None
    verified_by: str
    instrument_details: Optional[str] = None
    notes: Optional[str] = None


class ManualVerificationResponse(BaseModel):
    id: str
    block_id: str
    verification_type: str
    measured_length_cm: Optional[float] = None
    measured_breadth_cm: Optional[float] = None
    measured_height_cm: Optional[float] = None
    measured_weight_tonnes: Optional[float] = None
    verified_by: str
    instrument_details: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ManualVerificationList(BaseModel):
    items: List[ManualVerificationResponse]
    total: int
