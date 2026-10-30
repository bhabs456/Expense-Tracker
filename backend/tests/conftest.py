import os
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app import main, schemas, backups
from app.models import Base


@pytest.fixture
def clock(monkeypatch):
    current = [date(2027, 3, 15)]
    monkeypatch.setattr(main, "today", lambda: current[0])
    monkeypatch.setattr(schemas, "today", lambda: current[0])
    return current


@pytest.fixture
def client(tmp_path, monkeypatch, clock):
    monkeypatch.setenv("SUBSCRIPTION_WORKER_DISABLED", "1")
    url = os.getenv("TEST_DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    if not url.startswith("sqlite") and not url.rsplit("/", 1)[-1].endswith("_test"):
        raise RuntimeError(
            "TEST_DATABASE_URL must point to a disposable database ending in _test"
        )
    engine = create_engine(
        url,
        **(
            {"connect_args": {"check_same_thread": False}}
            if url.startswith("sqlite")
            else {}
        ),
    )
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def fks(c, _):
            c.execute("PRAGMA foreign_keys=ON")

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def sessions():
        with main.mutex:
            with factory() as db:
                try:
                    yield db
                    db.commit()
                except Exception:
                    db.rollback()
                    raise

    main.app.dependency_overrides[main.locked_db] = sessions
    monkeypatch.setattr(backups, "DIRECTORY", tmp_path / "backups")
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()
