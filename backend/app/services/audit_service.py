import json
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        user_id: Optional[int] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        outcome: str = "SUCCESS",
        ip_address: Optional[str] = None,
        details: Optional[Any] = None,
    ) -> AuditLog:
        """
        Append-only audit trail logging.
        No updates or deletes are ever permitted.
        """
        details_str = None
        if details is not None:
            if isinstance(details, (dict, list)):
                details_str = json.dumps(details)
            else:
                details_str = str(details)

        entry = AuditLog(
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            outcome=outcome,
            ip_address=ip_address,
            details=details_str,
            # Backward compatibility fields
            entity_type=target_type or "SYSTEM",
            entity_id=int(target_id) if (target_id and target_id.isdigit()) else 0,
            changes=details_str,
        )
        db.add(entry)
        try:
            db.commit()
            db.refresh(entry)
        except Exception:
            db.rollback()
        return entry
