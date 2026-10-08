from typing import Optional, List
from pydantic import BaseModel

class ComplianceMetrics(BaseModel):
    total_assets: int
    valid: int
    due_soon: int
    overdue: int
    failed: int
    pending: int
    compliance_percentage: float

class PriorityActionItem(BaseModel):
    asset_id_str: str
    asset_db_id: int
    site_name: str
    asset_type: str
    vehicle_number: Optional[str] = None
    cylinder_number: Optional[str] = None
    compliance_status: str
    next_due_date: Optional[str] = None
    days_diff: Optional[int] = None
    urgency_level: str  # CRITICAL, HIGH, MEDIUM
    recommended_action: str  # RECORD_HYDROTEST, SCHEDULE_TEST

class SiteStat(BaseModel):
    site_id: int
    site_code: str
    site_name: str
    total_assets: int
    valid: int
    due_soon: int
    overdue: int
    failed: int
    pending: int

class DashboardResponse(BaseModel):
    metrics: ComplianceMetrics
    overdue_queue: List[PriorityActionItem]
    due_soon_queue: List[PriorityActionItem]
    site_breakdowns: List[SiteStat]
