from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.site import Site
from app.core.security import hash_password


def seed_permanent_accounts(db: Session):
    """
    Guarantees that essential system accounts exist with permanent credentials.
    Runs on every FastAPI startup so admin and operator accounts are never lost.
    """
    all_sites = db.query(Site).all()
    if not all_sites:
        # Create default demo sites if empty
        site1 = Site(code="STN-AHD-01", name="Ahmedabad Demo CNG Station", city="Ahmedabad", state="Gujarat", is_active=True)
        site2 = Site(code="STN-SRT-02", name="Surat Demo Gas Station", city="Surat", state="Gujarat", is_active=True)
        site3 = Site(code="STN-RJK-03", name="Rajkot Demo Inspection Hub", city="Rajkot", state="Gujarat", is_active=True)
        db.add_all([site1, site2, site3])
        db.commit()
        all_sites = db.query(Site).all()

    # 1. Super Administrator
    admin = db.query(User).filter(User.email == "admin@hydrosafe.com").first()
    if not admin:
        admin = User(
            full_name="Super Administrator",
            email="admin@hydrosafe.com",
            role="ADMIN",
            status="ACTIVE",
            failed_attempts=0,
        )
        db.add(admin)
    admin.role = "ADMIN"
    admin.status = "ACTIVE"
    admin.failed_attempts = 0
    admin.password_hash = hash_password("Admin@HydroSafe2026")
    admin.stations = all_sites

    # 2. Pump Operator
    operator = db.query(User).filter(User.email == "operator@hydrosafe.com").first()
    if not operator:
        operator = User(
            full_name="Pump Operator",
            email="operator@hydrosafe.com",
            role="OPERATOR",
            status="ACTIVE",
            failed_attempts=0,
        )
        db.add(operator)
    operator.role = "OPERATOR"
    operator.status = "ACTIVE"
    operator.failed_attempts = 0
    operator.password_hash = hash_password("Operator@2026")
    operator.stations = all_sites

    db.commit()
