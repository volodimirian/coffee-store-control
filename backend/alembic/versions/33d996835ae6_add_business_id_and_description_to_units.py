"""add_business_id_and_description_to_units

Revision ID: 33d996835ae6
Revises: b8e3267f7084
Create Date: 2025-10-18 14:59:04.336270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33d996835ae6'
down_revision: Union[str, Sequence[str], None] = 'b8e3267f7084'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add business_id column to units table
    op.add_column('units', sa.Column('business_id', sa.Integer(), nullable=False, server_default='1'))
    # Add description column to units table  
    op.add_column('units', sa.Column('description', sa.String(length=500), nullable=True))
    
    # Add foreign key constraint for business_id
    op.create_foreign_key('units_business_id_fkey', 'units', 'businesses', ['business_id'], ['id'])
    
    # Remove server default after adding constraint
    op.alter_column('units', 'business_id', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint('units_business_id_fkey', 'units', type_='foreignkey')
    
    # Drop columns
    op.drop_column('units', 'description')
    op.drop_column('units', 'business_id')
