"""add cascade delete to unit base_unit_id foreign key

Revision ID: b8bd5e24ff91
Revises: 571bb0dd6392
Create Date: 2025-10-25 16:25:28.136332

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b8bd5e24ff91'
down_revision: Union[str, Sequence[str], None] = '571bb0dd6392'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add CASCADE to base_unit_id foreign key."""
    # Drop existing foreign key constraint (if exists)
    op.drop_constraint('units_base_unit_id_fkey', 'units', type_='foreignkey')
    
    # Recreate foreign key constraint with CASCADE on delete
    op.create_foreign_key(
        'units_base_unit_id_fkey',
        'units',
        'units',
        ['base_unit_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema - remove CASCADE from base_unit_id foreign key."""
    # Drop cascade foreign key constraint
    op.drop_constraint('units_base_unit_id_fkey', 'units', type_='foreignkey')
    
    # Recreate foreign key constraint without CASCADE
    op.create_foreign_key(
        'units_base_unit_id_fkey',
        'units',
        'units',
        ['base_unit_id'],
        ['id']
    )
