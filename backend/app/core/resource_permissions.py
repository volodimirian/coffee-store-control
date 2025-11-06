"""Resource-based permission middleware for automatic permission checking."""

from typing import Annotated, Optional
from collections.abc import Callable, Awaitable
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user_id, get_db_dep
from app.core.permissions import check_user_permission
from app.core.error_codes import ErrorCode, create_error_response
from app.businesses.service import BusinessService


# Resource types mapping
class Resource:
    """Resource type constants.
    
    Note: Names match permission names in database, not model names!
    - CATEGORIES -> ExpenseSection in code (expense_sections table)
    - SUBCATEGORIES -> ExpenseCategory in code (expense_categories table)
    """
    SUPPLIERS = "suppliers"
    INVOICES = "invoices"
    CATEGORIES = "categories"  # ExpenseSection in code
    SUBCATEGORIES = "subcategories"  # ExpenseCategory in code
    UNITS = "units"
    BUSINESSES = "business"
    USERS = "users"


# Action types mapping
class Action:
    """Action type constants."""
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    ACTIVATE_DEACTIVATE = "activate_deactivate"
    APPROVE = "approve"
    REJECT = "reject"
    ASSIGN_TO_BUSINESS = "assign_to_business"
    GRANT_PERMISSIONS = "grant_permissions"


def get_permission_name(resource: str, action: str) -> str:
    """Generate permission name from resource and action.
    
    Examples:
        get_permission_name("suppliers", "view") -> "view_supplier"
        get_permission_name("invoices", "create") -> "create_invoice"
    """
    # Handle special cases
    resource_mapping = {
        "business": "business",
        "categories": "category",  # ExpenseSection -> category permission
        "subcategories": "subcategory",  # ExpenseCategory -> subcategory permission
        "units": "unit",
        "suppliers": "supplier",
        "invoices": "invoice",
        "users": "user",
    }
    
    resource_singular = resource_mapping.get(resource, resource.rstrip('s'))
    
    # Action goes first in our naming convention
    return f"{action}_{resource_singular}"


async def extract_business_id_from_request(request: Request) -> Optional[int]:
    """Extract business_id from request path parameters or body.
    
    Priority:
    1. Path parameter: business_id
    2. Path parameter via related resource (invoice_id, supplier_id, etc.)
    3. Request body
    """
    # Try to get business_id directly from path
    if "business_id" in request.path_params:
        return int(request.path_params["business_id"])
    
    # For other resources, we might need to fetch the business_id
    # This will be handled in the specific dependency
    return None


class ResourcePermissionChecker:
    """Dependency class for checking resource-based permissions."""
    
    def __init__(
        self,
        resource: str,
        action: str,
        business_id_extractor: Optional[Callable[[Request, AsyncSession], Awaitable[Optional[int]]]] = None,
        skip_business_check: bool = False,
    ):
        """
        Initialize resource permission checker.
        
        Args:
            resource: Resource type (e.g., "suppliers", "invoices")
            action: Action type (e.g., "view", "create", "edit")
            business_id_extractor: Optional function to extract business_id from request/params
            skip_business_check: Skip business membership check (for global operations)
        """
        self.resource = resource
        self.action = action
        self.permission_name = get_permission_name(resource, action)
        self.business_id_extractor = business_id_extractor
        self.skip_business_check = skip_business_check
    
    async def __call__(
        self,
        request: Request,
        user_id: Annotated[str, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db_dep)],
    ) -> dict:
        """
        Check if user has permission for the resource action.
        
        Returns:
            dict with user_id and business_id for use in endpoint
        """
        user_id_int = int(user_id)
        
        # Extract business_id
        business_id = None
        if self.business_id_extractor:
            business_id = await self.business_id_extractor(request, db)
        elif not self.skip_business_check:
            business_id = await extract_business_id_from_request(request)
        
        # Check business membership first (if applicable)
        if business_id and not self.skip_business_check:
            has_access = await BusinessService.can_user_access_business(
                session=db,
                user_id=user_id_int,
                business_id=business_id,
            )
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=create_error_response(
                        error_code=ErrorCode.BUSINESS_ACCESS_DENIED,
                        detail="Access denied to this business"
                    ),
                )
        
        # Check resource permission
        has_permission = await check_user_permission(
            user_id=user_id_int,
            permission_name=self.permission_name,
            db=db,
            business_id=business_id,
        )
        
        if not has_permission:
            # Map action to appropriate error code
            error_code_map = {
                Action.VIEW: ErrorCode.PERMISSION_VIEW_DENIED,
                Action.CREATE: ErrorCode.PERMISSION_CREATE_DENIED,
                Action.EDIT: ErrorCode.PERMISSION_EDIT_DENIED,
                Action.DELETE: ErrorCode.PERMISSION_DELETE_DENIED,
                Action.ACTIVATE_DEACTIVATE: ErrorCode.PERMISSION_ACTIVATE_DEACTIVATE_DENIED,
            }
            
            error_code = error_code_map.get(self.action, ErrorCode.PERMISSION_DENIED)
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=create_error_response(
                    error_code=error_code,
                    detail=f"You don't have permission to {self.action} {self.resource}"
                ),
            )
        
        return {
            "user_id": user_id_int,
            "business_id": business_id,
        }


