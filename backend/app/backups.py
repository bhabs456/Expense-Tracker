"""Versioned, exact-decimal JSON snapshots. Restore validates before touching live data."""

import json
import os
import re
from pathlib import Path
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
from typing import Literal
from uuid import uuid4
from fastapi import Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select, delete, insert, text, create_engine, event
from sqlalchemy.orm import Session
from .models import *
from .schemas import (
    ExpenseIn,
    StipendIn,
    SavingsIn,
    SettingsIn,
    RefundIn,
    SubscriptionEdit,
)
from .finance import START, shift, record
from .catalog import CATEGORIES, PAYMENTS, SOURCES, canonical_subcategory

DIRECTORY = Path(os.getenv("BACKUP_DIR", "./backups"))
MAX_BYTES = 20 * 1024 * 1024


def encode(v):
    if isinstance(v, Decimal):
        return format(v, ".2f")
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    raise TypeError(type(v).__name__)


def snapshot(db):
    return {
        "format": "personal-expense-tracker",
        "version": 2,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tables": {
            m.__tablename__: [record(r) for r in db.scalars(select(m).order_by(m.id))]
            for m in TABLES
        },
    }


def serialized(data):
    return json.dumps(data, default=encode, ensure_ascii=False, indent=2).encode()


def save(db, prefix):
    DIRECTORY.mkdir(parents=True, exist_ok=True, mode=0o700)
    name = f"{prefix}-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}-{uuid4().hex[:8]}.json"
    payload = serialized(snapshot(db))
    fd = os.open(DIRECTORY / name, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())
    dirfd = os.open(DIRECTORY, os.O_RDONLY)
    try:
        os.fsync(dirfd)
    finally:
        os.close(dirfd)
    return name, payload


class Envelope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format: Literal["personal-expense-tracker"]
    version: Literal[1, 2]
    created_at: datetime
    tables: dict[str, list[dict]]


SCHEMAS = {
    Expense: ExpenseIn,
    Refund: RefundIn,
    Stipend: StipendIn,
    SavingsTransaction: SavingsIn,
    Subscription: SubscriptionEdit,
    Settings: SettingsIn,
}


def validated(data):
    env = Envelope.model_validate(data)
    if set(env.tables) != {m.__tablename__ for m in TABLES}:
        raise ValueError("Backup must contain every application table")
    result = {}
    for m in TABLES:
        parsed = []
        seen = set()
        fields = {c.name for c in m.__table__.columns}
        for raw in env.tables[m.__tablename__]:
            if m == Subscription and env.version == 1 and "first_billing_date" not in raw:
                raw = {**raw, "first_billing_date": (
                    date.fromisoformat(raw["start_date"]) + timedelta(days=30)
                ).isoformat()}
            if set(raw) != fields:
                raise ValueError(f"Invalid fields in {m.__tablename__}")
            if type(raw["id"]) is not int or raw["id"] < 1 or raw["id"] in seen:
                raise ValueError("Invalid or duplicate record ID")
            seen.add(raw["id"])
            row = raw.copy()
            for col in m.__table__.columns:
                if raw[col.name] is not None and isinstance(col.type, Date):
                    row[col.name] = date.fromisoformat(raw[col.name])
                if isinstance(col.type, Numeric):
                    row[col.name] = Decimal(str(raw[col.name]))
            if m in SCHEMAS:
                schema = SCHEMAS[m]
                schema.model_validate(
                    {k: v for k, v in row.items() if k in schema.model_fields}
                )
            if m in (Expense, SavingsTransaction):
                row["subcategory"] = canonical_subcategory(row["category"], row["subcategory"])
                if row["date"] < START:
                    raise ValueError("Transaction before tracking start")
                cats = (
                    SOURCES
                    if m == SavingsTransaction and row["type"] == "credit"
                    else CATEGORIES
                )
                if row["category"] not in cats or row["payment_method"] not in PAYMENTS:
                    raise ValueError("Invalid category or payment method")
                if (
                    row["subcategory"]
                    and row["category"] in CATEGORIES
                    and row["subcategory"] not in CATEGORIES[row["category"]]
                ):
                    raise ValueError("Invalid subcategory")
            if m == Stipend and row["earning_month"] < shift(START, -1):
                raise ValueError("Invalid stipend month")
            if m == Subscription and (
                row["start_date"] < START
                or row["first_billing_date"] is None
                or row["first_billing_date"] < row["start_date"]
                or row["status"] not in ("active", "paused", "canceled")
                or not 1 <= row["billing_day"] <= 31
                or row["category"] not in CATEGORIES
                or row["payment_method"] not in PAYMENTS
            ):
                raise ValueError("Invalid subscription")
            if m == Occurrence and row["state"] not in (
                "generated",
                "deleted",
                "skipped",
            ):
                raise ValueError("Invalid occurrence state")
            if m == Settings and (
                row["id"] != 1
                or row["currency"] != "INR"
                or row["default_payment_method"] not in PAYMENTS
            ):
                raise ValueError("Invalid settings")
            parsed.append(row)
        result[m] = parsed
    if len(result[Settings]) > 1:
        raise ValueError("Only one settings record allowed")
    expenses = {r["id"]: r for r in result[Expense]}
    subs = {r["id"]: r for r in result[Subscription]}
    totals = {}
    for r in result[Refund]:
        e = expenses.get(r["expense_id"])
        if not e or r["date"] < e["date"]:
            raise ValueError("Invalid refund link/date")
        totals[e["id"]] = totals.get(e["id"], Decimal(0)) + r["amount"]
        if totals[e["id"]] > e["amount"]:
            raise ValueError("Excessive refunds")
    linked = set()
    for r in result[Occurrence]:
        if r["subscription_id"] not in subs or r["billing_date"] < max(
            START, subs[r["subscription_id"]]["start_date"]
        ):
            raise ValueError("Invalid occurrence link/date")
        if r["state"] == "generated":
            e = expenses.get(r["expense_id"])
            if (
                not e
                or e["subscription_id"] != r["subscription_id"]
                or e["id"] in linked
            ):
                raise ValueError("Invalid generated occurrence")
            linked.add(e["id"])
        elif r["expense_id"] is not None:
            raise ValueError("Non-generated occurrence cannot link an expense")
    # Validate FK/unique/check constraints in a separate disposable database.
    test = create_engine("sqlite://")

    @event.listens_for(test, "connect")
    def enable_fk(c, _):
        c.execute("PRAGMA foreign_keys=ON")

    try:
        Base.metadata.create_all(test)
        with test.begin() as connection:
            for m in TABLES:
                if result[m]:
                    connection.execute(insert(m.__table__), result[m])
    finally:
        test.dispose()
    return result


