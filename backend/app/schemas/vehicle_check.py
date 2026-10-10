from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class CandidatePlate(BaseModel):
    plate: str
    confidence: float
    frames: int


class VehicleCheckUploadResponse(BaseModel):
    scan_id: str
    status: str = "AWAITING_CONFIRMATION"
    confidence_level: str  # HIGH, MEDIUM, LOW
    best_frame_url: Optional[str] = None
    candidates: List[CandidatePlate] = []


class VehicleCheckConfirmRequest(BaseModel):
    confirmed_plate: str
    station_id: Optional[int] = None


class VehicleCheckManualRequest(BaseModel):
    plate: str
    station_id: Optional[int] = None


class VehicleCheckConfirmResponse(BaseModel):
    scan_id: str
    plate: str
    plate_edited: bool
    vehicle: Optional[Dict[str, Any]] = None
    is_cng: bool
    asset_id: Optional[str] = None
    compliance_state: Optional[str] = None
    next_due_date: Optional[str] = None
    final_result: str
    message: str
    data_source: Dict[str, Any]
    checked_at: str


class VehicleCheckSummary(BaseModel):
    id: str
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    station_id: Optional[int] = None
    station_name: Optional[str] = None
    input_type: str
    detected_plate: Optional[str] = None
    confirmed_plate: Optional[str] = None
    plate_edited: bool = False
    final_result: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
