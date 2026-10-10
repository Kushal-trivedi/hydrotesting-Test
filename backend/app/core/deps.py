from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[str]:
    """Retrieves access token from Authorization header or cookie."""
    if credentials and credentials.credentials:
        return credentials.credentials
    # Fallback to cookie
    return request.cookies.get("access_token")


def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    """
    Decodes JWT token and returns authenticated active user.
    Raises 401 if missing, expired, or invalid.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided. Please sign in."
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token user identifier."
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with token was not found."
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is not active (status: {user.status})."
        )

    return user


def require_role(allowed_roles: List[str]) -> Callable[[User], User]:
    """
    Dependency factory ensuring user has one of the allowed roles.
    Allowed roles: OPERATOR, MANAGER, AUDITOR, ADMIN.
    Auditors and Admins have global visibility; Operators and Managers are branch-scoped.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "ADMIN":
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{current_user.role}' is not authorized for this resource."
            )
        return current_user

    return role_checker


def validate_station_access(current_user: User, station_id: int) -> bool:
    """
    Checks if user is allowed to access the given station.
    ADMIN and AUDITOR see all stations.
    OPERATOR and MANAGER only see their assigned stations.
    """
    if current_user.role in ["ADMIN", "AUDITOR"]:
        return True
    
    assigned_station_ids = [s.id for s in current_user.stations]
    return station_id in assigned_station_ids
