import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://tracker:tracker@localhost:55432/tracker"
)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    **(
        {"connect_args": {"check_same_thread": False}}
        if DATABASE_URL.startswith("sqlite")
        else {}
    ),
)
if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def fk_on(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
