"""API router for unit management endpoints."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
    extract_business_id_from_unit,
)
from app.expenses.schemas import (
    UnitCreate,
    UnitOut,
    UnitUpdate,
    UnitListOut,
    UnitConversionRequest,
    UnitConversionResponse,
    UnitHierarchyResponse,
)
from app.expenses.unit_service import UnitService

router = APIRouter()


@router.post("/", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
async def create_unit(
    unit_data: UnitCreate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.CREATE,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create a new measurement unit.
    
    Permission: create_unit
    """
    # Validate unit hierarchy if base unit is specified
    if unit_data.base_unit_id:
        is_valid, error_msg = await UnitService.validate_unit_hierarchy(
            session=session,
            unit_id=0,  # New unit, use 0 as placeholder
            new_base_unit_id=unit_data.base_unit_id,
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid unit hierarchy: {error_msg}",
            )

    unit = await UnitService.create_unit(
        session=session,
        unit_data=unit_data,
        created_by_user_id=auth["user_id"],
    )
    await session.commit()
    return unit


@router.get("/business/{business_id}", response_model=UnitListOut)
async def get_business_units(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.VIEW,
    ))],
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of units to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of units to return"),
    search: Optional[str] = Query(None, description="Search units by name or symbol"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all units for a business.
    
    Permission: view_unit
    """
    if search:
        units = await UnitService.search_units(
            session=session,
            business_id=business_id,
            search_query=search,
            unit_type=unit_type,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        units = await UnitService.get_units_by_business(
            session=session,
            business_id=business_id,
            unit_type=unit_type,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    total = await UnitService.count_units_by_business(
        session=session,
        business_id=business_id,
        unit_type=unit_type,
        is_active=is_active,
    )

    return UnitListOut(units=[UnitOut.from_orm(unit) for unit in units], total=total)


@router.get("/business/{business_id}/hierarchy", response_model=UnitHierarchyResponse)
async def get_unit_hierarchy(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.VIEW,
    ))],
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get units organized by type with conversion hierarchies.
    
    Permission: view_unit
    """
    hierarchy = await UnitService.get_unit_hierarchy(
        session=session,
        business_id=business_id,
        unit_type=unit_type,
    )

    return UnitHierarchyResponse(hierarchy={
        unit_type: [UnitOut.from_orm(unit) for unit in unit_list]
        for unit_type, unit_list in hierarchy.items()
    })


@router.get("/business/{business_id}/base-units")
async def get_base_units(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.VIEW,
    ))],
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get base units (no parent conversions) for a business.
    
    Permission: view_unit
    """
    base_units = await UnitService.get_base_units_by_business(
        session=session,
        business_id=business_id,
        unit_type=unit_type,
    )

    return {"base_units": base_units}


@router.get("/{unit_id}", response_model=UnitOut)
async def get_unit(
    unit_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_unit,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get unit by ID.
    
    Permission: view_unit
    """
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    return unit


