"""Core models for user management and access control."""
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text
from datetime import datetime
from enum import Enum as PyEnum
from app.core.db import Base


# Enums
class UserRole(PyEnum):
    ADMIN = "ADMIN"                    # System administrator
    BUSINESS_OWNER = "BUSINESS_OWNER"  # Business owner
    EMPLOYEE = "EMPLOYEE"              # Regular employee


# User management
class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="role")
    role_permissions: Mapped[list["RolePermission"]] = relationship("RolePermission", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Remember me / refresh token
    refresh_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    refresh_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Role relationship
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    
    # Relationships
    user_permissions: Mapped[list["UserPermission"]] = relationship("UserPermission", back_populates="user")
    owned_businesses: Mapped[list["Business"]] = relationship("Business", foreign_keys="Business.owner_id")
    user_businesses: Mapped[list["UserBusiness"]] = relationship("UserBusiness", back_populates="user")


# Access control system
class Permission(Base):
    __tablename__ = "permissions"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    resource: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'expenses', 'users', 'business'
    action: Mapped[str] = mapped_column(String(50), nullable=False)    # e.g., 'view', 'create', 'edit', 'delete'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    role_permissions: Mapped[list["RolePermission"]] = relationship("RolePermission", back_populates="permission")
    user_permissions: Mapped[list["UserPermission"]] = relationship("UserPermission", back_populates="permission")


class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship("Permission", back_populates="role_permissions")


class UserPermission(Base):
    __tablename__ = "user_permissions"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), nullable=False)
    # Business context for multi-business permission control
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_permissions")
    permission: Mapped["Permission"] = relationship("Permission", back_populates="user_permissions")
    business: Mapped["Business"] = relationship("Business", foreign_keys=[business_id])


# Business management
class Business(Base):
    __tablename__ = "businesses"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    user_businesses: Mapped[list["UserBusiness"]] = relationship("UserBusiness", back_populates="business")
    
    # Expense tracking relationships
    suppliers = relationship("Supplier", back_populates="business")
    month_periods = relationship("MonthPeriod", back_populates="business")
    units = relationship("Unit", back_populates="business")
    expense_sections = relationship("ExpenseSection", back_populates="business")
    expense_categories = relationship("ExpenseCategory", back_populates="business")


class UserBusiness(Base):
    __tablename__ = "user_businesses"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), primary_key=True)
    role_in_business: Mapped[str] = mapped_column(String(50), nullable=False, default="EMPLOYEE")  # OWNER, MANAGER, EMPLOYEE
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    business: Mapped["Business"] = relationship("Business", back_populates="user_businesses")
