from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.site import Site
from app.models.token import RefreshToken, PasswordResetToken
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    generate_secure_token,
    hash_token,
)
from app.services.audit_service import AuditService


class AuthService:
    @staticmethod
    def signup(
        db: Session,
        full_name: str,
        email: str,
        password: str,
        role: str = "OPERATOR",
        mobile: Optional[str] = None,
        station_ids: Optional[list] = None,
        ip_address: Optional[str] = None,
    ) -> User:
        # Validate password strength
        is_valid, err_msg = validate_password_strength(password)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)

        # Check existing email
        existing = db.query(User).filter(User.email == email.lower().strip()).first()
        if existing:
            # Per PDF: Duplicate email is rejected with neutral message or 409 Conflict
            AuditService.log(
                db,
                action="SIGNUP_DUPLICATE_ATTEMPT",
                user_id=None,
                target_type="USER",
                target_id=email,
                outcome="FAILURE",
                ip_address=ip_address,
                details={"reason": "Email already registered"},
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # Requested role can only be OPERATOR or MANAGER via self-signup
        requested_role = role.upper() if role else "OPERATOR"
        if requested_role not in ["OPERATOR", "MANAGER"]:
            requested_role = "OPERATOR"

        user = User(
            full_name=full_name.strip(),
            email=email.lower().strip(),
            mobile=mobile.strip() if mobile else None,
            password_hash=hash_password(password),
            role=requested_role,
            status="PENDING",  # Awaits admin approval
            failed_attempts=0,
        )

        if station_ids:
            sites = db.query(Site).filter(Site.id.in_(station_ids)).all()
            user.stations = sites

        db.add(user)
        db.commit()
        db.refresh(user)

        AuditService.log(
            db,
            action="SIGNUP_REQUEST",
            user_id=user.id,
            target_type="USER",
            target_id=str(user.id),
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"requested_role": requested_role, "status": "PENDING"},
        )
        return user

    @staticmethod
    def signin(
        db: Session,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Validates credentials and account status.
        Returns (user, access_token, raw_refresh_token).
        """
        clean_email = email.lower().strip()
        user = db.query(User).filter(User.email == clean_email).first()

        now = datetime.now(timezone.utc)

        # Check account lockout
        if user and user.locked_until:
            # Handle timezone-naive vs timezone-aware datetime comparison
            locked_until = user.locked_until
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if now < locked_until:
                minutes_left = int((locked_until - now).total_seconds() / 60) + 1
                AuditService.log(
                    db,
                    action="SIGNIN_LOCKED_ATTEMPT",
                    user_id=user.id,
                    target_type="USER",
                    target_id=str(user.id),
                    outcome="FAILURE",
                    ip_address=ip_address,
                    details={"minutes_remaining": minutes_left},
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is temporarily locked due to consecutive failed sign-in attempts. Try again in {minutes_left} minutes.",
                )
            else:
                # Lockout expired, reset attempts
                user.locked_until = None
                user.failed_attempts = 0
                db.commit()

        # If user not found or password incorrect
        if not user or not verify_password(password, user.password_hash):
            if user:
                user.failed_attempts += 1
                if user.failed_attempts >= 5:
                    user.locked_until = now + timedelta(minutes=15)
                    user.status = "LOCKED"
                    db.commit()
                    AuditService.log(
                        db,
                        action="ACCOUNT_LOCKED",
                        user_id=user.id,
                        target_type="USER",
                        target_id=str(user.id),
                        outcome="FAILURE",
                        ip_address=ip_address,
                        details={"reason": "5 failed login attempts"},
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Account has been locked for 15 minutes due to multiple failed sign-in attempts.",
                    )
                db.commit()

            AuditService.log(
                db,
                action="SIGNIN_FAILED",
                user_id=user.id if user else None,
                target_type="USER",
                target_id=clean_email,
                outcome="FAILURE",
                ip_address=ip_address,
                details={"reason": "Invalid email or password"},
            )
            # Never disclose whether email or password was wrong
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Check account status
        if user.status == "PENDING":
            AuditService.log(
                db,
                action="SIGNIN_PENDING_ATTEMPT",
                user_id=user.id,
                target_type="USER",
                target_id=str(user.id),
                outcome="FAILURE",
                ip_address=ip_address,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is waiting for administrator approval. You will receive access once approved.",
            )

        if user.status in ["REJECTED", "DISABLED"]:
            AuditService.log(
                db,
                action=f"SIGNIN_{user.status}_ATTEMPT",
                user_id=user.id,
                target_type="USER",
                target_id=str(user.id),
                outcome="FAILURE",
                ip_address=ip_address,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account access denied (status: {user.status}). Please contact system administrator.",
            )

        # Successful login: reset failed counters and update last login
        user.failed_attempts = 0
        user.locked_until = None
        user.last_login_at = now
        db.commit()

        # Generate JWT access token
        access_token = create_access_token(
            payload={"sub": str(user.id), "role": user.role, "email": user.email}
        )

        # Generate rotating refresh token
        raw_refresh_token = generate_secure_token()
        refresh_obj = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(refresh_obj)
        db.commit()

        AuditService.log(
            db,
            action="SIGNIN_SUCCESS",
            user_id=user.id,
            target_type="USER",
            target_id=str(user.id),
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"role": user.role},
        )
        return user, access_token, raw_refresh_token

    @staticmethod
    def refresh(db: Session, raw_refresh_token: str, ip_address: Optional[str] = None) -> Tuple[User, str, str]:
        """
        Validates refresh token, rotates it, and issues a new access token.
        """
        if not raw_refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing.")

        t_hash = hash_token(raw_refresh_token)
        token_entry = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()

        now = datetime.now(timezone.utc)
        if not token_entry:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

        if token_entry.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked.")

        exp = token_entry.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired.")

        user = token_entry.user
        if not user or user.status != "ACTIVE":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

        # Revoke old refresh token (Token rotation pattern)
        token_entry.revoked_at = now

        # Create new rotating refresh token
        new_raw_token = generate_secure_token()
        new_entry = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_raw_token),
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(new_entry)
        db.commit()

        # Create new access token
        new_access_token = create_access_token(
            payload={"sub": str(user.id), "role": user.role, "email": user.email}
        )

        AuditService.log(
            db,
            action="TOKEN_REFRESH",
            user_id=user.id,
            target_type="USER",
            target_id=str(user.id),
            outcome="SUCCESS",
            ip_address=ip_address,
        )
        return user, new_access_token, new_raw_token

    @staticmethod
    def signout(db: Session, raw_refresh_token: Optional[str], user_id: Optional[int] = None, ip_address: Optional[str] = None):
        """Revokes refresh token on sign out."""
        if raw_refresh_token:
            t_hash = hash_token(raw_refresh_token)
            token_entry = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()
            if token_entry:
                token_entry.revoked_at = datetime.now(timezone.utc)
                db.commit()

        if user_id:
            AuditService.log(
                db,
                action="SIGNOUT",
                user_id=user_id,
                target_type="USER",
                target_id=str(user_id),
                outcome="SUCCESS",
                ip_address=ip_address,
            )

    @staticmethod
    def forgot_password(db: Session, email: str, ip_address: Optional[str] = None) -> str:
        """
        Creates single-use 30-minute password reset token.
        Prints link to console log in demo mode.
        """
        clean_email = email.lower().strip()
        user = db.query(User).filter(User.email == clean_email).first()

        # Always return generic message to prevent email enumeration
        if not user:
            return "If this email is registered, a password reset link has been issued."

        now = datetime.now(timezone.utc)
        raw_reset_token = generate_secure_token()

        reset_obj = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_reset_token),
            expires_at=now + timedelta(minutes=30),
        )
        db.add(reset_obj)
        db.commit()

        reset_url = f"http://localhost:5173/reset-password?token={raw_reset_token}"
        print(f"\n[DEMO SERVER LOG] PASSWORD RESET EMAIL FOR {clean_email}:\nLink: {reset_url}\n")

        AuditService.log(
            db,
            action="PASSWORD_RESET_REQUESTED",
            user_id=user.id,
            target_type="USER",
            target_id=str(user.id),
            outcome="SUCCESS",
            ip_address=ip_address,
        )
        return "If this email is registered, a password reset link has been issued."

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str, ip_address: Optional[str] = None) -> bool:
        """Applies new password using valid reset token."""
        is_valid, err_msg = validate_password_strength(new_password)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)

        t_hash = hash_token(token)
        reset_entry = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == t_hash).first()

        now = datetime.now(timezone.utc)
        if not reset_entry:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

        if reset_entry.used_at is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has already been used.")

        exp = reset_entry.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired.")

        user = reset_entry.user
        user.password_hash = hash_password(new_password)
        reset_entry.used_at = now
        db.commit()

        AuditService.log(
            db,
            action="PASSWORD_RESET_COMPLETED",
            user_id=user.id,
            target_type="USER",
            target_id=str(user.id),
            outcome="SUCCESS",
            ip_address=ip_address,
        )
        return True
