from typing import Optional
from pydantic import BaseModel, Field

class VehicleLookupRequest(BaseModel):
    vehicle_number: str = Field(..., min_length=4, max_length=20)

class VehicleDetails(BaseModel):
    vehicle_number: str
    make: str
    model: str
    fuel_type: str
    is_cng: bool
    registration_date: Optional[str] = None
    fitness_valid_upto: Optional[str] = None
    owner_category: Optional[str] = None
    rto_location: Optional[str] = None

class VehicleLookupResponse(BaseModel):
    success: bool
    data: Optional[VehicleDetails] = None
    source: str
    message: str
