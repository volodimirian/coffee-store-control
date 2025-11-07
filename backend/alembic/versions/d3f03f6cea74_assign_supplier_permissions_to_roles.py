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
    
    # Step 1: Delete user_permissions that reference old 'business' resource permissions
    op.execute("""
        DELETE FROM user_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'business'
        );
    """)
    
    # Step 2: Delete role_permissions that reference old 'business' resource permissions
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'business'
        );
    """)
    
    # Step 3: Delete old business permissions with singular 'business' resource
    op.execute("""
        DELETE FROM permissions WHERE resource = 'business';
    """)
    
    # Step 4: Create new business permissions with plural 'businesses' resource
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_businesses', 'view', 'businesses', 'View business information', true, NOW()),
            ('create_businesses', 'create', 'businesses', 'Create new business location', true, NOW()),
            ('edit_businesses', 'edit', 'businesses', 'Edit business information and settings', true, NOW()),
            ('activate_deactivate_businesses', 'activate_deactivate', 'businesses', 'Activate or deactivate business locations', true, NOW()),
            ('view_members_businesses', 'view_members', 'businesses', 'View business and its members', true, NOW()),
            ('manage_members_businesses', 'manage_members', 'businesses', 'Add/remove members, manage memberships', true, NOW()),
            ('grant_permissions_businesses', 'grant_permissions', 'businesses', 'Manage member permissions within business', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Step 5: Assign business permissions to BUSINESS_OWNER
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.name IN (
            'view_businesses',
            'create_businesses',
            'edit_businesses',
            'activate_deactivate_businesses',
            'view_members_businesses',
            'manage_members_businesses',
            'grant_permissions_businesses'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # Step 6: Assign view_members_businesses to EMPLOYEE
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name = 'view_members_businesses'
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
    
    # Remove supplier permissions from roles
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'suppliers'
        );
    """)
    
    # Remove user_permissions that reference plural 'businesses' resource permissions
    op.execute("""
        DELETE FROM user_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'businesses'
        );
    """)
    
    # Remove role_permissions that reference plural 'businesses' resource permissions
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'businesses'
        );
    """)
    
    # Delete plural 'businesses' permissions
    op.execute("""
        DELETE FROM permissions WHERE resource = 'businesses';
    """)
    
    # Restore old business permissions with singular 'business' resource
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_business', 'view', 'business', 'View business information', true, NOW()),
            ('create_business', 'create', 'business', 'Create new business location', true, NOW()),
            ('edit_business', 'edit', 'business', 'Edit business information and settings', true, NOW()),
            ('activate_deactivate_business', 'activate_deactivate', 'business', 'Activate or deactivate business locations', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Assign old business permissions to BUSINESS_OWNER
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.name IN (
            'view_business',
            'create_business',
            'edit_business',
            'activate_deactivate_business'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # Restore user permissions
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_user', 'view', 'users', 'View user information', true, NOW()),
            ('create_user', 'create', 'users', 'Create new user', true, NOW()),
            ('edit_user', 'edit', 'users', 'Edit user information', true, NOW()),
            ('activate_deactivate_user', 'activate_deactivate', 'users', 'Activate or deactivate user', true, NOW())
        ON CONFLICT DO NOTHING;
    """)
