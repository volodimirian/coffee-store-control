"""add_refresh_token_to_users

Revision ID: 217b46cbce4a
Revises: dcb4ddcc1d95
Create Date: 2025-12-09 12:22:30.071920

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '217b46cbce4a'
down_revision: Union[str, Sequence[str], None] = 'dcb4ddcc1d95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    
    # Check if refresh_token column exists
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'refresh_token'
    """))
    
    if not result.fetchone():
        op.add_column('users', sa.Column('refresh_token', sa.String(length=500), nullable=True))
        op.add_column('users', sa.Column('refresh_token_expires', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    
    # Check and remove refresh_token_expires
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'refresh_token_expires'
    """))
    
    if result.fetchone():
        op.drop_column('users', 'refresh_token_expires')
    
    # Check and remove refresh_token
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'refresh_token'
    """))
    
    if result.fetchone():
        op.drop_column('users', 'refresh_token')
