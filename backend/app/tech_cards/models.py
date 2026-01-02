"""Technology Card models for recipe management."""

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship

from app.core.db import Base


class ApprovalStatus(str, Enum):
    """Technology card item approval status."""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TechCardItem(Base):
    """Technology card item (product for sale with recipe)."""
    __tablename__ = "tech_card_items"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    selling_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    approval_status = Column(String(20), nullable=False, default="draft")
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business", back_populates="tech_card_items")
    category = relationship("ExpenseCategory")
    ingredients = relationship("TechCardItemIngredient", back_populates="item", cascade="all, delete-orphan")
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])


class TechCardItemIngredient(Base):
    """Ingredient in a technology card item (recipe component)."""
    __tablename__ = "tech_card_item_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("tech_card_items.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    notes = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    item = relationship("TechCardItem", back_populates="ingredients")
    ingredient_category = relationship("ExpenseCategory")
    unit = relationship("Unit")


class IngredientCostHistory(Base):
    """Historical cost data for ingredients from invoices."""
    __tablename__ = "ingredient_cost_history"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    invoice_item_id = Column(Integer, ForeignKey("invoice_items.id", ondelete="CASCADE"), nullable=False)
    cost_per_unit = Column(Numeric(10, 2), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    purchase_date = Column(Date, nullable=False, index=True)
    quantity_purchased = Column(Numeric(10, 3), nullable=False)
    total_cost = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("ExpenseCategory")
    business = relationship("Business")
    invoice = relationship("Invoice")
    invoice_item = relationship("InvoiceItem")
    unit = relationship("Unit")


class StartingInventory(Base):
    """Starting inventory levels for ingredients."""
    __tablename__ = "starting_inventory"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    inventory_date = Column(Date, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business")
    category = relationship("ExpenseCategory")
    unit = relationship("Unit")
    created_by_user = relationship("User")
