from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field

class HydrotestBase(BaseModel):
    test_date: date
    performed_by: str = Field(..., min_length=2, max_length=200)
    result: str = Field(..., pattern="^(PASS|FAIL|PENDING)$")
    test_pressure_bar: Optional[float] = None
    working_pressure_bar: Optional[float] = None
    next_due_date: date
    certificate_number: str = Field(..., min_length=2, max_length=100)
    cylinder_number: Optional[str] = None
    notes: Optional[str] = None
    report_filename: Optional[str] = None

class HydrotestCreate(HydrotestBase):
    asset_id: int

class HydrotestUpdate(BaseModel):
    test_date: Optional[date] = None
    performed_by: Optional[str] = None
    result: Optional[str] = Field(None, pattern="^(PASS|FAIL|PENDING)$")
    test_pressure_bar: Optional[float] = None
    working_pressure_bar: Optional[float] = None
    next_due_date: Optional[date] = None
    certificate_number: Optional[str] = None
    cylinder_number: Optional[str] = None
    notes: Optional[str] = None
    report_filename: Optional[str] = None

class HydrotestResponse(HydrotestBase):
    id: int
    asset_id: int
    verification_status: str  # NOT_VERIFIED, VERIFIED, MISMATCH, UNAVAILABLE
    verification_payload: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CertificateVerificationResult(BaseModel):
    hydrotest_id: int
    verification_status: str
    is_match: bool
    authority_name: str
    matched_records: Optional[dict[str, Any]] = None
    mismatches: list[str] = []
    message: str
