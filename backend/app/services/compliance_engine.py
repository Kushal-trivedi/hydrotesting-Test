from datetime import date, timedelta
from typing import Optional, Tuple
from app.config import settings

class ComplianceEngine:
    @staticmethod
    def calculate_status(
        latest_test_result: Optional[str],
        next_due_date: Optional[date],
        current_date: Optional[date] = None,
        threshold_days: Optional[int] = None
    ) -> Tuple[str, Optional[int]]:
        """
        Calculates compliance status and remaining/overdue days.
        
        Statuses:
        - FAILED: Latest test result is FAIL
        - PENDING: No test recorded or latest test result is PENDING
        - OVERDUE: Latest test is PASS, but next_due_date < current_date
        - DUE_SOON: Latest test is PASS, and next_due_date is within threshold days
        - VALID: Latest test is PASS, and next_due_date is beyond threshold days

        Returns:
            (compliance_status, days_remaining)
            days_remaining is positive for future due dates, negative for overdue dates.
        """
        today = current_date or date.today()
        threshold = threshold_days if threshold_days is not None else settings.DUE_SOON_THRESHOLD_DAYS

        if not latest_test_result or latest_test_result == "PENDING":
            return "PENDING", None

        if latest_test_result == "FAIL":
            days = (next_due_date - today).days if next_due_date else None
            return "FAILED", days

        if latest_test_result == "PASS":
            if not next_due_date:
                return "PENDING", None
            
            days_remaining = (next_due_date - today).days
            if days_remaining < 0:
                return "OVERDUE", days_remaining
            elif days_remaining <= threshold:
                return "DUE_SOON", days_remaining
            else:
                return "VALID", days_remaining

        return "PENDING", None

    @staticmethod
    def get_urgency_level(status: str, days_remaining: Optional[int]) -> str:
        """Determines urgency level for action lists: CRITICAL, HIGH, MEDIUM, LOW"""
        if status == "FAILED":
            return "CRITICAL"
        if status == "OVERDUE":
            if days_remaining is not None and days_remaining < -14:
                return "CRITICAL"
            return "HIGH"
        if status == "DUE_SOON":
            if days_remaining is not None and days_remaining <= 7:
                return "HIGH"
            return "MEDIUM"
        return "LOW"
