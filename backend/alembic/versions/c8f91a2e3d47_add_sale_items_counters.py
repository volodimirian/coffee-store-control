"""add_sale_items_counters

Revision ID: c8f91a2e3d47
Revises: b5393e11b4a6
Create Date: 2026-02-09 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f91a2e3d47'
down_revision: Union[str, Sequence[str], None] = 'b5393e11b4a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add counters for items in sales table
    op.add_column(
        'sales',
        sa.Column('items_count', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column(
        'sales',
        sa.Column('unmapped_items_count', sa.Integer(), nullable=False, server_default='0')
    )
    
    # Update existing sales with correct counts
    op.execute("""
        UPDATE sales
        SET items_count = (
            SELECT COUNT(*) FROM sale_items WHERE sale_items.sale_id = sales.id
        ),
        unmapped_items_count = (
            SELECT COUNT(*) FROM sale_items 
            WHERE sale_items.sale_id = sales.id AND sale_items.is_mapped = false
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sales', 'unmapped_items_count')
    op.drop_column('sales', 'items_count')
