"""Mock OFD provider for development and testing."""
from datetime import date, datetime, timedelta
from typing import List
from .base import OFDProviderBase, OFDReceipt, OFDReceiptItem, OFDProduct


class MockOFDProvider(OFDProviderBase):
    """Mock implementation for development and testing."""
    
    async def validate_credentials(self) -> bool:
        """Validate credentials - always succeeds for Mock."""
        # Mock API key validation
        return self.api_key == "mock_api_key" or len(self.api_key) > 0
    
    async def get_products(self) -> List[OFDProduct]:
        """Return test product list."""
        return [
            OFDProduct(
                product_id="1",
                product_name="Cappuccino",
                category="Beverages"
            ),
            OFDProduct(
                product_id="2",
                product_name="Americano",
                category="Beverages"
            ),
            OFDProduct(
                product_id="3",
                product_name="Latte",
                category="Beverages"
            ),
            OFDProduct(
                product_id="4",
                product_name="Espresso",
                category="Beverages"
            ),
            OFDProduct(
                product_id="5",
                product_name="Croissant",
                category="Bakery"
            ),
            OFDProduct(
                product_id="6",
                product_name="Cheesecake",
                category="Desserts"
            ),
        ]
    
    async def get_receipts(
        self,
        from_date: date,
        to_date: date,
        limit: int | None = None
    ) -> List[OFDReceipt]:
        """Generate test receipts for date range."""
        receipts = []
        
        # Generate 2-3 receipts per day in the period
        current_date = from_date
        receipt_counter = 1
        
        while current_date <= to_date:
            # Generate 2-3 receipts per day
            for hour in [10, 14, 16]:
                receipt_time = datetime.combine(current_date, datetime.min.time()).replace(hour=hour, minute=30)
                
                receipt = OFDReceipt(
                    receipt_id=f"MOCK-{receipt_time.strftime('%Y%m%d')}-{receipt_counter:04d}",
                    receipt_datetime=receipt_time.isoformat(),
                    total_amount="450.00",
                    fiscal_document_number=f"FD{receipt_counter:08d}",
                    fiscal_sign=f"FS{receipt_counter:010d}",
                    items=[
                        OFDReceiptItem(
                            product_id="1",
                            product_name="Cappuccino",
                            quantity="2",
                            price="150.00",
                            total="300.00"
                        ),
                        OFDReceiptItem(
                            product_id="5",
                            product_name="Croissant",
                            quantity="1",
                            price="150.00",
                            total="150.00"
                        ),
                    ],
                    raw_data={
                        "mock": True,
                        "receipt_id": f"MOCK-{receipt_time.strftime('%Y%m%d')}-{receipt_counter:04d}",
                        "timestamp": receipt_time.isoformat(),
                        "generated_by": "MockOFDProvider"
                    }
                )
                
                receipts.append(receipt)
                receipt_counter += 1
                
                if limit and len(receipts) >= limit:
                    return receipts
            
            current_date += timedelta(days=1)
        
        return receipts
    
    async def get_receipt_details(self, receipt_id: str) -> OFDReceipt:
        """Get details of a specific receipt."""
        # Parse ID to generate consistent data
        parts = receipt_id.split('-')
        if len(parts) >= 3:
            date_str = parts[1]
            counter = parts[2]
        else:
            date_str = datetime.now().strftime('%Y%m%d')
            counter = "0001"
        
        receipt_time = datetime.strptime(date_str, '%Y%m%d').replace(hour=12, minute=0)
        
        return OFDReceipt(
            receipt_id=receipt_id,
            receipt_datetime=receipt_time.isoformat(),
            total_amount="600.00",
            fiscal_document_number=f"FD{counter}",
            fiscal_sign=f"FS{counter.zfill(10)}",
            items=[
                OFDReceiptItem(
                    product_id="2",
                    product_name="Americano",
                    quantity="2",
                    price="120.00",
                    total="240.00"
                ),
                OFDReceiptItem(
                    product_id="3",
                    product_name="Latte",
                    quantity="1",
                    price="180.00",
                    total="180.00"
                ),
                OFDReceiptItem(
                    product_id="6",
                    product_name="Cheesecake",
                    quantity="1",
                    price="180.00",
                    total="180.00"
                ),
            ],
            raw_data={
                "mock": True,
                "receipt_id": receipt_id,
                "timestamp": receipt_time.isoformat(),
                "generated_by": "MockOFDProvider",
                "details": True
            }
        )
