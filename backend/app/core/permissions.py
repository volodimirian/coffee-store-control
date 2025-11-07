"""Permission checking middleware and decorators."""
from typing import Annotated
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core_models import Permission, UserPermission
from app.deps import get_current_user_id, get_db_dep


async def check_user_permission(
    user_id: int,
    permission_name: str,
    db: AsyncSession,
    business_id: int | None = None
) -> bool:
    """Check if user has permission either directly or through their role.
    
    Priority:
    1. Explicit denial (UserPermission with is_active=False) - HIGHEST PRIORITY
    2. Direct user permission (UserPermission with is_active=True)
    3. Role-based permission (RolePermission)
    
    Args:
        user_id: ID of the user
        permission_name: Name of the permission to check
        db: Database session
        business_id: Optional business ID for business-specific permissions
        
    Returns:
        True if user has permission, False otherwise
    """
    # First, check for explicit denial (is_active=False)
    # This takes precedence over role permissions
    denial_query = select(UserPermission).join(Permission).where(
        UserPermission.user_id == user_id,
        ~UserPermission.is_active,
        Permission.name == permission_name
    )
    
    if business_id is not None:
        denial_query = denial_query.where(
            (UserPermission.business_id == business_id) | (UserPermission.business_id.is_(None))
        )
    
    denial = await db.scalar(denial_query)
    if denial:
        # Explicit denial - user does NOT have permission
        return False
    
    # Check for direct user permission (is_active=True)
    user_permission_query = select(UserPermission).join(Permission).where(
        UserPermission.user_id == user_id,
        UserPermission.is_active,
        Permission.name == permission_name
    )
    
    if business_id is not None:
        user_permission_query = user_permission_query.where(
            (UserPermission.business_id == business_id) | (UserPermission.business_id.is_(None))
        )
    
    user_permission = await db.scalar(user_permission_query)
    if user_permission:
        return True
    
    # Check for role-based permission (lowest priority)
    from app.core_models import Role, RolePermission, User, UserBusiness
    
    # If business_id is provided, check the user's role in that specific business
    if business_id is not None:
        # Get user's role in the business through UserBusiness table
        user_business = await db.scalar(
            select(UserBusiness)
            .where(
                UserBusiness.user_id == user_id,
                UserBusiness.business_id == business_id,
                UserBusiness.is_active
            )
        )
        
        if not user_business:
            # User is not a member of this business
            return False
        
        # Map role_in_business to system role name for permission checking
        # role_in_business values: "owner", "employee", "manager" (lowercase)
        # System roles: "BUSINESS_OWNER", "EMPLOYEE"
        # 
        # Logic: Owners in a business get BUSINESS_OWNER permissions within their business context.
        # This allows business owners to manage their business.
        role_name_mapping = {
            "owner": "BUSINESS_OWNER",
            "employee": "EMPLOYEE",
            "manager": "EMPLOYEE",  # Manager treated as employee for permissions
        }
        
        role_name = role_name_mapping.get(user_business.role_in_business.lower())
        if not role_name:
            # Unknown role - deny access
            return False
        
        # Check if this role has the required permission
        role_permission = await db.scalar(
            select(RolePermission)
            .join(Permission)
            .join(Role)
            .where(
                Role.name == role_name,
                RolePermission.is_active,
                Permission.name == permission_name
            )
        )
        
        return role_permission is not None
    else:
        # No business context - use global user role
        role_permission = await db.scalar(
            select(RolePermission)
            .join(Permission)
            .join(Role)
            .join(User, User.role_id == Role.id)
            .where(
                User.id == user_id,
                RolePermission.is_active,
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
    
    This function creates or updates a UserPermission record with is_active=False
    to explicitly deny the permission, even if the user has it through their role.
    
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
    
    # Find existing user permission
    user_permission = await db.scalar(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission.id,
            UserPermission.business_id == business_id
        )
    )
    
    if user_permission:
        # Deactivate existing permission
        user_permission.is_active = False
    else:
        # Create new user permission with is_active=False to explicitly deny
        # This is needed when user has permission through role but we want to revoke it
        user_permission = UserPermission(
            user_id=user_id,
            permission_id=permission.id,
            business_id=business_id,
            is_active=False
        )
        db.add(user_permission)
    
    await db.commit()
    return True


class PermissionChecker:
    """Permission checker dependency class."""
    
    def __init__(self, permission_name: str, error_code: str | None = None):
        self.permission_name = permission_name
        self.error_code = error_code or "PERMISSION_DENIED"
    
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
            from app.core.error_codes import ErrorCode, create_error_response
            error_response = create_error_response(
                error_code=ErrorCode(self.error_code),
                detail=f"Permission '{self.permission_name}' required"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_response
            )
        
        return True


class BusinessPermissionChecker:
    """Permission checker with business context."""
    
    def __init__(self, permission_name: str, error_code: str | None = None):
        self.permission_name = permission_name
        self.error_code = error_code or "PERMISSION_DENIED"
    
    async def __call__(
        self,
        business_id: int,
        user_id: Annotated[str, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db_dep)]
    ) -> bool:
        """Check if current user has required permission for specific business."""
        has_permission = await check_user_permission(
            user_id=int(user_id), 
            permission_name=self.permission_name, 
            db=db,
            business_id=business_id
        )
        
        if not has_permission:
            from app.core.error_codes import ErrorCode, create_error_response
            error_response = create_error_response(
                error_code=ErrorCode(self.error_code),
                detail=f"Permission '{self.permission_name}' required for this business"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_response
            )
        
        return True


def require_permission(permission_name: str, error_code: str | None = None):
    """Create a permission checker dependency.
    
    Args:
        permission_name: Name of the permission to check
        error_code: Optional error code to return (defaults to PERMISSION_DENIED)
    """
    return PermissionChecker(permission_name, error_code)


def require_business_permission(permission_name: str, error_code: str | None = None):
    """Create a business permission checker dependency.
    
    Args:
        permission_name: Name of the permission to check
        error_code: Optional error code to return (defaults to PERMISSION_DENIED)
    """
    return BusinessPermissionChecker(permission_name, error_code)


def require_admin():
    """Dependency to require admin role."""
    return require_permission("MANAGE_USERS")  # Admin-only permission


def require_business_owner():
    """Dependency to require business owner role or higher."""
    return require_permission("MANAGE_MONTHS")  # Business owner permission