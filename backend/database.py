from __future__ import annotations

import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///zoom_clone.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def migrate_sqlite_schema() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        if "email" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
            )
        if "password_hash" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
            )
        if "created_at" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN created_at DATETIME")
            )


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()