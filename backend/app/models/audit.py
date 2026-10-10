from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)

    action = Column(String(50), nullable=False, index=True)
    target_type = Column(String(50), nullable=True, index=True)
    target_id = Column(String(100), nullable=True, index=True)
    outcome = Column(String(50), nullable=True, default="SUCCESS")  # SUCCESS, FAILURE, REJECTED
    ip_address = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)  # JSON payload

    # Backward compatibility fields for existing HydroSafe code
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    changes = Column(Text, nullable=True)
