from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(100), unique=True, index=True, nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    
    # Asset equipment details
    asset_type = Column(String(50), nullable=False, index=True)  # VEHICLE_CYLINDER, CASCADE_STORAGE, etc.
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    manufacturer = Column(String(150), nullable=True)
    model = Column(String(150), nullable=True)
    capacity_liters = Column(Float, nullable=True)
    installation_date = Column(Date, nullable=True)
    cylinder_number = Column(String(100), nullable=True, index=True)

    # Optional Vehicle Information (Option B)
    vehicle_number = Column(String(50), nullable=True, index=True)
    vehicle_make = Column(String(100), nullable=True)
    vehicle_model = Column(String(100), nullable=True)
    vehicle_fuel_type = Column(String(50), nullable=True)
    vehicle_verified = Column(Boolean, default=False, nullable=False)
    vehicle_verification_date = Column(DateTime, nullable=True)

    # Operational status: ACTIVE, INACTIVE, RETIRED
    status = Column(String(30), default="ACTIVE", nullable=False, index=True)

    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    site = relationship("Site", back_populates="assets")
    hydrotests = relationship("HydrotestRecord", back_populates="asset", cascade="all, delete-orphan", order_by="desc(HydrotestRecord.test_date)")
