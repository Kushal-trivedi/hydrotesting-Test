import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hydrotest Compliance Management System"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'hydrotest.db'}")
    
    # Compliance Business Rules
    DUE_SOON_THRESHOLD_DAYS: int = 30
    DEFAULT_VEHICLE_VALIDITY_YEARS: int = 3
    DEFAULT_CASCADE_VALIDITY_YEARS: int = 5
    
    # External Services
    MOCK_EXTERNAL_APIS: bool = True
    VEHICLE_API_URL: str = os.getenv("VEHICLE_API_URL", "")
    VEHICLE_API_KEY: str = os.getenv("VEHICLE_API_KEY", "")
    HYDROTEST_API_URL: str = os.getenv("HYDROTEST_API_URL", "")
    HYDROTEST_API_KEY: str = os.getenv("HYDROTEST_API_KEY", "")

    # Storage
    DOCUMENT_STORAGE_DIR: Path = UPLOAD_DIR

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
