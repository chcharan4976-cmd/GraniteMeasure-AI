from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class AuditLogCreate(BaseModel):
    entity_type: str
    entity_id: str
    action: str
    performed_by: Optional[str] = None
    role: Optional[str] = None
    details_json: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    performed_by: Optional[str] = None
    role: Optional[str] = None
    details_json: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogList(BaseModel):
    items: List[AuditLogResponse]
    total: int
