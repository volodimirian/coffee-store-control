"""Technology Card API router."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker
from app.deps import get_current_user, get_db_dep
from app.core_models import User
from app.businesses.service import BusinessService
from app.tech_cards.service import TechCardService, IngredientCostService
from app.tech_cards.schemas import (
    TechCardItemCreate,
    TechCardItemUpdate,
    TechCardItemOut,
    TechCardItemListOut,
    TechCardItemApprovalUpdate,
    IngredientCostSummary,
)
from app.core.error_codes import ErrorCode

router = APIRouter()


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
    response.total_ingredient_cost = cost
    if cost is not None and response.selling_price is not None and response.selling_price > 0:
        response.profit_margin = response.selling_price - cost
        if response.selling_price > 0:
            response.profit_percentage = float((response.profit_margin / response.selling_price) * 100)

    return response


@router.get("/business/{business_id}/items", response_model=TechCardItemListOut)
async def list_tech_card_items(
    business_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
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
        category_id=category_id,
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

        item_out.total_ingredient_cost = cost
        if cost is not None and item_out.selling_price is not None and item_out.selling_price > 0:
            item_out.profit_margin = item_out.selling_price - cost
            if item_out.selling_price > 0:
                item_out.profit_percentage = float((item_out.profit_margin / item_out.selling_price) * 100)

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
    response.total_ingredient_cost = cost
    if cost is not None and response.selling_price is not None and response.selling_price > 0:
        response.profit_margin = response.selling_price - cost
        if response.selling_price > 0:
            response.profit_percentage = float((response.profit_margin / response.selling_price) * 100)

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
    response.total_ingredient_cost = cost
    if cost is not None and response.selling_price is not None and response.selling_price > 0:
        response.profit_margin = response.selling_price - cost
        if response.selling_price > 0:
            response.profit_percentage = float((response.profit_margin / response.selling_price) * 100)

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
    
    response.total_ingredient_cost = cost
    if cost is not None and response.selling_price is not None and response.selling_price > 0:
        response.profit_margin = response.selling_price - cost
        if response.selling_price > 0:
            response.profit_percentage = float((response.profit_margin / response.selling_price) * 100)

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
