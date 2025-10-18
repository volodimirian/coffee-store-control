"""Pydantic schemas for inventory balance API."""

from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field


class InventoryBalanceBase(BaseModel):
    """Base schema for inventory balance."""
    opening_balance: Decimal = Field(..., ge=0, description="Opening balance for the period")
    purchases_total: Decimal = Field(default=Decimal("0"), ge=0, description="Total purchases during the period")
    usage_total: Decimal = Field(default=Decimal("0"), ge=0, description="Total usage during the period")
    closing_balance: Decimal = Field(..., ge=0, description="Closing balance for the period")


class InventoryBalanceCreate(InventoryBalanceBase):
    """Schema for creating inventory balance."""
    expense_category_id: int = Field(..., gt=0, description="ID of the expense category")
    month_period_id: int = Field(..., gt=0, description="ID of the month period")
    unit_id: int = Field(..., gt=0, description="ID of the unit of measurement")


class InventoryBalanceUpdate(BaseModel):
    """Schema for updating inventory balance."""
    opening_balance: Optional[Decimal] = Field(None, ge=0, description="Opening balance for the period")
    purchases_total: Optional[Decimal] = Field(None, ge=0, description="Total purchases during the period")
    usage_total: Optional[Decimal] = Field(None, ge=0, description="Total usage during the period")


class InventoryBalanceResponse(InventoryBalanceBase):
    """Schema for inventory balance response."""
    id: int
    expense_category_id: int
    month_period_id: int
    unit_id: int
    last_calculated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LowStockCategoryResponse(BaseModel):
    """Schema for low stock category information."""
    category_id: int = Field(..., description="ID of the expense category")
    category_name: str = Field(..., description="Name of the expense category")
    current_balance: Decimal = Field(..., description="Current closing balance")
    unit_symbol: str = Field(..., description="Unit of measurement symbol")
    threshold: Decimal = Field(..., description="Low stock threshold")
    percentage_below_threshold: Decimal = Field(..., description="Percentage below the threshold")

    class Config:
        from_attributes = True


class BalanceRecalculationResponse(BaseModel):
    """Schema for balance recalculation response."""
    success: bool = Field(..., description="Whether the recalculation was successful")
    category_id: int = Field(..., description="ID of the expense category")
    month_period_id: int = Field(..., description="ID of the month period")
    new_balance: Optional[InventoryBalanceResponse] = Field(None, description="Updated balance record")
    message: str = Field(..., description="Result message")


class MonthlyUsageTrend(BaseModel):
    """Schema for monthly usage trend data."""
    month_period_id: int = Field(..., description="ID of the month period")
    year: int = Field(..., description="Year of the period")
    month: int = Field(..., description="Month of the period")
    usage_total: Decimal = Field(..., description="Total usage for the month")
    
    class Config:
        from_attributes = True


class CategoryUsageAnalytics(BaseModel):
    """Schema for category usage analytics."""
    category_id: int = Field(..., description="ID of the expense category")
    category_name: str = Field(..., description="Name of the expense category")
    average_monthly_usage: Decimal = Field(..., description="Average monthly usage")
    total_months_analyzed: int = Field(..., description="Number of months included in analysis")
    monthly_trends: list[MonthlyUsageTrend] = Field(default=[], description="Monthly usage trends")
    
    class Config:
        from_attributes = True


class PurchasePattern(BaseModel):
    """Schema for purchase pattern analysis."""
    month_period_id: int = Field(..., description="ID of the month period")
    year: int = Field(..., description="Year of the period")
    month: int = Field(..., description="Month of the period")
    purchases_total: Decimal = Field(..., description="Total purchases for the month")
    supplier_count: int = Field(..., description="Number of different suppliers")
    
    class Config:
        from_attributes = True


class CategoryPurchaseAnalytics(BaseModel):
    """Schema for category purchase analytics."""
    category_id: int = Field(..., description="ID of the expense category")
    category_name: str = Field(..., description="Name of the expense category")
    average_monthly_purchases: Decimal = Field(..., description="Average monthly purchases")
    total_months_analyzed: int = Field(..., description="Number of months included in analysis")
    purchase_patterns: list[PurchasePattern] = Field(default=[], description="Monthly purchase patterns")
    
    class Config:
        from_attributes = True