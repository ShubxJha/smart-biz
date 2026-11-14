"""Add external references for idempotent historical sales imports."""
from alembic import op
import sqlalchemy as sa

revision = "0005_sales_import_reference"
down_revision = "0004_email_rate_limits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("external_reference", sa.String(length=128), nullable=True))
    op.create_unique_constraint(
        "uq_sale_business_external_reference",
        "sales",
        ["business_id", "external_reference"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_sale_business_external_reference", "sales", type_="unique")
    op.drop_column("sales", "external_reference")
