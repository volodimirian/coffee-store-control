"""add_created_by_to_expense_sections_and_categories

Revision ID: 6c9f704f14f8
Revises: 70c8ec2c9f53
Create Date: 2025-10-18 15:31:53.646833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c9f704f14f8'
down_revision: Union[str, Sequence[str], None] = '70c8ec2c9f53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add created_by column to expense_sections table
    op.add_column('expense_sections', sa.Column('created_by', sa.Integer(), nullable=False, server_default='1'))
    # Add created_by column to expense_categories table  
    op.add_column('expense_categories', sa.Column('created_by', sa.Integer(), nullable=False, server_default='1'))
    
    # Add foreign key constraints
    op.create_foreign_key('expense_sections_created_by_fkey', 'expense_sections', 'users', ['created_by'], ['id'])
    op.create_foreign_key('expense_categories_created_by_fkey', 'expense_categories', 'users', ['created_by'], ['id'])
    
    # Remove server defaults after adding constraints
    op.alter_column('expense_sections', 'created_by', server_default=None)
    op.alter_column('expense_categories', 'created_by', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraints
    op.drop_constraint('expense_sections_created_by_fkey', 'expense_sections', type_='foreignkey')
    op.drop_constraint('expense_categories_created_by_fkey', 'expense_categories', type_='foreignkey')
    
    # Drop columns
    op.drop_column('expense_sections', 'created_by')
    op.drop_column('expense_categories', 'created_by')
