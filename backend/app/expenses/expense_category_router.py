"""API router for expense category management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.expenses.schemas import (
    ExpenseCategoryCreate,
    ExpenseCategoryOut,
    ExpenseCategoryUpdate,
    ExpenseCategoryListOut,
    ExpenseCategoryReorderRequest,
)
from app.expenses.expense_category_service import ExpenseCategoryService
from app.expenses.expense_section_service import ExpenseSectionService
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=ExpenseCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense category. User must have access to the business."""
    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, category_data.section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    category = await ExpenseCategoryService.create_category(
        session=session,
        category_data=category_data,
        created_by_user_id=current_user.id,
    )
    await session.commit()
    return ExpenseCategoryOut.from_orm(category)


@router.get("/section/{section_id}", response_model=ExpenseCategoryListOut)
async def get_categories_by_section(
    section_id: int,
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_relations: bool = Query(False, description="Include section and unit relations"),
    skip: int = Query(0, ge=0, description="Number of categories to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of categories to return"),
    search: Optional[str] = Query(None, description="Search categories by name"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all categories for a section."""
    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user has access to business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business",
        )

    if search:
        categories = await ExpenseCategoryService.search_categories(
            session=session,
            section_id=section_id,
            search_query=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        categories = await ExpenseCategoryService.get_categories_by_section(
            session=session,
            section_id=section_id,
            is_active=is_active,
            include_relations=include_relations,
            skip=skip,
            limit=limit,
        )

    total = await ExpenseCategoryService.count_categories_by_section(
        session=session,
        section_id=section_id,
        is_active=is_active,
    )

    return ExpenseCategoryListOut(
        categories=[ExpenseCategoryOut.from_orm(category) for category in categories], 
        total=total
    )


@router.get("/business/{business_id}/period/{month_period_id}", response_model=ExpenseCategoryListOut)
async def get_categories_by_business_period(
    business_id: int,
    month_period_id: int,
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_relations: bool = Query(False, description="Include section and unit relations"),
    skip: int = Query(0, ge=0, description="Number of categories to skip"),
    limit: int = Query(200, ge=1, le=1000, description="Number of categories to return"),
    search: Optional[str] = Query(None, description="Search categories by name"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all categories for a business period across all sections."""
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
        categories = await ExpenseCategoryService.search_categories_by_business_period(
            session=session,
            business_id=business_id,
            month_period_id=month_period_id,
            search_query=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        categories = await ExpenseCategoryService.get_categories_by_business_period(
            session=session,
            business_id=business_id,
            month_period_id=month_period_id,
            is_active=is_active,
            include_relations=include_relations,
            skip=skip,
            limit=limit,
        )

    # For business-wide categories, total count is handled differently
    total = len(categories)  # Simplified for now

    return ExpenseCategoryListOut(
        categories=[ExpenseCategoryOut.from_orm(category) for category in categories], 
        total=total
    )


@router.get("/{category_id}", response_model=ExpenseCategoryOut)
async def get_category(
    category_id: int,
    include_relations: bool = Query(False, description="Include section and unit relations"),
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get category by ID."""
    category = await ExpenseCategoryService.get_category_by_id(
        session, 
        category_id, 
        include_relations=include_relations
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, getattr(category, 'section_id'))
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category's section not found",
        )

    # Check if user has access to category's business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this category",
        )

    return ExpenseCategoryOut.from_orm(category)


@router.put("/{category_id}", response_model=ExpenseCategoryOut)
async def update_category(
    category_id: int,
    category_data: ExpenseCategoryUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update category information. User must be able to manage the business."""
    category = await ExpenseCategoryService.get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, getattr(category, 'section_id'))
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category's section not found",
        )

    # Check if user can manage category's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this category",
        )

    updated_category = await ExpenseCategoryService.update_category(
        session=session,
        category_id=category_id,
        category_data=category_data,
    )
    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    await session.commit()
    return ExpenseCategoryOut.from_orm(updated_category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Soft delete category. User must be able to manage the business."""
    category = await ExpenseCategoryService.get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, getattr(category, 'section_id'))
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category's section not found",
        )

    # Check if user can manage category's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this category",
        )

    success = await ExpenseCategoryService.delete_category(session, category_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category",
        )

    await session.commit()


@router.post("/{category_id}/restore", response_model=ExpenseCategoryOut)
async def restore_category(
    category_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted category. User must be able to manage the business."""
    category = await ExpenseCategoryService.get_category_by_id(session, category_id, include_inactive=True)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, getattr(category, 'section_id'))
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category's section not found",
        )

    # Check if user can manage category's business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this category",
        )

    success = await ExpenseCategoryService.restore_category(session, category_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore category",
        )

    await session.commit()
    
    # Return updated category
    restored_category = await ExpenseCategoryService.get_category_by_id(session, category_id)
    return ExpenseCategoryOut.from_orm(restored_category)


@router.post("/section/{section_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_categories(
    section_id: int,
    reorder_request: ExpenseCategoryReorderRequest,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Reorder categories within a section. User must be able to manage the business."""
    # Get section to verify business access
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if user can manage business
    can_manage = await BusinessService.can_user_manage_business(
        session=session,
        user_id=current_user.id,
        business_id=getattr(section, 'business_id'),
    )
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this business",
        )

    success = await ExpenseCategoryService.reorder_categories(
        session=session,
        section_id=section_id,
        category_orders=reorder_request.category_orders,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder categories",
        )

    await session.commit()
    