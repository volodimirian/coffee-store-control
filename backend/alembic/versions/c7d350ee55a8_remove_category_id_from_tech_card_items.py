"""remove_category_id_from_tech_card_items

Revision ID: c7d350ee55a8
Revises: 8728a3df9016
Create Date: 2026-01-02 18:29:43.010777

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d350ee55a8'
down_revision: Union[str, Sequence[str], None] = '8728a3df9016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove category_id column from tech_card_items
    op.drop_constraint('tech_card_items_category_id_fkey', 'tech_card_items', type_='foreignkey')
    op.drop_column('tech_card_items', 'category_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Add category_id column back
    op.add_column('tech_card_items', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key('tech_card_items_category_id_fkey', 'tech_card_items', 'expense_categories', ['category_id'], ['id'], ondelete='RESTRICT')
    # Note: Original data will be lost, set to NULL or a default value if needed
