import pytest
from datetime import date, timedelta
from app.models.site import Site
from app.models.asset import Asset
from app.models.hydrotest import HydrotestRecord
from app.models.user import User
from app.core.security import hash_password
from app.services.vehicle_check_service import VehicleCheckService


@pytest.fixture
def seed_compliance_records(db):
    today = date.today()

    # Pre-seed site
    site = db.query(Site).first()
    if not site:
        site = Site(code="STN-AHD-01", name="Ahmedabad Central", city="Ahmedabad", state="Gujarat")
        db.add(site)
        db.commit()
        db.refresh(site)

    # 1. VALID: GJ01AB1234
    asset_valid = Asset(
        asset_id="CNG-VEH-AHD-002",
        site_id=site.id,
        asset_type="VEHICLE_CYLINDER",
        serial_number="SN-CYL-88219",
        vehicle_number="GJ01AB1234",
        vehicle_fuel_type="CNG / Petrol",
        vehicle_verified=True,
        status="ACTIVE",
    )
    db.add(asset_valid)
    db.flush()

    test_valid = HydrotestRecord(
        asset_id=asset_valid.id,
        test_date=today - timedelta(days=100),
        next_due_date=today + timedelta(days=976),
        result="PASS",
        performed_by="Demo Lab",
        certificate_number="DEMO-AHD-2026-1102",
    )
    db.add(test_valid)

    # 2. DUE_SOON: GJ05EF9012
    asset_due_soon = Asset(
        asset_id="CNG-VEH-SRT-003",
        site_id=site.id,
        asset_type="VEHICLE_CYLINDER",
        serial_number="SN-CYL-77402",
        vehicle_number="GJ05EF9012",
        vehicle_fuel_type="CNG / Petrol",
        vehicle_verified=True,
        status="ACTIVE",
    )
    db.add(asset_due_soon)
    db.flush()

    test_due_soon = HydrotestRecord(
        asset_id=asset_due_soon.id,
        test_date=today - timedelta(days=1083),
        next_due_date=today + timedelta(days=12),
        result="PASS",
        performed_by="Demo Lab",
        certificate_number="DEMO-SRT-2026-9912",
    )
    db.add(test_due_soon)

    # 3. OVERDUE: GJ06GH3456
    asset_overdue = Asset(
        asset_id="CNG-VEH-RJK-005",
        site_id=site.id,
        asset_type="VEHICLE_CYLINDER",
        serial_number="SN-CYL-11045",
        vehicle_number="GJ06GH3456",
        vehicle_fuel_type="CNG",
        vehicle_verified=True,
        status="ACTIVE",
    )
    db.add(asset_overdue)
    db.flush()

    test_overdue = HydrotestRecord(
        asset_id=asset_overdue.id,
        test_date=today - timedelta(days=1110),
        next_due_date=today - timedelta(days=15),
        result="PASS",
        performed_by="Demo Lab",
        certificate_number="DEMO-RJK-2026-9944",
    )
    db.add(test_overdue)

    # 4. FAILED: GJ27JK7890
    asset_failed = Asset(
        asset_id="CNG-VEH-AHD-007",
        site_id=site.id,
        asset_type="VEHICLE_CYLINDER",
        serial_number="SN-CYL-90012",
        vehicle_number="GJ27JK7890",
        vehicle_fuel_type="CNG",
        vehicle_verified=True,
        status="ACTIVE",
    )
    db.add(asset_failed)
    db.flush()

    test_failed = HydrotestRecord(
        asset_id=asset_failed.id,
        test_date=today - timedelta(days=20),
        next_due_date=today - timedelta(days=20),
        result="FAIL",
        performed_by="Demo Lab",
        certificate_number="DEMO-AHD-2026-4450",
    )
    db.add(test_failed)

    # Operator user
    operator = User(
        full_name="Attendant",
        email="attendant@hydrosafe.com",
        password_hash=hash_password("AttendantPass123!"),
        role="OPERATOR",
        status="ACTIVE",
    )
    operator.stations = [site]
    db.add(operator)
    db.flush()

    return operator


@pytest.mark.anyio
async def test_must_pass_gj01ab1234_returns_valid(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "GJ01AB1234", op)
    assert res.final_result == "VALID"
    assert res.asset_id == "CNG-VEH-AHD-002"
    assert res.is_cng is True


@pytest.mark.anyio
async def test_must_pass_gj05ef9012_returns_due_soon(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "GJ05EF9012", op)
    assert res.final_result == "DUE_SOON"
    assert res.asset_id == "CNG-VEH-SRT-003"


@pytest.mark.anyio
async def test_must_pass_gj06gh3456_returns_overdue(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "GJ06GH3456", op)
    assert res.final_result == "OVERDUE"
    assert res.asset_id == "CNG-VEH-RJK-005"


@pytest.mark.anyio
async def test_must_pass_gj27jk7890_returns_failed(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "GJ27JK7890", op)
    assert res.final_result == "FAILED"
    assert res.asset_id == "CNG-VEH-AHD-007"


@pytest.mark.anyio
async def test_must_pass_unregistered_plate_returns_record_not_found(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "GJ01CD5678", op)
    assert res.final_result == "RECORD_NOT_FOUND"
    assert "Ask the manager" in res.message


@pytest.mark.anyio
async def test_must_pass_petrol_vehicle_returns_not_applicable(db, seed_compliance_records):
    op = seed_compliance_records
    res = await VehicleCheckService.manual_check(db, "MH12AB4321", op)
    assert res.final_result == "NOT_APPLICABLE"
    assert res.is_cng is False
