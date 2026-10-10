from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.site import Site
from app.core.deps import require_role
from app.core.security import hash_password
from app.schemas.user import UserResponse, UserApproveRequest, UserRejectRequest, UserUpdateRequest, UserCreateByAdminRequest
from app.schemas.auth import StationBrief, StationCreateRequest, StationUpdateRequest
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Administration"])


def _format_user(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        full_name=u.full_name,
        email=u.email,
        mobile=u.mobile,
        role=u.role,
        status=u.status,
        failed_attempts=u.failed_attempts,
        rejection_reason=u.rejection_reason,
        assigned_stations=[
            StationBrief(id=s.id, code=s.code, name=s.name, city=s.city)
            for s in u.stations
        ],
        created_at=u.created_at,
        last_login_at=u.last_login_at,
    )


@router.get("/users", response_model=List[UserResponse])
def list_users(
    status: Optional[str] = None,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if status:
        query = query.filter(User.status == status.upper())
    users = query.order_by(User.created_at.desc()).all()
    return [_format_user(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    payload: UserCreateByAdminRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.")

    if payload.role not in ["OPERATOR", "MANAGER", "AUDITOR", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    if len(payload.password) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 10 characters.")

    stations = []
    if payload.station_ids:
        stations = db.query(Site).filter(Site.id.in_(payload.station_ids)).all()

    now = datetime.now(timezone.utc)
    new_user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status="ACTIVE",
        approved_by=current_admin.id,
        approved_at=now,
        failed_attempts=0,
    )
    new_user.stations = stations
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="USER_CREATED_BY_ADMIN",
        user_id=current_admin.id,
        target_type="USER",
        target_id=str(new_user.id),
        outcome="SUCCESS",
        ip_address=ip,
        details={"email": new_user.email, "role": new_user.role, "station_ids": payload.station_ids},
    )
    return _format_user(new_user)


@router.post("/users/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    payload: UserApproveRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if payload.role not in ["OPERATOR", "MANAGER", "AUDITOR", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    now = datetime.now(timezone.utc)
    user.status = "ACTIVE"
    user.role = payload.role
    user.approved_by = current_admin.id
    user.approved_at = now
    user.rejection_reason = None

    if payload.station_ids is not None:
        stations = db.query(Site).filter(Site.id.in_(payload.station_ids)).all()
        user.stations = stations

    db.commit()
    db.refresh(user)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="USER_APPROVED",
        user_id=current_admin.id,
        target_type="USER",
        target_id=str(user.id),
        outcome="SUCCESS",
        ip_address=ip,
        details={"approved_role": user.role, "station_ids": payload.station_ids},
    )
    return _format_user(user)


@router.post("/users/{user_id}/reject", response_model=UserResponse)
def reject_user(
    user_id: int,
    payload: UserRejectRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.status = "REJECTED"
    user.rejection_reason = payload.reason
    db.commit()
    db.refresh(user)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="USER_REJECTED",
        user_id=current_admin.id,
        target_type="USER",
        target_id=str(user.id),
        outcome="SUCCESS",
        ip_address=ip,
        details={"reason": payload.reason},
    )
    return _format_user(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    changes = {}
    if payload.full_name is not None:
        user.full_name = payload.full_name
        changes["full_name"] = payload.full_name
    if payload.role is not None:
        if payload.role not in ["OPERATOR", "MANAGER", "AUDITOR", "ADMIN"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role.")
        user.role = payload.role
        changes["role"] = payload.role
    if payload.status is not None:
        if payload.status not in ["ACTIVE", "PENDING", "REJECTED", "LOCKED", "DISABLED"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status.")
        user.status = payload.status
        changes["status"] = payload.status
    if payload.station_ids is not None:
        stations = db.query(Site).filter(Site.id.in_(payload.station_ids)).all()
        user.stations = stations
        changes["station_ids"] = payload.station_ids

    db.commit()
    db.refresh(user)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="USER_UPDATED",
        user_id=current_admin.id,
        target_type="USER",
        target_id=str(user.id),
        outcome="SUCCESS",
        ip_address=ip,
        details=changes,
    )
    return _format_user(user)


@router.get("/stations", response_model=List[StationBrief])
def list_admin_stations(
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    stations = db.query(Site).order_by(Site.name.asc()).all()
    return [
        StationBrief(
            id=s.id,
            code=s.code,
            name=s.name,
            city=s.city,
            state=s.state,
            is_active=s.is_active,
        )
        for s in stations
    ]


@router.post("/stations", response_model=StationBrief, status_code=status.HTTP_201_CREATED)
def create_station(
    payload: StationCreateRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    existing = db.query(Site).filter(Site.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Branch code already exists.")

    new_site = Site(
        code=payload.code.upper(),
        name=payload.name,
        city=payload.city,
        state=payload.state,
        is_active=True,
    )
    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="BRANCH_CREATED",
        user_id=current_admin.id,
        target_type="BRANCH",
        target_id=str(new_site.id),
        outcome="SUCCESS",
        ip_address=ip,
        details={"code": new_site.code, "name": new_site.name},
    )
    return StationBrief(
        id=new_site.id,
        code=new_site.code,
        name=new_site.name,
        city=new_site.city,
        state=new_site.state,
        is_active=new_site.is_active,
    )


@router.patch("/stations/{station_id}", response_model=StationBrief)
def update_station(
    station_id: int,
    payload: StationUpdateRequest,
    request: Request,
    current_admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    site = db.query(Site).filter(Site.id == station_id).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    changes = {}
    if payload.name is not None:
        site.name = payload.name
        changes["name"] = payload.name
    if payload.city is not None:
        site.city = payload.city
        changes["city"] = payload.city
    if payload.state is not None:
        site.state = payload.state
        changes["state"] = payload.state
    if payload.is_active is not None:
        site.is_active = payload.is_active
        changes["is_active"] = payload.is_active

    db.commit()
    db.refresh(site)

    ip = request.client.host if request.client else None
    AuditService.log(
        db,
        action="BRANCH_UPDATED",
        user_id=current_admin.id,
        target_type="BRANCH",
        target_id=str(site.id),
        outcome="SUCCESS",
        ip_address=ip,
        details=changes,
    )
    return StationBrief(
        id=site.id,
        code=site.code,
        name=site.name,
        city=site.city,
        state=site.state,
        is_active=site.is_active,
    )
