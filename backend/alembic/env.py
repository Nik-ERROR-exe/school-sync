from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Import the app's configuration, Base, and ALL models so that
# Base.metadata contains every table for autogenerate to detect.
# ---------------------------------------------------------------------------
from app.config import settings
from app.database import Base

# Import all models – this registers them on Base.metadata
from app.models import (  # noqa: F401
    Teacher,
    Student,
    SchoolClass,
    Subject,
    ExamType,
    TimetableSlot,
    Result,
    Notification,
    SubstituteAssignment,
    WeeklyRequirement,
    TimetableSettings,
)

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerate
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Override sqlalchemy.url from the application's settings so we never
# hardcode credentials in alembic.ini.
# ---------------------------------------------------------------------------
_db_url = settings.DATABASE_URL
# Normalise SSL params for psycopg2 (same logic as database.py)
_db_url = _db_url.replace("?ssl=require", "?sslmode=require")
_db_url = _db_url.replace("&ssl=require", "&sslmode=require")
if "render.com" in _db_url and "sslmode=" not in _db_url:
    separator = "&" if "?" in _db_url else "?"
    _db_url += f"{separator}sslmode=require"

config.set_main_option("sqlalchemy.url", _db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well.  By skipping the Engine
    creation we don't even need a DBAPI to be available.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we create a sync Engine and associate a connection
    with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
