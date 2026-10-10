import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "HydroSafe Compliance Operating System"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'hydrotest.db'}")
    
    # Compliance Business Rules
    DUE_SOON_THRESHOLD_DAYS: int = 30
    DEFAULT_VEHICLE_VALIDITY_YEARS: int = 3
    DEFAULT_CASCADE_VALIDITY_YEARS: int = 5
    
    # Security & JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "hydrosafe-dev-super-secret-key-change-in-production-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    IDLE_TIMEOUT_MINUTES: int = 30
    ALLOWED_ORIGIN: str = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")

    # Storage & Retention
    DOCUMENT_STORAGE_DIR: Path = UPLOAD_DIR
    MEDIA_STORAGE_DIR: Path = MEDIA_DIR
    MEDIA_RETENTION_DAYS: int = int(os.getenv("MEDIA_RETENTION_DAYS", "30"))

    # External Services & Modes
    MOCK_EXTERNAL_APIS: bool = True
    VAHAN_MODE: str = os.getenv("VAHAN_MODE", "mock")
    VEHICLE_API_URL: str = os.getenv("VEHICLE_API_URL", "")
    VEHICLE_API_KEY: str = os.getenv("VEHICLE_API_KEY", "")
    HYDROTEST_API_URL: str = os.getenv("HYDROTEST_API_URL", "")
    HYDROTEST_API_KEY: str = os.getenv("HYDROTEST_API_KEY", "")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
