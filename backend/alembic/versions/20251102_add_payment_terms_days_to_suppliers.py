"""Add payment_terms_days to suppliers table

Revision ID: 20251102_add_payment_terms_days
Revises: 47576662dbb8
Create Date: 2025-11-02 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251102_add_payment_terms_days'
down_revision: Union[str, Sequence[str], None] = '47576662dbb8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add payment_terms_days column to suppliers table."""
    # Add payment_terms_days column with default value of 14 days
    op.add_column('suppliers', sa.Column('payment_terms_days', sa.Integer(), nullable=False, server_default='14'))


def downgrade() -> None:
    """Remove payment_terms_days column from suppliers table."""
    # Remove payment_terms_days column
    op.drop_column('suppliers', 'payment_terms_days')
    