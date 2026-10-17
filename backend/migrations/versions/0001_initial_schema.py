"""Initial business, catalog, and sales schema."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(254)),
        sa.Column("phone", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("business_id", "email", name="uq_customer_business_email"),
    )
    op.create_index("ix_customers_business_id", "customers", ["business_id"])
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("sku", sa.String(64), nullable=False),
        sa.Column("price_minor", sa.Integer(), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("price_minor >= 0", name="ck_product_price_nonnegative"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_product_stock_nonnegative"),
        sa.UniqueConstraint("business_id", "sku", name="uq_product_business_sku"),
    )
    op.create_index("ix_products_business_id", "products", ["business_id"])
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL")),
        sa.Column("total_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("total_minor >= 0", name="ck_sale_total_nonnegative"),
    )
    op.create_index("ix_sales_business_id", "sales", ["business_id"])
    op.create_index("ix_sales_created_at", "sales", ["created_at"])
    op.create_table(
        "sale_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="SET NULL")),
        sa.Column("product_name", sa.String(160), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_minor", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_sale_item_quantity_positive"),
        sa.CheckConstraint("unit_price_minor >= 0", name="ck_sale_item_price_nonnegative"),
    )
    op.create_index("ix_sale_items_sale_id", "sale_items", ["sale_id"])


def downgrade() -> None:
    op.drop_index("ix_sale_items_sale_id", table_name="sale_items")
    op.drop_table("sale_items")
    op.drop_index("ix_sales_created_at", table_name="sales")
    op.drop_index("ix_sales_business_id", table_name="sales")
    op.drop_table("sales")
    op.drop_index("ix_products_business_id", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_customers_business_id", table_name="customers")
    op.drop_table("customers")
    op.drop_table("businesses")
