"""Add OFD Integration permissions

Revision ID: d8d22509ee76
Revises: 7624bf70ffc5
Create Date: 2026-01-31 09:05:29.587299

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd8d22509ee76'
down_revision: Union[str, Sequence[str], None] = '7624bf70ffc5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add OFD Integration permissions and assign to roles."""
    
    # Create OFD connections permissions
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_ofd_connections', 'view', 'ofd_connections', 'View OFD provider connections', true, NOW()),
            ('create_ofd_connections', 'create', 'ofd_connections', 'Create OFD provider connections', true, NOW()),
            ('edit_ofd_connections', 'edit', 'ofd_connections', 'Edit OFD provider connections', true, NOW()),
            ('delete_ofd_connections', 'delete', 'ofd_connections', 'Delete OFD provider connections', true, NOW()),
            ('sync_ofd_connections', 'sync', 'ofd_connections', 'Manually sync data from OFD provider', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Create product mappings permissions
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_product_mappings', 'view', 'product_mappings', 'View OFD product mappings', true, NOW()),
            ('create_product_mappings', 'create', 'product_mappings', 'Create OFD product mappings', true, NOW()),
            ('edit_product_mappings', 'edit', 'product_mappings', 'Edit OFD product mappings', true, NOW()),
            ('delete_product_mappings', 'delete', 'product_mappings', 'Delete OFD product mappings', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Create sales permissions
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_sales', 'view', 'sales', 'View sales and receipts from OFD', true, NOW()),
            ('reprocess_sales', 'reprocess', 'sales', 'Reprocess failed sales', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # ADMIN gets all OFD permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'ADMIN'
        AND p.resource IN ('ofd_connections', 'product_mappings', 'sales')
        ON CONFLICT DO NOTHING;
    """)
    
    # BUSINESS_OWNER gets all OFD permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.resource IN ('ofd_connections', 'product_mappings', 'sales')
        ON CONFLICT DO NOTHING;
    """)
    
    # EMPLOYEE gets view permissions only
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name IN ('view_ofd_connections', 'view_product_mappings', 'view_sales')
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove OFD Integration permissions."""
    
    # Delete role_permissions first (foreign key constraint)
    op.execute("""
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource IN ('ofd_connections', 'product_mappings', 'sales')
        );
    """)
    
    # Delete user_permissions
    op.execute("""
        DELETE FROM user_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource IN ('ofd_connections', 'product_mappings', 'sales')
        );
    """)
    
    # Delete permissions
    op.execute("""
        DELETE FROM permissions WHERE resource IN ('ofd_connections', 'product_mappings', 'sales');
    """)
