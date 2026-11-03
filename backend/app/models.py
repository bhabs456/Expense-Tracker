from datetime import date
from decimal import Decimal
from sqlalchemy import (
    String,
    Numeric,
    Date,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    JSON,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(100))
    subcategory: Mapped[str] = mapped_column(String(100), default="")
    payment_method: Mapped[str] = mapped_column(String(100))
    notes: Mapped[str] = mapped_column(String(2000), default="")
    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    __table_args__ = (CheckConstraint("amount > 0"),)


class Refund(Base):
    __tablename__ = "expense_refunds"
    id: Mapped[int] = mapped_column(primary_key=True)
    expense_id: Mapped[int] = mapped_column(
        ForeignKey("expenses.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    date: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(String(2000), default="")
    __table_args__ = (CheckConstraint("amount > 0"),)


class Stipend(Base):
    __tablename__ = "stipends"
    id: Mapped[int] = mapped_column(primary_key=True)
    earning_month: Mapped[date] = mapped_column(Date, unique=True)
    expected_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    received_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    received_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (CheckConstraint("expected_amount >= 0 AND received_amount >= 0"),)


class SavingsTransaction(Base):
    __tablename__ = "savings_transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(100))
    subcategory: Mapped[str] = mapped_column(String(100), default="")
    payment_method: Mapped[str] = mapped_column(String(100))
    notes: Mapped[str] = mapped_column(String(2000), default="")
    __table_args__ = (CheckConstraint("type IN ('credit','debit') AND amount > 0"),)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    start_date: Mapped[date] = mapped_column(Date)
    billing_day: Mapped[int] = mapped_column(Integer)
    first_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="Subscriptions")
    subcategory: Mapped[str] = mapped_column(String(100), default="")
    payment_method: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="active")
    __table_args__ = (
        CheckConstraint(
            "amount > 0 AND billing_day BETWEEN 1 AND 31 AND status IN ('active','paused','canceled')"
        ),
    )


class Occurrence(Base):
    __tablename__ = "subscription_occurrences"
    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE")
    )
    billing_date: Mapped[date] = mapped_column(Date)
    state: Mapped[str] = mapped_column(String(20))
    expense_id: Mapped[int | None] = mapped_column(
        ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True
    )
    __table_args__ = (
        UniqueConstraint("subscription_id", "billing_date"),
        CheckConstraint("state IN ('generated','deleted','skipped')"),
    )


class Settings(Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    minimum_savings_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=40)
    stretch_savings_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=50)
    default_payment_method: Mapped[str] = mapped_column(String(100), default="UPI")
    theme: Mapped[str] = mapped_column(String(10), default="system")
    currency: Mapped[str] = mapped_column(String(3), default="INR")


TABLES = [
    Subscription,
    Expense,
    Refund,
    Stipend,
    SavingsTransaction,
    Occurrence,
    Settings,
]
