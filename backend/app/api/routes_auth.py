from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.core.config import settings
from app.schemas.auth import (
    SignUpRequest,
    SignInRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserMeResponse,
    StationBrief,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_user_me(user: User) -> UserMeResponse:
    return UserMeResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        mobile=user.mobile,
        role=user.role,
        status=user.status,
        assigned_stations=[
            StationBrief(id=s.id, code=s.code, name=s.name, city=s.city)
            for s in user.stations
        ],
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    user = AuthService.signup(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        mobile=payload.mobile,
        station_ids=payload.station_ids,
        ip_address=ip,
    )
    return {
        "message": "Registration submitted successfully. Your account is waiting for admin approval.",
        "user_id": user.id,
        "status": user.status,
    }


@router.post("/signin", response_model=TokenResponse)
def signin(payload: SignInRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    user, access_token, raw_refresh_token = AuthService.signin(
        db=db,
        email=payload.email,
        password=payload.password,
        ip_address=ip,
    )

    # Set HttpOnly refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=False,  # Dev localhost allows false
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    # Also set access_token cookie for browser requests
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_build_user_me(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token cookie missing.")

    ip = request.client.host if request.client else None
    user, access_token, new_refresh = AuthService.refresh(db=db, raw_refresh_token=raw_refresh, ip_address=ip)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_build_user_me(user),
    )


@router.post("/signout")
def signout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    ip = request.client.host if request.client else None
    AuthService.signout(db=db, raw_refresh_token=raw_refresh, ip_address=ip)

    response.delete_cookie("refresh_token")
    response.delete_cookie("access_token")
    return {"message": "Signed out successfully."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    msg = AuthService.forgot_password(db=db, email=payload.email, ip_address=ip)
    return {"message": msg}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    AuthService.reset_password(
        db=db,
        token=payload.token,
        new_password=payload.new_password,
        ip_address=ip,
    )
    return {"message": "Password reset successfully. You can now sign in with your new password."}


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _build_user_me(current_user)
