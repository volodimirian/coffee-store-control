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


class DayDataSchema(BaseModel):
    """Data for a single day."""
    date: str  # YYYY-MM-DD format
    purchases_qty: Decimal
    purchases_amount: Decimal
    usage_qty: Decimal  # TODO: From expense records
    usage_amount: Decimal  # TODO: From expense records
    purchase_details: list[PurchaseDetailSchema]


class CategoryDataSchema(BaseModel):
    """Category with its daily data."""
    category_id: int
    category_name: str
    unit_symbol: str
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
