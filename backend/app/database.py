from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Build the database URL for psycopg2
_db_url = settings.DATABASE_URL

# Strip ssl parameters from the URL since we pass them in connect_args (to avoid conflict)
for term in ["?ssl=require", "&ssl=require", "?sslmode=require", "&sslmode=require"]:
    _db_url = _db_url.replace(term, "")

is_local = "localhost" in _db_url or "127.0.0.1" in _db_url

# Use sync engine with psycopg2 and Render-safe settings
engine = create_engine(
    _db_url,
    pool_pre_ping=True,       # Test connection before using — detects dead connections
    pool_recycle=280,         # Recycle connections every 280 seconds (Render kills at ~300s)
    pool_size=15,             # Keep pool ready for concurrent queries
    max_overflow=10,          # Allow extra connections on burst
    connect_args={
        "sslmode": "prefer" if is_local else "require",         # Prefer for local, require for Render
        "connect_timeout": 10,        # Don't wait forever if connection fails
        "keepalives": 1,              # Enable TCP keepalives
        "keepalives_idle": 30,        # Start keepalives after 30s idle
        "keepalives_interval": 10,    # Send keepalive every 10s
        "keepalives_count": 5,        # Give up after 5 failed keepalives
    },
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