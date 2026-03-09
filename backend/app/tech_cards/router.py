"""Technology Card API router."""

from typing import Optional, cast
from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.permissions import PermissionChecker
from app.deps import get_current_user, get_db_dep
from app.core_models import User
from app.businesses.service import BusinessService
from app.tech_cards.service import TechCardService, IngredientCostService, StartingInventoryService
from app.tech_cards.schemas import (
    TechCardItemCreate,
    TechCardItemUpdate,
    TechCardItemOut,
    TechCardItemListOut,
    TechCardItemApprovalUpdate,
    IngredientCostSummary,
    StartingInventoryCreate,
    StartingInventoryOut,
    StartingInventoryWithCalculated,
)
from app.core.error_codes import ErrorCode

router = APIRouter()


def calculate_profitability(
    selling_price: Decimal, 
    cost: Optional[Decimal]
) -> tuple[Optional[Decimal], Optional[Decimal], Optional[float]]:
    """Calculate profitability metrics for tech card item.
    
    Returns tuple of (total_cost, profit_margin, profit_percentage).
    Formula: (selling_price / cost) * 100
    """
    if cost is None or selling_price <= 0:
        return cost, None, None
    
    profit_margin = selling_price - cost
    profit_percentage = float((selling_price / cost) * 100) if cost > 0 else None
    
    return cost, profit_margin, profit_percentage


@router.post("/business/{business_id}/items", response_model=TechCardItemOut, status_code=status.HTTP_201_CREATED)
async def create_tech_card_item(
    business_id: int,
    item_data: TechCardItemCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="create_tech_card_items")
    ),
):
    """Create a new technology card item (product recipe)."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    # Create item
    item = await TechCardService.create_tech_card_item(
        session=session,
        business_id=business_id,
        user_id=current_user.id,
        item_data=item_data,
    )

    # Build response
    response = TechCardItemOut.model_validate(item)
    
    # Calculate cost (optional, for response)
    cost = await TechCardService.calculate_item_cost(
        session=session,
        item_id=response.id,
        business_id=business_id,
    )
    response.total_ingredient_cost, response.profit_margin, response.profit_percentage = calculate_profitability(
        response.selling_price, cost
    )

    return response


@router.get("/business/{business_id}/items", response_model=TechCardItemListOut)
async def list_tech_card_items(
    business_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="view_tech_card_items")
    ),
):
    """List technology card items with filters."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    items, total = await TechCardService.list_tech_card_items(
        session=session,
        business_id=business_id,
        page=page,
        page_size=page_size,
        is_active=is_active,
        approval_status=approval_status,
    )

    # Build response with costs
    items_out = []
    for item in items:
        item_out = TechCardItemOut.model_validate(item)
        
        cost = await TechCardService.calculate_item_cost(
            session=session,
            item_id=item_out.id,
            business_id=business_id,
        )
        item_out.total_ingredient_cost, item_out.profit_margin, item_out.profit_percentage = calculate_profitability(
            item_out.selling_price, cost
        )

        items_out.append(item_out)

    return TechCardItemListOut(
        items=items_out,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/business/{business_id}/items/{item_id}", response_model=TechCardItemOut)
async def get_tech_card_item(
    business_id: int,
    item_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="view_tech_card_items")
    ),
):
    """Get technology card item by ID."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    item = await TechCardService.get_tech_card_item(
        session=session,
        item_id=item_id,
        business_id=business_id,
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail={"code": ErrorCode.NOT_FOUND, "message": "Tech card item not found"},
        )

    # Build response
    response = TechCardItemOut.model_validate(item)

    # Calculate cost
    cost = await TechCardService.calculate_item_cost(
        session=session,
        item_id=response.id,
        business_id=business_id,
    )
    response.total_ingredient_cost, response.profit_margin, response.profit_percentage = calculate_profitability(
        response.selling_price, cost
    )

    return response


@router.put("/business/{business_id}/items/{item_id}", response_model=TechCardItemOut)
async def update_tech_card_item(
    business_id: int,
    item_id: int,
    update_data: TechCardItemUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="edit_tech_card_items")
    ),
):
    """Update technology card item."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    item = await TechCardService.update_tech_card_item(
        session=session,
        item_id=item_id,
        business_id=business_id,
        update_data=update_data,
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail={"code": ErrorCode.NOT_FOUND, "message": "Tech card item not found"},
        )

    # Build response
    response = TechCardItemOut.model_validate(item)
    
    # Calculate cost
    cost = await TechCardService.calculate_item_cost(
        session=session,
        item_id=response.id,
        business_id=business_id,
    )
    response.total_ingredient_cost, response.profit_margin, response.profit_percentage = calculate_profitability(
        response.selling_price, cost
    )

    return response


