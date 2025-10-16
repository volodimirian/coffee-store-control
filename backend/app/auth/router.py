"""Auth router."""
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.schemas import RegisterIn, LoginIn, TokenOut
from app.core.security import hash_password, verify_password, create_access_token
from app.core.error_codes import ErrorCode, create_error_response
from app.core.permissions import require_permission, require_admin, grant_user_permission, check_user_permission
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
async def login(data: LoginIn, db: AsyncSession = Depends(get_db_dep)):
    user = await db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=create_error_response(ErrorCode.INVALID_CREDENTIALS)
        )
    token = create_access_token(subject=user.id)
    return TokenOut(access_token=token)

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
