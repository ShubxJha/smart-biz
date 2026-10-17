"""Add expiring business invitations and access-token revocations."""
from alembic import op
import sqlalchemy as sa

revision = "0003_invites_revokes"
down_revision = "0002_identity_memberships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "business_invitations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('admin', 'sales', 'viewer')", name="ck_invitation_role_valid"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_business_invitations_business_id", "business_invitations", ["business_id"])
    op.create_index("ix_business_invitations_email", "business_invitations", ["email"])
    op.create_index("ix_business_invitations_expires_at", "business_invitations", ["expires_at"])
    op.create_table(
        "token_revocations",
        sa.Column("token_id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_token_revocations_user_id", "token_revocations", ["user_id"])
    op.create_index("ix_token_revocations_expires_at", "token_revocations", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_token_revocations_expires_at", table_name="token_revocations")
    op.drop_index("ix_token_revocations_user_id", table_name="token_revocations")
    op.drop_table("token_revocations")
    op.drop_index("ix_business_invitations_expires_at", table_name="business_invitations")
    op.drop_index("ix_business_invitations_email", table_name="business_invitations")
    op.drop_index("ix_business_invitations_business_id", table_name="business_invitations")
    op.drop_table("business_invitations")
