from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)

    # Roles: OPERATOR, MANAGER, AUDITOR, ADMIN
    role = Column(String(30), nullable=False, default="OPERATOR", index=True)

    # Statuses: PENDING, ACTIVE, REJECTED, LOCKED, DISABLED
    status = Column(String(30), nullable=False, default="PENDING", index=True)

    # Account security & lockout
    failed_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    rejection_reason = Column(String(255), nullable=True)

    # Approvals & Audits
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Many-to-many relationship with Sites / Stations
    stations = relationship("Site", secondary="user_stations", back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    vehicle_checks = relationship("VehicleCheck", back_populates="user")
