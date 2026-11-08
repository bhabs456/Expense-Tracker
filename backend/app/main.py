import threading
import asyncio
import os
import logging
from datetime import date, timedelta
from decimal import Decimal
from contextlib import asynccontextmanager, contextmanager
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import select, delete, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db, SessionLocal
from .models import *
from .schemas import *
from .finance import *
from .catalog import CATEGORIES, PAYMENTS, SOURCES
from .backups import install_backup_routes, weekly_backup

# Serialize financial operations within a process; PostgreSQL lock coordinates workers.
mutex = threading.Lock()


@contextmanager
def financial_session():
    with mutex:
        with SessionLocal() as db:
            try:
                if db.bind.dialect.name == "postgresql":
                    db.execute(text("SELECT pg_advisory_xact_lock(726202611)"))
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise


def locked_db():
    with financial_session() as db:
        yield db


DB = Annotated[Session, Depends(locked_db, scope="function")]


def billing_tick():
    with financial_session() as db:
        process_subscriptions(db, today())


def backup_tick():
    with financial_session() as db:
        weekly_backup(db)


@asynccontextmanager
async def lifespan(app):
    stop = asyncio.Event()

    async def worker(tick, label):
        while not stop.is_set():
            try:
                await asyncio.to_thread(tick)
            except Exception:
                logging.getLogger(__name__).exception(
                    "%s failed. Retrying in 60 seconds.", label
                )
            try:
                await asyncio.wait_for(stop.wait(), timeout=60)
            except asyncio.TimeoutError:
                pass

    tasks = []
    if os.getenv("SUBSCRIPTION_WORKER_DISABLED") != "1":
        tasks.append(
            asyncio.create_task(worker(billing_tick, "Subscription processing"))
        )
    if os.getenv("AUTO_BACKUP_DISABLED") != "1":
        tasks.append(asyncio.create_task(worker(backup_tick, "Weekly backup")))
    try:
        yield
    finally:
        stop.set()
        await asyncio.gather(*tasks)


app = FastAPI(title="Personal Expense Tracker", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "testserver", "backend"],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def local_origin(request, call_next):
    origin = request.headers.get("origin")
    if (
        request.method not in ("GET", "HEAD", "OPTIONS")
        and origin
        and origin not in ("http://localhost:3000", "http://127.0.0.1:3000")
    ):
        return JSONResponse({"detail": "Untrusted request origin"}, status_code=403)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(
        {
            "detail": "Record conflicts with existing data. Check unique months and linked records."
        },
        status_code=409,
    )


def fail(message, code=422):
    raise HTTPException(code, jsonable_encoder(message))


def get(db, cls, id):
    obj = db.get(cls, id)
    if obj is None:
        fail("Record not found", 404)
    return obj


def valid_expense(p, savings=False):
    if p.date < START:
        fail("Tracking begins November 1, 2026")
    allowed = (
        SOURCES if savings and getattr(p, "type", None) == "credit" else CATEGORIES
    )
    if p.category not in allowed:
        fail("Choose a predefined category")
    if p.payment_method not in PAYMENTS:
        fail("Choose a predefined payment method")
    if allowed is CATEGORIES:
        valid_classification(p)
    elif p.subcategory:
        fail("Savings credits use a source without a subcategory")


def valid_classification(p):
    if p.subcategory not in CATEGORIES.get(p.category, ()):
        fail("Choose a subcategory belonging to the category")


def negative_guard(db, confirmed):
    db.flush()
    if not confirmed and any(r["running_balance"] < 0 for r in ledger(db)):
        fail(
            {
                "code": "negative_savings",
                "message": "This change produces a negative historical savings balance. Confirm to continue.",
            },
            409,
        )


def duplicate(db, p, exclude=None):
    stmt = select(Expense).where(
        Expense.date == p.date,
        Expense.amount == p.amount,
        Expense.category == p.category,
        Expense.payment_method == p.payment_method,
    )
    if exclude:
        stmt = stmt.where(Expense.id != exclude)
    return list(db.scalars(stmt))


