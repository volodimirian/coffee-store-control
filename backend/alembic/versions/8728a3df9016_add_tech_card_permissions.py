"""add_tech_card_permissions

Revision ID: 8728a3df9016
Revises: f36e2a507682
Create Date: 2026-01-02 16:52:45.090316

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8728a3df9016'
down_revision: Union[str, Sequence[str], None] = 'f36e2a507682'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tech card permissions and assign to roles."""
    
    # Create tech card permissions
    op.execute("""
        INSERT INTO permissions (name, action, resource, description, is_active, created_at)
        VALUES 
            ('view_tech_card_items', 'view', 'tech_card_items', 'View technology card items', true, NOW()),
            ('create_tech_card_items', 'create', 'tech_card_items', 'Create technology card items', true, NOW()),
            ('edit_tech_card_items', 'edit', 'tech_card_items', 'Edit technology card items', true, NOW()),
            ('delete_tech_card_items', 'delete', 'tech_card_items', 'Delete technology card items', true, NOW()),
            ('approve_tech_card_items', 'approve', 'tech_card_items', 'Approve/reject technology card items', true, NOW())
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # ADMIN gets all tech card permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'ADMIN'
        AND p.resource = 'tech_card_items'
        ON CONFLICT DO NOTHING;
    """)
    
    # BUSINESS_OWNER gets all tech card permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'BUSINESS_OWNER'
        AND p.resource = 'tech_card_items'
        ON CONFLICT DO NOTHING;
    """)
    
    # EMPLOYEE gets view and create permissions only
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
        SELECT r.id, p.id, true, NOW(), NOW()
        FROM roles r, permissions p
        WHERE r.name = 'EMPLOYEE'
        AND p.name IN ('view_tech_card_items', 'create_tech_card_items')
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove tech card permissions."""
    
    # Delete role_permissions first (foreign key constraint)
    op.execute("""
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'tech_card_items'
        );
    """)
    
    # Delete user_permissions
    op.execute("""
        DELETE FROM user_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE resource = 'tech_card_items'
        );
    """)
    
    # Delete permissions
    op.execute("""
        DELETE FROM permissions WHERE resource = 'tech_card_items';
    """)
