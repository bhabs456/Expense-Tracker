from importlib import import_module
from datetime import date
from decimal import Decimal

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.orm import Session

from app.finance import expense_rows, monthly, savings_summary
from app.models import Base, Expense, Refund, SavingsTransaction, Stipend, Subscription

migration = import_module("migrations.versions.0003_taxonomy_v11")


def test_migration_preserves_records_and_finances(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'migration.db'}")
    Base.metadata.create_all(engine)
    day = date(2026, 11, 3)
    with Session(engine) as db:
        db.add_all([
            Expense(id=20, amount=Decimal("500.50"), date=day,
                    category=" education ", subcategory="BOOKS", payment_method="UPI", notes="Textbook"),
            Expense(id=21, amount=Decimal("90"), date=day,
                    category="Transport", subcategory="Other", payment_method="Cash", notes="Unknown"),
            Stipend(earning_month=date(2026, 10, 1), expected_amount=1000,
                    received_amount=1000, received_date=day, confirmed=True),
            SavingsTransaction(date=day, type="debit", amount=20,
                               category="Transport", subcategory="Taxi", payment_method="UPI"),
            Subscription(id=7, name="Legacy", amount=10, start_date=day, billing_day=3,
                         first_billing_date=date(2026, 12, 3), payment_method="UPI"),
        ])
        db.flush()
        db.add(Refund(expense_id=20, amount=Decimal("20.50"), date=day))
        db.commit()
        before = expense_rows(db)
        totals = monthly(db, day)
        savings = savings_summary(db, day)["accumulated"]

    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE subscriptions DROP COLUMN subcategory")
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
        audit = sa.Table("taxonomy_v11_audit", sa.MetaData(), autoload_with=connection)
        migration.classify(connection, audit)
        results = {(row.table_name, row.record_id): row.new_subcategory
                   for row in connection.execute(sa.select(audit))}
        assert results == {("expenses", 20): "Books & Study Materials",
                           ("expenses", 21): None,
                           ("subscriptions", 7): None,
                           ("savings_transactions", 1): "Taxi & Auto"}

    with Session(engine) as db:
        after = expense_rows(db)
        omit_taxonomy = lambda rows: [
            {k: v for k, v in r.items() if k not in ("category", "subcategory")}
            for r in rows
        ]
        assert omit_taxonomy(before) == omit_taxonomy(after)
        assert db.get(Expense, 21).subcategory == "Other"
        assert db.get(Subscription, 7).first_billing_date == date(2026, 12, 3)
        assert db.get(SavingsTransaction, 1).subcategory == "Taxi & Auto"
        updated = monthly(db, day)
        assert updated["spending"] == totals["spending"] == Decimal("570")
        assert updated["remaining"] == totals["remaining"]
        assert {"name": "Education", "value": Decimal("480")} in updated["categories"]
        assert savings_summary(db, day)["accumulated"] == savings
    engine.dispose()


def test_classification_updates_roll_back_on_audit_failure(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'rollback.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Expense(id=1, amount=100, date=date(2026, 11, 3), category="Transport",
                       subcategory="Taxi", payment_method="UPI"))
        db.commit()
    with engine.begin() as connection:
        connection.exec_driver_sql("""
            CREATE TABLE taxonomy_v11_audit (
                table_name TEXT, record_id INTEGER, old_category TEXT,
                old_subcategory TEXT, new_category TEXT, new_subcategory TEXT,
                CHECK (new_category IS NULL))
        """)
        audit = sa.Table("taxonomy_v11_audit", sa.MetaData(), autoload_with=connection)
    with pytest.raises(sa.exc.IntegrityError):
        with engine.begin() as connection:
            migration.classify(connection, audit)
    with Session(engine) as db:
        assert db.get(Expense, 1).subcategory == "Taxi"
        assert db.execute(sa.select(audit)).all() == []
    engine.dispose()
