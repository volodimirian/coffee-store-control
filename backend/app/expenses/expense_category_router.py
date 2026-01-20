"""API router for expense category management endpoints."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
    extract_business_id_from_category,
)
from app.expenses.schemas import (
    ExpenseCategoryCreate,
    ExpenseCategoryOut,
    ExpenseCategoryUpdate,
    ExpenseCategoryListOut,
    ExpenseCategoryReorderRequest,
)
from app.expenses.expense_category_service import ExpenseCategoryService
from app.expenses.expense_section_service import ExpenseSectionService

router = APIRouter()


@router.post("/", response_model=ExpenseCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.CREATE,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create a new expense category (subcategory).
    
    Permission: create_subcategory
    """
    # Get section to verify it exists
    section = await ExpenseSectionService.get_section_by_id(session, category_data.section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    category = await ExpenseCategoryService.create_category(
        session=session,
        category_data=category_data,
        created_by_user_id=auth["user_id"],
    )
    await session.commit()
    return ExpenseCategoryOut.from_orm(category)


@router.get("/section/{section_id}", response_model=ExpenseCategoryListOut)
async def get_categories_by_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.VIEW,
    ))],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_relations: bool = Query(False, description="Include section and unit relations"),
    skip: int = Query(0, ge=0, description="Number of categories to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of categories to return"),
    search: Optional[str] = Query(None, description="Search categories by name"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all categories (subcategories) for a section.
    
    Permission: view_subcategory
    """
    # Get section to verify it exists (include inactive sections)
    section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
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


@router.get("/business/{business_id}", response_model=ExpenseCategoryListOut)
async def get_categories_by_business(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.VIEW,
    ))],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    month_period_id: Optional[int] = Query(None, description="Filter by month period (auto-adjusts active filter based on period status)"),
    include_relations: bool = Query(False, description="Include section and unit relations"),
    skip: int = Query(0, ge=0, description="Number of categories to skip"),
    limit: int = Query(200, ge=1, le=1000, description="Number of categories to return"),
    search: Optional[str] = Query(None, description="Search categories by name"),
    session: AsyncSession = Depends(get_db_dep),
):
    """
    Get all categories (subcategories) for a business across all sections.
    
    Category filtering logic based on month period status:
    - ACTIVE period: only returns is_active=True categories
    - CLOSED/ARCHIVED period: returns all categories (active and inactive)
    - No period specified: uses is_active parameter as provided
    
    Permission: view_subcategory
    """
    # Get categories for this business
    categories = await ExpenseCategoryService.get_categories_by_business(
        session=session,
        business_id=business_id,
        is_active=is_active,
        month_period_id=month_period_id,
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_category
    ))],
    include_relations: bool = Query(False, description="Include section and unit relations"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get category (subcategory) by ID.
    
    Permission: view_subcategory
    """
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

    return ExpenseCategoryOut.from_orm(category)


@router.put("/{category_id}", response_model=ExpenseCategoryOut)
async def update_category(
    category_id: int,
    category_data: ExpenseCategoryUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_category
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update category (subcategory) information.
    
    Permission: edit_subcategory
    """
    category = await ExpenseCategoryService.get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.DELETE,
        business_id_extractor=extract_business_id_from_category
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Hard delete category (subcategory) - permanently remove from database.
    
    Permission: delete_subcategory
    """
    category = await ExpenseCategoryService.get_category_by_id(session, category_id, include_inactive=True)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    success, error_message = await ExpenseCategoryService.delete_category(session, category_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message or "Failed to delete category",
        )

    await session.commit()


@router.patch("/{category_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_category(
    category_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_category
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Deactivate (soft delete) an expense category (subcategory).
    
    Permission: activate_deactivate_subcategory
    """
    category = await ExpenseCategoryService.get_category_by_id(
        session=session,
        category_id=category_id,
        include_inactive=True,
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    success = await ExpenseCategoryService.deactivate_category(
        session=session,
        category_id=category_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate category",
        )

    await session.commit()


@router.post("/section/{section_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_categories(
    section_id: int,
    reorder_request: ExpenseCategoryReorderRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.EDIT,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Reorder categories (subcategories) within a section.
    
    Permission: edit_subcategory
    """
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
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


@router.patch("/{category_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_category(
    category_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_category
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Activate (restore) an expense category (subcategory).
    
    Permission: activate_deactivate_subcategory
    """
    category = await ExpenseCategoryService.get_category_by_id(
        session=session,
        category_id=category_id,
        include_inactive=True,
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    success = await ExpenseCategoryService.activate_category(
        session=session,
        category_id=category_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate category",
        )

    await session.commit()


@router.patch("/section/{section_id}/activate-all-categories", status_code=status.HTTP_204_NO_CONTENT)
async def activate_all_categories_in_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Activate all categories (subcategories) in a section.
    
    Permission: activate_deactivate_subcategory
    """
    section = await ExpenseSectionService.get_section_by_id(
        session=session,
        section_id=section_id,
        include_inactive=True,
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    success = await ExpenseCategoryService.activate_all_categories_in_section(
        session=session,
        section_id=section_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate categories",
        )

    await session.commit()


@router.patch("/section/{section_id}/deactivate-all-categories", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_all_categories_in_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.SUBCATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Deactivate all categories (subcategories) in a section.
    
    Permission: activate_deactivate_subcategory
    """
    section = await ExpenseSectionService.get_section_by_id(
        session=session,
        section_id=section_id,
        include_inactive=True,
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    success = await ExpenseCategoryService.deactivate_all_categories_in_section(
        session=session,
        section_id=section_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate categories",
        )

    await session.commit()
