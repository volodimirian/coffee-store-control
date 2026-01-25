"""API router for invoice management endpoints."""

from typing import Optional, List, Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
    extract_business_id_from_invoice,
)
from app.expenses.schemas import (
    InvoiceCreate,
    InvoiceOut,
    InvoiceUpdate,
    InvoiceListOut,
    InvoiceItemCreate,
    InvoiceItemOut,
    InvoiceItemOutWithConversion,
    InvoiceItemUpdate,
)
from app.expenses.models import InvoiceStatus
from app.expenses.invoice_service import InvoiceService, InvoiceItemService

router = APIRouter()


@router.post("/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.INVOICES, Action.CREATE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create a new invoice. User must have create_invoice permission."""
    invoice = await InvoiceService.create_invoice(
        session=session,
        invoice_data=invoice_data,
        created_by_user_id=auth["user_id"],
    )
    await session.commit()
    return invoice


@router.get("/business/{business_id}", response_model=InvoiceListOut)
async def get_business_invoices(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.INVOICES, Action.VIEW))],
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    paid_status: Optional[InvoiceStatus] = Query(None, description="Filter by payment status"),
    date_from: Optional[datetime] = Query(None, description="Filter invoices from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter invoices to this date"),
    skip: int = Query(0, ge=0, description="Number of invoices to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of invoices to return"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all invoices for a specific business. User must have view_invoice permission."""
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    load_items: bool = Query(False, description="Load invoice items"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get invoice by ID. User must have view_invoice permission."""
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

    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update invoice information. User must have edit_invoice permission."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.DELETE,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Delete invoice. User must have delete_invoice permission."""
    # Get invoice first to check access
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.APPROVE,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    paid_date: Optional[datetime] = None,
    session: AsyncSession = Depends(get_db_dep),
):
    """Mark invoice as paid. User must have approve_invoice permission."""
    # Get invoice first to check it exists
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.REJECT,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Mark invoice as cancelled. User must have reject_invoice permission."""
    # Get invoice first to check it exists
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(Resource.INVOICES, Action.VIEW))],
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of invoices to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of invoices to return"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Search invoices by invoice number or supplier name."""
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create a new invoice item."""
    # Get invoice first to check it exists
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
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


@router.get("/{invoice_id}/items", response_model=List[InvoiceItemOutWithConversion])
async def get_invoice_items(
    invoice_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    convert_to_category_unit: bool = False,
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Get all items for an invoice.
    
    Args:
        invoice_id: ID of the invoice
        convert_to_category_unit: If True, convert quantities to category's default unit
    """
    # Get invoice first to check it exists
    invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    items = await InvoiceItemService.get_items_by_invoice(
        session=session,
        invoice_id=invoice_id,
    )
    
    # If conversion requested, convert quantities to category default units
    if convert_to_category_unit:
        from app.expenses.inventory_balance_service import InventoryBalanceService
        from app.expenses.models import ExpenseCategory
        from sqlalchemy import select
        
        converted_items = []
        for item in items:
            # Get category to know default unit
            category_result = await session.execute(
                select(ExpenseCategory).where(ExpenseCategory.id == item.category_id)
            )
            category = category_result.scalars().first()
            
            if not category:
                # If category not found, return item as-is
                converted_items.append(InvoiceItemOutWithConversion(**item.__dict__))
                continue
            
            default_unit_id = getattr(category, 'default_unit_id')
            item_unit_id = getattr(item, 'unit_id')
            item_quantity = getattr(item, 'quantity')
            
            # Convert if units are different
            if item_unit_id != default_unit_id:
                converted_quantity = await InventoryBalanceService._convert_quantity_to_target_unit(
                    session=session,
                    quantity=item_quantity,
                    from_unit_id=item_unit_id,
                    to_unit_id=default_unit_id,
                )
                
                # Create extended item with conversion info
                item_dict = {**item.__dict__}
                item_dict['converted_quantity'] = converted_quantity
                item_dict['original_unit_id'] = item_unit_id
                item_dict['original_quantity'] = item_quantity
                item_dict['invoice_number'] = getattr(invoice, 'invoice_number', None)
                converted_items.append(InvoiceItemOutWithConversion(**item_dict))
            else:
                # Same unit, no conversion needed
                item_dict = {**item.__dict__}
                item_dict['converted_quantity'] = item_quantity
                item_dict['original_unit_id'] = None
                item_dict['original_quantity'] = None
                item_dict['invoice_number'] = getattr(invoice, 'invoice_number', None)
                converted_items.append(InvoiceItemOutWithConversion(**item_dict))
        
        return converted_items
    
    # No conversion, return as InvoiceItemOutWithConversion but without conversion fields
    return [InvoiceItemOutWithConversion(**item.__dict__, invoice_number=getattr(invoice, 'invoice_number', None)) for item in items]


@router.put("/{invoice_id}/items/{item_id}", response_model=InvoiceItemOut)
async def update_invoice_item(
    invoice_id: int,
    item_id: int,
    item_data: InvoiceItemUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update invoice item."""
    # Get item first to check it exists
    item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    updated_item = await InvoiceItemService.update_invoice_item(
        session=session,
        item_id=item_id,
        item_data=item_data,
    )
    
    # Recalculate invoice total
    await InvoiceItemService.recalculate_invoice_total(session, getattr(item, 'invoice_id'))
    
    await session.commit()
    return updated_item


@router.delete("/{invoice_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice_item(
    invoice_id: int,
    item_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.INVOICES,
        Action.DELETE,
        business_id_extractor=extract_business_id_from_invoice
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Delete invoice item."""
    # Get item first to check it exists and store invoice_id
    item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    invoice_id = getattr(item, 'invoice_id')
    
    success = await InvoiceItemService.delete_invoice_item(session=session, item_id=item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )
    
    # Recalculate invoice total
    await InvoiceItemService.recalculate_invoice_total(session, invoice_id)
    
    await session.commit()


@router.post("/update-overdue-statuses")
async def update_overdue_statuses(
    auth: Annotated[dict, Depends(require_resource_permission(Resource.INVOICES, Action.EDIT))],
    business_id: Optional[int] = Query(None, description="Business ID to filter invoices"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Update overdue statuses for pending invoices based on supplier payment terms."""
    # Note: business_id is optional - if provided, it will be checked by middleware through business_id in query params
    # If not provided, will update all invoices user has access to
    
    updated_count = await InvoiceService.update_overdue_statuses(session, business_id)
    
    return {
        "message": f"Updated {updated_count} invoices to overdue status",
        "updated_count": updated_count
    }
