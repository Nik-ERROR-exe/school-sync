from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
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

# Use sync engine (not async)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()