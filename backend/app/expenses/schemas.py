"""Pydantic schemas for expense tracking API."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field

from app.expenses.models import UnitType, MonthPeriodStatus, InvoiceStatus, AuditAction


# Unit schemas
class UnitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    symbol: str = Field(..., min_length=1, max_length=10)
    unit_type: UnitType
    base_unit_id: Optional[int] = None
    conversion_factor: Decimal = Field(default=Decimal("1.0"), ge=0)
    is_active: bool = True


class UnitCreate(UnitBase):
    business_id: int
    description: Optional[str] = Field(None, max_length=500)


class UnitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    symbol: Optional[str] = Field(None, min_length=1, max_length=10)
    unit_type: Optional[UnitType] = None
    base_unit_id: Optional[int] = None
    conversion_factor: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class UnitOut(UnitBase):
    id: int
    business_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UnitListOut(BaseModel):
    units: List[UnitOut]
    total: int


class UnitConversionRequest(BaseModel):
    quantity: Decimal = Field(..., gt=0)
    from_unit_id: int
    to_unit_id: int


class UnitConversionResponse(BaseModel):
    original_quantity: Decimal
    converted_quantity: Decimal
    from_unit: UnitOut
    to_unit: UnitOut


class UnitHierarchyResponse(BaseModel):
    hierarchy: Dict[str, List[UnitOut]]


# Supplier schemas
class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_info: Optional[Dict[str, Any]] = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    business_id: int


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_info: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: int
    business_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierListOut(BaseModel):
    suppliers: List[SupplierOut]
    total: int


# Month Period schemas
class MonthPeriodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    status: MonthPeriodStatus = MonthPeriodStatus.ACTIVE
    is_active: bool = True


class MonthPeriodCreate(MonthPeriodBase):
    business_id: int


class MonthPeriodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[MonthPeriodStatus] = None
    is_active: Optional[bool] = None


class MonthPeriodOut(MonthPeriodBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthPeriodListOut(BaseModel):
    periods: List[MonthPeriodOut]
    total: int


# Expense Section schemas
class ExpenseSectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    order_index: int = Field(default=0, ge=0)
    is_active: bool = True


class ExpenseSectionCreate(ExpenseSectionBase):
    business_id: int


class ExpenseSectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ExpenseSectionOut(ExpenseSectionBase):
    id: int
    business_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Expense Category schemas
class ExpenseCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    default_unit_id: int
    order_index: int = Field(default=0, ge=0)
    is_active: bool = True


class ExpenseCategoryCreate(ExpenseCategoryBase):
    section_id: int
    business_id: int


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    default_unit_id: Optional[int] = None
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ExpenseCategoryOut(ExpenseCategoryBase):
    id: int
    section_id: int
    business_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseSectionListOut(BaseModel):
    sections: List[ExpenseSectionOut]
    total: int


class ExpenseCategoryListOut(BaseModel):
    categories: List[ExpenseCategoryOut]
    total: int


class ExpenseSectionReorderRequest(BaseModel):
    section_orders: List[tuple[int, int]] = Field(..., description="List of (section_id, new_order) tuples")


class ExpenseCategoryReorderRequest(BaseModel):
    category_orders: List[tuple[int, int]] = Field(..., description="List of (category_id, new_order) tuples")


# Invoice schemas
class InvoiceBase(BaseModel):
    supplier_id: int
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: datetime
    total_amount: Decimal = Field(..., ge=0)
    paid_status: InvoiceStatus = InvoiceStatus.PENDING
    paid_date: Optional[datetime] = None
    document_path: Optional[str] = Field(None, max_length=500)


class InvoiceCreate(InvoiceBase):
    business_id: int


class InvoiceUpdate(BaseModel):
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[datetime] = None
    total_amount: Optional[Decimal] = Field(None, ge=0)
    paid_status: Optional[InvoiceStatus] = None
    paid_date: Optional[datetime] = None
    document_path: Optional[str] = Field(None, max_length=500)


class InvoiceOut(InvoiceBase):
    id: int
    business_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceListOut(BaseModel):
    invoices: List[InvoiceOut]
    total: int


# Invoice Item schemas
class InvoiceItemBase(BaseModel):
    category_id: int
    quantity: Decimal = Field(..., gt=0)
    unit_id: int
    unit_price: Decimal = Field(..., ge=0)
    total_price: Decimal = Field(..., ge=0)


class InvoiceItemCreate(InvoiceItemBase):
    invoice_id: int


class InvoiceItemUpdate(BaseModel):
    category_id: Optional[int] = None
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit_id: Optional[int] = None
    unit_price: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)


class InvoiceItemOut(InvoiceItemBase):
    id: int
    invoice_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceItemOutWithConversion(InvoiceItemOut):
    """Extended invoice item with unit conversion info for display."""
    converted_quantity: Optional[Decimal] = None
    original_unit_id: Optional[int] = None
    original_quantity: Optional[Decimal] = None
    invoice_number: Optional[str] = None

    class Config:
        from_attributes = True


# Expense Record schemas (РАСХОД товара из партии)
class ExpenseRecordBase(BaseModel):
    category_id: int
    date: datetime
    quantity_used: Decimal = Field(..., gt=0)
    unit_id: int
    invoice_item_id: Optional[int] = None  # From which batch the item was taken


class ExpenseRecordCreate(ExpenseRecordBase):
    month_period_id: int


class ExpenseRecordUpdate(BaseModel):
    category_id: Optional[int] = None
    date: Optional[datetime] = None
    quantity_used: Optional[Decimal] = Field(None, gt=0)
    unit_id: Optional[int] = None
    invoice_item_id: Optional[int] = None


class ExpenseRecordOut(ExpenseRecordBase):
    id: int
    month_period_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Inventory Balance schemas
class InventoryBalanceBase(BaseModel):
    category_id: int
    month_period_id: int
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0)
    purchases_total: Decimal = Field(default=Decimal("0"), ge=0)
    usage_total: Decimal = Field(default=Decimal("0"), ge=0)
    closing_balance: Decimal = Field(default=Decimal("0"), ge=0)
    unit_id: int
    last_calculated: Optional[datetime] = None


class InventoryBalanceOut(InventoryBalanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Audit Trail schemas
class AuditTrailOut(BaseModel):
    id: int
    table_name: str
    record_id: int
    action: AuditAction
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    user_id: int
    business_id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# Combined schemas for complex operations
class InvoiceWithItemsCreate(BaseModel):
    invoice: InvoiceCreate
    items: List[InvoiceItemCreate]


class ExpenseSectionWithCategories(BaseModel):
    section: ExpenseSectionOut
    categories: List[ExpenseCategoryOut]


class MonthPeriodWithStructure(BaseModel):
    period: MonthPeriodOut
    sections: List[ExpenseSectionWithCategories]


# Summary and report schemas
class CategorySummary(BaseModel):
    category_id: int
    category_name: str
    opening_balance: Decimal
    purchases_total: Decimal
    usage_total: Decimal
    closing_balance: Decimal
    average_unit_price: Decimal
    unit_symbol: str


class SectionSummary(BaseModel):
    section_id: int
    section_name: str
    categories: List[CategorySummary]
    total_purchases: Decimal
    total_usage: Decimal


class MonthSummary(BaseModel):
    month_period_id: int
    period_name: str
    sections: List[SectionSummary]
    grand_total_purchases: Decimal
    grand_total_usage: Decimal