def apply(obj, p):
    for k, v in p.items():
        setattr(obj, k, v)
    return obj


def parse_month(value):
    try:
        d = date.fromisoformat(value + "-01")
        if d < START:
            fail("History starts November 2026")
        return d
    except ValueError:
        fail("Use month format YYYY-MM")


@app.get("/api/v1/health")
def health(db: DB):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/api/v1/catalog")
def catalog():
    return {
        "categories": CATEGORIES,
        "payment_methods": PAYMENTS,
        "savings_sources": SOURCES,
        "tracking_start": START,
        "today": today(),
    }


@app.get("/api/v1/settings")
def read_settings(db: DB):
    return record(settings(db))


@app.patch("/api/v1/settings")
def edit_settings(p: SettingsIn, db: DB):
    if p.default_payment_method not in PAYMENTS:
        fail("Invalid payment method")
    return record(apply(settings(db), p.model_dump()))


@app.get("/api/v1/dashboard")
def dashboard(db: DB, month: str | None = None):
    as_of = today()
    process_subscriptions(db, as_of)
    d = parse_month(month) if month else max(START, as_of.replace(day=1))
    all_rows = expense_rows(db)
    summary = monthly(db, d, all_rows)
    rows = [r for r in all_rows if r["date"].replace(day=1) == d]
    cfg = settings(db)
    return {
        **summary,
        "week": weekly(all_rows, week_start(as_of)),
        "today_spending": sum(
            (r["net_amount"] for r in rows if r["date"] == as_of), ZERO
        ),
        "recent": rows[:5],
        "accumulated_savings": savings_summary(db, as_of)["accumulated"],
        "minimum_goal": (
            summary["budget"] * cfg.minimum_savings_percent / 100
        ).quantize(Decimal(".01")),
        "stretch_goal": (
            summary["budget"] * cfg.stretch_savings_percent / 100
        ).quantize(Decimal(".01")),
        "tracking_open": as_of >= START,
    }


@app.get("/api/v1/expenses")
def expenses(
    db: DB,
    search: str = "",
    start: date | None = None,
    end: date | None = None,
    category: str = "",
    subcategory: str = "",
    payment_method: str = "",
    page: int = Query(1, ge=1),
):
    rows = filtered(expense_rows(db), search, start, end, category, payment_method, subcategory=subcategory)
    return {
        "items": rows[(page - 1) * 20 : page * 20],
        "total": len(rows),
        "page": page,
        "page_size": 20,
    }


def filtered(rows, search, start, end, category, payment_method, type="", subcategory=""):
    return [
        r
        for r in rows
        if (
            not search
            or search.lower()
            in " ".join(
                str(r.get(k, ""))
                for k in (
                    "notes",
                    "category",
                    "subcategory",
                    "amount",
                    "payment_method",
                )
            ).lower()
        )
        and (not start or r["date"] >= start)
        and (not end or r["date"] <= end)
        and (not category or r["category"] == category)
        and (not subcategory or r["subcategory"] == subcategory)
        and (not payment_method or r["payment_method"] == payment_method)
        and (not type or r["type"] == type)
    ]


@app.post("/api/v1/expenses/batch", status_code=201)
def add_batch(p: BatchIn, db: DB):
    warnings = []
    seen = set()
    for row in p.items:
        valid_expense(row)
        key = (
            row.date,
            row.amount,
            row.category,
            row.payment_method,
            row.savings_funded,
        )
        if not row.savings_funded and (duplicate(db, row) or key in seen):
            warnings.append(row.model_dump(mode="json"))
        seen.add(key)
    if warnings and not p.confirm_duplicates:
        fail(
            {
                "code": "duplicates",
                "message": "Possible duplicate expenses. Save anyway?",
                "items": warnings,
            },
            409,
        )
    result = []
    for row in p.items:
        values = row.model_dump(exclude={"savings_funded"})
        obj = (
            SavingsTransaction(**values, type="debit")
            if row.savings_funded
            else Expense(**values)
        )
        db.add(obj)
        db.flush()
        result.append(record(obj))
    if any(r.savings_funded for r in p.items):
        negative_guard(db, p.confirm_negative_savings)
    return {"items": result}


