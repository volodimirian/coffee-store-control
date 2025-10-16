"""Permission checking middleware and decorators."""
from typing import Annotated
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core_models import User, Role, Permission, RolePermission, UserPermission
from app.deps import get_current_user_id, get_db_dep


async def check_user_permission(
    user_id: int, 
    permission_name: str, 
    db: AsyncSession,
    business_id: int | None = None
) -> bool:
    """Check if user has specific permission.
    
    Priority order:
    1. Individual user permissions (highest priority)
    2. Role permissions (lower priority)
    
    Args:
        user_id: ID of the user to check
        permission_name: Name of the permission to check
        db: Database session
        business_id: Optional business ID for business-specific permissions
        
    Returns:
        True if user has permission, False otherwise
    """
    # PRIORITY 1: Check individual user permissions first (highest priority)
    user_permission_query = select(UserPermission).join(Permission).where(
        UserPermission.user_id == user_id,
        UserPermission.is_active == True,
        Permission.name == permission_name
    )
    
    # Add business_id filter if specified
    if business_id is not None:
        user_permission_query = user_permission_query.where(
            (UserPermission.business_id == business_id) | (UserPermission.business_id.is_(None))
        )
    
    user_permission = await db.scalar(user_permission_query)
    if user_permission:
        return True
    
    # PRIORITY 2: Check role permissions (lower priority)
    role_permission = await db.scalar(
        select(RolePermission)
        .join(Permission)
        .join(Role)
        .join(User, User.role_id == Role.id)
        .where(
            User.id == user_id,
            RolePermission.is_active == True,
            Permission.name == permission_name
        )
    )
    
    return role_permission is not None


async def grant_user_permission(
    user_id: int,
    permission_name: str,
    db: AsyncSession,
    business_id: int | None = None
) -> bool:
    """Grant individual permission to a user.
    
    Args:
        user_id: ID of the user to grant permission to
        permission_name: Name of the permission to grant
        db: Database session
        business_id: Optional business ID for business-specific permissions
        
    Returns:
        True if permission was granted successfully, False otherwise
    """
    # Check if permission exists
    permission = await db.scalar(
        select(Permission).where(Permission.name == permission_name)
    )
    if not permission:
        return False
    
    # Check if user permission already exists
    existing_perm = await db.scalar(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission.id,
            UserPermission.business_id == business_id
        )
    )
    
    if existing_perm:
        # Update existing permission to active
        existing_perm.is_active = True
    else:
        # Create new user permission
        user_permission = UserPermission(
            user_id=user_id,
            permission_id=permission.id,
            business_id=business_id,
            is_active=True
        )
        db.add(user_permission)
    
    await db.commit()
    return True


async def revoke_user_permission(
    user_id: int,
    permission_name: str,
    db: AsyncSession,
    business_id: int | None = None
) -> bool:
    """Revoke individual permission from a user.
    
    Args:
        user_id: ID of the user to revoke permission from
        permission_name: Name of the permission to revoke
        db: Database session
        business_id: Optional business ID for business-specific permissions
        
    Returns:
        True if permission was revoked successfully, False otherwise
    """
    # Get permission
    permission = await db.scalar(
        select(Permission).where(Permission.name == permission_name)
    )
    if not permission:
        return False
    
    # Find user permission
    user_permission = await db.scalar(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission.id,
            UserPermission.business_id == business_id
        )
    )
    
    if user_permission:
        # Deactivate permission instead of deleting
        user_permission.is_active = False
        await db.commit()
        return True
    
    return False


class PermissionChecker:
    """Permission checker dependency class."""
    
    def __init__(self, permission_name: str):
        self.permission_name = permission_name
    
    async def __call__(
        self,
        user_id: Annotated[str, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db_dep)]
    ) -> bool:
        """Check if current user has required permission."""
        has_permission = await check_user_permission(
            user_id=int(user_id), 
            permission_name=self.permission_name, 
            db=db
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{self.permission_name}' required"
            )
        
        return True


def require_permission(permission_name: str):
    """Create a permission checker dependency."""
    return PermissionChecker(permission_name)


def require_admin():
    """Dependency to require admin role."""
    return require_permission("MANAGE_USERS")  # Admin-only permission


def require_business_owner():
    """Dependency to require business owner role or higher."""
    return require_permission("MANAGE_MONTHS")  # Business owner permission