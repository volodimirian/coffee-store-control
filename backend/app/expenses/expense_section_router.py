"""API router for expense section management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.expenses.schemas import (
    ExpenseSectionCreate,
    ExpenseSectionOut,
    ExpenseSectionUpdate,
    ExpenseSectionListOut,
    ExpenseSectionReorderRequest,
)
from app.expenses.expense_section_service import ExpenseSectionService
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=ExpenseSectionOut, status_code=status.HTTP_201_CREATED)
async def create_expense_section(
    section_data: ExpenseSectionCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense section. User must have access to the business."""
    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=section_data.business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    section = await ExpenseSectionService.create_section(
        session=session,
        section_data=section_data,
        created_by_user_id=current_user.id,
    )
    await session.commit()
    return ExpenseSectionOut.from_orm(section)


@router.get("/business/{business_id}/period/{month_period_id}", response_model=ExpenseSectionListOut)
async def get_sections_by_business_period(
    business_id: int,
    month_period_id: int,
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_categories: bool = Query(False, description="Include categories in sections"),
    skip: int = Query(0, ge=0, description="Number of sections to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of sections to return"),
    search: Optional[str] = Query(None, description="Search sections by name"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all sections for a business period."""
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
        sections = await ExpenseSectionService.search_sections(
            session=session,
            business_id=business_id,
            month_period_id=month_period_id,
            search_query=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        sections = await ExpenseSectionService.get_sections_by_business_period(
            session=session,
            business_id=business_id,
            month_period_id=month_period_id,
            is_active=is_active,
            include_categories=include_categories,
            skip=skip,
            limit=limit,
        )

    total = await ExpenseSectionService.count_sections_by_business_period(
        session=session,
        business_id=business_id,
        month_period_id=month_period_id,
        is_active=is_active,
    )

    return ExpenseSectionListOut(
        sections=[ExpenseSectionOut.from_orm(section) for section in sections], 
        total=total
    )


@router.get("/{section_id}", response_model=ExpenseSectionOut)
async def get_section(
    section_id: int,
    include_categories: bool = Query(False, description="Include categories in section"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get section by ID."""
    section = await ExpenseSectionService.get_section_by_id(
        session, 
        section_id, 
        include_categories=include_categories
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user has access to section's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this section",
        )

    return ExpenseSectionOut.from_orm(section)


@router.put("/{section_id}", response_model=ExpenseSectionOut)
async def update_section(
    section_id: int,
    section_data: ExpenseSectionUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update section information. User must be able to manage the business."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user can manage section's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this section",
        )

    updated_section = await ExpenseSectionService.update_section(
        session=session,
        section_id=section_id,
        section_data=section_data,
    )
    if not updated_section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    await session.commit()
    return ExpenseSectionOut.from_orm(updated_section)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Soft delete section. User must be able to manage the business."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user can manage section's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this section",
        )

    success = await ExpenseSectionService.delete_section(session, section_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete section",
        )

    await session.commit()


@router.post("/{section_id}/restore", response_model=ExpenseSectionOut)
async def restore_section(
    section_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted section. User must be able to manage the business."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user can manage section's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this section",
        )

    success = await ExpenseSectionService.restore_section(session, section_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore section",
        )

    await session.commit()
    
    # Return updated section
    restored_section = await ExpenseSectionService.get_section_by_id(session, section_id)
    return ExpenseSectionOut.from_orm(restored_section)


@router.post("/business/{business_id}/period/{month_period_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_sections(
    business_id: int,
    month_period_id: int,
    reorder_request: ExpenseSectionReorderRequest,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Reorder sections within a business period. User must be able to manage the business."""
    # Check if user can manage business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=business_id,
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this business",
        )

    success = await ExpenseSectionService.reorder_sections(
        session=session,
        business_id=business_id,
        month_period_id=month_period_id,
        section_orders=reorder_request.section_orders,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder sections",
        )

    await session.commit()
    