@app.patch("/api/v1/expenses/{id}")
def edit_expense(id: int, p: ExpenseIn, db: DB, confirm_duplicates: bool = False):
    valid_expense(p)
    e = get(db, Expense, id)
    refunded = sum(
        (r.amount for r in db.scalars(select(Refund).where(Refund.expense_id == id))),
        ZERO,
    )
    if p.amount < refunded:
        fail("Amount cannot be lower than existing refunds")
    if any(
        r.date < p.date
        for r in db.scalars(select(Refund).where(Refund.expense_id == id))
    ):
        fail("Expense cannot be dated after its refund")
    if duplicate(db, p, id) and not confirm_duplicates:
        fail({"code": "duplicates", "message": "Possible duplicate. Save anyway?"}, 409)
    return record(apply(e, p.model_dump()))


@app.delete("/api/v1/expenses/{id}")
def delete_expense(id: int, db: DB, confirm: bool = False):
    e = get(db, Expense, id)
    refunds = list(db.scalars(select(Refund).where(Refund.expense_id == id)))
    if not confirm:
        fail(
            {
                "code": "delete_confirmation",
                "message": f"Delete expense and its {len(refunds)} linked refunds? This also affects historical savings.",
            },
            409,
        )
    for o in db.scalars(select(Occurrence).where(Occurrence.expense_id == id)):
        o.state = "deleted"
        o.expense_id = None
    for r in refunds:
        db.delete(r)
    db.flush()
    db.delete(e)
    return {"deleted": True}


@app.post("/api/v1/expenses/{id}/refunds", status_code=201)
def add_refund(id: int, p: RefundIn, db: DB):
    e = get(db, Expense, id)
    if p.date < e.date or p.date > today():
        fail("Refund date must be between expense date and today")
    total = sum(
        (r.amount for r in db.scalars(select(Refund).where(Refund.expense_id == id))),
        ZERO,
    )
    if total + p.amount > e.amount:
        fail("Total refunds cannot exceed the original expense")
    r = Refund(expense_id=id, **p.model_dump())
    db.add(r)
    db.flush()
    return record(r)


@app.delete("/api/v1/refunds/{id}")
def remove_refund(id: int, db: DB, confirm: bool = False):
    if not confirm:
        fail("Confirm refund deletion", 409)
    db.delete(get(db, Refund, id))
    return {"deleted": True}


@app.get("/api/v1/stipends")
def stipends(db: DB):
    return [
        record(s)
        for s in db.scalars(select(Stipend).order_by(Stipend.earning_month.desc()))
    ]


@app.post("/api/v1/stipends", status_code=201)
def add_stipend(p: StipendIn, db: DB):
    if p.earning_month < shift(START, -1):
        fail("First earning month is October 2026")
    s = Stipend(**p.model_dump())
    db.add(s)
    db.flush()
    return record(s)


@app.patch("/api/v1/stipends/{id}")
def edit_stipend(id: int, p: StipendIn, db: DB):
    if p.earning_month < shift(START, -1):
        fail("First earning month is October 2026")
    return record(apply(get(db, Stipend, id), p.model_dump()))


@app.delete("/api/v1/stipends/{id}")
def remove_stipend(id: int, db: DB, confirm: bool = False):
    if not confirm:
        fail("Confirm stipend deletion and historical recalculation", 409)
    db.delete(get(db, Stipend, id))
    return {"deleted": True}


@app.get("/api/v1/savings/summary")
def savings(db: DB):
    return {**savings_summary(db, today()), "settings": record(settings(db))}


@app.get("/api/v1/savings/transactions")
def transactions(
    db: DB,
    search: str = "",
    start: date | None = None,
    end: date | None = None,
    category: str = "",
    subcategory: str = "",
    payment_method: str = "",
    type: str = "",
    page: int = Query(1, ge=1),
):
    rows = list(
        reversed(
            filtered(ledger(db), search, start, end, category, payment_method, type, subcategory)
        )
    )
    return {
        "items": rows[(page - 1) * 20 : page * 20],
        "total": len(rows),
        "page": page,
        "page_size": 20,
    }


@app.post("/api/v1/savings/transactions", status_code=201)
def add_transaction(p: SavingsIn, db: DB):
    valid_expense(p, True)
    t = SavingsTransaction(**p.model_dump(exclude={"confirm_negative_savings"}))
    db.add(t)
    db.flush()
    negative_guard(db, p.confirm_negative_savings)
    return record(t)


@app.patch("/api/v1/savings/transactions/{id}")
def edit_transaction(id: int, p: SavingsIn, db: DB):
    valid_expense(p, True)
    t = get(db, SavingsTransaction, id)
    apply(t, p.model_dump(exclude={"confirm_negative_savings"}))
    negative_guard(db, p.confirm_negative_savings)
    return record(t)


@app.delete("/api/v1/savings/transactions/{id}")
def remove_transaction(
    id: int, db: DB, confirm: bool = False, confirm_negative_savings: bool = False
):
    if not confirm:
        fail("Confirm savings transaction deletion", 409)
    db.delete(get(db, SavingsTransaction, id))
    negative_guard(db, confirm_negative_savings)
    return {"deleted": True}


@app.get("/api/v1/calendar")
def calendar_data(db: DB, month: str):
    d = parse_month(month)
    rows = [r for r in expense_rows(db) if r["date"].replace(day=1) == d]
    return {
        "items": rows,
        "days": [
            {
                "date": day.isoformat(),
                "total": sum((r["net_amount"] for r in rows if r["date"] == day), ZERO),
            }
            for day in sorted({r["date"] for r in rows})
        ],
    }


@app.get("/api/v1/analytics")
def analytics(db: DB, month: str):
    d = parse_month(month)
    as_of = today()
    process_subscriptions(db, as_of)
    rows = expense_rows(db)
    return {
        "selected": monthly(db, d, rows),
        "weeks": list(weeks_in_month(rows, d, as_of)),
        "months": [
            monthly(db, m, rows) for m in months(max(START, shift(d, -11)), shift(d))
        ],
    }


@app.post("/api/v1/subscriptions/process")
def process(db: DB):
    return {"generated": process_subscriptions(db, today())}


def initial_payment_details(db, sub):
    occurrence = db.scalar(select(Occurrence).where(
        Occurrence.subscription_id == sub.id, Occurrence.billing_date == sub.start_date))
    payment_date = sub.start_date
    if occurrence is None:
        payment_date = sub.first_billing_date or sub.start_date + timedelta(days=30)
        occurrence = db.scalar(select(Occurrence).where(
            Occurrence.subscription_id == sub.id, Occurrence.billing_date == payment_date))
    return {
        "first_payment_date": payment_date,
        "first_payment_status": {"generated": "paid", "deleted": "deleted", "skipped": "not_recorded"}.get(
            occurrence.state if occurrence else "", "scheduled"),
    }


@app.get("/api/v1/subscriptions")
def subscriptions(db: DB):
    as_of = today()
    process_subscriptions(db, as_of)
    result = []
    for s in db.scalars(select(Subscription).order_by(Subscription.id.desc())):
        first_payment = initial_payment_details(db, s)
        result.append({
            **record(s),
            **first_payment,
            "next_charge": next_charge(
                s, as_of, first_payment["first_payment_status"] in ("paid", "deleted")
            ),
            "billing_interval_days": 30,
            "first_billing_date": s.first_billing_date or s.start_date + timedelta(days=30),
        })
    return result


@app.post("/api/v1/subscriptions", status_code=201)
def add_subscription(p: SubscriptionIn, db: DB):
    if p.start_date < START:
        fail("Subscription tracking begins November 1, 2026")
    if p.payment_method not in PAYMENTS or p.category not in CATEGORIES:
        fail("Invalid category or payment method")
    valid_classification(p)
    if p.first_payment_made and p.start_date > today():
        fail("An already paid charge cannot have a future date")
    first_due = p.first_billing_date or p.start_date + timedelta(days=30)
    if first_due < START or first_due < p.start_date:
        fail("The next payment cannot be before the subscription start date")
    if p.first_payment_made and first_due <= p.start_date:
        fail("The next payment must be after the already paid payment date")
    if p.first_billing_date and not p.first_payment_made and first_due < today():
        fail("Choose today or a future date for the upcoming payment")
    s = Subscription(
        **p.model_dump(exclude={"first_payment_made", "existing_expense_id", "first_billing_date"}),
        first_billing_date=first_due,
        billing_day=p.start_date.day,
    )
    # billing_day is retained only for version-1 backup compatibility; renewals use 30-day intervals.
    db.add(s)
    db.flush()
    if p.first_payment_made:
        probe = ExpenseIn(
            amount=p.amount,
            date=p.start_date,
            category=p.category,
            payment_method=p.payment_method,
        )
        candidates = duplicate(db, probe)
        e = None
        if p.existing_expense_id:
            e = get(db, Expense, p.existing_expense_id)
            if e not in candidates or e.subscription_id is not None:
                fail("Select an unlinked matching initial expense")
        elif candidates:
            fail(
                {
                    "code": "initial_payment_match",
                    "message": "Choose an existing matching payment to avoid recording it twice.",
                    "candidates": [record(e) for e in candidates],
                },
                409,
            )
        else:
            e = Expense(
                amount=s.amount,
                date=s.start_date,
                category=s.category,
                subcategory=s.subcategory,
                payment_method=s.payment_method,
                notes=s.name,
            )
            db.add(e)
            db.flush()
        e.subscription_id = s.id
        db.add(
            Occurrence(
                subscription_id=s.id,
                billing_date=s.start_date,
                state="generated",
                expense_id=e.id,
            )
        )
    elif p.first_billing_date is None and not p.one_cycle:
        # Old clients retain their previous skipped-initial-payment semantics.
        db.add(
            Occurrence(subscription_id=s.id, billing_date=s.start_date, state="skipped")
        )
    process_subscriptions(db, today())
    return record(s)


@app.patch("/api/v1/subscriptions/{id}")
def edit_subscription(id: int, p: SubscriptionEdit, db: DB):
    if p.category not in CATEGORIES or p.payment_method not in PAYMENTS:
        fail("Invalid category or payment method")
    valid_classification(p)
    subscription = get(db, Subscription, id)
    # Apply a new limit before processing due charges. Process skipped dates
    # under the old limit before lifting it, so they stay skipped.
    if p.one_cycle:
        subscription.one_cycle = True
    process_subscriptions(db, today())
    return record(apply(subscription, p.model_dump(exclude_none=True)))


@app.post("/api/v1/subscriptions/{id}/{action}")
def subscription_action(id: int, action: str, db: DB):
    s = get(db, Subscription, id)
    if action not in ("pause", "resume", "cancel"):
        fail("Unknown action", 404)
    if s.status == "canceled":
        fail("Canceled subscriptions cannot be resumed")
    process_subscriptions(db, today())
    s.status = {"pause": "paused", "resume": "active", "cancel": "canceled"}[action]
    return record(s)


@app.delete("/api/v1/subscriptions/{id}")
def delete_subscription(id: int, db: DB, confirm: bool = False):
    if not confirm:
        fail("Delete subscription? Historical expenses will be preserved.", 409)
    s = get(db, Subscription, id)
    for e in db.scalars(select(Expense).where(Expense.subscription_id == id)):
        e.subscription_id = None
    db.execute(delete(Occurrence).where(Occurrence.subscription_id == id))
    db.delete(s)
    return {"deleted": True}

install_backup_routes(app, locked_db)
