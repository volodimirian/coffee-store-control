"""assign_supplier_permissions_to_roles

Revision ID: d3f03f6cea74
Revises: 941e69f0d13c
Create Date: 2025-11-06 11:57:06.609617

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd3f03f6cea74'
down_revision: Union[str, Sequence[str], None] = '941e69f0d13c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Assign supplier permissions to roles and update business permissions."""
    
    # ===== SUPPLIER PERMISSIONS =====
    
    # ADMIN gets all supplier permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'ADMIN'
        AND p.resource = 'suppliers'
        ON CONFLICT DO NOTHING;
    """)
    
    # BUSINESS_OWNER permissions: VIEW, CREATE, EDIT, DELETE, ACTIVATE_DEACTIVATE
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.name IN (
            'view_supplier',
            'create_supplier',
            'edit_supplier',
            'delete_supplier',
            'activate_deactivate_supplier'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # EMPLOYEE permissions: VIEW, CREATE, ACTIVATE_DEACTIVATE
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name IN (
            'view_supplier',
            'create_supplier',
            'activate_deactivate_supplier'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # ===== BUSINESS PERMISSIONS UPDATE =====
    
    # Add new business permissions: view_members_business, manage_members_business, grant_permissions_business
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_members_business', 'view_members', 'businesses', 'View business and its members', true, NOW()),
            ('manage_members_business', 'manage_members', 'businesses', 'Add/remove members, manage memberships', true, NOW()),
            ('grant_permissions_business', 'grant_permissions', 'businesses', 'Manage member permissions within business', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Rename view_business to view_members_business (update existing permission)
    op.execute("""
        UPDATE permissions 
        SET name = 'view_members_business', 
            action = 'view_members',
            description = 'View business and its members'
        WHERE name = 'view_business' AND resource = 'businesses';
    """)
    
    # Assign new business permissions to BUSINESS_OWNER
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.name IN (
            'view_members_business',
            'manage_members_business',
            'grant_permissions_business'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # Assign view_members_business to EMPLOYEE
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name = 'view_members_business'
        ON CONFLICT DO NOTHING;
    """)
    
    # ===== REMOVE USER PERMISSIONS =====
    
    # Delete all permissions for 'users' resource
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'users'
        );
    """)
    
    op.execute("""
        DELETE FROM permissions WHERE resource = 'users';
    """)


def downgrade() -> None:
    """Remove supplier permissions from roles and revert business permissions."""
    
    # Remove supplier permissions
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'suppliers'
        );
    """)
    
    # Remove new business permissions
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions 
            WHERE name IN ('view_members_business', 'manage_members_business', 'grant_permissions_business')
        );
    """)
    
    op.execute("""
        DELETE FROM permissions 
        WHERE name IN ('manage_members_business', 'grant_permissions_business');
    """)
    
    # Revert view_members_business back to view_business
    op.execute("""
        UPDATE permissions 
        SET name = 'view_business', 
            action = 'view',
            description = 'View business details'
        WHERE name = 'view_members_business' AND resource = 'businesses';
    """)
    
    # Restore user permissions (basic structure)
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_user', 'view', 'users', 'View user information', true, NOW()),
            ('create_user', 'create', 'users', 'Create new user', true, NOW()),
            ('edit_user', 'edit', 'users', 'Edit user information', true, NOW()),
            ('activate_deactivate_user', 'activate_deactivate', 'users', 'Activate or deactivate user', true, NOW())
        ON CONFLICT DO NOTHING;
    """)
