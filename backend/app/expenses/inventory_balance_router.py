"""API routes for inventory balance management."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from app.deps import get_db, validate_business_access
from app.core_models import User
from app.expenses.inventory_balance_service import InventoryBalanceService
from app.expenses.inventory_balance_schemas import (
    InventoryBalanceResponse,
    LowStockCategoryResponse,
    BalanceRecalculationResponse,
)

router = APIRouter(
    prefix="/inventory-balance",
    tags=["Inventory Balance"]
)
@router.get("/{business_id}/category/{category_id}/period/{month_period_id}", response_model=Optional[InventoryBalanceResponse])
async def get_balance_by_category_and_period(
    category_id: int,
    month_period_id: int,
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Get inventory balance for a specific category and month period."""
    # We only validate access, don't need user or business_id for this operation
    balance = await InventoryBalanceService.get_balance_by_category_and_period(
        db, category_id, month_period_id
    )
    return balance
@router.post("/{business_id}/category/{category_id}/period/{month_period_id}", response_model=InventoryBalanceResponse)
async def create_or_update_balance(
    category_id: int,
    month_period_id: int,
    unit_id: int,
    opening_balance: Decimal,
    purchases_total: Optional[Decimal] = None,
    usage_total: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Create or update inventory balance for a category and period."""
    
    balance = await InventoryBalanceService.create_or_update_balance(
        session=db,
        category_id=category_id,
        month_period_id=month_period_id,
        unit_id=unit_id,
        opening_balance=opening_balance,
        purchases_total=purchases_total,
        usage_total=usage_total
    )
    return balance
@router.get("/{business_id}/category/{category_id}/period/{month_period_id}/purchases", response_model=Decimal)
async def get_purchases_for_category(
    category_id: int,
    month_period_id: int,
    db: AsyncSession = Depends(get_db),
    _: tuple[User, int] = Depends(validate_business_access)
):
    """Calculate total purchases for a category in a specific month period."""
    
    purchases = await InventoryBalanceService.calculate_purchases_for_category(
        db, category_id, month_period_id
    )
    return purchases
@router.get("/{business_id}/category/{category_id}/period/{month_period_id}/usage", response_model=Decimal)
async def get_usage_for_category(
    category_id: int,
    month_period_id: int,
    db: AsyncSession = Depends(get_db),
    user_and_business: tuple[User, int] = Depends(validate_business_access)
):
    """Calculate total usage for a category in a specific month period."""
    
    current_user, business_id = user_and_business
    usage = await InventoryBalanceService.calculate_usage_for_category(
        db, category_id, month_period_id
    )
    return usage
@router.get("/{business_id}/category/{category_id}/period/{month_period_id}/opening-balance", response_model=Decimal)
async def get_opening_balance(
    category_id: int,
    month_period_id: int,
    db: AsyncSession = Depends(get_db),
    user_and_business: tuple[User, int] = Depends(validate_business_access)
):
    """Get opening balance for a category (closing balance of previous month)."""
    
    current_user, business_id = user_and_business
    opening_balance = await InventoryBalanceService.get_previous_month_closing_balance(
        db, category_id, month_period_id
    )
    return opening_balance
@router.post("/{business_id}/category/{category_id}/period/{month_period_id}/recalculate", response_model=BalanceRecalculationResponse)
async def recalculate_balance_for_category(
    category_id: int,
    month_period_id: int,
    db: AsyncSession = Depends(get_db),
    user_and_business: tuple[User, int] = Depends(validate_business_access)
):
    """Recalculate inventory balance for a specific category and period."""
    
    current_user, business_id = user_and_business
    try:
        balance = await InventoryBalanceService.recalculate_balance_for_category(
            db, category_id, month_period_id
        )
        return BalanceRecalculationResponse(
            success=True,
            category_id=category_id,  # type: ignore
            month_period_id=month_period_id,
            new_balance=InventoryBalanceResponse.model_validate(balance),
            message="Balance recalculated successfully"
        )
    except Exception as e:
        return BalanceRecalculationResponse(
            success=False,
            category_id=category_id,  # type: ignore
            month_period_id=month_period_id,
            new_balance=None,
            message=f"Failed to recalculate balance: {str(e)}"
        )
@router.post("/{business_id}/period/{month_period_id}/transfer-balances/{next_period_id}", response_model=dict)
async def transfer_closing_balances(
    month_period_id: int,
    next_period_id: int,
    db: AsyncSession = Depends(get_db),
    user_and_business: tuple[User, int] = Depends(validate_business_access)
):
    """Transfer closing balances from current month to next month as opening balances."""
    
    current_user, business_id = user_and_business
    try:
        transferred_balances = await InventoryBalanceService.transfer_closing_balances_to_next_month(
            db, month_period_id, next_period_id
        )
        return {
            "success": True,
            "message": f"Successfully transferred {len(transferred_balances)} balance records to next month",
            "transferred_count": len(transferred_balances)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to transfer balances: {str(e)}",
            "transferred_count": 0
        }
@router.get("/{business_id}/period/{month_period_id}/low-stock", response_model=List[LowStockCategoryResponse])
async def get_low_stock_categories(
    month_period_id: int,
    threshold: Optional[Decimal] = Query(default=Decimal("10"), description="Stock threshold below which items are considered low stock"),
    db: AsyncSession = Depends(get_db),
    user_and_business: tuple[User, int] = Depends(validate_business_access)
):
    """Get categories with low stock levels for a specific period."""
    
    current_user, business_id = user_and_business
    low_stock_categories = await InventoryBalanceService.get_low_stock_categories(
        db, month_period_id, threshold or Decimal("10")
    )
    return low_stock_categories
@router.get("/{business_id}/category/{category_id}/average-usage", response_model=Decimal)
async def get_average_monthly_usage(
    category_id: int,
    months_back: int = Query(default=6, description="Number of months to look back for average calculation"),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Calculate average monthly usage for a category over specified period."""
    
    _, business_id = auth_data  # Extract business_id for service call
    average_usage = await InventoryBalanceService.calculate_average_monthly_usage(
        db, category_id, business_id, months_back
    )
    return average_usage
@router.get("/{business_id}/analytics/usage-trends", response_model=dict)
async def get_usage_trends(
    months_back: int = Query(default=12, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Get usage trends analysis for inventory categories."""
    
    _, business_id = auth_data  # Extract business_id for response
    # This could be extended to provide comprehensive analytics
    # For now, returning a simple structure
    return {
        "message": "Usage trends analysis endpoint ready for implementation",
        "months_analyzed": months_back,
        "business_id": business_id
    }
@router.get("/{business_id}/analytics/purchase-patterns", response_model=dict)
async def get_purchase_patterns(
    months_back: int = Query(default=12, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Get purchase patterns analysis for inventory categories."""
    
    _, business_id = auth_data  # Extract business_id for response
    # This could be extended to provide comprehensive analytics
    # For now, returning a simple structure
    return {
        "message": "Purchase patterns analysis endpoint ready for implementation",
        "months_analyzed": months_back,
        "business_id": business_id
    }