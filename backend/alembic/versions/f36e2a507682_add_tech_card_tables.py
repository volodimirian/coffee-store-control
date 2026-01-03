"""add_tech_card_tables

Revision ID: f36e2a507682
Revises: 217b46cbce4a
Create Date: 2026-01-02 16:46:35.456064

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f36e2a507682'
down_revision: Union[str, Sequence[str], None] = '217b46cbce4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add tech_card_requires_approval to businesses table
    op.add_column(
        'businesses',
        sa.Column('tech_card_requires_approval', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Create tech_card_items table (products for sale)
    op.create_table(
        'tech_card_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('selling_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('approval_status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tech_card_items_business_id'), 'tech_card_items', ['business_id'], unique=False)
    op.create_index(op.f('ix_tech_card_items_is_active'), 'tech_card_items', ['is_active'], unique=False)
    
    # Create tech_card_item_ingredients table (product composition)
    op.create_table(
        'tech_card_item_ingredients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('ingredient_category_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['item_id'], ['tech_card_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ingredient_category_id'], ['expense_categories.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tech_card_item_ingredients_item_id'), 'tech_card_item_ingredients', ['item_id'], unique=False)
    
    # Create ingredient_cost_history table (track ingredient costs from invoices)
    op.create_table(
        'ingredient_cost_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('invoice_item_id', sa.Integer(), nullable=False),
        sa.Column('cost_per_unit', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('purchase_date', sa.Date(), nullable=False),
        sa.Column('quantity_purchased', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('total_cost', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_item_id'], ['invoice_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ingredient_cost_history_category_id'), 'ingredient_cost_history', ['category_id'], unique=False)
    op.create_index(op.f('ix_ingredient_cost_history_purchase_date'), 'ingredient_cost_history', ['purchase_date'], unique=False)
    op.create_index('ix_ingredient_cost_category_date', 'ingredient_cost_history', ['category_id', 'purchase_date'], unique=False)
    
    # Create starting_inventory table (initial stock levels)
    op.create_table(
        'starting_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('inventory_date', sa.Date(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('business_id', 'category_id', 'inventory_date', name='uq_starting_inventory_business_category_date')
    )
    op.create_index(op.f('ix_starting_inventory_business_id'), 'starting_inventory', ['business_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.drop_index(op.f('ix_starting_inventory_business_id'), table_name='starting_inventory')
    op.drop_table('starting_inventory')
    
    op.drop_index('ix_ingredient_cost_category_date', table_name='ingredient_cost_history')
    op.drop_index(op.f('ix_ingredient_cost_history_purchase_date'), table_name='ingredient_cost_history')
    op.drop_index(op.f('ix_ingredient_cost_history_category_id'), table_name='ingredient_cost_history')
    op.drop_table('ingredient_cost_history')
    
    op.drop_index(op.f('ix_tech_card_item_ingredients_item_id'), table_name='tech_card_item_ingredients')
    op.drop_table('tech_card_item_ingredients')
    
    op.drop_index(op.f('ix_tech_card_items_is_active'), table_name='tech_card_items')
    op.drop_index(op.f('ix_tech_card_items_business_id'), table_name='tech_card_items')
    op.drop_table('tech_card_items')
    
    op.drop_column('businesses', 'tech_card_requires_approval')
