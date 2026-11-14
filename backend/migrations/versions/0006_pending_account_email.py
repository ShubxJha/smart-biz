"""Store pending account email addresses until they are verified."""
from alembic import op
import sqlalchemy as sa

revision = "0006_pending_account_email"
down_revision = "0005_sales_import_reference"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("email_verifications", sa.Column("pending_email", sa.String(length=254), nullable=True))


def downgrade() -> None:
    op.drop_column("email_verifications", "pending_email")
