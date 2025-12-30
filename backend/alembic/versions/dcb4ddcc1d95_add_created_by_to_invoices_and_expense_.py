"""add_created_by_to_invoices_and_expense_records

Revision ID: dcb4ddcc1d95
Revises: 0b95f72eaf36
Create Date: 2025-11-15 18:12:35.093719

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dcb4ddcc1d95'
down_revision: Union[str, Sequence[str], None] = '1b878a6d9d3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    
    # Check if created_by column exists in invoices table
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'created_by'
    """))
    
    if not result.fetchone():
        # Add created_by column to invoices table
        op.add_column('invoices', sa.Column('created_by', sa.Integer(), nullable=True))
        
        # Add foreign key constraint
        op.create_foreign_key(
            'fk_invoices_created_by_users',
            'invoices', 
            'users',
            ['created_by'], 
            ['id'],
            ondelete='SET NULL'
        )
    
    # Check if created_by column exists in expense_records table
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'expense_records' 
        AND column_name = 'created_by'
    """))
    
    if not result.fetchone():
        # Add created_by column to expense_records table
        op.add_column('expense_records', sa.Column('created_by', sa.Integer(), nullable=True))
        
        # Add foreign key constraint
        op.create_foreign_key(
            'fk_expense_records_created_by_users',
            'expense_records', 
            'users',
            ['created_by'], 
            ['id'],
            ondelete='SET NULL'
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    
    # Check and remove expense_records.created_by
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'expense_records' 
        AND column_name = 'created_by'
    """))
    
    if result.fetchone():
        # Drop foreign key first
        op.drop_constraint('fk_expense_records_created_by_users', 'expense_records', type_='foreignkey')
        op.drop_column('expense_records', 'created_by')
    
    # Check and remove invoices.created_by
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'created_by'
    """))
    
    if result.fetchone():
        # Drop foreign key first
        op.drop_constraint('fk_invoices_created_by_users', 'invoices', type_='foreignkey')
        op.drop_column('invoices', 'created_by')
