"""
Schemas for inventory tracking summary endpoint.
Optimized to reduce N+1 queries by returning all data in one call.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class PurchaseDetailSchema(BaseModel):
    """Purchase detail for tooltip display."""
    invoice_number: str
    original_quantity: Decimal
    original_unit_id: Optional[int] = None
    original_unit_symbol: Optional[str] = None
    converted_quantity: Optional[Decimal] = None
    was_converted: bool


class SaleExpenseDetailSchema(BaseModel):
    """Sales expense detail (from OFD receipts) for modal display."""
    sale_id: int
    receipt_id: str  # OFD receipt ID
    receipt_datetime: str  # ISO format
    tech_card_item_name: str  # What product was sold
    quantity_sold: Decimal  # How many portions sold
    ingredient_quantity: Decimal  # Quantity as stored in DB (in ingredient's unit)
    unit_symbol: str  # Unit symbol from expense record
    cost: Decimal  # Ingredient cost for this deduction


class DayDataSchema(BaseModel):
    """Data for a single day."""
    date: str  # YYYY-MM-DD format
    purchases_qty: Decimal
    purchases_amount: Decimal
    usage_qty: Decimal  # From sale_ingredient_expenses (OFD sales)
    usage_amount: Decimal  # From sale_ingredient_expenses (OFD sales)
    purchase_details: list[PurchaseDetailSchema]
    sale_expense_details: list[SaleExpenseDetailSchema]  # Details for modal


class CategoryDataSchema(BaseModel):
    """Category with its daily data."""
    category_id: int
    category_name: str
    unit_symbol: str
    default_unit_id: int  # For unit conversion selector
    daily_data: list[DayDataSchema]


class SectionDataSchema(BaseModel):
    """Section with categories and their data."""
    section_id: int
    section_name: str
    categories: list[CategoryDataSchema]


class InventoryTrackingSummaryResponse(BaseModel):
    """Complete inventory tracking data for a month."""
    year: int
    month: int
    sections: list[SectionDataSchema]
