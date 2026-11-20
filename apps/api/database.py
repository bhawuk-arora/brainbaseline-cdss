"""SQLite database configuration with WAL mode and SQLModel engine."""

import os
from pathlib import Path
from typing import Generator
from sqlalchemy import event
from sqlmodel import SQLModel, create_engine, Session

# DB path configurable via environment variable or default to local sqlite
# On Vercel / AWS Lambda, the root filesystem is read-only; /tmp is the only writable directory
default_sqlite = "sqlite:////tmp/brainbaseline.db" if os.environ.get("VERCEL") else "sqlite:///brainbaseline.db"
DB_PATH = os.getenv("DATABASE_URL", default_sqlite)

engine = create_engine(
    DB_PATH,
    echo=False,
    connect_args={"check_same_thread": False},
)


# Enforce WAL mode for safe concurrent access from Next.js / API calls
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.close()


def init_db() -> None:
    """Creates all SQLModel tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI session dependency."""
    with Session(engine) as session:
        yield session
