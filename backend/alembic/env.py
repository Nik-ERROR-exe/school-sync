import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import our configuration and models metadata
from app.config import settings
from app.models import Base
from app.database import engine as app_engine

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerating migrations
target_metadata = Base.metadata

# Override the sqlalchemy.url from our application configuration
# Strip ssl param since it's handled by connect_args in the engine
_clean_url = settings.DATABASE_URL.replace("?ssl=require", "").replace("&ssl=require", "")
config.set_main_option("sqlalchemy.url", _clean_url)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    """Run migrations in 'online' mode using the app's SSL-configured engine."""
    async with app_engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await app_engine.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    # Run the online migrations asynchronously
    asyncio.run(run_migrations_online())
