"""add_created_by_to_suppliers

Revision ID: 70c8ec2c9f53
Revises: 33d996835ae6
Create Date: 2025-10-18 15:16:07.135384

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70c8ec2c9f53'
down_revision: Union[str, Sequence[str], None] = '33d996835ae6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add created_by column to suppliers table
    op.add_column('suppliers', sa.Column('created_by', sa.Integer(), nullable=False, server_default='1'))
    
    # Add foreign key constraint for created_by
    op.create_foreign_key('suppliers_created_by_fkey', 'suppliers', 'users', ['created_by'], ['id'])
    
    # Remove server default after adding constraint
    op.alter_column('suppliers', 'created_by', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint('suppliers_created_by_fkey', 'suppliers', type_='foreignkey')
    
    # Drop column
    op.drop_column('suppliers', 'created_by')
