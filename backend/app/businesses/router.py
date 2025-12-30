"""API router for business management endpoints."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core_models import User
from app.core.permissions import grant_user_permission, revoke_user_permission
from app.core.resource_permissions import (
    require_resource_permission,
    Resource,
    Action,
)
from app.core.error_codes import ErrorCode, create_error_response
from app.deps import get_current_user, get_db_dep
from app.businesses.schemas import (
    BusinessCreate,
    BusinessOut,
    BusinessUpdate,
    BusinessListOut,
    UserBusinessCreate,
    UserBusinessUpdate,
    BusinessMembersOut,
    EmployeeCreateRequest,
    EmployeeOut,
    OwnerEmployeesOut,
    PermissionGrantRequest,
    PermissionRevokeRequest,
    PermissionBatchRequest,
    PermissionOut,
    UserPermissionsDetailOut,
)
from app.businesses.service import BusinessService

router = APIRouter()


@router.post("/", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
    accept_language: str = Header(default="ru"),
):
    """Create a new business. Current user becomes the owner."""
    # Use language from body if provided, otherwise from Accept-Language header
    if business_data.language is None:
        # Extract primary language from Accept-Language header (e.g., "en-US" -> "en")
        lang_code = accept_language.split(",")[0].split("-")[0].lower()
        business_data.language = lang_code if lang_code in ["ru", "en"] else "ru"
    else:
        # Validate explicitly provided language
        business_data.language = business_data.language if business_data.language in ["ru", "en"] else "ru"
    
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
            detail=create_error_response(ErrorCode.BUSINESS_ACCESS_DENIED),
        )

    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.BUSINESS_NOT_FOUND),
        )

    return business


@router.put("/{business_id}", response_model=BusinessOut)
async def update_business(
    business_id: int,
    business_data: BusinessUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.EDIT,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update business information.
    
    Permission: edit_business
    """
    business = await BusinessService.update_business(
        session=session,
        business_id=business_id,
        business_data=business_data,
    )
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.BUSINESS_NOT_FOUND),
        )

    return business


@router.post("/{business_id}/restore", response_model=BusinessOut)
async def restore_business(
    business_id: int,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted business.
    
    Owner-only operation: Only the business owner can restore their business.
    This is not a permission-based check but an ownership verification.
    """
    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.BUSINESS_NOT_FOUND),
        )

    # Only owner can restore business
    if business.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.ONLY_OWNER_CAN_RESTORE),
        )

    success = await BusinessService.restore_business(session, business_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(ErrorCode.BUSINESS_OPERATION_FAILED),
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
    """Soft delete business.
    
    Owner-only operation: Only the business owner can delete their business.
    This is not a permission-based check but an ownership verification.
    """
    business = await BusinessService.get_business_by_id(session, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.BUSINESS_NOT_FOUND),
        )

    # Only owner can delete business
    if business.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.ONLY_OWNER_CAN_DELETE),
        )

    success = await BusinessService.delete_business(session, business_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(ErrorCode.BUSINESS_OPERATION_FAILED),
        )


@router.get("/{business_id}/members", response_model=BusinessMembersOut)
async def get_business_members(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.VIEW,
    ))],
    is_active: Optional[bool] = True,
    session: AsyncSession = Depends(get_db_dep),
):
    """Get all members of a business.
    
    Permission: view_businesses
    """
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
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.MANAGE_MEMBERS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Add a user to business as a member.
    
    Permission: manage_members_business
    """
    # Ensure business_id matches URL parameter
    if member_data.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(ErrorCode.BUSINESS_ID_MISMATCH),
        )

    user_business, error = await BusinessService.add_user_to_business(
        session=session,
        user_business_data=member_data,
    )
    if error or not user_business:
        # Map error codes to status codes
        status_code_map = {
            ErrorCode.USER_ALREADY_BUSINESS_MEMBER: status.HTTP_409_CONFLICT,
            ErrorCode.CANNOT_ASSIGN_BUSINESS_OWNER_ROLE: status.HTTP_403_FORBIDDEN,
        }
        http_status = status_code_map.get(error, status.HTTP_400_BAD_REQUEST) if error else status.HTTP_400_BAD_REQUEST
        
        raise HTTPException(
            status_code=http_status,
            detail=create_error_response(error or ErrorCode.INTERNAL_ERROR),
        )

    return {"message": "User successfully added to business"}


@router.put("/{business_id}/members/{user_id}")
async def update_member_role(
    business_id: int,
    user_id: int,
    update_data: UserBusinessUpdate,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.MANAGE_MEMBERS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Update member's role in business.
    
    Permission: manage_members_business
    """
    user_business = await BusinessService.update_user_business_role(
        session=session,
        user_id=user_id,
        business_id=business_id,
        update_data=update_data,
    )
    if not user_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.USER_NOT_BUSINESS_MEMBER),
        )

    return {"message": "User role updated successfully"}


@router.delete("/{business_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_business(
    business_id: int,
    user_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.MANAGE_MEMBERS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Remove member from business.
    
    Permission: manage_members_business
    """
    # Don't allow removing business owner
    business = await BusinessService.get_business_by_id(session, business_id)
    if business and business.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(ErrorCode.CANNOT_REMOVE_BUSINESS_OWNER),
        )

    success = await BusinessService.remove_user_from_business(
        session=session,
        user_id=user_id,
        business_id=business_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.USER_NOT_BUSINESS_MEMBER),
        )


