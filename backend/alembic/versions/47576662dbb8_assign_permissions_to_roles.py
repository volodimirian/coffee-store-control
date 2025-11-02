"""assign_permissions_to_roles

Revision ID: 47576662dbb8
Revises: a0d42252cae5
Create Date: 2025-11-01 23:01:10.603865

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '47576662dbb8'
down_revision: Union[str, Sequence[str], None] = 'a0d42252cae5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Assign permissions to roles based on PERMISSIONS.md."""
    
    # Clear existing role_permissions
    op.execute("DELETE FROM role_permissions;")
    
    # ADMIN gets all permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'ADMIN'
        ON CONFLICT DO NOTHING;
    """)
    
    # BUSINESS_OWNER permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.name IN (
            -- Users (all)
            'view_user',
            'create_user',
            'edit_user',
            'assign_user_to_business',
            'grant_user_permissions',
            'activate_deactivate_user',
            
            -- Business (all except VIEW which is shared with EMPLOYEE)
            'view_business',
            'create_business',
            'edit_business',
            'activate_deactivate_business',
            
            -- Categories (all except VIEW which is shared with EMPLOYEE)
            'view_category',
            'create_category',
            'edit_category',
            'activate_deactivate_category',
            'delete_category',
            
            -- Subcategories (all except VIEW which is shared with EMPLOYEE)
            'view_subcategory',
            'create_subcategory',
            'edit_subcategory',
            'activate_deactivate_subcategory',
            'delete_subcategory',
            
            -- Units (all except VIEW which is shared with EMPLOYEE)
            'view_unit',
            'create_unit',
            'edit_unit',
            'activate_deactivate_unit',
            'delete_unit',
            
            -- Invoices (all)
            'view_invoice',
            'create_invoice',
            'edit_invoice',
            'delete_invoice',
            'approve_invoice',
            'reject_invoice'
        )
        ON CONFLICT DO NOTHING;
    """)
    
    # EMPLOYEE permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name IN (
            -- Business - VIEW only
            'view_business',
            
            -- Categories - VIEW only
            'view_category',
            
            -- Subcategories - VIEW and ACTIVATE_DEACTIVATE
            'view_subcategory',
            'activate_deactivate_subcategory',
            
            -- Units - VIEW, EDIT, ACTIVATE_DEACTIVATE
            'view_unit',
            'edit_unit',
            'activate_deactivate_unit',
            
            -- Invoices - VIEW, CREATE, EDIT
            'view_invoice',
            'create_invoice',
            'edit_invoice'
        )
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove role permissions."""
    op.execute("DELETE FROM role_permissions;")
