import io
import pytest
from PIL import Image
from app.models.user import User
from app.models.site import Site
from app.models.asset import Asset
from app.core.security import hash_password, create_access_token


@pytest.fixture
def test_setup(db):
    # Setup test stations
    site1 = db.query(Site).filter(Site.code == "STN-AHD-01").first()
    if not site1:
        site1 = Site(code="STN-AHD-01", name="Ahmedabad Central", city="Ahmedabad")
        db.add(site1)
        db.flush()

    site2 = db.query(Site).filter(Site.code == "STN-SRT-02").first()
    if not site2:
        site2 = Site(code="STN-SRT-02", name="Surat Station", city="Surat")
        db.add(site2)
        db.flush()

    # Operator 1
    op1 = db.query(User).filter(User.email == "op1@test.com").first()
    if not op1:
        op1 = User(id=201, full_name="Op One", email="op1@test.com", password_hash=hash_password("Pass1234567"), role="OPERATOR", status="ACTIVE")
        op1.stations = [site1]
        db.add(op1)
        db.flush()

    # Operator 2
    op2 = db.query(User).filter(User.email == "op2@test.com").first()
    if not op2:
        op2 = User(id=202, full_name="Op Two", email="op2@test.com", password_hash=hash_password("Pass1234567"), role="OPERATOR", status="ACTIVE")
        op2.stations = [site2]
        db.add(op2)
        db.flush()

    return {"op1": op1, "op2": op2, "site1": site1, "site2": site2}


def test_scan_manual_api(client, test_setup):
    op_token = create_access_token({"sub": "201", "role": "OPERATOR", "email": "op1@test.com"})
    res = client.post(
        "/api/scans/manual",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"plate": "GJ01AB1234"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["plate"] == "GJ01AB1234"
    assert "final_result" in data


def test_scan_upload_image_and_confirm(client, test_setup):
    op_token = create_access_token({"sub": "201", "role": "OPERATOR", "email": "op1@test.com"})

    # Create dummy in-memory image
    img = Image.new("RGB", (320, 240), color=(73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    # Stage 1: Upload
    upload_res = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {op_token}"},
        files={"file": ("test_vehicle.jpg", img_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "scan_id" in upload_data
    scan_id = upload_data["scan_id"]
    assert upload_data["status"] == "AWAITING_CONFIRMATION"

    # Stage 2: Confirm
    confirm_res = client.post(
        f"/api/scans/{scan_id}/confirm",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"confirmed_plate": "GJ01AB1234"}
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["scan_id"] == scan_id
    assert confirm_data["plate"] == "GJ01AB1234"


def test_operator_scan_history_isolation(client, test_setup):
    op1_token = create_access_token({"sub": "201", "role": "OPERATOR", "email": "op1@test.com"})
    op2_token = create_access_token({"sub": "202", "role": "OPERATOR", "email": "op2@test.com"})

    # op2 performs a manual scan
    client.post(
        "/api/scans/manual",
        headers={"Authorization": f"Bearer {op2_token}"},
        json={"plate": "GJ05EF9012"}
    )

    # op1 reads history: should only see op1's scans
    res_op1 = client.get("/api/scans", headers={"Authorization": f"Bearer {op1_token}"})
    assert res_op1.status_code == 200
    for item in res_op1.json():
        assert item["user_id"] == 201
