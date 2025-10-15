"""Users models."""
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, ForeignKey, DateTime
from datetime import datetime
from enum import Enum as PyEnum
from app.core.db import Base


class UserRole(PyEnum):
    ADMIN = "ADMIN"        # System administrator
    SUPPLIER = "SUPPLIER"  # Product supplier/creator
    BUYER = "BUYER"        # Product buyer

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Relationship with users
    users: Mapped[list["User"]] = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Role relationship (one user - one role)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    role: Mapped["Role"] = relationship("Role", back_populates="users")
