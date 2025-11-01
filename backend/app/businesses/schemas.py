"""Pydantic schemas for business management API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BusinessBase(BaseModel):
    """Base schema for business entity."""
    name: str
    city: str
    address: str


class BusinessCreate(BusinessBase):
    """Schema for creating a new business."""
    pass


class BusinessUpdate(BaseModel):
    """Schema for updating business information."""
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class BusinessOut(BusinessBase):
    """Schema for business output in API responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BusinessListOut(BaseModel):
    """Schema for business list output."""
    businesses: list[BusinessOut]
    total: int
    
    @classmethod
    def from_business_list(cls, businesses: list, total: Optional[int] = None):
        """Create from list of Business models."""
        business_outs = [BusinessOut.model_validate(business) for business in businesses]
        return cls(businesses=business_outs, total=total or len(business_outs))


class UserBusinessBase(BaseModel):
    """Base schema for user-business relationship."""
    role_in_business: str


class UserBusinessCreate(UserBusinessBase):
    """Schema for adding user to business."""
    user_id: int
    business_id: int


class UserBusinessUpdate(BaseModel):
    """Schema for updating user's role in business."""
    role_in_business: Optional[str] = None
    is_active: Optional[bool] = None


class UserBusinessOut(UserBusinessBase):
    """Schema for user-business relationship output."""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    business_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BusinessMemberOut(BaseModel):
    """Schema for business member information."""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    username: str
    email: str
    role_in_business: str
    is_active: bool
    joined_at: datetime


class BusinessMembersOut(BaseModel):
    """Schema for business members list."""
    members: list[BusinessMemberOut]
    total: int


class EmployeeCreateRequest(BaseModel):
    """Schema for creating new employee and adding to business."""
    email: str
    username: str
    password: str
    business_id: int
    role_in_business: str = "employee"


class EmployeeOut(BusinessMemberOut):
    """Schema for employee information with permissions."""
    permissions: list[str] = []  # List of permission names


class OwnerEmployeesOut(BaseModel):
    """Schema for listing all employees created by owner."""
    employees: list[EmployeeOut]
    total: int


class PermissionGrantRequest(BaseModel):
    """Schema for granting permissions to a single user."""
    permission_names: list[str]  # Can grant multiple permissions at once
    business_id: Optional[int] = None  # None for global permissions


class PermissionRevokeRequest(BaseModel):
    """Schema for revoking permissions from a single user."""
    permission_names: list[str]  # Can revoke multiple permissions at once
    business_id: Optional[int] = None


class PermissionBatchRequest(BaseModel):
    """Schema for batch permission operations on multiple users."""
    user_ids: list[int]  # Multiple users
    permission_names: list[str]  # Multiple permissions
    business_id: Optional[int] = None
    