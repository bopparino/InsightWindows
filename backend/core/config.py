import os, secrets, logging
from pydantic_settings import BaseSettings

_logger = logging.getLogger(__name__)

_INSECURE_DEFAULTS = {"change-me-to-something-long-and-random", ""}

class Settings(BaseSettings):
    DATABASE_URL:       str
    STORAGE_PATH:       str = "../data/quotes"
    ESTIMATOR_NAME:     str = "Your Name"
    ESTIMATOR_INITIALS: str = "YN"
    COMPANY_LOGO_PATH:  str = "static/logo.png"
    SECRET_KEY:          str = "change-me-to-something-long-and-random"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ADMIN_PASSWORD:      str = ""

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Microsoft Entra ID (SSO)
    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""

    # Email
    SMTP_HOST:      str = "smtp.office365.com"
    SMTP_PORT:      int = 587
    SMTP_USER:      str = ""
    SMTP_PASSWORD:  str = ""
    SMTP_FROM_NAME: str = "Metcalfe Heating & Air Conditioning"

    class Config:
        env_file = "../.env"

settings = Settings()

# Warn loudly if SECRET_KEY is still the insecure default
if settings.SECRET_KEY in _INSECURE_DEFAULTS:
    _generated = secrets.token_urlsafe(48)
    _logger.warning(
        "SECRET_KEY is using an insecure default! "
        "Set SECRET_KEY env var in production. "
        "Using auto-generated ephemeral key for this process."
    )
    settings.SECRET_KEY = _generated
