"""API router for business management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.deps import get_current_user, get_db_dep
from app.businesses.schemas import (
    BusinessCreate,
    BusinessOut,
    BusinessUpdate,
    BusinessListOut,
    UserBusinessCreate,
    UserBusinessUpdate,
    BusinessMembersOut,
)
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Create a new business. Current user becomes the owner."""
    business = await BusinessService.create_business(
        session=session,
        business_data=business_data,
        owner_id=current_user.id,
    )
    return business


@router.get("/my", response_model=BusinessListOut)
async def get_my_businesses(
    is_active: Optional[bool] = None,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all businesses where current user is owner or member."""
    businesses = await BusinessService.get_user_businesses(
        session=session,
        user_id=current_user.id,
        is_active=is_active,
    )
    return BusinessListOut.from_business_list(businesses)


@router.get("/owned", response_model=BusinessListOut)
async def get_owned_businesses(
    is_active: Optional[bool] = None,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all businesses owned by current user."""
    businesses = await BusinessService.get_businesses_by_owner(
        session=session,
        owner_id=current_user.id,
        is_active=is_active,
    )
    return BusinessListOut.from_business_list(businesses)


@router.get("/{business_id}", response_model=BusinessOut)
async def get_business(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get business by ID. User must have access to this business."""
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

    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    return business


@router.put("/{business_id}", response_model=BusinessOut)
async def update_business(
    business_id: int,
    business_data: BusinessUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update business information. User must be owner or manager."""
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

    business = await BusinessService.update_business(
        session=session,
        business_id=business_id,
        business_data=business_data,
    )
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    return business


@router.post("/{business_id}/restore", response_model=BusinessOut)
async def restore_business(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted business. Only owner can restore business."""
    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    # Only owner can restore business
    if business.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only business owner can restore business",
        )

    success = await BusinessService.restore_business(session, business_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore business",
        )

    # Return updated business
    restored_business = await BusinessService.get_business_by_id(session, business_id)
    return restored_business


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Soft delete business. Only owner can delete business."""
    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    # Only owner can delete business
    if business.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only business owner can delete business",
        )

    success = await BusinessService.delete_business(session, business_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete business",
        )


@router.get("/{business_id}/members", response_model=BusinessMembersOut)
async def get_business_members(
    business_id: int,
    is_active: Optional[bool] = True,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all members of a business. User must have access to business."""
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

    members = await BusinessService.get_business_members(
        session=session,
        business_id=business_id,
        is_active=is_active,
    )
    return BusinessMembersOut(members=members, total=len(members))


@router.post("/{business_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member_to_business(
    business_id: int,
    member_data: UserBusinessCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Add a user to business. User must be owner or manager."""
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

    # Ensure business_id matches URL parameter
    if member_data.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business ID in URL and request body must match",
        )

    user_business = await BusinessService.add_user_to_business(
        session=session,
        user_business_data=member_data,
    )
    if not user_business:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this business",
        )

    return {"message": "User successfully added to business"}


@router.put("/{business_id}/members/{user_id}")
async def update_member_role(
    business_id: int,
    user_id: int,
    update_data: UserBusinessUpdate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Update user's role in business. User must be owner or manager."""
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

    user_business = await BusinessService.update_user_business_role(
        session=session,
        user_id=user_id,
        business_id=business_id,
        update_data=update_data,
    )
    if not user_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this business",
        )

    return {"message": "User role updated successfully"}


@router.delete("/{business_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_business(
    business_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Remove user from business. User must be owner or manager."""
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

    # Don't allow removing business owner
    business = await BusinessService.get_business_by_id(session, business_id)
    if business and business.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove business owner from business",
        )

    success = await BusinessService.remove_user_from_business(
        session=session,
        user_id=user_id,
        business_id=business_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this business",
        )