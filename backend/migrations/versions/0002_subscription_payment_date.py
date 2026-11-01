"""Store an explicit first scheduled billing date without changing legacy schedules."""
from datetime import timedelta
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("subscriptions", sa.Column("first_billing_date", sa.Date(), nullable=True))
    table = sa.table("subscriptions", sa.column("id", sa.Integer()),
                     sa.column("start_date", sa.Date()), sa.column("first_billing_date", sa.Date()))
    connection = op.get_bind()
    for row in connection.execute(sa.select(table.c.id, table.c.start_date)).mappings():
        connection.execute(table.update().where(table.c.id == row["id"]).values(
            first_billing_date=row["start_date"] + timedelta(days=30)))


def downgrade():
    op.drop_column("subscriptions", "first_billing_date")
