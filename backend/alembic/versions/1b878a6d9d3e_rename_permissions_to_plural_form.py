"""rename_permissions_to_plural_form

Revision ID: 1b878a6d9d3e
Revises: d3f03f6cea74
Create Date: 2025-11-07 15:29:39.182068

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '1b878a6d9d3e'
down_revision: Union[str, Sequence[str], None] = 'd3f03f6cea74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename all permission names to use plural resource form for consistency.
    
    Changes:
    - categories: view_category -> view_categories, etc.
    - subcategories: view_subcategory -> view_subcategories, etc.
    - suppliers: view_supplier -> view_suppliers, etc.
    - invoices: view_invoice -> view_invoices, etc.
    - units: view_unit -> view_units, etc.
    """
    
    # CATEGORIES: category -> categories
    op.execute("""
        UPDATE permissions 
        SET name = 'view_categories'
        WHERE name = 'view_category' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_categories'
        WHERE name = 'create_category' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_categories'
        WHERE name = 'edit_category' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_categories'
        WHERE name = 'delete_category' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_categories'
        WHERE name = 'activate_deactivate_category' AND resource = 'categories';
    """)
    
    # SUBCATEGORIES: subcategory -> subcategories
    op.execute("""
        UPDATE permissions 
        SET name = 'view_subcategories'
        WHERE name = 'view_subcategory' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_subcategories'
        WHERE name = 'create_subcategory' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_subcategories'
        WHERE name = 'edit_subcategory' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_subcategories'
        WHERE name = 'delete_subcategory' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_subcategories'
        WHERE name = 'activate_deactivate_subcategory' AND resource = 'subcategories';
    """)
    
    # SUPPLIERS: supplier -> suppliers
    op.execute("""
        UPDATE permissions 
        SET name = 'view_suppliers'
        WHERE name = 'view_supplier' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_suppliers'
        WHERE name = 'create_supplier' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_suppliers'
        WHERE name = 'edit_supplier' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_suppliers'
        WHERE name = 'delete_supplier' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_suppliers'
        WHERE name = 'activate_deactivate_supplier' AND resource = 'suppliers';
    """)
    
    # INVOICES: invoice -> invoices
    op.execute("""
        UPDATE permissions 
        SET name = 'view_invoices'
        WHERE name = 'view_invoice' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_invoices'
        WHERE name = 'create_invoice' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_invoices'
        WHERE name = 'edit_invoice' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_invoices'
        WHERE name = 'delete_invoice' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'approve_invoices'
        WHERE name = 'approve_invoice' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'reject_invoices'
        WHERE name = 'reject_invoice' AND resource = 'invoices';
    """)
    
    # UNITS: unit -> units
    op.execute("""
        UPDATE permissions 
        SET name = 'view_units'
        WHERE name = 'view_unit' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_units'
        WHERE name = 'create_unit' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_units'
        WHERE name = 'edit_unit' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_units'
        WHERE name = 'delete_unit' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_units'
        WHERE name = 'activate_deactivate_unit' AND resource = 'units';
    """)


def downgrade() -> None:
    """Revert permission names back to singular resource form."""
    
    # CATEGORIES: categories -> category
    op.execute("""
        UPDATE permissions 
        SET name = 'view_category'
        WHERE name = 'view_categories' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_category'
        WHERE name = 'create_categories' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_category'
        WHERE name = 'edit_categories' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_category'
        WHERE name = 'delete_categories' AND resource = 'categories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_category'
        WHERE name = 'activate_deactivate_categories' AND resource = 'categories';
    """)
    
    # SUBCATEGORIES: subcategories -> subcategory
    op.execute("""
        UPDATE permissions 
        SET name = 'view_subcategory'
        WHERE name = 'view_subcategories' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_subcategory'
        WHERE name = 'create_subcategories' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_subcategory'
        WHERE name = 'edit_subcategories' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_subcategory'
        WHERE name = 'delete_subcategories' AND resource = 'subcategories';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_subcategory'
        WHERE name = 'activate_deactivate_subcategories' AND resource = 'subcategories';
    """)
    
    # SUPPLIERS: suppliers -> supplier
    op.execute("""
        UPDATE permissions 
        SET name = 'view_supplier'
        WHERE name = 'view_suppliers' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_supplier'
        WHERE name = 'create_suppliers' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_supplier'
        WHERE name = 'edit_suppliers' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_supplier'
        WHERE name = 'delete_suppliers' AND resource = 'suppliers';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_supplier'
        WHERE name = 'activate_deactivate_suppliers' AND resource = 'suppliers';
    """)
    
    # INVOICES: invoices -> invoice
    op.execute("""
        UPDATE permissions 
        SET name = 'view_invoice'
        WHERE name = 'view_invoices' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_invoice'
        WHERE name = 'create_invoices' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_invoice'
        WHERE name = 'edit_invoices' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_invoice'
        WHERE name = 'delete_invoices' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'approve_invoice'
        WHERE name = 'approve_invoices' AND resource = 'invoices';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'reject_invoice'
        WHERE name = 'reject_invoices' AND resource = 'invoices';
    """)
    
    # UNITS: units -> unit
    op.execute("""
        UPDATE permissions 
        SET name = 'view_unit'
        WHERE name = 'view_units' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'create_unit'
        WHERE name = 'create_units' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'edit_unit'
        WHERE name = 'edit_units' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'delete_unit'
        WHERE name = 'delete_units' AND resource = 'units';
    """)
    
    op.execute("""
        UPDATE permissions 
        SET name = 'activate_deactivate_unit'
        WHERE name = 'activate_deactivate_units' AND resource = 'units';
    """)

