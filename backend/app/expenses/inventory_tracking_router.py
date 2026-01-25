"""
Router for optimized inventory tracking endpoint.
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
)
from app.expenses.inventory_tracking_service import InventoryTrackingService
from app.expenses.inventory_tracking_schemas import InventoryTrackingSummaryResponse

router = APIRouter(prefix="/inventory-tracking", tags=["inventory-tracking"])


@router.get(
    "/business/{business_id}/summary",
    response_model=InventoryTrackingSummaryResponse,
    summary="Get complete inventory tracking data for a month (optimized)",
)
async def get_inventory_tracking_summary(
    business_id: int,
    year: int,
    month: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.INVOICES, Action.VIEW))],
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Get all inventory tracking data for a specific month in ONE request.
    
    This optimized endpoint replaces hundreds of individual API calls:
    - Previously: ~800+ requests (sections + categories + invoices × items)
    - Now: 1 request with all data batched
    
    Returns complete daily data for all sections/categories with purchases and usage.
    
    **Performance**: Uses selectinload for efficient eager loading and batch processing.
    """
    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12",
        )

    summary = await InventoryTrackingService.get_month_summary(
        session=session,
        business_id=business_id,
        year=year,
        month=month,
    )

    return summary
