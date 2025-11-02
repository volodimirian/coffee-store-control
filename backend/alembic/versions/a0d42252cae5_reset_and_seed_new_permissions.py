"""reset_and_seed_new_permissions

Revision ID: a0d42252cae5
Revises: b8bd5e24ff91
Create Date: 2025-11-01 22:28:16.734320

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a0d42252cae5'
down_revision: Union[str, Sequence[str], None] = 'b8bd5e24ff91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Reset and seed new permissions structure."""
    
    # Step 1: Delete all existing permission relationships
    op.execute("DELETE FROM user_permissions;")
    op.execute("DELETE FROM role_permissions;")
    
    # Step 2: Delete all existing permissions
    op.execute("DELETE FROM permissions;")
    
    # Step 3: Insert new permissions based on PERMISSIONS.md
    op.execute("""
        INSERT INTO permissions (name, description, resource, action, is_active, created_at) VALUES 
        
        -- Users permissions
        ('view_user', 'View user information and list users', 'users', 'view', true, NOW()),
        ('create_user', 'Create new users in the system', 'users', 'create', true, NOW()),
        ('edit_user', 'Edit existing user information', 'users', 'edit', true, NOW()),
        ('assign_user_to_business', 'Assign users to business locations', 'users', 'assign_to_business', true, NOW()),
        ('grant_user_permissions', 'Grant permissions to users', 'users', 'grant_permissions', true, NOW()),
        ('activate_deactivate_user', 'Activate or deactivate user accounts', 'users', 'activate_deactivate', true, NOW()),
        
        -- Business/Location permissions
        ('view_business', 'View business information and details', 'business', 'view', true, NOW()),
        ('create_business', 'Create new business locations', 'business', 'create', true, NOW()),
        ('edit_business', 'Edit business information and settings', 'business', 'edit', true, NOW()),
        ('activate_deactivate_business', 'Activate or deactivate business locations', 'business', 'activate_deactivate', true, NOW()),
        
        -- Categories permissions
        ('view_category', 'View expense categories', 'categories', 'view', true, NOW()),
        ('create_category', 'Create new expense categories', 'categories', 'create', true, NOW()),
        ('edit_category', 'Edit existing expense categories', 'categories', 'edit', true, NOW()),
        ('activate_deactivate_category', 'Activate or deactivate expense categories', 'categories', 'activate_deactivate', true, NOW()),
        ('delete_category', 'Permanently delete expense categories', 'categories', 'delete', true, NOW()),
        
        -- Subcategories permissions
        ('view_subcategory', 'View expense subcategories', 'subcategories', 'view', true, NOW()),
        ('create_subcategory', 'Create new expense subcategories', 'subcategories', 'create', true, NOW()),
        ('edit_subcategory', 'Edit existing expense subcategories', 'subcategories', 'edit', true, NOW()),
        ('activate_deactivate_subcategory', 'Activate or deactivate expense subcategories', 'subcategories', 'activate_deactivate', true, NOW()),
        ('delete_subcategory', 'Permanently delete expense subcategories', 'subcategories', 'delete', true, NOW()),
        
        -- Units permissions
        ('view_unit', 'View measurement units', 'units', 'view', true, NOW()),
        ('create_unit', 'Create new measurement units', 'units', 'create', true, NOW()),
        ('edit_unit', 'Edit existing measurement units', 'units', 'edit', true, NOW()),
        ('activate_deactivate_unit', 'Activate or deactivate measurement units', 'units', 'activate_deactivate', true, NOW()),
        ('delete_unit', 'Permanently delete measurement units', 'units', 'delete', true, NOW()),
        
        -- Invoices permissions
        ('view_invoice', 'View invoices and invoice details', 'invoices', 'view', true, NOW()),
        ('create_invoice', 'Create new invoices', 'invoices', 'create', true, NOW()),
        ('edit_invoice', 'Edit existing invoices', 'invoices', 'edit', true, NOW()),
        ('delete_invoice', 'Delete invoices', 'invoices', 'delete', true, NOW()),
        ('approve_invoice', 'Approve invoices for processing', 'invoices', 'approve', true, NOW()),
        ('reject_invoice', 'Reject invoices', 'invoices', 'reject', true, NOW()),
        
        -- API Documentation
        ('view_api_docs', 'Access and view API documentation', 'api', 'view_docs', true, NOW())
        
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade() -> None:
    """Downgrade schema - restore old permissions."""
    
    # Delete new permissions
    op.execute("DELETE FROM user_permissions;")
    op.execute("DELETE FROM role_permissions;")
    op.execute("DELETE FROM permissions;")
    
    # Restore old permissions structure (from previous migration)
    op.execute("""
        INSERT INTO permissions (name, description, resource, action, is_active, created_at) VALUES 
        ('VIEW_DATA', 'View expense data', 'expenses', 'view', true, NOW()),
        ('ADD_DATA', 'Add expense records', 'expenses', 'create', true, NOW()),
        ('EDIT_DATA', 'Edit expense records', 'expenses', 'edit', true, NOW()),
        ('MANAGE_SECTIONS', 'Manage expense sections', 'sections', 'manage', true, NOW()),
        ('VIEW_TOTALS', 'View expense totals', 'expenses', 'view_totals', true, NOW()),
        ('EXPORT_DATA', 'Export expense data', 'expenses', 'export', true, NOW()),
        ('MANAGE_MONTHS', 'Manage month periods', 'periods', 'manage', true, NOW()),
        ('VIEW_USERS', 'View users', 'users', 'view', true, NOW()),
        ('MANAGE_USERS', 'Manage users', 'users', 'manage', true, NOW()),
        ('VIEW_API_DOCS', 'Access API documentation', 'api', 'view_docs', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
