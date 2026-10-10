from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.schemas.auth import StationBrief


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: Optional[str] = None
    role: str
    status: str
    failed_attempts: int = 0
    rejection_reason: Optional[str] = None
    assigned_stations: List[StationBrief] = []
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserApproveRequest(BaseModel):
    role: str = "OPERATOR"
    station_ids: List[int] = []


class UserRejectRequest(BaseModel):
    reason: str


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    station_ids: Optional[List[int]] = None


class UserCreateByAdminRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    mobile: Optional[str] = None
    role: str = "OPERATOR"
    station_ids: List[int] = []
