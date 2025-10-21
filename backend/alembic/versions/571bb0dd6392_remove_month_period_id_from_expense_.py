"""remove month_period_id from expense_sections and add business_id to expense_categories

Revision ID: 571bb0dd6392
Revises: 6c9f704f14f8
Create Date: 2025-10-21 15:35:13.735589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '571bb0dd6392'
down_revision: Union[str, Sequence[str], None] = '6c9f704f14f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop foreign key constraints first
    op.drop_constraint('expense_sections_month_period_id_fkey', 'expense_sections', type_='foreignkey')
    
    # Remove month_period_id from expense_sections
    op.drop_column('expense_sections', 'month_period_id')
    
    # Add business_id to expense_categories (nullable at first)
    op.add_column('expense_categories', sa.Column('business_id', sa.Integer(), nullable=True))
    
    # Update business_id from related sections
    op.execute("""
        UPDATE expense_categories 
        SET business_id = expense_sections.business_id 
        FROM expense_sections 
        WHERE expense_categories.section_id = expense_sections.id
    """)
    
    # Make business_id non-nullable
    op.alter_column('expense_categories', 'business_id', nullable=False)
    
    # Add foreign key constraint
    op.create_foreign_key('expense_categories_business_id_fkey', 'expense_categories', 'businesses', ['business_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Add month_period_id back to expense_sections
    op.add_column('expense_sections', sa.Column('month_period_id', sa.Integer(), nullable=False, server_default='1'))
    op.create_foreign_key('expense_sections_month_period_id_fkey', 'expense_sections', 'month_periods', ['month_period_id'], ['id'])
    
    # Remove server default after adding
    op.alter_column('expense_sections', 'month_period_id', server_default=None)
    
    # Remove business_id from expense_categories
    op.drop_constraint('expense_categories_business_id_fkey', 'expense_categories', type_='foreignkey')
    op.drop_column('expense_categories', 'business_id')
