import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/school_sync"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Force the psycopg2 sync driver and rebuild the URL from its parsed
        parts (rather than doing string replacement) so a pasted/retyped Neon
        connection string can't silently corrupt the database name if a `?`
        or `&` gets misplaced (e.g. "...neondb&channel_binding=require" — a
        stray `&` merged straight into the path because the `?` before
        sslmode went missing when the URL was typed/edited by hand).
        """
        v = v.strip().strip('"').strip("'")

        # Normalize the scheme/driver first.
        if "+asyncpg" in v:
            v = v.replace("+asyncpg", "+psycopg2")
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+psycopg2://", 1)

        parts = urlsplit(v)

        # If the "database name" swallowed a stray "&key=value" because the
        # `?` was lost, split it back out here rather than sending a garbage
        # dbname to Postgres.
        path = parts.path
        stray_query = ""
        if "&" in path and "?" not in v.split(path, 1)[-1]:
            # e.g. path == "/neondb&channel_binding=require"
            db_part, _, stray = path.partition("&")
            path = db_part
            stray_query = stray

        query_pairs = parse_qsl(parts.query, keep_blank_values=True)
        if stray_query:
            query_pairs += parse_qsl(stray_query, keep_blank_values=True)

        query_dict = dict(query_pairs)  # last value wins for any duplicate key
        query_dict.setdefault("sslmode", "require")

        # psycopg2 (via older libpq) can reject `channel_binding` outright;
        # drop it defensively for the sync psycopg2 driver we force above —
        # sslmode=require already gives you an encrypted connection.
        if "+psycopg2" in parts.scheme:
            query_dict.pop("channel_binding", None)

        rebuilt_query = urlencode(query_dict)
        rebuilt = urlunsplit((parts.scheme, parts.netloc, path, rebuilt_query, parts.fragment))
        return rebuilt

    # JWT Authentication Settings
    # JWT_SECRET is REQUIRED. It is read from the environment / .env only
    # (never committed to the repo) and must be at least 32 chars. Leaving it
    # unset aborts startup so a deployment can never silently use a blank secret.
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

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
    # Leave blank to auto-generate a strong random password on first startup
    # (it is printed to the logs once, then hashed). Never rely on a default.
    INITIAL_ADMIN_PASSWORD: str = ""
    INITIAL_ADMIN_TEACHER_ID: str = "ADM001"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    # Frontend CORS origin(s). Comma-separated list, e.g.
    # FRONTEND_ORIGIN=https://school-sync-fj5p.vercel.app
    FRONTEND_ORIGIN: str = ""

    # Data archival: substitute assignments dated before this day are purged.
    # Format: YYYY-MM-DD (start of the current academic term).
    ACADEMIC_TERM_START: str = "2026-04-01"

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        # Fail fast if the secret is missing entirely — but never hard-code the
        # user's actual secret value into this module (that would defeat the point).
        if not v or len(v) < 32:
            raise ValueError(
                "JWT_SECRET must be set in the environment / .env to a value of at "
                "least 32 characters. Refusing to start without it."
            )
        return v

    @field_validator("INITIAL_ADMIN_PASSWORD")
    @classmethod
    def validate_initial_admin_password(cls, v: str) -> str:
        # If a password is configured it must meet a minimum length. Leave it
        # blank to auto-generate a strong random one on first startup.
        if v and len(v) < 12:
            raise ValueError(
                "INITIAL_ADMIN_PASSWORD must be at least 12 characters. Leave it "
                "blank to auto-generate a strong password on first startup."
            )
        return v

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()