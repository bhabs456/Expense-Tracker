"""Add subscription subcategories and migrate approved historical classifications."""
from alembic import op
import sqlalchemy as sa

from app.taxonomy_v11 import historical_classification

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

TABLES = ("expenses", "savings_transactions", "subscriptions")


def classify(connection, audit):
    for name in TABLES:
        table = sa.Table(name, sa.MetaData(), autoload_with=connection)
        query = sa.select(table).order_by(table.c.id)
        if name == "savings_transactions":
            query = query.where(table.c.type == "debit")
        for row in connection.execute(query).mappings():
            old = row["category"], row["subcategory"]
            new = historical_classification(name, row)
            already_audited = connection.execute(sa.select(audit.c.record_id).where(
                audit.c.table_name == name, audit.c.record_id == row["id"]
            )).first()
            if new == old or already_audited:
                continue
            if new:
                connection.execute(table.update().where(table.c.id == row["id"]).values(
                    category=new[0], subcategory=new[1]))
            connection.execute(audit.insert().values(
                table_name=name, record_id=row["id"], old_category=old[0],
                old_subcategory=old[1], new_category=new[0] if new else None,
                new_subcategory=new[1] if new else None,
            ))


def upgrade():
    op.add_column("subscriptions", sa.Column("subcategory", sa.String(100), nullable=False, server_default=""))
    audit = op.create_table(
        "taxonomy_v11_audit",
        sa.Column("table_name", sa.String(40), primary_key=True),
        sa.Column("record_id", sa.Integer(), primary_key=True),
        sa.Column("old_category", sa.String(100), nullable=False),
        sa.Column("old_subcategory", sa.String(100), nullable=False),
        sa.Column("new_category", sa.String(100)),
        sa.Column("new_subcategory", sa.String(100)),
    )
    classify(op.get_bind(), audit)


def downgrade():
    raise RuntimeError("Use the classification audit for targeted recovery or restore the verified pre-migration backup separately.")
