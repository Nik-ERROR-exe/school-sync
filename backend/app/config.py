import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/school_sync"

    # JWT Authentication Settings
    JWT_SECRET: str = "change_me_to_a_secure_random_string_in_production_32_chars_or_more"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # SMTP Settings (Email Notifications)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "no-reply@schoolsync.com"

    # Redis and Celery Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_CELERY: bool = False

    # Seed Admin Settings
    INITIAL_ADMIN_EMAIL: str = "admin@schoolsync.com"
    INITIAL_ADMIN_PASSWORD: str = "AdminPassword123"
    INITIAL_ADMIN_TEACHER_ID: str = "ADM001"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
