import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal, migrate_schema
from app.models.user import User
from app.models.site import Site
from app.core.security import hash_password


@pytest.fixture(scope="function")
def client():
    # Setup tables
    Base.metadata.create_all(bind=engine)
    migrate_schema(engine)
    db = SessionLocal()
    # Clear only temporary test users, preserving permanent accounts
    db.query(User).filter(~User.email.in_(["admin@hydrosafe.com", "operator@hydrosafe.com"])).delete()
    db.commit()

    # Ensure a test station exists
    stn = db.query(Site).filter(Site.code == "TEST-STN-01").first()
    if not stn:
        stn = Site(code="TEST-STN-01", name="Test Station", city="Ahmedabad", state="Gujarat")
        db.add(stn)
        db.commit()

    db.close()

    with TestClient(app) as test_client:
        yield test_client


def test_signup_creates_pending_user(client):
    res = client.post("/api/auth/signup", json={
        "full_name": "Ramesh Patel",
        "email": "ramesh.operator@example.com",
        "password": "StrongPassword123!",
        "role": "OPERATOR"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "PENDING"
    assert "user_id" in data


def test_signup_password_too_short(client):
    res = client.post("/api/auth/signup", json={
        "full_name": "Short Pass User",
        "email": "short@example.com",
        "password": "short",
        "role": "OPERATOR"
    })
    assert res.status_code in [422, 400]


def test_signup_duplicate_email_rejected(client):
    client.post("/api/auth/signup", json={
        "full_name": "User One",
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
        "role": "OPERATOR"
    })
    res = client.post("/api/auth/signup", json={
        "full_name": "User Two",
        "email": "duplicate@example.com",
        "password": "StrongPassword123!",
        "role": "OPERATOR"
    })
    assert res.status_code == 409


def test_signin_pending_account_blocked(client):
    client.post("/api/auth/signup", json={
        "full_name": "Pending User",
        "email": "pending@example.com",
        "password": "StrongPassword123!",
        "role": "OPERATOR"
    })
    res = client.post("/api/auth/signin", json={
        "email": "pending@example.com",
        "password": "StrongPassword123!"
    })
    assert res.status_code == 403
    assert "approval" in res.json()["detail"].lower()


def test_admin_approval_and_signin_success(client):
    db = SessionLocal()
    # Create active admin
    admin = User(
        full_name="Super Admin",
        email="admin@test.com",
        password_hash=hash_password("AdminSecurePass123"),
        role="ADMIN",
        status="ACTIVE"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # Operator signs up
    client.post("/api/auth/signup", json={
        "full_name": "Operator To Approve",
        "email": "operator.approve@example.com",
        "password": "OperatorPass123!",
        "role": "OPERATOR"
    })
    op_user = db.query(User).filter(User.email == "operator.approve@example.com").first()

    # Admin signs in
    admin_login = client.post("/api/auth/signin", json={
        "email": "admin@test.com",
        "password": "AdminSecurePass123"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # Admin approves operator
    stn = db.query(Site).first()
    approve_res = client.post(
        f"/api/admin/users/{op_user.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "OPERATOR", "station_ids": [stn.id]}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "ACTIVE"

    # Operator signs in now
    op_login = client.post("/api/auth/signin", json={
        "email": "operator.approve@example.com",
        "password": "OperatorPass123!"
    })
    assert op_login.status_code == 200
    assert "access_token" in op_login.json()
    assert op_login.json()["user"]["role"] == "OPERATOR"
    db.close()


def test_lockout_after_5_failed_attempts(client):
    db = SessionLocal()
    user = User(
        full_name="Locked User",
        email="locktest@example.com",
        password_hash=hash_password("CorrectPassword123"),
        role="OPERATOR",
        status="ACTIVE"
    )
    db.add(user)
    db.commit()
    db.close()

    for i in range(4):
        res = client.post("/api/auth/signin", json={
            "email": "locktest@example.com",
            "password": "WrongPassword!"
        })
        assert res.status_code == 401

    # 5th attempt triggers lockout
    res5 = client.post("/api/auth/signin", json={
        "email": "locktest@example.com",
        "password": "WrongPassword!"
    })
    assert res5.status_code == 403
    assert "locked" in res5.json()["detail"].lower()
