"""add_updated_at_to_sales

Revision ID: b5393e11b4a6
Revises: d8d22509ee76
Create Date: 2026-02-01 20:35:34.053608

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5393e11b4a6'
down_revision: Union[str, Sequence[str], None] = 'd8d22509ee76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add updated_at column to sales table
    op.add_column(
        'sales',
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=True,
            onupdate=sa.func.now()
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove updated_at column from sales table
    op.drop_column('sales', 'updated_at')
