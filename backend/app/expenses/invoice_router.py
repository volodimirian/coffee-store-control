"""API router for invoice management endpoints."""

from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.expenses.schemas import (
    InvoiceCreate,
    InvoiceOut,
    InvoiceUpdate,
    InvoiceListOut,
    InvoiceItemCreate,
    InvoiceItemOut,
    InvoiceItemUpdate,
)
from app.expenses.models import InvoiceStatus
from app.expenses.invoice_service import InvoiceService, InvoiceItemService
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new invoice. User must have access to the business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice_data.business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    invoice = await InvoiceService.create_invoice(
        session=session,
        invoice_data=invoice_data,
        created_by_user_id=current_user.id,
    )
    await session.commit()
    return invoice


@router.get("/business/{business_id}", response_model=InvoiceListOut)
async def get_business_invoices(
    business_id: int,
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    paid_status: Optional[InvoiceStatus] = Query(None, description="Filter by payment status"),
    date_from: Optional[datetime] = Query(None, description="Filter invoices from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter invoices to this date"),
    skip: int = Query(0, ge=0, description="Number of invoices to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of invoices to return"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all invoices for a specific business with optional filtering."""
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

    invoices = await InvoiceService.get_invoices_by_business(
        session=session,
        business_id=business_id,
        supplier_id=supplier_id,
        paid_status=paid_status,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    
    total = await InvoiceService.count_invoices_by_business(
        session=session,
        business_id=business_id,
        paid_status=paid_status,
    )

    return InvoiceListOut(invoices=[InvoiceOut.model_validate(invoice) for invoice in invoices], total=total)


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    load_items: bool = Query(False, description="Load invoice items"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get invoice by ID."""
    invoice = await InvoiceService.get_invoice_by_id(
        session=session,
        invoice_id=invoice_id,
        load_items=load_items,
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    # Type: ignore для SQLAlchemy Column[int] -> int автоконвертации
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update invoice information."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    updated_invoice = await InvoiceService.update_invoice(
        session=session,
        invoice_id=invoice_id,
        invoice_data=invoice_data,
    )
    await session.commit()
    return updated_invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Delete invoice."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    success = await InvoiceService.delete_invoice(session=session, invoice_id=invoice_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    
    await session.commit()


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceOut)
async def mark_invoice_as_paid(
    invoice_id: int,
    paid_date: Optional[datetime] = None,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Mark invoice as paid."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    updated_invoice = await InvoiceService.mark_invoice_as_paid(
        session=session,
        invoice_id=invoice_id,
        paid_date=paid_date,
    )
    await session.commit()
    return updated_invoice


@router.post("/{invoice_id}/mark-cancelled", response_model=InvoiceOut)
async def mark_invoice_as_cancelled(
    invoice_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Mark invoice as cancelled."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    updated_invoice = await InvoiceService.mark_invoice_as_cancelled(
        session=session,
        invoice_id=invoice_id,
    )
    await session.commit()
    return updated_invoice


@router.get("/business/{business_id}/search", response_model=InvoiceListOut)
async def search_invoices(
    business_id: int,
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of invoices to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of invoices to return"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Search invoices by invoice number or supplier name."""
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

    invoices = await InvoiceService.search_invoices(
        session=session,
        business_id=business_id,
        search_query=q,
        skip=skip,
        limit=limit,
    )

    total = len(invoices)  # For search, we return actual count
    return InvoiceListOut(invoices=[InvoiceOut.model_validate(invoice) for invoice in invoices], total=total)


# Invoice Items endpoints
@router.post("/{invoice_id}/items", response_model=InvoiceItemOut, status_code=status.HTTP_201_CREATED)
async def create_invoice_item(
    invoice_id: int,
    item_data: InvoiceItemCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new invoice item."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    # Ensure invoice_id matches
    item_data.invoice_id = invoice_id

    item = await InvoiceItemService.create_invoice_item(
        session=session,
        item_data=item_data,
    )
    
    # Recalculate invoice total
    await InvoiceItemService.recalculate_invoice_total(session, invoice_id)
    
    await session.commit()
    return item


@router.get("/{invoice_id}/items", response_model=List[InvoiceItemOut])
async def get_invoice_items(
    invoice_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all items for an invoice."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    items = await InvoiceItemService.get_items_by_invoice(
        session=session,
        invoice_id=invoice_id,
    )
    return items


@router.put("/items/{item_id}", response_model=InvoiceItemOut)
async def update_invoice_item(
    item_id: int,
    item_data: InvoiceItemUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update invoice item."""
    # Get item first to check access
    item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    # Get invoice to check business access
    invoice = await InvoiceService.get_invoice_by_id(session, item.invoice_id)  # type: ignore
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    updated_item = await InvoiceItemService.update_invoice_item(
        session=session,
        item_id=item_id,
        item_data=item_data,
    )
    
    # Recalculate invoice total
    await InvoiceItemService.recalculate_invoice_total(session, item.invoice_id)  # type: ignore
    
    await session.commit()
    return updated_item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice_item(
    item_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Delete invoice item."""
    # Get item first to check access
    item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    # Get invoice to check business access
    invoice = await InvoiceService.get_invoice_by_id(session, item.invoice_id)  # type: ignore
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=invoice.business_id,  # type: ignore
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    success = await InvoiceItemService.delete_invoice_item(session=session, item_id=item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )
    
    # Recalculate invoice total
    await InvoiceItemService.recalculate_invoice_total(session, item.invoice_id)  # type: ignore
    
    await session.commit()
