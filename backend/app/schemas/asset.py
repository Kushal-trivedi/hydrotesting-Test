from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.hydrotest import HydrotestResponse
from app.schemas.site import SiteResponse

class AssetBase(BaseModel):
    asset_id: str = Field(..., min_length=2, max_length=100)
    site_id: int
    asset_type: str = Field(..., min_length=2, max_length=50)
    serial_number: str = Field(..., min_length=2, max_length=100)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity_liters: Optional[float] = None
    installation_date: Optional[date] = None
    cylinder_number: Optional[str] = None
    
    # Vehicle attributes (Option B)
    vehicle_number: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_fuel_type: Optional[str] = None
    vehicle_verified: bool = False
    
    status: str = Field(default="ACTIVE", pattern="^(ACTIVE|INACTIVE|RETIRED)$")

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    site_id: Optional[int] = None
    asset_type: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity_liters: Optional[float] = None
    installation_date: Optional[date] = None
    cylinder_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_fuel_type: Optional[str] = None
    vehicle_verified: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE|RETIRED)$")

class AssetResponse(AssetBase):
    id: int
    site_name: Optional[str] = None
    site_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Dynamically calculated compliance properties
    compliance_status: str  # VALID, DUE_SOON, OVERDUE, FAILED, PENDING
    days_remaining: Optional[int] = None  # Negative if overdue
    next_due_date: Optional[date] = None
    last_test_date: Optional[date] = None
    last_test_result: Optional[str] = None
    total_tests: int = 0

    model_config = ConfigDict(from_attributes=True)

class AssetDetailResponse(AssetResponse):
    site: Optional[SiteResponse] = None
    hydrotests: List[HydrotestResponse] = []
