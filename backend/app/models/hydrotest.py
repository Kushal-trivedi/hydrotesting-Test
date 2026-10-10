from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    Text,
    ForeignKey
)
from sqlalchemy.orm import relationship

from app.database import Base


class HydrotestRecord(Base):
    __tablename__ = "hydrotest_records"

    id = Column(Integer, primary_key=True, index=True)

    asset_id = Column(
        Integer,
        ForeignKey("assets.id"),
        nullable=False,
        index=True
    )

    test_date = Column(
        Date,
        nullable=False,
        index=True
    )

    performed_by = Column(
        String(200),
        nullable=False
    )  # Testing Agency / Station Name

    result = Column(
        String(30),
        nullable=False,
        index=True
    )  # PASS, FAIL, PENDING

    test_pressure_bar = Column(
        Float,
        nullable=True
    )

    working_pressure_bar = Column(
        Float,
        nullable=True
    )

    next_due_date = Column(
        Date,
        nullable=False,
        index=True
    )

    # A certificate number identifies one hydrotest certificate.
    # Duplicate certificate numbers are not allowed.
    certificate_number = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )

    cylinder_number = Column(
        String(100),
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    report_filename = Column(
        String(255),
        nullable=True
    )

    # External verification details
    verification_status = Column(
        String(40),
        default="NOT_VERIFIED",
        nullable=False,
        index=True
    )
    # NOT_VERIFIED, VERIFIED, MISMATCH, UNAVAILABLE

    verification_payload = Column(
        Text,
        nullable=True
    )  # Stored JSON comparison details

    recorded_by = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    asset = relationship(
        "Asset",
        back_populates="hydrotests"
    )

    documents = relationship(
        "Document",
        back_populates="hydrotest_record",
        cascade="all, delete-orphan"
    )