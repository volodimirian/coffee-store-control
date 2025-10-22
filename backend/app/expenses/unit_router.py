"""API router for unit management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
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
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
async def create_unit(
    unit_data: UnitCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new measurement unit. User must have access to the business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=unit_data.business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

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
        created_by_user_id=current_user.id,
    )
    await session.commit()
    return unit


@router.get("/business/{business_id}", response_model=UnitListOut)
async def get_business_units(
    business_id: int,
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of units to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of units to return"),
    search: Optional[str] = Query(None, description="Search units by name or symbol"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all units for a business."""
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
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get units organized by type with conversion hierarchies."""
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
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get base units (no parent conversions) for a business."""
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

    base_units = await UnitService.get_base_units_by_business(
        session=session,
        business_id=business_id,
        unit_type=unit_type,
    )

    return {"base_units": base_units}


@router.get("/{unit_id}", response_model=UnitOut)
async def get_unit(
    unit_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get unit by ID."""
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Check if user has access to unit's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(unit, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this unit",
        )

    return unit


@router.put("/{unit_id}", response_model=UnitOut)
async def update_unit(
    unit_id: int,
    unit_data: UnitUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update unit information. User must be able to manage the business."""
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Check if user can manage unit's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(unit, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this unit",
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
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Soft delete unit. User must be able to manage the business."""
    unit = await UnitService.get_unit_by_id(session, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Check if user can manage unit's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(unit, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this unit",
        )

    success = await UnitService.delete_unit(session, unit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete unit",
        )

    await session.commit()


@router.post("/{unit_id}/restore", response_model=UnitOut)
async def restore_unit(
    unit_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted unit. User must be able to manage the business."""
    unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Check if user can manage unit's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(unit, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this unit",
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
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Convert quantity between two units."""
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

    # Check if user has access to both units' businesses
    has_access_from = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(from_unit, 'business_id'),
    )
    has_access_to = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(to_unit, 'business_id'),
    )
    
    if not has_access_from or not has_access_to:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to one or both units",
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
