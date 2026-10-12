"""
SQLAlchemy Database Session and Engine Configuration.
Provides seamless PostgreSQL connectivity with SQLite local fallback.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.core.config import settings
from backend.app.core.logging import logger

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info(f"Database engine initialized for: {settings.DATABASE_URL.split('@')[-1]}")
except Exception as e:
    logger.warning(f"Could not connect to {settings.DATABASE_URL}: {e}. Falling back to SQLite.")
    sqlite_url = "sqlite:///./credit_risk.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI Dependency for database session management."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
