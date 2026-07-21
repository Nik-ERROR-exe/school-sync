from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Build the database URL for psycopg2
# Replace ?ssl=require with ?sslmode=require (psycopg2 syntax)
_db_url = settings.DATABASE_URL
_db_url = _db_url.replace("?ssl=require", "?sslmode=require")
_db_url = _db_url.replace("&ssl=require", "&sslmode=require")

# If connecting to Render and no sslmode is set, add it
if "render.com" in _db_url and "sslmode=" not in _db_url:
    separator = "&" if "?" in _db_url else "?"
    _db_url += f"{separator}sslmode=require"

# Use sync engine with psycopg2
engine = create_engine(
    _db_url,
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