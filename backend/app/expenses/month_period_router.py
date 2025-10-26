"""API router for month period management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.expenses.schemas import (
    MonthPeriodCreate,
    MonthPeriodOut,
    MonthPeriodUpdate,
    MonthPeriodListOut,
)
from app.expenses.month_period_service import MonthPeriodService
from app.expenses.models import MonthPeriodStatus
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=MonthPeriodOut, status_code=status.HTTP_201_CREATED)
async def create_month_period(
    period_data: MonthPeriodCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new monthly period. User must have access to the business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=period_data.business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    try:
        period = await MonthPeriodService.create_month_period(
            session=session,
            period_data=period_data,
            created_by_user_id=current_user.id,
        )
        await session.commit()
        return period
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/business/{business_id}", response_model=MonthPeriodListOut)
async def get_business_periods(
    business_id: int,
    status_filter: Optional[MonthPeriodStatus] = Query(None, alias="status", description="Filter by period status"),
    year: Optional[int] = Query(None, description="Filter by year"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of periods to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of periods to return"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all periods for a business."""
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

    periods = await MonthPeriodService.get_periods_by_business(
        session=session,
        business_id=business_id,
        status=status_filter,
        year=year,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )

    total = await MonthPeriodService.count_periods_by_business(
        session=session,
        business_id=business_id,
        status=status_filter,
        year=year,
        is_active=is_active,
    )

    return MonthPeriodListOut(
        periods=[MonthPeriodOut.from_orm(period) for period in periods], 
        total=total
    )


@router.get("/business/{business_id}/current", response_model=MonthPeriodOut)
async def get_current_period(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get the current active period for a business."""
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

    period = await MonthPeriodService.get_current_period(
        session=session,
        business_id=business_id,
    )
    
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active period found for this business",
        )

    return MonthPeriodOut.from_orm(period)


@router.get("/business/{business_id}/years")
async def get_years_with_periods(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get list of years that have periods for a business."""
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

    years = await MonthPeriodService.get_years_with_periods(
        session=session,
        business_id=business_id,
    )

    return {"years": years}


@router.get("/{period_id}", response_model=MonthPeriodOut)
async def get_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get period by ID."""
    period = await MonthPeriodService.get_period_by_id(session, period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user has access to period's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this period",
        )

    return MonthPeriodOut.from_orm(period)


@router.put("/{period_id}", response_model=MonthPeriodOut)
async def update_period(
    period_id: int,
    period_data: MonthPeriodUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update period information. User must be able to manage the business."""
    period = await MonthPeriodService.get_period_by_id(session, period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user can manage period's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this period",
        )

    # Validate status transition if status is being changed
    if period_data.status is not None and period_data.status != getattr(period, 'status'):
        is_valid, error_msg = await MonthPeriodService.validate_period_transition(
            session=session,
            business_id=getattr(period, 'business_id'),
            from_status=getattr(period, 'status'),
            to_status=period_data.status,
            period_id=period_id,
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

    updated_period = await MonthPeriodService.update_period(
        session=session,
        period_id=period_id,
        period_data=period_data,
    )
    if not updated_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    await session.commit()
    return MonthPeriodOut.from_orm(updated_period)


@router.post("/{period_id}/close", response_model=MonthPeriodOut)
async def close_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Close a period (set status to CLOSED). User must be able to manage the business."""
    period = await MonthPeriodService.get_period_by_id(session, period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user can manage period's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this period",
        )

    success = await MonthPeriodService.close_period(session, period_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close period",
        )

    await session.commit()
    
    # Return updated period
    updated_period = await MonthPeriodService.get_period_by_id(session, period_id)
    return MonthPeriodOut.from_orm(updated_period)


@router.post("/{period_id}/reopen", response_model=MonthPeriodOut)
async def reopen_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Reopen a closed period (set status to ACTIVE). User must be able to manage the business."""
    period = await MonthPeriodService.get_period_by_id(session, period_id, include_inactive=True)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user can manage period's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this period",
        )

    # Validate if we can have another active period
    current_business_id = getattr(period, 'business_id')
    is_valid, error_msg = await MonthPeriodService.validate_period_transition(
        session=session,
        business_id=current_business_id,
        from_status=getattr(period, 'status'),
        to_status=MonthPeriodStatus.ACTIVE,
        period_id=period_id,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    success = await MonthPeriodService.reopen_period(session, period_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reopen period",
        )

    await session.commit()
    
    # Return updated period
    updated_period = await MonthPeriodService.get_period_by_id(session, period_id)
    return MonthPeriodOut.from_orm(updated_period)


@router.post("/{period_id}/archive", response_model=MonthPeriodOut)
async def archive_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Archive a closed period (set status to ARCHIVED). Only owner or admin can archive periods."""
    period = await MonthPeriodService.get_period_by_id(session, period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user is owner or admin
    is_owner_or_admin = await BusinessService.is_user_owner_or_admin(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not is_owner_or_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can archive periods",
        )

    # Check if period is in CLOSED status
    current_status = getattr(period, 'status')
    if str(current_status) != str(MonthPeriodStatus.CLOSED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only closed periods can be archived",
        )

    success = await MonthPeriodService.archive_period(session, period_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive period",
        )

    await session.commit()
    
    # Return updated period
    updated_period = await MonthPeriodService.get_period_by_id(session, period_id)
    return MonthPeriodOut.from_orm(updated_period)


@router.delete("/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Soft delete period. User must be able to manage the business."""
    period = await MonthPeriodService.get_period_by_id(session, period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user can manage period's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this period",
        )

    success = await MonthPeriodService.delete_period(session, period_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete period",
        )

    await session.commit()


@router.post("/{period_id}/restore", response_model=MonthPeriodOut)
async def restore_period(
    period_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted period. User must be able to manage the business."""
    period = await MonthPeriodService.get_period_by_id(session, period_id, include_inactive=True)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    # Check if user can manage period's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(period, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this period",
        )

    success = await MonthPeriodService.restore_period(session, period_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore period",
        )

    await session.commit()
    
    # Return updated period
    restored_period = await MonthPeriodService.get_period_by_id(session, period_id)
    return MonthPeriodOut.from_orm(restored_period)
