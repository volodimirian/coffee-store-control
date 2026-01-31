"""Base abstract class for OFD providers."""
from abc import ABC, abstractmethod
from datetime import date
from typing import List
from pydantic import BaseModel


class OFDReceipt(BaseModel):
    """Unified receipt format."""
    receipt_id: str
    receipt_datetime: str  # ISO format
    total_amount: str
    fiscal_document_number: str | None = None
    fiscal_sign: str | None = None
    items: List['OFDReceiptItem']
    raw_data: dict  # Original data from OFD


class OFDReceiptItem(BaseModel):
    """Receipt line item."""
    product_id: str | None = None  # Product ID from OFD (if available)
    product_name: str  # Product name
    quantity: str
    price: str
    total: str


class OFDProduct(BaseModel):
    """Product from OFD nomenclature."""
    product_id: str | None = None  # Product ID (if available)
    product_name: str  # Product name
    category: str | None = None  # Category (if provided)


class OFDProviderBase(ABC):
    """Base class for OFD providers."""
    
    def __init__(self, api_key: str, base_url: str):
        """Initialize OFD provider.
        
        Args:
            api_key: Client API key (decrypted)
            base_url: API URL (from DB: custom_base_url or provider.base_url)
        """
        self.api_key = api_key
        self.base_url = base_url
    
    @abstractmethod
    async def validate_credentials(self) -> bool:
        """Validate connection and credentials."""
        pass
    
    @abstractmethod
    async def get_products(self) -> List[OFDProduct]:
        """Get list of products from OFD nomenclature.
        
        Used for mapping setup - allows retrieving all products
        sold through the cash register.
        """
        pass
    
    @abstractmethod
    async def get_receipts(
        self,
        from_date: date,
        to_date: date,
        limit: int | None = None
    ) -> List[OFDReceipt]:
        """Get receipts for a date range."""
        pass
    
    @abstractmethod
    async def get_receipt_details(self, receipt_id: str) -> OFDReceipt:
        """Get receipt details by ID."""
        pass
