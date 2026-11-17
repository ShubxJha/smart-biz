"""Add cost price to products and unit cost to sale items for profit tracking."""
from alembic import op
import sqlalchemy as sa

revision = "0007_cogs_cost_price"
down_revision = "0006_pending_account_email"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("cost_price_minor", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_product_cost_nonnegative", "products", "cost_price_minor >= 0")
    op.add_column("sale_items", sa.Column("unit_cost_minor", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_sale_item_cost_nonnegative", "sale_items", "unit_cost_minor >= 0")


def downgrade() -> None:
    op.drop_constraint("ck_sale_item_cost_nonnegative", "sale_items", type_="check")
    op.drop_column("sale_items", "unit_cost_minor")
    op.drop_constraint("ck_product_cost_nonnegative", "products", type_="check")
    op.drop_column("products", "cost_price_minor")