def install_backup_routes(app, dependency):
    @app.post("/api/v1/backups")
    def backup(db: Session = Depends(dependency, scope="function")):
        name, payload = save(db, "backup")
        return Response(
            payload,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{name}"'},
        )

    @app.get("/api/v1/backups")
    def list_backups():
        return (
            [
                {"name": p.name, "bytes": p.stat().st_size}
                for p in sorted(DIRECTORY.glob("*.json"), reverse=True)
            ]
            if DIRECTORY.exists()
            else []
        )

    @app.get("/api/v1/backups/{name}")
    def download(name: str):
        if not re.fullmatch(r"(?:backup|safety)-\d{8}T\d{6}-[a-f0-9]{8}\.json", name):
            raise HTTPException(404, "Backup not found")
        p = DIRECTORY / name
        if not p.is_file():
            raise HTTPException(404, "Backup not found")
        return Response(
            p.read_bytes(),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{name}"'},
        )

    @app.post("/api/v1/backups/restore")
    async def restore(
        request: Request, db: Session = Depends(dependency, scope="function")
    ):
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_BYTES:
                raise HTTPException(413, "Backup exceeds 20 MB")
        try:
            data = json.loads(body)
            if (
                set(data) != {"confirmation", "backup"}
                or data["confirmation"] != "RESTORE"
            ):
                raise ValueError("Type RESTORE to confirm replacement")
            rows = validated(data["backup"])
        except Exception as e:
            raise HTTPException(422, f"Invalid backup: {str(e)[:400]}") from e
        # No live records change unless safety backup was successfully fsynced.
        name, _ = save(db, "safety")
        for m in reversed(TABLES):
            db.execute(delete(m))
        db.flush()
        for m in TABLES:
            if rows[m]:
                db.execute(insert(m.__table__), rows[m])
        if db.bind.dialect.name == "postgresql":
            for m in TABLES:
                table = m.__tablename__
                db.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), EXISTS(SELECT 1 FROM {table}))"
                    )
                )
        db.flush()
        return {
            "restored": True,
            "safety_backup": name,
            "counts": {m.__tablename__: len(rows[m]) for m in TABLES},
        }
