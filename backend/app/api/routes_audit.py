from typing import Optional, List, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.core.deps import require_role

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    outcome: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    target_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(["ADMIN", "AUDITOR"])),
    db: Session = Depends(get_db),
):
    """
    Append-only audit ledger reader for Admins and Auditors.
    Operators and Managers receive 403 Forbidden.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)

    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    # Pre-fetch user names for convenience
    user_ids = {l.user_id for l in logs if l.user_id}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.full_name for u in users}

    result = []
    for l in logs:
        result.append(
            AuditLogResponse(
                id=l.id,
                timestamp=l.timestamp,
                user_id=l.user_id,
                user_name=users_map.get(l.user_id) if l.user_id else None,
                action=l.action,
                target_type=l.target_type,
                target_id=l.target_id,
                outcome=l.outcome,
                ip_address=l.ip_address,
                details=l.details,
            )
        )
    return result
