"""Add tax_id field to suppliers table

Revision ID: 20251102_add_tax_id_to_suppliers
Revises: 20251102_add_payment_terms_days
Create Date: 2025-11-02 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251102_add_tax_id_to_suppliers'
down_revision: Union[str, Sequence[str], None] = '20251102_add_payment_terms_days'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tax_id field to suppliers table."""
    op.add_column('suppliers', sa.Column('tax_id', sa.String(length=50), nullable=True))
    
    # Set default value for existing records
    op.execute("UPDATE suppliers SET tax_id = '0000000000000' WHERE tax_id IS NULL")
    op.alter_column('suppliers', 'tax_id', nullable=False)


def downgrade() -> None:
    """Remove tax_id field from suppliers table."""
    op.drop_column('suppliers', 'tax_id')