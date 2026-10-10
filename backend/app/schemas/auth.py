from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    mobile: Optional[str] = None
    station_ids: Optional[List[int]] = Field(default_factory=list)
    role: str = Field(default="OPERATOR", description="Requested role: OPERATOR or MANAGER")
    password: str = Field(..., min_length=10)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=10)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=10)


class StationBrief(BaseModel):
    id: int
    code: str
    name: str
    city: str
    state: Optional[str] = "Gujarat"
    is_active: Optional[bool] = True


class StationCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(default="Gujarat", max_length=100)


class StationUpdateRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None


class UserMeResponse(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: Optional[str] = None
    role: str
    status: str
    assigned_stations: List[StationBrief] = []


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMeResponse
