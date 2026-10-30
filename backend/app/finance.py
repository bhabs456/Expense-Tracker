from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import select
from .models import (
    Expense,
    Refund,
    Stipend,
    SavingsTransaction,
    Subscription,
    Occurrence,
    Settings,
)

START = date(2026, 11, 1)
ZERO = Decimal("0.00")


def month(d):
    return d.replace(day=1)


def shift(d, n=1):
    y, m = divmod(d.year * 12 + d.month - 1 + n, 12)
    return date(y, m + 1, 1)


def months(first, end):
    d = month(first)
    while d < end:
        yield d
        d = shift(d)


def record(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def settings(db):
    obj = db.get(Settings, 1)
    if not obj:
        obj = Settings(id=1)
        db.add(obj)
        db.flush()
    return obj


def expense_rows(db):
    refunds = {}
    for r in db.scalars(select(Refund)):
        refunds.setdefault(r.expense_id, []).append(record(r))
    rows = []
    for e in db.scalars(
        select(Expense).order_by(Expense.date.desc(), Expense.id.desc())
    ):
        rs = refunds.get(e.id, [])
        refunded = sum((r["amount"] for r in rs), ZERO)
        rows.append(
            {
                **record(e),
                "refunds": rs,
                "refunded_amount": refunded,
                "net_amount": e.amount - refunded,
            }
        )
    return rows


def monthly(db, m, rows=None):
    m = month(m)
    s = db.scalar(
        select(Stipend).where(
            Stipend.earning_month == shift(m, -1), Stipend.confirmed.is_(True)
        )
    )
    budget = s.received_amount if s else ZERO
    rows = expense_rows(db) if rows is None else rows
    selected = [r for r in rows if month(r["date"]) == m and r["date"] >= START]
    spent = sum((r["net_amount"] for r in selected), ZERO)
    cats = {}
    for r in selected:
        cats[r["category"]] = cats.get(r["category"], ZERO) + r["net_amount"]
    return {
        "month": m.isoformat()[:7],
        "budget": budget,
        "spending": spent,
        "remaining": budget - spent,
        "savings": budget - spent,
        "stipend_pending": not bool(s),
        "usage_percent": spent / budget * 100
        if budget
        else (Decimal(100) if spent else ZERO),
        "categories": [{"name": k, "value": v} for k, v in cats.items()],
    }


def completed(db, as_of, rows=None):
    rows = expense_rows(db) if rows is None else rows
    return sum(
        (monthly(db, m, rows)["savings"] for m in months(START, month(as_of))), ZERO
    )


def ledger(db):
    rows = expense_rows(db)
    txs = list(
        db.scalars(
            select(SavingsTransaction).order_by(
                SavingsTransaction.date, SavingsTransaction.id
            )
        )
    )
    credits = ZERO
    result = []
    for t in txs:
        credits += t.amount if t.type == "credit" else -t.amount
        result.append(
            {**record(t), "running_balance": completed(db, t.date, rows) + credits}
        )
    return result


def savings_summary(db, today):
    rows = expense_rows(db)
    history = [monthly(db, m, rows) for m in months(START, month(today))]
    adjustments = sum(
        (
            t.amount if t.type == "credit" else -t.amount
            for t in db.scalars(
                select(SavingsTransaction).where(SavingsTransaction.date <= today)
            )
        ),
        ZERO,
    )
    return {
        "accumulated": sum((r["savings"] for r in history), ZERO) + adjustments,
        "projected": monthly(db, today, rows)["savings"] if today >= START else ZERO,
        "history": history,
    }


def renewal_dates(sub, through):
    """Fixed 30-day calendar-date intervals, anchored to the tracking date."""
    due = sub.start_date + timedelta(days=30)
    while due <= through:
        if due >= START:
            yield due
        due += timedelta(days=30)


def process_subscriptions(db, today):
    count = 0
    for sub in db.scalars(select(Subscription)):
        existing = {
            o.billing_date
            for o in db.scalars(
                select(Occurrence).where(Occurrence.subscription_id == sub.id)
            )
        }
        # Preserve previously processed history when moving from calendar-month billing.
        # Never fill a new 30-day occurrence into an already processed historical period.
        processed_through = max(existing, default=sub.start_date)
        for d in renewal_dates(sub, today):
            if d in existing or d <= processed_through:
                continue
            e = None
            if sub.status == "active":
                e = Expense(
                    amount=sub.amount,
                    date=d,
                    category=sub.category,
                    payment_method=sub.payment_method,
                    notes=sub.name,
                    subscription_id=sub.id,
                )
                db.add(e)
                db.flush()
                count += 1
            db.add(
                Occurrence(
                    subscription_id=sub.id,
                    billing_date=d,
                    state="generated" if e else "skipped",
                    expense_id=e.id if e else None,
                )
            )
    db.flush()
    return count


def next_charge(sub, today):
    if sub.status != "active":
        return None
    elapsed = (today - sub.start_date).days
    interval = max(1, elapsed // 30 + 1)
    return sub.start_date + timedelta(days=30 * interval)
