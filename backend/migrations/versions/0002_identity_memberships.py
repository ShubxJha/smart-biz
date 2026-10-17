"""Add users and tenant membership authorization."""
from alembic import op
import sqlalchemy as sa

revision = "0002_identity_memberships"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "business_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('owner', 'admin', 'sales', 'viewer')", name="ck_membership_role_valid"),
        sa.UniqueConstraint("business_id", "user_id", name="uq_membership_business_user"),
    )
    op.create_index("ix_business_memberships_business_id", "business_memberships", ["business_id"])
    op.create_index("ix_business_memberships_user_id", "business_memberships", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_business_memberships_user_id", table_name="business_memberships")
    op.drop_index("ix_business_memberships_business_id", table_name="business_memberships")
    op.drop_table("business_memberships")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
