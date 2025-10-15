"""Dependency injection stubs (DB, auth, etc)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import decode_token
from app.core.error_codes import ErrorCode, create_error_response
from app.users.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")  # Login endpoint from auth.router

async def get_db_dep(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("No subject in token")
        return sub
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=create_error_response(ErrorCode.UNAUTHORIZED)
        )

async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_dep)
) -> User:
    """Get current authenticated user."""
    user = await db.scalar(
        select(User)
        .options(selectinload(User.role))
        .where(User.id == int(user_id))
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=create_error_response(ErrorCode.USER_NOT_FOUND)
        )
    return user


def require_non_buyer_role(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have SUPPLIER or ADMIN role (any role except BUYER)."""
    from app.users.models import UserRole
    
    if current_user.role.name == UserRole.BUYER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.BUYERS_NOT_ALLOWED)
        )
    return current_user


def require_supplier_role(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have SUPPLIER role."""
    from app.users.models import UserRole
    
    if current_user.role.name != UserRole.SUPPLIER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.SUPPLIERS_ONLY)
        )
    return current_user


def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have ADMIN role."""
    from app.users.models import UserRole
    
    if current_user.role.name != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.ADMIN_ONLY)
        )
    return current_user


def require_supplier_or_admin_role(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have SUPPLIER or ADMIN role."""
    from app.users.models import UserRole
    
    if current_user.role.name not in [UserRole.SUPPLIER.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(ErrorCode.SUPPLIERS_ONLY)
        )
    return current_user