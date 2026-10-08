from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # ASSET, HYDROTEST, SITE
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, STATUS_CHANGE, VERIFICATION
    changes = Column(Text, nullable=True)  # JSON representation of diff or details
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
