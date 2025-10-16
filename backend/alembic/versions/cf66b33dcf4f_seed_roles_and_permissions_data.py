"""Seed roles and permissions data

Revision ID: cf66b33dcf4f
Revises: cf9fa2be56da
Create Date: 2025-10-16 17:53:57.942568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf66b33dcf4f'
down_revision: Union[str, Sequence[str], None] = 'cf9fa2be56da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed roles and permissions data."""
    # Insert 3 core roles
    op.execute("""
        INSERT INTO roles (name, description) VALUES 
        ('ADMIN', 'System administrator with full access'),
        ('BUSINESS_OWNER', 'Business owner with management access'),
        ('EMPLOYEE', 'Regular employee with limited access')
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Insert expense tracking permissions
    op.execute("""
        INSERT INTO permissions (name, description, resource, action, is_active) VALUES 
        ('VIEW_DATA', 'View expense data', 'expenses', 'view', true),
        ('ADD_DATA', 'Add expense records', 'expenses', 'create', true),
        ('EDIT_DATA', 'Edit expense records', 'expenses', 'edit', true),
        ('MANAGE_SECTIONS', 'Manage expense sections', 'sections', 'manage', true),
        ('VIEW_TOTALS', 'View expense totals', 'expenses', 'view_totals', true),
        ('EXPORT_DATA', 'Export expense data', 'expenses', 'export', true),
        ('MANAGE_MONTHS', 'Manage month periods', 'periods', 'manage', true),
        ('VIEW_USERS', 'View users', 'users', 'view', true),
        ('MANAGE_USERS', 'Manage users', 'users', 'manage', true),
        ('VIEW_API_DOCS', 'Access API documentation', 'api', 'view_docs', true)
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Assign permissions to roles
    op.execute("""
        -- Admin gets all permissions
        INSERT INTO role_permissions (role_id, permission_id, is_active)
        SELECT r.id, p.id, true
        FROM roles r, permissions p
        WHERE r.name = 'ADMIN'
        ON CONFLICT DO NOTHING;
        
        -- Business owner permissions
        INSERT INTO role_permissions (role_id, permission_id, is_active)
        SELECT r.id, p.id, true
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER' 
        AND p.name IN ('VIEW_DATA', 'ADD_DATA', 'EDIT_DATA', 'MANAGE_SECTIONS', 'VIEW_TOTALS', 'EXPORT_DATA', 'MANAGE_MONTHS', 'VIEW_USERS', 'MANAGE_USERS')
        ON CONFLICT DO NOTHING;
        
        -- Employee permissions (basic data entry only)
        INSERT INTO role_permissions (role_id, permission_id, is_active)
        SELECT r.id, p.id, true
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE' 
        AND p.name IN ('VIEW_DATA', 'ADD_DATA')
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    pass
