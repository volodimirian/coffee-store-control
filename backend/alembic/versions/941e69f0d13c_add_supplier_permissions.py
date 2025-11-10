"""add_supplier_permissions

Revision ID: 941e69f0d13c
Revises: 20251102_add_tax_id_to_suppliers
Create Date: 2025-11-06 11:56:19.492110

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '941e69f0d13c'
down_revision: Union[str, Sequence[str], None] = '20251102_add_tax_id_to_suppliers'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add supplier permissions to the permissions table."""
    
    # Insert supplier permissions
    op.execute("""
        INSERT INTO permissions (name, description, resource, action, is_active, created_at) VALUES 
        ('view_supplier', 'View supplier information and list suppliers', 'suppliers', 'view', true, NOW()),
        ('create_supplier', 'Create new suppliers', 'suppliers', 'create', true, NOW()),
        ('edit_supplier', 'Edit existing supplier information', 'suppliers', 'edit', true, NOW()),
        ('activate_deactivate_supplier', 'Activate or deactivate suppliers', 'suppliers', 'activate_deactivate', true, NOW()),
        ('delete_supplier', 'Delete suppliers', 'suppliers', 'delete', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    """Remove supplier permissions."""
    
    # Remove supplier permissions
    op.execute("""
        DELETE FROM user_permissions WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'suppliers'
        );
    """)
    
    op.execute("""
        DELETE FROM role_permissions WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'suppliers'
        );
    """)
    
    op.execute("""
        DELETE FROM permissions WHERE resource = 'suppliers';
    """)
