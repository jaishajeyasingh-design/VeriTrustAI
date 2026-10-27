from typing import List, Optional
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "VeriTrust AI - Compliance & Verification API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Simulated AI engine flag
    ENVIRONMENT: str = "development"
    DEMO_MODE: bool = True  # Explicitly marks AI OCR & validation results as simulated
    
    # CORS: Allow frontend dev server (default Vite on 5173) and production origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    
    # Security / Server-Trusted Identities (Option A: Explicit Server Identity Mapping)
    # Distinct credentials mapped to verified server-side roles
    ADMIN_API_KEY: str = "vt_admin_sec_84029ba73e1c4f5a90"
    REVIEWER_API_KEY: str = "vt_reviewer_sec_948f9210bcdef45a78"
    APPLICANT_API_KEY: str = "vt_applicant_sec_318e4701d4a82c9e5b"

    # Legacy/Default API Key (mapped to reviewer role with least privilege; never administrator)
    API_KEY: str = "vt_live_948f9210bcdef45a78"

    def validate_production_security(self) -> None:
        """
        Enforces fail-closed security for production environments.
        Fails startup if required security credentials are missing, insecure, or using default dev values.
        """
        if self.ENVIRONMENT.lower() == "production":
            insecure_defaults = {
                "vt_admin_sec_84029ba73e1c4f5a90",
                "vt_reviewer_sec_948f9210bcdef45a78",
                "vt_applicant_sec_318e4701d4a82c9e5b",
                "vt_live_948f9210bcdef45a78",
                "your_secure_api_key_here",
                ""
            }
            keys = [self.ADMIN_API_KEY, self.REVIEWER_API_KEY, self.APPLICANT_API_KEY]
            for key in keys:
                if not key or key in insecure_defaults or len(key) < 24:
                    raise RuntimeError(
                        "Production Security Failure: Required authentication secrets are missing, "
                        "insufficiently long, or using insecure development defaults. "
                        "Production requires distinct, high-entropy secrets."
                    )
            if len(set(keys)) != len(keys):
                raise RuntimeError(
                    "Production Security Failure: ADMIN_API_KEY, REVIEWER_API_KEY, and APPLICANT_API_KEY "
                    "must be distinct credentials in production."
                )
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Document upload & storage settings (non-public directory)
    UPLOAD_DIR: str = "backend/uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg"]
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/pjpeg"
    ]

    # Database configuration (SQLite for local development, configurable via environment)
    DATABASE_URL: str = "sqlite:///./backend/data/veritrust.db"

    # Generated PDF reports storage directory (non-public directory)
    REPORTS_DIR: str = "backend/uploads/reports"

    # Tesseract OCR executable path (auto-detected if None)
    TESSERACT_CMD: Optional[str] = None

    def get_upload_path(self) -> Path:
        """Returns the absolute Path to the upload directory, ensuring it exists."""
        p = Path(self.UPLOAD_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    def get_reports_path(self) -> Path:
        """Returns the absolute Path to the reports directory, ensuring it exists."""
        p = Path(self.REPORTS_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    def get_data_path(self) -> Path:
        """Returns the absolute Path to the database data directory, ensuring it exists."""
        p = Path("backend/data").resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()

