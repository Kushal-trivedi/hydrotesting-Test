from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class VehicleCheck(Base):
    __tablename__ = "vehicle_checks"

    # Human-readable format like "VC-20261010-0042" or primary key string
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    station_id = Column(Integer, ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)

    input_type = Column(String(20), nullable=False, default="VIDEO")  # VIDEO, IMAGE, MANUAL
    media_path = Column(String(255), nullable=True)
    best_frame_path = Column(String(255), nullable=True)

    # Detection & Candidates
    detected_plate = Column(String(30), nullable=True, index=True)
    plate_confidence = Column(Float, nullable=True)
    candidates = Column(Text, nullable=True)  # JSON list of {plate, confidence, frames}

    # Human Confirmation
    confirmed_plate = Column(String(30), nullable=True, index=True)
    plate_edited = Column(Boolean, default=False, nullable=False)

    # External & Compliance Data
    fuel_type = Column(String(50), nullable=True)
    vehicle_summary = Column(Text, nullable=True)  # JSON or text (make, model, owner)
    asset_id = Column(String(100), nullable=True, index=True)

    # Verdict States: VALID, DUE_SOON, OVERDUE, FAILED, RECORD_NOT_FOUND, NOT_APPLICABLE, LOOKUP_UNAVAILABLE, NOT_CONFIRMED
    final_result = Column(String(30), default="NOT_CONFIRMED", nullable=False, index=True)
    data_source = Column(Text, nullable=True)  # JSON e.g. {"vahan": "mock", "hydrotest": "internal_register"}

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="vehicle_checks")
    station = relationship("Site")
