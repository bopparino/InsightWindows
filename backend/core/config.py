from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL:       str
    STORAGE_PATH:       str = "../data/quotes"
    ESTIMATOR_NAME:     str = "Your Name"
    ESTIMATOR_INITIALS: str = "YN"
    COMPANY_LOGO_PATH:  str = ""
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
