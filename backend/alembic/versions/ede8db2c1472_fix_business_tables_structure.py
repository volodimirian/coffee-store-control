"""fix_business_tables_structure

Revision ID: ede8db2c1472
Revises: 841261b889ce
Create Date: 2025-10-17 13:29:09.859435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ede8db2c1472'
down_revision: Union[str, Sequence[str], None] = '841261b889ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - idempotent version."""
    # Get connection to check existing state
    conn = op.get_bind()
    
    # Fix businesses table: make city and address NOT NULL
    op.execute("UPDATE businesses SET city = 'Unknown' WHERE city IS NULL")
    op.execute("UPDATE businesses SET address = 'Unknown' WHERE address IS NULL")
    op.alter_column('businesses', 'city',
               existing_type=sa.VARCHAR(length=100),
               nullable=False)
    op.alter_column('businesses', 'address',
               existing_type=sa.TEXT(),
               nullable=False)
    
    # Fix user_businesses table: remove auto-increment id and use composite primary key (idempotent)
    # Check if 'id' column exists before trying to drop it
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='user_businesses' AND column_name='id'
    """))
    
    if result.fetchone() is not None:
        # Only drop if it exists
        op.drop_constraint('user_businesses_pkey', 'user_businesses', type_='primary')
        op.drop_column('user_businesses', 'id')
        op.create_primary_key('user_businesses_pkey', 'user_businesses', ['user_id', 'business_id'])
    else:
        # Ensure composite primary key exists
        result = conn.execute(sa.text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name='user_businesses' AND constraint_name='user_businesses_pkey'
        """))
        if result.fetchone() is None:
            op.create_primary_key('user_businesses_pkey', 'user_businesses', ['user_id', 'business_id'])
    
    # Fix NULL values in other tables before setting NOT NULL constraints
    op.execute("UPDATE permissions SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE permissions SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE role_permissions SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE role_permissions SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE role_permissions SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE user_permissions SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_permissions SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE user_permissions SET is_active = true WHERE is_active IS NULL")
    
    # Set NOT NULL constraints
    op.alter_column('permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=False)
    op.alter_column('role_permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('role_permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=False)
    op.alter_column('role_permissions', 'updated_at',
               existing_type=sa.TIMESTAMP(),
               nullable=False)
    op.alter_column('user_permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=False)
    op.alter_column('user_permissions', 'updated_at',
               existing_type=sa.TIMESTAMP(),
               nullable=False)
    
    # Add foreign key constraint for business_id (idempotent)
    result = conn.execute(sa.text("""
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name='user_permissions' AND constraint_name='user_permissions_business_id_fkey'
    """))
    if result.fetchone() is None:
        op.create_foreign_key('user_permissions_business_id_fkey', 'user_permissions', 'businesses', ['business_id'], ['id'])
    
    # Drop unique constraints on users table (idempotent)
    result = conn.execute(sa.text("""
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_name='users_email_key'
    """))
    if result.fetchone() is not None:
        op.drop_constraint('users_email_key', 'users', type_='unique')
    
    result = conn.execute(sa.text("""
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_name='users_username_key'
    """))
    if result.fetchone() is not None:
        op.drop_constraint('users_username_key', 'users', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    # Revert changes
    op.create_unique_constraint('users_username_key', 'users', ['username'])
    op.create_unique_constraint('users_email_key', 'users', ['email'])
    
    op.drop_constraint('user_permissions_business_id_fkey', 'user_permissions', type_='foreignkey')
    
    op.alter_column('user_permissions', 'updated_at',
               existing_type=sa.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('role_permissions', 'updated_at',
               existing_type=sa.TIMESTAMP(),
               nullable=True)
    op.alter_column('role_permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=True)
    op.alter_column('role_permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('permissions', 'created_at',
               existing_type=sa.TIMESTAMP(),
               nullable=True)
    op.alter_column('permissions', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    
    # Revert user_businesses table changes
    op.drop_constraint('user_businesses_pkey', 'user_businesses', type_='primary')
    op.add_column('user_businesses', sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False))
    op.create_primary_key('user_businesses_pkey', 'user_businesses', ['id'])
    
    # Revert businesses table changes
    op.alter_column('businesses', 'address',
               existing_type=sa.TEXT(),
               nullable=True)
    op.alter_column('businesses', 'city',
               existing_type=sa.VARCHAR(length=100),
               nullable=True)
