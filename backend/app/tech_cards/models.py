"""Technology Card models for recipe management."""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Boolean, ForeignKey, Numeric, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.core_models import User, Business
    from app.expenses.models import ExpenseCategory, Unit, Invoice, InvoiceItem


class ApprovalStatus(str, Enum):
    """Technology card item approval status."""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TechCardItem(Base):
    """Technology card item (product for sale with recipe)."""
    __tablename__ = "tech_card_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    approval_status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="tech_card_items")
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory")
    ingredients: Mapped[list["TechCardItemIngredient"]] = relationship("TechCardItemIngredient", back_populates="item", cascade="all, delete-orphan")
    created_by_user: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    approved_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by])


class TechCardItemIngredient(Base):
    """Ingredient in a technology card item (recipe component)."""
    __tablename__ = "tech_card_item_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("tech_card_items.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    item: Mapped["TechCardItem"] = relationship("TechCardItem", back_populates="ingredients")
    ingredient_category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory")
    unit: Mapped["Unit"] = relationship("Unit")


class IngredientCostHistory(Base):
    """Historical cost data for ingredients from invoices."""
    __tablename__ = "ingredient_cost_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    invoice_item_id: Mapped[int] = mapped_column(ForeignKey("invoice_items.id", ondelete="CASCADE"), nullable=False)
    cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    quantity_purchased: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory")
    business: Mapped["Business"] = relationship("Business")
    invoice: Mapped["Invoice"] = relationship("Invoice")
    invoice_item: Mapped["InvoiceItem"] = relationship("InvoiceItem")
    unit: Mapped["Unit"] = relationship("Unit")


class StartingInventory(Base):
    """Starting inventory levels for ingredients."""
    __tablename__ = "starting_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    inventory_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory")
    unit: Mapped["Unit"] = relationship("Unit")
    created_by_user: Mapped["User"] = relationship("User")
