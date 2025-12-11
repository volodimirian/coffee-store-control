"""API router for supplier management endpoints."""

from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
    extract_business_id_from_supplier,
)
from app.expenses.schemas import (
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
    SupplierListOut,
)
from app.expenses.supplier_service import SupplierService

router = APIRouter()


@router.post("/", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.SUPPLIERS, Action.CREATE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Create a new supplier.
    
    Permission: create_supplier
    The auth dependency automatically:
    1. Verifies user has access to business (from supplier_data.business_id)
    2. Checks create_supplier permission
    3. Returns {"user_id": int, "business_id": int}
    """
    supplier = await SupplierService.create_supplier(
        session=session,
        supplier_data=supplier_data,
        created_by_user_id=auth["user_id"],
    )
    await session.commit()
    return supplier


@router.get("/business/{business_id}", response_model=SupplierListOut)
async def get_business_suppliers(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.SUPPLIERS, Action.VIEW))],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of suppliers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of suppliers to return"),
    search: Optional[str] = Query(None, description="Search suppliers by name"),
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Get all suppliers for a business.
    
    Permission: view_supplier
    Business access is automatically checked via business_id in path.
    """
    if search:
        suppliers = await SupplierService.search_suppliers(
            session=session,
            business_id=business_id,
            search_query=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        suppliers = await SupplierService.get_suppliers_by_business(
            session=session,
            business_id=business_id,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    total = await SupplierService.count_suppliers_by_business(
        session=session,
        business_id=business_id,
        is_active=is_active,
    )

    return SupplierListOut(
        suppliers=[SupplierOut.model_validate(supplier) for supplier in suppliers],
        total=total
    )


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Get supplier by ID.
    
    Permission: view_supplier
    Uses custom extractor to get business_id from supplier_id.
    """
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Update supplier information.
    
    Permission: edit_supplier
    """
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    updated_supplier = await SupplierService.update_supplier(
        session=session,
        supplier_id=supplier_id,
        supplier_data=supplier_data,
    )
    if not updated_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    await session.commit()
    return updated_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
    permanent: bool = False,
):
    """
    Delete supplier (soft delete = deactivate).
    For permanent delete, requires delete_suppliers permission.
    
    Permission: activate_deactivate_suppliers (soft), delete_suppliers (permanent)
    """
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # For permanent delete, check DELETE permission
    if permanent:
        from app.core.permissions import check_user_permission
        from app.core.error_codes import ErrorCode, create_error_response
        
        has_delete_perm = await check_user_permission(
            user_id=auth["user_id"],
            permission_name="delete_suppliers",
            db=session,
            business_id=getattr(supplier, 'business_id'),
        )
        if not has_delete_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=create_error_response(
                    error_code=ErrorCode.PERMISSION_DENIED,
                    detail="You don't have permission to permanently delete suppliers"
                ),
            )
        success = await SupplierService.hard_delete_supplier(session, supplier_id)
    else:
        success = await SupplierService.delete_supplier(session, supplier_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete supplier",
        )

    await session.commit()


@router.post("/{supplier_id}/restore", response_model=SupplierOut)
async def restore_supplier(
    supplier_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Restore soft-deleted supplier.
    
    Permission: activate_deactivate_supplier
    """
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    success = await SupplierService.restore_supplier(session, supplier_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore supplier",
        )

    await session.commit()
    
    restored_supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    return restored_supplier


@router.get("/{supplier_id}/has-invoices")
async def check_supplier_has_invoices(
    supplier_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUPPLIERS,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_supplier
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Check if supplier has any invoices.
    
    Permission: view_supplier
    """
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    from sqlalchemy import select, func
    from app.expenses.models import Invoice
    
    invoice_count_result = await session.execute(
        select(func.count(Invoice.id)).where(Invoice.supplier_id == supplier_id)
    )
    invoice_count = invoice_count_result.scalar() or 0
    
    return {
        "has_invoices": invoice_count > 0,
        "invoice_count": invoice_count
    }
