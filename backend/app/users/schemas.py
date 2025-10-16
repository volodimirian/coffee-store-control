"""Users schemas."""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from enum import Enum

class UserRoleEnum(str, Enum):
    ADMIN = "ADMIN"                    # System administrator
    BUSINESS_OWNER = "BUSINESS_OWNER"  # Business owner
    EMPLOYEE = "EMPLOYEE"              # Regular employee

class RoleOut(BaseModel):
    id: int
    name: str
    description: str | None = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime
    role: RoleOut

    class Config:
        from_attributes = True