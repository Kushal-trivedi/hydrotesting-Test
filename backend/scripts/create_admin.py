import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine, Base
import app.models
from app.models.user import User
from app.models.site import Site
from app.core.security import hash_password


def create_initial_admin(
    email: str = "admin@hydrosafe.com",
    password: str = "Admin@HydroSafe2026",
    full_name: str = "System Administrator"
):
    """
    Creates the first Administrator account if one does not already exist.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing:
            print(f"[create_admin] Admin account already exists: {existing.email} (Role: {existing.role}, Status: {existing.status})")
            return existing

        admin_user = User(
            full_name=full_name,
            email=email.lower(),
            password_hash=hash_password(password),
            role="ADMIN",
            status="ACTIVE",
            failed_attempts=0,
        )

        # Grant access to all existing sites
        all_sites = db.query(Site).all()
        admin_user.stations = all_sites

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n" + "=" * 60)
        print("INITIAL ADMIN ACCOUNT CREATED SUCCESSFULLY")
        print("=" * 60)
        print(f"Name:     {admin_user.full_name}")
        print(f"Email:    {admin_user.email}")
        print(f"Password: {password}")
        print(f"Role:     {admin_user.role}")
        print(f"Status:   {admin_user.status}")
        print(f"Stations: {len(all_sites)} assigned")
        print("=" * 60 + "\n")
        return admin_user
    finally:
        db.close()


if __name__ == "__main__":
    admin_email = os.getenv("ADMIN_EMAIL", "admin@hydrosafe.com")
    admin_pass = os.getenv("ADMIN_PASSWORD", "Admin@HydroSafe2026")
    create_initial_admin(email=admin_email, password=admin_pass)