@router.delete("/business/{business_id}/items/{item_id}", status_code=204)
async def delete_tech_card_item(
    business_id: int,
    item_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="delete_tech_card_items")
    ),
):
    """Delete technology card item."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    success = await TechCardService.delete_tech_card_item(
        session=session,
        item_id=item_id,
        business_id=business_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail={"code": ErrorCode.NOT_FOUND, "message": "Tech card item not found"},
        )


@router.post("/business/{business_id}/items/{item_id}/approval", response_model=TechCardItemOut)
async def update_tech_card_approval(
    business_id: int,
    item_id: int,
    approval_data: TechCardItemApprovalUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="approve_tech_card_items")
    ),
):
    """Approve or reject technology card item."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    item = await TechCardService.update_approval_status(
        session=session,
        item_id=item_id,
        business_id=business_id,
        user_id=current_user.id,
        approval_data=approval_data,
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail={"code": ErrorCode.NOT_FOUND, "message": "Tech card item not found"},
        )

    # Build response
    response = TechCardItemOut.model_validate(item)
    
    # Calculate cost
    cost = await TechCardService.calculate_item_cost(
        session=session,
        item_id=response.id,
        business_id=business_id,
    )
    response.total_ingredient_cost, response.profit_margin, response.profit_percentage = calculate_profitability(
        response.selling_price, cost
    )

    return response


@router.get("/business/{business_id}/ingredients/{category_id}/cost", response_model=IngredientCostSummary)
async def get_ingredient_cost_summary(
    business_id: int,
    category_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="view_tech_card_items")
    ),
):
    """Get cost summary for an ingredient category."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    summary = await IngredientCostService.get_ingredient_cost_summary(
        session=session,
        business_id=business_id,
        category_id=category_id,
    )

    if not summary:
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND,
                "message": "No cost data found for this ingredient",
            },
        )

    return summary


# ========== Starting Inventory Endpoints ==========

@router.get(
    "/business/{business_id}/starting-inventory",
    response_model=list[StartingInventoryWithCalculated]
)
async def get_starting_inventory_for_month(
    business_id: int,
    year: int = Query(..., ge=2020, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="view_tech_card_items")
    ),
):
    """
    Get all starting inventories for a month.
    Returns manual values + calculated values for comparison.
    For categories without manual entries, returns only calculated values.
    """
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    # Get all active categories for the business (through sections)
    from app.expenses.models import ExpenseSection, ExpenseCategory
    stmt = select(ExpenseCategory).join(ExpenseSection).where(
        ExpenseSection.business_id == business_id,
        ExpenseCategory.is_active == True,
        ExpenseSection.is_active == True,
    ).options(
        selectinload(ExpenseCategory.default_unit),
    )
    result = await session.execute(stmt)
    all_categories = result.scalars().all()

    # Get manual entries
    manual_records = await StartingInventoryService.get_all_for_month(
        session, business_id, year, month
    )
    
    # Create map of manual records by category_id
    manual_map = {cast(int, record.category_id): record for record in manual_records}

    # For each category, get calculated value and create result
    results = []
    for category in all_categories:
        calculated = await StartingInventoryService.get_calculated_opening_balance(
            session, business_id, category.id, year, month
        )
        
        manual_record = manual_map.get(category.id)
        
        if manual_record:
            # Category has manual entry
            record_dict = {
                "id": manual_record.id,
                "business_id": manual_record.business_id,
                "category_id": manual_record.category_id,
                "quantity": manual_record.quantity,
                "unit_id": manual_record.unit_id,
                "inventory_date": manual_record.inventory_date,
                "notes": manual_record.notes,
                "created_by": manual_record.created_by,
                "created_at": manual_record.created_at,
                "category_name": cast(str, manual_record.category.name) if manual_record.category else None,
                "unit_name": cast(str, manual_record.unit.name) if manual_record.unit else None,
                "unit_symbol": cast(str, manual_record.unit.symbol) if manual_record.unit else None,
                "created_by_name": (
                    cast(str, manual_record.created_by_user.username)
                    if manual_record.created_by_user
                    else None
                ),
                "calculated_quantity": calculated,
                "discrepancy": manual_record.quantity - calculated,
            }
        else:
            # Category has no manual entry, return calculated only
            from datetime import date
            first_day = date(year, month, 1)
            record_dict = {
                "id": 0,  # No manual record exists
                "business_id": business_id,
                "category_id": category.id,
                "quantity": "0",  # No manual entry
                "unit_id": category.default_unit_id,
                "inventory_date": first_day.isoformat(),
                "notes": None,
                "created_by": current_user.id,
                "created_at": datetime.utcnow(),
                "category_name": cast(str, category.name),
                "unit_name": cast(str, category.default_unit.name) if category.default_unit else None,
                "unit_symbol": cast(str, category.default_unit.symbol) if category.default_unit else None,
                "created_by_name": None,
                "calculated_quantity": calculated,
                "discrepancy": Decimal("0") - calculated,
            }
        
        results.append(record_dict)

    return results


@router.post(
    "/business/{business_id}/starting-inventory",
    response_model=StartingInventoryOut,
    status_code=status.HTTP_201_CREATED
)
async def create_or_update_starting_inventory(
    business_id: int,
    data: StartingInventoryCreate,
    year: int = Query(..., ge=2020, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="create_tech_card_items")
    ),
):
    """Create or update starting inventory for a category."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    record = await StartingInventoryService.create_or_update(
        db=session,
        business_id=business_id,
        category_id=data.category_id,
        quantity=data.quantity,
        unit_id=data.unit_id,
        year=year,
        month=month,
        created_by=current_user.id,
        notes=data.notes,
    )

    # Build response with nested data
    await session.refresh(record, ["category", "unit", "created_by_user"])
    
    return StartingInventoryOut(
        id=record.id,
        business_id=record.business_id,
        category_id=record.category_id,
        quantity=record.quantity,
        unit_id=record.unit_id,
        inventory_date=record.inventory_date,
        notes=record.notes,
        created_by=record.created_by,
        created_at=record.created_at,
        category_name=cast(str, record.category.name) if record.category else None,
        unit_name=cast(str, record.unit.name) if record.unit else None,
        unit_symbol=cast(str, record.unit.symbol) if record.unit else None,
        created_by_name=(
            cast(str, record.created_by_user.username)
            if record.created_by_user
            else None
        ),
    )


