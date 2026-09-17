import sys
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Build the async database URL
_db_url = settings.DATABASE_URL

# Clean SSL parameters from the URL since we manage SSL explicitly via connect_args
for term in ["?ssl=require", "&ssl=require", "?sslmode=require", "&sslmode=require"]:
    _db_url = _db_url.replace(term, "")

is_local = "localhost" in _db_url or "127.0.0.1" in _db_url
is_sqlite = _db_url.startswith("sqlite")

# Configure driver-specific engine parameters
engine_kwargs = {
    "echo": False,
}

if is_sqlite:
    # SQLite async settings (for tests and local dev)
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL asyncpg settings with connection pooling & Render/Neon keepalive
    engine_kwargs.update({
        "pool_pre_ping": True,       # Test connection before using — detects dead connections
        "pool_recycle": 280,         # Recycle connections every 280s (Render kills at ~300s)
        "pool_size": 15,             # Active connection pool size
        "max_overflow": 10,          # Extra burst connections
        "connect_args": {
            "ssl": "prefer" if is_local else "require",  # SSL mode for asyncpg
            "timeout": 10,                               # Connection timeout in seconds
        }
    })

# Asynchronous SQLAlchemy Engine
engine = create_async_engine(_db_url, **engine_kwargs)

# Asynchronous Session factory
# expire_on_commit=False prevents lazy-load errors on committed model instances
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Backward-compatibility alias
SessionLocal = AsyncSessionLocal

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an asynchronous database session.

    Usage:
        @router.get('/endpoint')
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Model))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()