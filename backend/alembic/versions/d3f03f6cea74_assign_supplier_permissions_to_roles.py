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
    """Assign supplier permissions to roles based on PERMISSIONS.md."""
    
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


def downgrade() -> None:
    """Remove supplier permissions from roles."""
    
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'suppliers'
        );
    """)