@router.post("/{business_id}/members/create", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_member(
    business_id: int,
    employee_data: EmployeeCreateRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.MANAGE_MEMBERS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Create new member (employee) and add to business.
    
    Permission: manage_members_business
    """
    # Ensure business_id matches
    if employee_data.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(ErrorCode.BUSINESS_ID_MISMATCH),
        )
    
    # Create employee (service checks ownership)
    new_user, error = await BusinessService.create_employee(
        session=session,
        employee_data=employee_data,
        owner_id=auth["user_id"],
    )
    
    if error or not new_user:
        # Return error code for frontend i18n
        status_code_map = {
            ErrorCode.EMAIL_ALREADY_EXISTS: status.HTTP_409_CONFLICT,
            ErrorCode.ONLY_OWNER_CAN_CREATE_EMPLOYEES: status.HTTP_403_FORBIDDEN,
            ErrorCode.FORBIDDEN: status.HTTP_403_FORBIDDEN,
        }
        http_status = status_code_map.get(error, status.HTTP_400_BAD_REQUEST) if error else status.HTTP_400_BAD_REQUEST
        
        raise HTTPException(
            status_code=http_status,
            detail=create_error_response(error or ErrorCode.INTERNAL_ERROR),
        )
    
    # Return employee with permissions
    employee = await BusinessService.get_employee_with_permissions(
        session=session,
        user_id=new_user.id,
        business_id=business_id,
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(ErrorCode.EMPLOYEE_CREATION_FAILED),
        )
    return employee


@router.get("/owner/employees", response_model=OwnerEmployeesOut)
async def get_owner_employees(
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Get all employees across all businesses owned by current user."""
    employees = await BusinessService.get_owner_employees(
        session=session,
        owner_id=current_user.id,
    )
    return OwnerEmployeesOut(employees=employees, total=len(employees))


# TODOD: fix that to make it possibel 
# to search users across all platform for making him employee
@router.get("/users/search")
async def search_user_by_email(
    email: str,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """Search for a user by email. Only business owners can search for users."""
    # Check if current user owns at least one business
    owner_businesses = await BusinessService.get_businesses_by_owner(
        session=session,
        owner_id=current_user.id,
    )
    
    if not owner_businesses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.ONLY_OWNERS_CAN_SEARCH_USERS),
        )
    
    user = await BusinessService.find_user_by_email(
        session=session,
        email=email,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.USER_NOT_FOUND),
        )
    
    # Return basic user info (no password)
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.name if user.role else None,
    }


@router.get("/{business_id}/members/list", response_model=list[EmployeeOut])
async def get_business_members_list(
    business_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.VIEW,
    ))],
    is_active: Optional[bool] = True,
    session: AsyncSession = Depends(get_db_dep),
):
    """Get members (employees) of a specific business.
    
    Permission: view_businesses
    """
    # Get all members (we'll filter employees)
    members = await BusinessService.get_business_members(
        session=session,
        business_id=business_id,
        is_active=is_active,
    )
    
    # Convert to EmployeeOut with permissions
    employees = []
    for member in members:
        if member.role_in_business in ["employee", "manager"]:  # Exclude owners
            employee = await BusinessService.get_employee_with_permissions(
                session=session,
                user_id=member.user_id,
                business_id=business_id,
            )
            if employee:
                employees.append(employee)
    
    return employees


