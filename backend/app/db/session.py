from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


engine: Engine | None = None
SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_engine() -> Engine:
    """Create the configured database engine only when it is first needed."""

    global engine
    if engine is None:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
    return engine


def get_db() -> Generator[Session, None, None]:
    """Provide a database session for future route dependencies."""

    db = SessionLocal(bind=get_engine())
    try:
        yield db
    finally:
        db.close()