# Convenience functions for creating permission checkers

def require_resource_permission(
    resource: str,
    action: str,
    business_id_extractor: Optional[Callable[[Request, AsyncSession], Awaitable[Optional[int]]]] = None,
    skip_business_check: bool = False,
):
    """Create a resource permission checker dependency.
    
    Usage in router:
        @router.get("/suppliers/{supplier_id}")
        async def get_supplier(
            supplier_id: int,
            auth: Annotated[dict, Depends(require_resource_permission(Resource.SUPPLIERS, Action.VIEW))],
            session: AsyncSession = Depends(get_db_dep),
        ):
            # auth contains {"user_id": int, "business_id": Optional[int]}
            ...
    """
    return ResourcePermissionChecker(
        resource=resource,
        action=action,
        business_id_extractor=business_id_extractor,
        skip_business_check=skip_business_check,
    )


# Specific extractors for complex cases

async def extract_business_id_from_supplier(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from supplier_id in path."""
    supplier_id = request.path_params.get("supplier_id")
    if not supplier_id:
        # Try to get from request body for create operations
        try:
            body = await request.json()
            return body.get("business_id")
        except Exception:
            return None
    
    # Get supplier to find business_id
    from app.expenses.supplier_service import SupplierService
    supplier = await SupplierService.get_supplier_by_id(db, int(supplier_id))
    return getattr(supplier, 'business_id', None) if supplier else None


async def extract_business_id_from_invoice(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from invoice_id in path."""
    invoice_id = request.path_params.get("invoice_id")
    if not invoice_id:
        # Try to get from request body for create operations
        try:
            body = await request.json()
            return body.get("business_id")
        except Exception:
            return None
    
    # Get invoice to find business_id
    from app.expenses.invoice_service import InvoiceService
    invoice = await InvoiceService.get_invoice_by_id(db, int(invoice_id))
    return getattr(invoice, 'business_id', None) if invoice else None


async def extract_business_id_from_invoice_item(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from item_id in path (through invoice)."""
    item_id = request.path_params.get("item_id")
    if not item_id:
        return None
    
    # Get item to find invoice_id, then get business_id from invoice
    from app.expenses.invoice_service import InvoiceItemService, InvoiceService
    item = await InvoiceItemService.get_invoice_item_by_id(db, int(item_id))
    if not item:
        return None
    
    invoice = await InvoiceService.get_invoice_by_id(db, getattr(item, 'invoice_id'))
    return getattr(invoice, 'business_id', None) if invoice else None


async def extract_business_id_from_section(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from section_id in path.
    
    Note: ExpenseSection is called 'category' in permissions.
    """
    section_id = request.path_params.get("section_id")
    if not section_id:
        # Try to get from request body for create operations
        try:
            body = await request.json()
            return body.get("business_id")
        except Exception:
            return None
    
    # Get section to find business_id
    from app.expenses.expense_section_service import ExpenseSectionService
    section = await ExpenseSectionService.get_section_by_id(db, int(section_id))
    return getattr(section, 'business_id', None) if section else None


async def extract_business_id_from_category(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from category_id in path.
    
    Note: ExpenseCategory is called 'subcategory' in permissions.
    """
    category_id = request.path_params.get("category_id")
    if not category_id:
        # Try to get section_id from request body for create operations
        try:
            body = await request.json()
            section_id = body.get("section_id")
            if section_id:
                from app.expenses.expense_section_service import ExpenseSectionService
                section = await ExpenseSectionService.get_section_by_id(db, section_id)
                return getattr(section, 'business_id', None) if section else None
            # Fallback to direct business_id in body
            return body.get("business_id")
        except Exception:
            return None
    
    # Get category to find business_id (category has business_id directly)
    from app.expenses.expense_category_service import ExpenseCategoryService
    category = await ExpenseCategoryService.get_category_by_id(db, int(category_id))
    return getattr(category, 'business_id', None) if category else None


async def extract_business_id_from_unit(request: Request, db: AsyncSession) -> Optional[int]:
    """Extract business_id from unit_id in path."""
    unit_id = request.path_params.get("unit_id")
    if not unit_id:
        # Try to get from request body for create operations
        try:
            body = await request.json()
            return body.get("business_id")
        except Exception:
            return None
    
    # Get unit to find business_id
    from app.expenses.unit_service import UnitService
    unit = await UnitService.get_unit_by_id(db, int(unit_id))
    return getattr(unit, 'business_id', None) if unit else None
