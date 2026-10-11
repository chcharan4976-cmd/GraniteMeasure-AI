from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class OfficerBase(BaseModel):
    name: str
    designation: Optional[str] = "Mining Officer"
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_quarry_id: Optional[str] = None
    role: Optional[str] = "officer"
    is_active: Optional[bool] = True


class OfficerCreate(OfficerBase):
    pass


class OfficerUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_quarry_id: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class OfficerResponse(OfficerBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OfficerList(BaseModel):
    items: List[OfficerResponse]
    total: int
