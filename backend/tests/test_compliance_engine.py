from datetime import date, timedelta
from app.services.compliance_engine import ComplianceEngine

def test_compliance_valid():
    today = date(2026, 10, 8)
    due_date = today + timedelta(days=90)
    status, days = ComplianceEngine.calculate_status("PASS", due_date, current_date=today, threshold_days=30)
    assert status == "VALID"
    assert days == 90

def test_compliance_due_soon():
    today = date(2026, 10, 8)
    due_date = today + timedelta(days=15)
    status, days = ComplianceEngine.calculate_status("PASS", due_date, current_date=today, threshold_days=30)
    assert status == "DUE_SOON"
    assert days == 15

def test_compliance_overdue():
    today = date(2026, 10, 8)
    due_date = today - timedelta(days=5)
    status, days = ComplianceEngine.calculate_status("PASS", due_date, current_date=today, threshold_days=30)
    assert status == "OVERDUE"
    assert days == -5

def test_compliance_failed():
    today = date(2026, 10, 8)
    due_date = today + timedelta(days=100)
    status, days = ComplianceEngine.calculate_status("FAIL", due_date, current_date=today, threshold_days=30)
    assert status == "FAILED"

def test_compliance_pending():
    today = date(2026, 10, 8)
    status, days = ComplianceEngine.calculate_status(None, None, current_date=today)
    assert status == "PENDING"
    assert days is None

    status_pend, _ = ComplianceEngine.calculate_status("PENDING", today + timedelta(days=50), current_date=today)
    assert status_pend == "PENDING"

def test_urgency_levels():
    assert ComplianceEngine.get_urgency_level("FAILED", 0) == "CRITICAL"
    assert ComplianceEngine.get_urgency_level("OVERDUE", -20) == "CRITICAL"
    assert ComplianceEngine.get_urgency_level("OVERDUE", -5) == "HIGH"
    assert ComplianceEngine.get_urgency_level("DUE_SOON", 5) == "HIGH"
    assert ComplianceEngine.get_urgency_level("DUE_SOON", 25) == "MEDIUM"
    assert ComplianceEngine.get_urgency_level("VALID", 100) == "LOW"
