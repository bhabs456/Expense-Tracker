"""Initial immutable schema."""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "savings_transactions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("type", sa.String(length=10), primary_key=False, nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("date", sa.Date(), primary_key=False, nullable=False),
        sa.Column("category", sa.String(length=100), primary_key=False, nullable=False),
        sa.Column(
            "subcategory", sa.String(length=100), primary_key=False, nullable=False
        ),
        sa.Column(
            "payment_method", sa.String(length=100), primary_key=False, nullable=False
        ),
        sa.Column("notes", sa.String(length=2000), primary_key=False, nullable=False),
        sa.CheckConstraint("type IN ('credit','debit') AND amount > 0"),
    )
    op.create_index(
        "ix_savings_transactions_date", "savings_transactions", ["date"], unique=False
    )
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "minimum_savings_percent",
            sa.Numeric(precision=5, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column(
            "stretch_savings_percent",
            sa.Numeric(precision=5, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column(
            "default_payment_method",
            sa.String(length=100),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("theme", sa.String(length=10), primary_key=False, nullable=False),
        sa.Column("currency", sa.String(length=3), primary_key=False, nullable=False),
    )
    op.create_table(
        "stipends",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("earning_month", sa.Date(), primary_key=False, nullable=False),
        sa.Column(
            "expected_amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column(
            "received_amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("received_date", sa.Date(), primary_key=False, nullable=True),
        sa.Column("confirmed", sa.Boolean(), primary_key=False, nullable=False),
        sa.UniqueConstraint("earning_month"),
        sa.CheckConstraint("expected_amount >= 0 AND received_amount >= 0"),
    )
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), primary_key=False, nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("start_date", sa.Date(), primary_key=False, nullable=False),
        sa.Column("billing_day", sa.Integer(), primary_key=False, nullable=False),
        sa.Column("category", sa.String(length=100), primary_key=False, nullable=False),
        sa.Column(
            "payment_method", sa.String(length=100), primary_key=False, nullable=False
        ),
        sa.Column("status", sa.String(length=20), primary_key=False, nullable=False),
        sa.CheckConstraint(
            "amount > 0 AND billing_day BETWEEN 1 AND 31 AND status IN ('active','paused','canceled')"
        ),
    )
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("date", sa.Date(), primary_key=False, nullable=False),
        sa.Column("category", sa.String(length=100), primary_key=False, nullable=False),
        sa.Column(
            "subcategory", sa.String(length=100), primary_key=False, nullable=False
        ),
        sa.Column(
            "payment_method", sa.String(length=100), primary_key=False, nullable=False
        ),
        sa.Column("notes", sa.String(length=2000), primary_key=False, nullable=False),
        sa.Column(
            "subscription_id",
            sa.Integer(),
            sa.ForeignKey("subscriptions.id", ondelete="SET NULL"),
            primary_key=False,
            nullable=True,
        ),
        sa.CheckConstraint("amount > 0"),
    )
    op.create_index("ix_expenses_date", "expenses", ["date"], unique=False)
    op.create_table(
        "expense_refunds",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "expense_id",
            sa.Integer(),
            sa.ForeignKey("expenses.id", ondelete="CASCADE"),
            primary_key=False,
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(precision=14, scale=2),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("date", sa.Date(), primary_key=False, nullable=False),
        sa.Column("notes", sa.String(length=2000), primary_key=False, nullable=False),
        sa.CheckConstraint("amount > 0"),
    )
    op.create_index(
        "ix_expense_refunds_expense_id", "expense_refunds", ["expense_id"], unique=False
    )
    op.create_table(
        "subscription_occurrences",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "subscription_id",
            sa.Integer(),
            sa.ForeignKey("subscriptions.id", ondelete="CASCADE"),
            primary_key=False,
            nullable=False,
        ),
        sa.Column("billing_date", sa.Date(), primary_key=False, nullable=False),
        sa.Column("state", sa.String(length=20), primary_key=False, nullable=False),
        sa.Column(
            "expense_id",
            sa.Integer(),
            sa.ForeignKey("expenses.id", ondelete="SET NULL"),
            primary_key=False,
            nullable=True,
        ),
        sa.UniqueConstraint("subscription_id", "billing_date"),
        sa.CheckConstraint("state IN ('generated','deleted','skipped')"),
    )


def downgrade():
    op.drop_table("subscription_occurrences")
    op.drop_table("expense_refunds")
    op.drop_table("expenses")
    op.drop_table("subscriptions")
    op.drop_table("stipends")
    op.drop_table("settings")
    op.drop_table("savings_transactions")
