"""Technology Card schemas for API validation and serialization."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# ========== TechCardItemIngredient Schemas ==========

class TechCardItemIngredientBase(BaseModel):
    """Base schema for tech card item ingredient."""
    ingredient_category_id: int = Field(..., description="ID of ingredient category")
    quantity: Decimal = Field(..., gt=0, max_digits=10, decimal_places=3, description="Quantity required")
    unit_id: int = Field(..., description="Unit of measurement")
    notes: Optional[str] = Field(None, max_length=500, description="Optional preparation notes")
    sort_order: int = Field(default=0, description="Display order")


class TechCardItemIngredientCreate(TechCardItemIngredientBase):
    """Schema for creating a tech card item ingredient."""
    pass


class TechCardItemIngredientUpdate(BaseModel):
    """Schema for updating a tech card item ingredient."""
    ingredient_category_id: Optional[int] = None
    quantity: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=3)
    unit_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)
    sort_order: Optional[int] = None


class TechCardItemIngredientOut(TechCardItemIngredientBase):
    """Schema for tech card item ingredient output."""
    id: int
    item_id: int
    created_at: datetime
    
    # Nested data (populated by service layer)
    ingredient_category_name: Optional[str] = None
    unit_name: Optional[str] = None
    unit_symbol: Optional[str] = None
    estimated_cost: Optional[Decimal] = None  # Cost for this ingredient in recipe

    model_config = ConfigDict(from_attributes=True)


# ========== TechCardItem Schemas ==========

class TechCardItemBase(BaseModel):
    """Base schema for tech card item."""
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    category_id: int = Field(..., description="Category this product belongs to")
    description: Optional[str] = Field(None, max_length=1000, description="Product description")
    selling_price: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2, description="Selling price")
    is_active: bool = Field(default=True, description="Whether product is active")


class TechCardItemCreate(TechCardItemBase):
    """Schema for creating a tech card item."""
    ingredients: list[TechCardItemIngredientCreate] = Field(default_factory=list, description="Recipe ingredients")


class TechCardItemUpdate(BaseModel):
    """Schema for updating a tech card item."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=1000)
    selling_price: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    is_active: Optional[bool] = None
    ingredients: Optional[list[TechCardItemIngredientCreate]] = None


class TechCardItemOut(TechCardItemBase):
    """Schema for tech card item output."""
    id: int
    business_id: int
    approval_status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    # Nested data
    ingredients: list[TechCardItemIngredientOut] = Field(default_factory=list)
    total_ingredient_cost: Optional[Decimal] = None  # Sum of all ingredient costs
    profit_margin: Optional[Decimal] = None  # selling_price - total_ingredient_cost
    profit_percentage: Optional[float] = None  # (profit_margin / selling_price) * 100
    category_name: Optional[str] = None
    created_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TechCardItemListOut(BaseModel):
    """Schema for paginated tech card items list."""
    items: list[TechCardItemOut]
    total: int
    page: int
    page_size: int


class TechCardItemApprovalUpdate(BaseModel):
    """Schema for approving/rejecting tech card item."""
    approval_status: str = Field(..., pattern="^(approved|rejected)$", description="New approval status")
    notes: Optional[str] = Field(None, max_length=500, description="Approval/rejection notes")


# ========== IngredientCostHistory Schemas ==========

class IngredientCostOut(BaseModel):
    """Schema for ingredient cost history output."""
    id: int
    category_id: int
    category_name: str
    cost_per_unit: Decimal
    unit_id: int
    unit_name: str
    unit_symbol: str
    purchase_date: date
    quantity_purchased: Decimal
    total_cost: Decimal
    invoice_id: int
    invoice_number: Optional[str] = None
    supplier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngredientCostSummary(BaseModel):
    """Summary of ingredient costs for calculation."""
    category_id: int
    category_name: str
    average_cost_per_base_unit: Decimal  # Weighted average in base unit
    base_unit_name: str
    base_unit_symbol: str
    invoices_analyzed: int
    date_range_from: Optional[date] = None
    date_range_to: Optional[date] = None


# ========== StartingInventory Schemas ==========

class StartingInventoryBase(BaseModel):
    """Base schema for starting inventory."""
    category_id: int = Field(..., description="Ingredient category")
    quantity: Decimal = Field(..., gt=0, max_digits=10, decimal_places=3, description="Initial quantity")
    unit_id: int = Field(..., description="Unit of measurement")
    inventory_date: date = Field(..., description="Inventory date")
    notes: Optional[str] = Field(None, max_length=500, description="Notes")


class StartingInventoryCreate(StartingInventoryBase):
    """Schema for creating starting inventory."""
    pass


class StartingInventoryOut(StartingInventoryBase):
    """Schema for starting inventory output."""
    id: int
    business_id: int
    created_by: int
    created_at: datetime
    
    # Nested data
    category_name: Optional[str] = None
    unit_name: Optional[str] = None
    unit_symbol: Optional[str] = None
    created_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StartingInventoryListOut(BaseModel):
    """Schema for paginated starting inventory list."""
    items: list[StartingInventoryOut]
    total: int
    page: int
    page_size: int


# ========== Inventory Balance Schemas ==========

class InventoryBalanceOut(BaseModel):
    """Schema for current inventory balance calculation."""
    category_id: int
    category_name: str
    current_balance: Decimal  # In base unit
    base_unit_name: str
    base_unit_symbol: str
    starting_inventory: Optional[Decimal] = None
    total_income: Decimal = Field(default=Decimal("0"))
    total_expense: Decimal = Field(default=Decimal("0"))
    last_updated: Optional[datetime] = None


class InventoryBalanceListOut(BaseModel):
    """Schema for inventory balance list."""
    balances: list[InventoryBalanceOut]
    as_of_date: date
