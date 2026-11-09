"""Rename the Taxi & Auto transport subcategory."""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def rename_subcategory(old, new):
    for name in ("expenses", "savings_transactions", "subscriptions"):
        table = sa.table(
            name, sa.column("category"), sa.column("subcategory"), sa.column("type")
        )
        update = table.update().where(
            table.c.category == "Transport", table.c.subcategory == old
        )
        if name == "savings_transactions":
            update = update.where(table.c.type == "debit")
        op.execute(update.values(subcategory=new))


def upgrade():
    rename_subcategory("Taxi & Auto", "Cab & Auto")


def downgrade():
    rename_subcategory("Cab & Auto", "Taxi & Auto")
