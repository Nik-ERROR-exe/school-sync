from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import ssl as _ssl

# Detect if SSL is required (e.g. Render external database connections)
_use_ssl = "render.com" in settings.DATABASE_URL or "ssl=require" in settings.DATABASE_URL
_connect_args = {}
if _use_ssl:
    # Create a minimal SSL context for asyncpg
    ssl_ctx = _ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = _ssl.CERT_NONE
    _connect_args["ssl"] = ssl_ctx

# Strip ssl query param from URL since asyncpg handles it via connect_args
_db_url = settings.DATABASE_URL.replace("?ssl=require", "").replace("&ssl=require", "")

# Create async engine. Pool size and max overflow configured for production-grade scaling.
engine = create_async_engine(
    _db_url,
    pool_pre_ping=True,
    echo=False,
    pool_size=20,
    max_overflow=10,
    connect_args=_connect_args,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Declarative base class for SQLAlchemy 2.0
class Base(DeclarativeBase):
    pass

# FastAPI DB dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
