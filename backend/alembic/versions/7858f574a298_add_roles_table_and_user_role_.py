"""Create users and roles tables

Revision ID: 7858f574a298
Revises: 
Create Date: 2025-10-07 20:17:58.709860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7858f574a298'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and roles tables."""
    # Create roles table
    op.create_table('roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=255), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column(
            'created_at',
            sa.TIMESTAMP(timezone=False),
            server_default=sa.text('CURRENT_TIMESTAMP'),
            nullable=False
        ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id']),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    
    # Create indexes
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    # Add initial roles
    connection = op.get_bind()
    connection.execute(
        sa.text("INSERT INTO roles (name, description) VALUES "
               "('ADMIN', 'System administrator')")
    )


def downgrade() -> None:
    """Drop users and roles tables."""
    op.drop_table('users')
    op.drop_table('roles')
