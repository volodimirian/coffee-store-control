"""API router for expense section management endpoints."""

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db_dep
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
    extract_business_id_from_section,
)
from app.expenses.schemas import (
    ExpenseSectionCreate,
    ExpenseSectionOut,
    ExpenseSectionUpdate,
    ExpenseSectionListOut,
)
from app.expenses.expense_section_service import ExpenseSectionService

router = APIRouter()


@router.post("/", response_model=ExpenseSectionOut, status_code=status.HTTP_201_CREATED)
async def create_expense_section(
    section_data: ExpenseSectionCreate,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.CATEGORIES, Action.CREATE))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create a new expense section."""
    section = await ExpenseSectionService.create_section(
        session=session,
        section_data=section_data,
        created_by_user_id=auth["user_id"],
    )
    await session.commit()
    return ExpenseSectionOut.from_orm(section)


@router.get("/business/{business_id}", response_model=ExpenseSectionListOut)
async def get_sections_by_business(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(Resource.CATEGORIES, Action.VIEW))],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_categories: bool = Query(False, description="Include categories in sections"),
    skip: int = Query(0, ge=0, description="Number of sections to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of sections to return"),
    search: Optional[str] = Query(None, description="Search sections by name"),
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all sections for a business."""
    if search:
        sections = await ExpenseSectionService.search_sections(
            session=session,
            business_id=business_id,
            search_query=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )
    else:
        sections = await ExpenseSectionService.get_sections_by_business(
            session=session,
            business_id=business_id,
            is_active=is_active,
            include_categories=include_categories,
            skip=skip,
            limit=limit,
        )

    total = await ExpenseSectionService.count_sections_by_business(
        session=session,
        business_id=business_id,
        is_active=is_active,
    )

    return ExpenseSectionListOut(
        sections=[ExpenseSectionOut.from_orm(section) for section in sections], 
        total=total
    )


@router.get("/{section_id}", response_model=ExpenseSectionOut)
async def get_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.VIEW,
        business_id_extractor=extract_business_id_from_section
    ))],
    include_categories: bool = Query(False, description="Include categories in section"),
    session: AsyncSession = Depends(get_db_dep),
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

    return ExpenseSectionOut.from_orm(section)


@router.put("/{section_id}", response_model=ExpenseSectionOut)
async def update_section(
    section_id: int,
    section_data: ExpenseSectionUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.EDIT,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update section information."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    updated_section = await ExpenseSectionService.update_section(
        session=session,
        section_id=section_id,
        section_data=section_data,
    )
    await session.commit()
    return ExpenseSectionOut.from_orm(updated_section)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Soft delete section (deactivate).
    
    Permission: activate_deactivate_category
    """
    section = await ExpenseSectionService.get_section_by_id(session, section_id)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Restore soft-deleted section."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
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


@router.patch("/reorder", response_model=List[ExpenseSectionOut])
async def reorder_sections(
    business_id: int,
    section_orders: List[tuple[int, int]],  # [(section_id, new_order_index), ...]
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.ACTIVATE_DEACTIVATE
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Reorder sections for a business (pass array of tuples: [(section_id, order_index), ...])."""
    # Reorder sections
    reordered = await ExpenseSectionService.reorder_sections(
        session=session,
        business_id=business_id,
        section_orders=section_orders,
    )
    if not reordered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid section IDs or mismatch with business",
        )

    await session.commit()
    
    # Return reordered sections
    sections = await ExpenseSectionService.get_sections_by_business(
        session=session,
        business_id=business_id,
        is_active=True,
    )
    return [ExpenseSectionOut.from_orm(s) for s in sections]


@router.patch("/{section_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Deactivate section (soft delete). User must be able to manage the business."""
    # Use delete_section which sets is_active=False
    success = await ExpenseSectionService.delete_section(session, section_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )
    
    await session.commit()


@router.patch("/{section_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.ACTIVATE_DEACTIVATE,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Activate section (undo soft delete). User must be able to manage the business."""
    # Use restore_section which sets is_active=True
    success = await ExpenseSectionService.restore_section(session, section_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    await session.commit()


@router.delete("/{section_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_section(
    section_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.CATEGORIES,
        Action.DELETE,
        business_id_extractor=extract_business_id_from_section
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Permanently delete section. User must be able to manage the business."""
    section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    success = await ExpenseSectionService.hard_delete_section(session, section_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to permanently delete section",
        )

    await session.commit()
