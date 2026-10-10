import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal, migrate_schema
from app.models.user import User
from app.models.site import Site
from app.core.security import hash_password, create_access_token


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    migrate_schema(engine)
    db = SessionLocal()
    db.query(User).filter(User.id.in_([101, 102, 103, 104])).delete()
    db.commit()

    # Create users for all 4 roles
    admin = User(id=101, full_name="Admin", email="admin@r.com", password_hash=hash_password("Pass1234567"), role="ADMIN", status="ACTIVE")
    manager = User(id=102, full_name="Manager", email="manager@r.com", password_hash=hash_password("Pass1234567"), role="MANAGER", status="ACTIVE")
    operator = User(id=103, full_name="Operator", email="operator@r.com", password_hash=hash_password("Pass1234567"), role="OPERATOR", status="ACTIVE")
    auditor = User(id=104, full_name="Auditor", email="auditor@r.com", password_hash=hash_password("Pass1234567"), role="AUDITOR", status="ACTIVE")
    db.add_all([admin, manager, operator, auditor])
    db.commit()
    db.close()

    with TestClient(app) as test_client:
        yield test_client


def test_operator_blocked_from_admin_endpoints(client):
    op_token = create_access_token({"sub": "103", "role": "OPERATOR", "email": "operator@r.com"})
    res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {op_token}"})
    assert res.status_code == 403


def test_operator_blocked_from_audit_logs(client):
    op_token = create_access_token({"sub": "103", "role": "OPERATOR", "email": "operator@r.com"})
    res = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {op_token}"})
    assert res.status_code == 403


def test_auditor_can_read_audit_logs(client):
    aud_token = create_access_token({"sub": "104", "role": "AUDITOR", "email": "auditor@r.com"})
    res = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {aud_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_admin_can_access_admin_endpoints(client):
    admin_token = create_access_token({"sub": "101", "role": "ADMIN", "email": "admin@r.com"})
    res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 4
