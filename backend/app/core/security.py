import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError
    _ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
    _USE_ARGON2 = True
except ImportError:
    _ph = None
    _USE_ARGON2 = False
    import bcrypt

from app.core.config import settings

# Common passwords blacklist (per Section 9 password rules)
COMMON_PASSWORDS = {
    "password", "password123", "1234567890", "qwerty1234", "admin12345",
    "welcome123", "letmein123", "changeme123", "hydrosafe123", "operator123"
}


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Per implementation plan:
    - At least 10 characters.
    - Checked against a list of common passwords.
    - No forced symbol rules.
    """
    if not password or len(password) < 10:
        return False, "Password must be at least 10 characters long."
    if password.lower() in COMMON_PASSWORDS:
        return False, "Password is too common or easily guessable."
    return True, None


def hash_password(password: str) -> str:
    """Hashes a password with argon2id (or bcrypt as fallback)."""
    if _USE_ARGON2 and _ph:
        return _ph.hash(password)
    # Fallback to bcrypt
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against an argon2id or bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    if _USE_ARGON2 and _ph:
        try:
            return _ph.verify(hashed_password, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            # Check if it was hashed with bcrypt as fallback
            pass
        except Exception:
            pass

    # Try bcrypt verification
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(payload: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a short-lived JWT access token."""
    to_encode = payload.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token."""
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None


def generate_secure_token() -> str:
    """Generates a cryptographically secure random token string for refresh/reset."""
    return secrets.token_urlsafe(48)


def hash_token(raw_token: str) -> str:
    """Returns SHA-256 hash of a raw token for storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