@router.put("/{unit_id}", response_model=UnitOut)
async def update_unit(
    unit_id: int,
    unit_data: UnitUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_unit,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update unit information.
    
    Permission: edit_unit
    """
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Validate unit hierarchy if base unit is being changed
    if unit_data.base_unit_id is not None:
        is_valid, error_msg = await UnitService.validate_unit_hierarchy(
            session=session,
            unit_id=unit_id,
            new_base_unit_id=unit_data.base_unit_id,
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid unit hierarchy: {error_msg}",
            )

    updated_unit = await UnitService.update_unit(
        session=session,
        unit_id=unit_id,
        unit_data=unit_data,
    )
    if not updated_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    await session.commit()
    return updated_unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_unit,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Soft delete unit.
    
    Permission: activate_deactivate_unit
    """
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    success = await UnitService.delete_unit(session, unit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete unit",
        )

    await session.commit()


@router.delete("/{unit_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_unit(
    unit_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.DELETE,
        business_id_extractor=extract_business_id_from_unit,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Permanently delete unit from database.
    
    Permission: delete_unit
    """
    from sqlalchemy import select, func
    from app.expenses.models import ExpenseCategory, InvoiceItem, ExpenseRecord, InventoryBalance
    
    unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Check if unit is used in categories (default_unit_id)
    category_count_query = select(func.count(ExpenseCategory.id)).where(
        ExpenseCategory.default_unit_id == unit_id
    )
    category_count = await session.scalar(category_count_query)
    
    # Check if unit is used in invoice items
    invoice_item_count_query = select(func.count(InvoiceItem.id)).where(
        InvoiceItem.unit_id == unit_id
    )
    invoice_item_count = await session.scalar(invoice_item_count_query)
    
    # Check if unit is used in expense records
    expense_record_count_query = select(func.count(ExpenseRecord.id)).where(
        ExpenseRecord.unit_id == unit_id
    )
    expense_record_count = await session.scalar(expense_record_count_query)
    
    # Check if unit is used in inventory balances
    inventory_balance_count_query = select(func.count(InventoryBalance.id)).where(
        InventoryBalance.unit_id == unit_id
    )
    inventory_balance_count = await session.scalar(inventory_balance_count_query)
    
    # Check if unit has derived units
    from app.expenses.models import Unit
    derived_units_query = select(Unit).where(Unit.base_unit_id == unit_id)
    derived_units_result = await session.execute(derived_units_query)
    derived_units = derived_units_result.scalars().all()
    
    # If unit or its derived units are in use, prevent deletion
    if category_count or invoice_item_count or expense_record_count or inventory_balance_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete unit that is being used in categories, invoices, expense records, or inventory balances. Please deactivate it instead.",
        )
    
    # Check if any derived units are in use
    for derived_unit in derived_units:
        # Check categories
        derived_category_count = await session.scalar(
            select(func.count(ExpenseCategory.id)).where(ExpenseCategory.default_unit_id == derived_unit.id)
        )
        # Check invoice items
        derived_invoice_count = await session.scalar(
            select(func.count(InvoiceItem.id)).where(InvoiceItem.unit_id == derived_unit.id)
        )
        # Check expense records
        derived_expense_count = await session.scalar(
            select(func.count(ExpenseRecord.id)).where(ExpenseRecord.unit_id == derived_unit.id)
        )
        # Check inventory balances
        derived_inventory_count = await session.scalar(
            select(func.count(InventoryBalance.id)).where(InventoryBalance.unit_id == derived_unit.id)
        )
        
        if derived_category_count or derived_invoice_count or derived_expense_count or derived_inventory_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete base unit because derived unit '{derived_unit.name}' is being used. Please deactivate instead.",
            )

    # Perform hard delete
    # First, manually delete all derived units (SQLAlchemy doesn't always handle CASCADE correctly)
    for derived_unit in derived_units:
        await session.delete(derived_unit)
    
    # Then delete the base unit
    await session.delete(unit)
    await session.commit()


@router.post("/{unit_id}/restore", response_model=UnitOut)
async def restore_unit(
    unit_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_unit,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Restore soft-deleted unit.
    
    Permission: activate_deactivate_unit
    """
    unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    success = await UnitService.restore_unit(session, unit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore unit",
        )

    await session.commit()
    
    # Return updated unit
    restored_unit = await UnitService.get_unit_by_id(session, unit_id)
    return restored_unit


@router.post("/convert", response_model=UnitConversionResponse)
async def convert_units(
    conversion_request: UnitConversionRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.UNITS,
        Action.VIEW,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Convert quantity between two units.
    
    Permission: view_unit
    """
    # Get both units to check business access
    from_unit = await UnitService.get_unit_by_id(
        session, conversion_request.from_unit_id
    )
    to_unit = await UnitService.get_unit_by_id(
        session, conversion_request.to_unit_id
    )
    
    if not from_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source unit not found",
        )
    if not to_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target unit not found",
        )

    # Perform conversion
    converted_quantity, error_msg = await UnitService.convert_quantity(
        session=session,
        quantity=conversion_request.quantity,
        from_unit_id=conversion_request.from_unit_id,
        to_unit_id=conversion_request.to_unit_id,
    )

    if converted_quantity is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    return UnitConversionResponse(
        original_quantity=conversion_request.quantity,
        converted_quantity=converted_quantity,
        from_unit=UnitOut.from_orm(from_unit),
        to_unit=UnitOut.from_orm(to_unit),
    )
