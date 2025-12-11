"""Auth schemas."""
from pydantic import BaseModel, EmailStr, Field
from app.users.schemas import UserRoleEnum

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    username: str = Field(..., min_length=3, max_length=50, description="Username must be 3-50 characters")
    role: UserRoleEnum  # Required role field for registration

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"