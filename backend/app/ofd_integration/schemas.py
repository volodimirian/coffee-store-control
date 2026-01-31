"""Pydantic schemas for OFD Integration API."""

from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field


# ========== OFD Provider Schemas ==========
class OFDProviderBase(BaseModel):
    code: str
    name: str
    base_url: str
    is_active: bool = True
    description: str | None = None


class OFDProviderResponse(OFDProviderBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== OFD Connection Schemas ==========
class OFDConnectionCreate(BaseModel):
    provider_id: int
    api_key: str = Field(..., description="Plain API key, will be encrypted")
    custom_base_url: str | None = None


class OFDConnectionUpdate(BaseModel):
    api_key: str | None = Field(None, description="Plain API key, will be encrypted")
    custom_base_url: str | None = None
    is_active: bool | None = None


class OFDConnectionResponse(BaseModel):
    id: int
    business_id: int
    provider_id: int
    provider_name: str = Field(..., description="Provider name from relationship")
    is_active: bool
    last_sync_at: datetime | None
    last_sync_status: str | None
    last_sync_error: str | None
    first_import_date: date | None
    last_imported_date: date | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OFDConnectionTestResponse(BaseModel):
    success: bool
    error: str | None = None


# ========== Product Mapping Schemas ==========
class ProductMappingCreate(BaseModel):
    ofd_product_id: str | None = None
    ofd_product_name: str
    tech_card_item_id: int


class ProductMappingBulkCreate(BaseModel):
    mappings: list[ProductMappingCreate] = Field(..., min_length=1)


class ProductMappingUpdate(BaseModel):
    tech_card_item_id: int | None = None
    is_active: bool | None = None


class ProductMappingResponse(BaseModel):
    id: int
    connection_id: int
    ofd_product_id: str | None
    ofd_product_name: str
    tech_card_item_id: int
    tech_card_item_name: str = Field(..., description="From relationship")
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== Sale Schemas ==========
class SaleItemResponse(BaseModel):
    id: int
    ofd_product_id: str | None
    ofd_product_name: str
    quantity: Decimal
    price: Decimal
    total: Decimal
    is_mapped: bool
    processed: bool
    tech_card_item_id: int | None
    tech_card_item_name: str | None = None

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: int
    business_id: int
    connection_id: int
    ofd_receipt_id: str
    receipt_datetime: datetime
    total_amount: Decimal
    fiscal_document_number: str | None
    fiscal_sign: str | None
    processing_status: str
    processing_error: str | None
    processed_at: datetime | None
    imported_at: datetime
    items_count: int = Field(..., description="Count of sale items")

    class Config:
        from_attributes = True


class SaleDetailResponse(SaleResponse):
    items: list[SaleItemResponse]
    raw_data: dict


class SaleSyncRequest(BaseModel):
    from_date: date | None = None
    to_date: date | None = None


class SaleSyncResponse(BaseModel):
    imported: int
    updated: int
    skipped: int
    period_from: date
    period_to: date


# ========== Ingredient Expense Schemas ==========
class SaleIngredientExpenseResponse(BaseModel):
    id: int
    sale_item_id: int
    tech_card_item_id: int
    tech_card_item_name: str
    category_id: int
    category_name: str
    quantity: Decimal
    unit_id: int
    unit_name: str
    cost: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ========== OFD Product (from provider) ==========
class OFDProductResponse(BaseModel):
    """Product from OFD provider's nomenclature."""

    product_id: str | None
    product_name: str
    category: str | None = None
