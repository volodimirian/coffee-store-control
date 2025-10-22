"""Expense tracking models for inventory and supply management."""

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, JSON
from sqlalchemy.orm import relationship

from app.core.db import Base


class UnitType(str, Enum):
    """Types of measurement units."""
    WEIGHT = "weight"      # grams, kilograms
    VOLUME = "volume"      # milliliters, liters  
    COUNT = "count"        # pieces, bottles, packages


class Unit(Base):
    """Measurement units for inventory tracking."""
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # "Килограмм", "Литр", "Штука"
    symbol = Column(String(10), nullable=False)  # "кг", "л", "шт"
    unit_type = Column(String(20), nullable=False)  # UnitType enum
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    description = Column(String(500), nullable=True)  # Optional description
    base_unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)  # Base unit for conversion
    conversion_factor = Column(Numeric(10, 4), nullable=False, default=1.0)  # Factor to convert to base unit
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business", back_populates="units")
    base_unit = relationship("Unit", remote_side=[id])
    derived_units = relationship("Unit", back_populates="base_unit")


class Supplier(Base):
    """Suppliers for each business."""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact_info = Column(JSON, nullable=True)  # {"phone": "", "email": "", "address": "", "tax_id": ""}
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business", back_populates="suppliers")
    created_by_user = relationship("User")
    invoices = relationship("Invoice", back_populates="supplier")


class MonthPeriodStatus(str, Enum):
    """Status of accounting periods."""
    ACTIVE = "active"      # Currently active for data entry
    CLOSED = "closed"      # Closed for data entry, calculations finalized
    ARCHIVED = "archived"  # Old period, read-only


class MonthPeriod(Base):
    """Monthly accounting periods for expense tracking."""
    __tablename__ = "month_periods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # "Октябрь 2025"
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    status = Column(String(20), nullable=False, default=MonthPeriodStatus.ACTIVE)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business", back_populates="month_periods")
    expense_records = relationship("ExpenseRecord", back_populates="month_period")
    inventory_balances = relationship("InventoryBalance", back_populates="month_period")


class ExpenseSection(Base):
    """Sections for organizing expense categories (e.g., Coffee & Beans, Dairy Products).
    
    These are created at business level and reused across all periods.
    """
    __tablename__ = "expense_sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business")
    created_by_user = relationship("User")
    expense_categories = relationship("ExpenseCategory", back_populates="section")


class ExpenseCategory(Base):
    """Categories of items within sections (e.g., Arabica Coffee, 3.2% Milk).
    
    These are created at business level and reused across all periods.
    Each category belongs to a section and has a default measurement unit.
    """
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    section_id = Column(Integer, ForeignKey("expense_sections.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)  # For easier queries
    default_unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    section = relationship("ExpenseSection", back_populates="expense_categories")
    business = relationship("Business")
    default_unit = relationship("Unit")
    created_by_user = relationship("User")
    invoice_items = relationship("InvoiceItem", back_populates="category")
    expense_records = relationship("ExpenseRecord", back_populates="category")
    inventory_balances = relationship("InventoryBalance", back_populates="category")


class InvoiceStatus(str, Enum):
    """Status of invoices."""
    PENDING = "pending"    # Not yet paid
    PAID = "paid"         # Fully paid
    CANCELLED = "cancelled"  # Cancelled invoice


class Invoice(Base):
    """Invoices from suppliers."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    invoice_number = Column(String(100), nullable=True)  # Invoice number from supplier
    invoice_date = Column(DateTime, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    paid_status = Column(String(20), nullable=False, default=InvoiceStatus.PENDING)
    paid_date = Column(DateTime, nullable=True)
    document_path = Column(String(500), nullable=True)  # Path to invoice document
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    business = relationship("Business")
    supplier = relationship("Supplier", back_populates="invoices")
    created_by_user = relationship("User")
    invoice_items = relationship("InvoiceItem", back_populates="invoice")


class InvoiceItem(Base):
    """Items within invoices."""
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    unit_price = Column(Numeric(12, 4), nullable=False)  # Price per unit
    total_price = Column(Numeric(12, 2), nullable=False)  # quantity * unit_price
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="invoice_items")
    category = relationship("ExpenseCategory", back_populates="invoice_items")
    unit = relationship("Unit")
    expense_records = relationship("ExpenseRecord", back_populates="invoice_item")


class ExpenseRecord(Base):
    """Daily usage records of inventory items."""
    __tablename__ = "expense_records"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    month_period_id = Column(Integer, ForeignKey("month_periods.id"), nullable=False)
    date = Column(DateTime, nullable=False)  # Date of usage
    quantity_used = Column(Numeric(10, 3), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    invoice_item_id = Column(Integer, ForeignKey("invoice_items.id"), nullable=True)  # Source of the item
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("ExpenseCategory", back_populates="expense_records")
    month_period = relationship("MonthPeriod", back_populates="expense_records")
    unit = relationship("Unit")
    invoice_item = relationship("InvoiceItem", back_populates="expense_records")
    created_by_user = relationship("User")


class InventoryBalance(Base):
    """Calculated inventory balances for each category per month."""
    __tablename__ = "inventory_balances"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    month_period_id = Column(Integer, ForeignKey("month_periods.id"), nullable=False)
    opening_balance = Column(Numeric(10, 3), nullable=False, default=0)  # Balance at month start
    purchases_total = Column(Numeric(10, 3), nullable=False, default=0)  # Total purchased in month
    usage_total = Column(Numeric(10, 3), nullable=False, default=0)     # Total used in month
    closing_balance = Column(Numeric(10, 3), nullable=False, default=0)  # Balance at month end
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    last_calculated = Column(DateTime, nullable=True)  # When last recalculated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("ExpenseCategory", back_populates="inventory_balances")
    month_period = relationship("MonthPeriod", back_populates="inventory_balances")
    unit = relationship("Unit")


class AuditAction(str, Enum):
    """Actions for audit trail."""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class AuditTrail(Base):
    """Audit trail for all financial operations."""
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)  # AuditAction enum
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    business = relationship("Business")
