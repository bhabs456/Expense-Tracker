"""Add configurable subscription billing intervals."""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("subscriptions") as batch:
        batch.add_column(
            sa.Column("billing_months", sa.Integer(), nullable=False, server_default="1")
        )
        batch.create_check_constraint(
            "ck_subscription_billing_months", "billing_months IN (1, 3, 6, 9, 12)"
        )


def downgrade():
    with op.batch_alter_table("subscriptions") as batch:
        batch.drop_constraint("ck_subscription_billing_months", type_="check")
        batch.drop_column("billing_months")