@router.post(
    "/business/{business_id}/starting-inventory/bulk",
    response_model=list[StartingInventoryOut]
)
async def bulk_upsert_starting_inventory(
    business_id: int,
    items: list[StartingInventoryCreate],
    year: int = Query(..., ge=2020, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="create_tech_card_items")
    ),
):
    """Bulk create or update starting inventories."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    inventory_data = [
        {
            "category_id": item.category_id,
            "quantity": item.quantity,
            "unit_id": item.unit_id,
            "notes": item.notes,
        }
        for item in items
    ]

    records = await StartingInventoryService.bulk_upsert(
        db=session,
        business_id=business_id,
        year=year,
        month=month,
        inventory_data=inventory_data,
        created_by=current_user.id,
    )

    # Build response with nested data
    results = []
    for record in records:
        await session.refresh(record, ["category", "unit", "created_by_user"])
        results.append(
            StartingInventoryOut(
                id=record.id,
                business_id=record.business_id,
                category_id=record.category_id,
                quantity=record.quantity,
                unit_id=record.unit_id,
                inventory_date=record.inventory_date,
                notes=record.notes,
                created_by=record.created_by,
                created_at=record.created_at,
                category_name=cast(str, record.category.name) if record.category else None,
                unit_name=cast(str, record.unit.name) if record.unit else None,
                unit_symbol=cast(str, record.unit.symbol) if record.unit else None,
                created_by_name=(
                    cast(str, record.created_by_user.username)
                    if record.created_by_user
                    else None
                ),
            )
        )

    return results


@router.get(
    "/business/{business_id}/starting-inventory/category/{category_id}",
    response_model=StartingInventoryWithCalculated
)
async def get_starting_inventory_for_category(
    business_id: int,
    category_id: int,
    year: int = Query(..., ge=2020, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        PermissionChecker(permission_name="view_tech_card_items")
    ),
):
    """Get starting inventory for specific category with calculated comparison."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    manual = await StartingInventoryService.get_by_category_and_month(
        session, business_id, category_id, year, month
    )

    calculated = await StartingInventoryService.get_calculated_opening_balance(
        session, business_id, category_id, year, month
    )

    if manual:
        await session.refresh(manual, ["category", "unit", "created_by_user"])
        return StartingInventoryWithCalculated(
            id=manual.id,
            business_id=manual.business_id,
            category_id=manual.category_id,
            quantity=manual.quantity,
            unit_id=manual.unit_id,
            inventory_date=manual.inventory_date,
            notes=manual.notes,
            created_by=manual.created_by,
            created_at=manual.created_at,
            category_name=cast(str, manual.category.name) if manual.category else None,
            unit_name=cast(str, manual.unit.name) if manual.unit else None,
            unit_symbol=cast(str, manual.unit.symbol) if manual.unit else None,
            created_by_name=(
                cast(str, manual.created_by_user.username)
                if manual.created_by_user
                else None
            ),
            calculated_quantity=calculated,
            discrepancy=manual.quantity - calculated,
        )
    else:
        # No manual entry - return calculated value only (as if manual = calculated)
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND,
                "message": "No starting inventory found for this category and month",
                "calculated_opening_balance": float(calculated),
            },
        )
