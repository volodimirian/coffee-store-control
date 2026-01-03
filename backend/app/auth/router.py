"""Auth router."""
from fastapi import APIRouter, Depends, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.schemas import RegisterIn, LoginIn, TokenOut
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.error_codes import ErrorCode, create_error_response
from app.core.permissions import check_user_permission
from app.core.rate_limiter import refresh_rate_limiter, login_rate_limiter
from app.deps import get_db_dep
from app.deps import get_current_user_id
from app.core_models import User, Role
from app.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db_dep)):
    # Check email uniqueness
    exists = await db.scalar(select(User).where(User.email == data.email))
    if exists:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=create_error_response(ErrorCode.EMAIL_ALREADY_EXISTS)
        )
    
    # Check username uniqueness
    username_exists = await db.scalar(select(User).where(User.username == data.username))
    if username_exists:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=create_error_response(ErrorCode.USERNAME_ALREADY_EXISTS)
        )
    
    # Get role by name
    role = await db.scalar(select(Role).where(Role.name == data.role.value))
    if not role:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=create_error_response(ErrorCode.INVALID_ROLE)
        )

    user = User(
        email=data.email, 
        password_hash=hash_password(data.password), 
        username=data.username,
        role_id=role.id
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenOut(access_token=token)

@router.post("/login", response_model=TokenOut)
async def login(
    request: Request,
    data: LoginIn,
    db: AsyncSession = Depends(get_db_dep),
    _: None = Depends(login_rate_limiter.check_rate_limit)
):
    user = await db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    from datetime import datetime, timedelta, timezone
    from app.core.config import settings
    
    access_token = create_access_token(subject=user.id)
    
    # Always create refresh token, but with different expiry based on remember_me
    # remember_me=True: 30 days (can close browser)
    # remember_me=False: 1 day (session-like, but allows token refresh during active use)
    refresh_expiry_days = settings.refresh_token_expire_days if data.remember_me else 1
    
    refresh_token = create_refresh_token(subject=user.id)
    user.refresh_token = refresh_token
    user.refresh_token_expires = datetime.now(timezone.utc) + timedelta(days=refresh_expiry_days)
    await db.commit()
    
    return TokenOut(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenOut)
async def refresh(
    request: Request,
    refresh_token: str,
    db: AsyncSession = Depends(get_db_dep),
    _: None = Depends(refresh_rate_limiter.check_rate_limit)
):
    """Refresh access token using refresh token."""
    from datetime import datetime, timedelta, timezone
    from app.core.security import decode_token
    from app.core.config import settings
    
    try:
        payload = decode_token(refresh_token)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    # Verify it's a refresh token
    if payload.get("type") != "refresh":
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    user_id = int(user_id_str)
    user = await db.scalar(select(User).where(User.id == user_id))
    
    if not user or user.refresh_token != refresh_token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    # Check if refresh token is expired
    if user.refresh_token_expires and user.refresh_token_expires < datetime.now(timezone.utc):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    
    # Create new access token
    new_access_token = create_access_token(subject=user.id)
    
    # Rotate refresh token (create new one)
    new_refresh_token = create_refresh_token(subject=user.id)
    user.refresh_token = new_refresh_token
    user.refresh_token_expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    await db.commit()
    
    return TokenOut(access_token=new_access_token, refresh_token=new_refresh_token)

@router.post("/logout")
async def logout(
    db: AsyncSession = Depends(get_db_dep),
    user_id: str = Depends(get_current_user_id)
):
    """Logout user and clear refresh token."""
    user = await db.scalar(select(User).where(User.id == int(user_id)))
    if user:
        user.refresh_token = None
        user.refresh_token_expires = None
        await db.commit()
    
    return {"message": "Successfully logged out"}

@router.post("/revoke-all")
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db_dep),
    user_id: str = Depends(get_current_user_id)
):
    """Revoke all refresh tokens for the current user (all sessions)."""
    user = await db.scalar(select(User).where(User.id == int(user_id)))
    if user:
        user.refresh_token = None
        user.refresh_token_expires = None
        await db.commit()
    
    return {"message": "All sessions revoked successfully"}

@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db_dep)):
    user = await db.scalar(
        select(User)
        .options(selectinload(User.role))
        .where(User.id == int(user_id))
    )
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=create_error_response(ErrorCode.USER_NOT_FOUND)
        )
    return user

# Test endpoints for optimized permission system
@router.post("/test-check-permission")
async def test_check_permission(
    data: dict,
    db: AsyncSession = Depends(get_db_dep)
):
    """Test the optimized check_user_permission function."""
    user_id = data.get("user_id")
    permission_name = data.get("permission_name")
    business_id = data.get("business_id")
    
    if not isinstance(user_id, int) or not isinstance(permission_name, str):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "user_id must be int, permission_name must be str"}
        )
    
    has_permission = await check_user_permission(
        user_id=user_id,
        permission_name=permission_name,
        db=db,
        business_id=business_id
    )
    
    return {
        "user_id": user_id,
        "permission_name": permission_name,
        "business_id": business_id,
        "has_permission": has_permission
    }
