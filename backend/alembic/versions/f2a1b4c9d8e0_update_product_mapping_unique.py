"""Update product_mappings unique constraint

Revision ID: f2a1b4c9d8e0
Revises: c8f91a2e3d47
Create Date: 2026-02-13 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f2a1b4c9d8e0'
down_revision: Union[str, Sequence[str], None] = 'c8f91a2e3d47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('uq_connection_product', 'product_mappings', type_='unique')
    op.create_unique_constraint(
        'uq_connection_product',
        'product_mappings',
        ['connection_id', 'ofd_product_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_connection_product', 'product_mappings', type_='unique')
    op.create_unique_constraint(
        'uq_connection_product',
        'product_mappings',
        ['connection_id', 'ofd_product_id', 'ofd_product_name']
    )
