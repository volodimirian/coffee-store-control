"""API router for supplier management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.expenses.schemas import (
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
    SupplierListOut,
)
from app.expenses.supplier_service import SupplierService
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new supplier. User must have access to the business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier_data.business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    supplier = await SupplierService.create_supplier(
        session=session,
        supplier_data=supplier_data,
        created_by_user_id=current_user.id,
    )
    await session.commit()
    return supplier


@router.get("/business/{business_id}", response_model=SupplierListOut)
async def get_business_suppliers(
    business_id: int,
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of suppliers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of suppliers to return"),
    search: Optional[str] = Query(None, description="Search suppliers by name"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all suppliers for a business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

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

    return SupplierListOut(suppliers=[SupplierOut.model_validate(supplier) for supplier in suppliers], total=total)


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get supplier by ID."""
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Check if user has access to supplier's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this supplier",
        )

    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update supplier information. User must be able to manage the business."""
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Check if user can manage supplier's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,  # type: ignore
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this supplier",
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
    permanent: bool = False,  # Query parameter to control hard vs soft delete
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Delete supplier. Use permanent=true for hard delete, false for soft delete."""
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Check if user can manage supplier's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,  # type: ignore
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this supplier",
        )

    if permanent:
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
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted supplier. User must be able to manage the business."""
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Check if user can manage supplier's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,  # type: ignore
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this supplier",
        )

    success = await SupplierService.restore_supplier(session, supplier_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore supplier",
        )

    await session.commit()
    
    # Return updated supplier
    restored_supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    return restored_supplier


@router.get("/{supplier_id}/has-invoices")
async def check_supplier_has_invoices(
    supplier_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Check if supplier has any invoices."""
    supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # Check if user has access to supplier's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=supplier.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this supplier",
        )

    # Check invoices
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