@router.post("/{business_id}/members/{user_id}/permissions/grant")
async def grant_permissions_to_user(
    business_id: int,
    user_id: int,
    permission_data: PermissionGrantRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.GRANT_PERMISSIONS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Grant one or multiple permissions to a single user.
    
    Permission: grant_permissions_business
    
    Use this endpoint for:
    - Managing permissions for a specific employee
    - Editing user's permission set in UI modal
    - Single user permission updates
    
    For granting same permissions to multiple users, use /permissions/grant-batch instead.
    """
    # Verify user is member of business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=user_id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.USER_NOT_BUSINESS_MEMBER),
        )
    
    # Grant permissions
    results = []
    for permission_name in permission_data.permission_names:
        success = await grant_user_permission(
            user_id=user_id,
            permission_name=permission_name,
            db=session,
            business_id=permission_data.business_id or business_id,
        )
        results.append({
            "permission": permission_name,
            "success": success,
        })
    
    failed = [r for r in results if not r["success"]]
    if failed:
        return {
            "message": f"Granted {len(results) - len(failed)}/{len(results)} permissions",
            "results": results
        }
    
    return {
        "message": f"Successfully granted {len(results)} permission(s)",
        "results": results
    }


@router.post("/{business_id}/members/{user_id}/permissions/revoke")
async def revoke_permissions_from_user(
    business_id: int,
    user_id: int,
    permission_data: PermissionRevokeRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.GRANT_PERMISSIONS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Revoke one or multiple permissions from a single user.
    
    Permission: grant_permissions_business
    
    Use this endpoint for:
    - Removing permissions from a specific employee
    - Updating user's permission set in UI modal
    - Single user permission removal
    
    For revoking same permissions from multiple users, use /permissions/revoke-batch instead.
    """
    # Verify user is member of business
    has_access = await BusinessService.can_user_access_business(
        session=session,
        user_id=user_id,
        business_id=business_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(ErrorCode.USER_NOT_BUSINESS_MEMBER),
        )
    
    # Revoke permissions
    results = []
    for permission_name in permission_data.permission_names:
        success = await revoke_user_permission(
            user_id=user_id,
            permission_name=permission_name,
            db=session,
            business_id=permission_data.business_id or business_id,
        )
        results.append({
            "permission": permission_name,
            "success": success,
        })
    
    failed = [r for r in results if not r["success"]]
    if failed:
        return {
            "message": f"Revoked {len(results) - len(failed)}/{len(results)} permissions",
            "results": results
        }
    
    return {
        "message": f"Successfully revoked {len(results)} permission(s)",
        "results": results
    }


@router.post("/{business_id}/permissions/grant-batch")
async def grant_permissions_batch(
    business_id: int,
    batch_data: PermissionBatchRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.GRANT_PERMISSIONS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Grant same set of permissions to multiple users.
    
    Permission: grant_permissions_business
    
    Use this endpoint for:
    - Onboarding new employees (apply role template to multiple users)
    - Bulk permission updates for teams
    - Granting department-wide access
    - Import/migration operations
    
    Example: Give 5 new baristas the same 7 permissions in one request.
    
    Returns success/failure status for each user+permission combination.
    For managing permissions of a single user, use /members/{user_id}/permissions/grant instead.
    """
    # Grant permissions to all users
    results = []
    for user_id in batch_data.user_ids:
        for permission_name in batch_data.permission_names:
            success = await grant_user_permission(
                user_id=user_id,
                permission_name=permission_name,
                db=session,
                business_id=batch_data.business_id or business_id,
            )
            results.append({
                "user_id": user_id,
                "permission": permission_name,
                "success": success,
            })
    
    successful = len([r for r in results if r["success"]])
    return {
        "message": f"Granted permissions to {len(batch_data.user_ids)} users: {successful}/{len(results)} operations successful",
        "results": results
    }


@router.post("/{business_id}/permissions/revoke-batch")
async def revoke_permissions_batch(
    business_id: int,
    batch_data: PermissionBatchRequest,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.GRANT_PERMISSIONS,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Revoke same set of permissions from multiple users.
    
    Permission: grant_permissions_business
    
    Use this endpoint for:
    - Removing access from multiple employees at once
    - Bulk permission cleanup for teams
    - Revoking department-wide access
    - Security incident response (mass permission removal)
    
    Example: Remove report viewing access from 10 employees in one request.
    
    Returns success/failure status for each user+permission combination.
    For managing permissions of a single user, use /members/{user_id}/permissions/revoke instead.
    """
    # Revoke permissions from all users
    results = []
    for user_id in batch_data.user_ids:
        for permission_name in batch_data.permission_names:
            success = await revoke_user_permission(
                user_id=user_id,
                permission_name=permission_name,
                db=session,
                business_id=batch_data.business_id or business_id,
            )
            results.append({
                "user_id": user_id,
                "permission": permission_name,
                "success": success,
            })
    
    successful = len([r for r in results if r["success"]])
    return {
        "message": f"Revoked permissions from {len(batch_data.user_ids)} users: {successful}/{len(results)} operations successful",
        "results": results
    }


@router.get("/permissions", response_model=list[PermissionOut])
async def get_all_permissions(
    is_active_only: bool = True,
    session: AsyncSession = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
):
    """
    Get all available permissions in the system.
    
    Query Parameters:
    - is_active_only: Filter only active permissions (default: True)
    
    Returns list of all permissions with their details (name, resource, action).
    Useful for building permission selection UI.
    """
    permissions = await BusinessService.get_all_permissions(session, is_active_only)
    return [PermissionOut.model_validate(perm) for perm in permissions]


@router.get("/{business_id}/members/{user_id}/permissions/detail", response_model=UserPermissionsDetailOut)
async def get_user_permissions_detail(
    business_id: int,
    user_id: int,
    auth: Annotated[dict, Depends(require_resource_permission(
        Resource.BUSINESSES,
        Action.VIEW,
    ))],
    session: AsyncSession = Depends(get_db_dep),
):
    """Get detailed permission information for a user in a business context.
    
    Permission: view_businesses
    
    Shows:
    - All available permissions
    - Which permissions the user has (from role or explicit grant)
    - Source of each permission (role, user, both, or none)
    - Whether permission was explicitly granted/revoked
    """
    result = await BusinessService.get_user_permissions_detail(
        session=session,
        user_id=user_id,
        business_id=business_id,
    )
    return result
