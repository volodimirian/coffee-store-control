"""AQSI OFD provider implementation."""
from datetime import date, datetime, timedelta
from typing import List
import httpx
from .base import OFDProviderBase, OFDReceipt, OFDReceiptItem, OFDProduct


class AqsiOFDProvider(OFDProviderBase):
    """AQSI OFD provider implementation.
    
    API Documentation: https://api.aqsi.ru/
    Base URL: https://api.aqsi.ru/
    Authentication: x-client-key header
    
    AQSI Limitations:
    - Maximum date range per request: 90 days
    - Provider automatically splits larger ranges into chunks
    """
    
    DEFAULT_PAGE_SIZE = 25
    MAX_PAGE_SIZE = 100
    TIMEOUT_SECONDS = 30
    MAX_DATE_RANGE_DAYS = 90  # AQSI limitation
    
    def __init__(self, api_key: str, base_url: str):
        """Initialize AQSI provider.
        
        Args:
            api_key: API key for authentication (x-client-key header)
            base_url: API base URL (e.g., https://api.aqsi.ru/)
        """
        super().__init__(api_key, base_url)
        self.base_url = base_url.rstrip('/')
        
    def _get_headers(self) -> dict:
        """Get HTTP headers with authentication."""
        return {
            "x-client-key": f"Application {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def validate_credentials(self) -> bool:
        """Validate API credentials by making a test request.
        
        Returns:
            True if credentials are valid, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT_SECONDS) as client:
                # Try to fetch first page of goods to validate credentials
                # Using v2/Goods list endpoint as it's simple and doesn't require parameters
                url = f"{self.base_url}/v2/Goods/list"
                headers = self._get_headers()
                params = {"pageSize": 1, "page": 1} 
                response = await client.get(url, headers=headers, params=params)
                
                # 200 = valid credentials, any other status = invalid
                if response.status_code == 200:
                    print("[AQSI] Credentials valid!")
                    return True
                else:
                    # Log error status for debugging
                    print(f"[AQSI] Credentials validation failed with status {response.status_code}")
                    return False
                    
        except httpx.HTTPError as e:
            print(f"AQSI credentials validation failed with HTTP error: {e}")
            return False
        except Exception as e:
            print(f"AQSI credentials validation failed: {e}")
            return False
    
    async def get_products(self) -> List[OFDProduct]:
        """Fetch product list from AQSI API.
        
        Uses /v2/Goods endpoint to retrieve all products.
        
        Returns:
            List of OFDProduct objects
        """
        products = []
        page = 0
        has_more = True
        
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT_SECONDS) as client:
                while has_more:
                    # AQSI API v2 uses GET for Goods list endpoint
                    response = await client.get(
                        f"{self.base_url}/v2/Goods/list",
                        headers=self._get_headers(),
                        params={
                            "pageSize": self.MAX_PAGE_SIZE,
                            "pageNumber": page
                        }
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    
                    # Check if we have goods in response
                    goods_list = data.get("rows", [])
                    if not goods_list:
                        has_more = False
                        break
                    
                    # Process each good
                    for good in goods_list:
                        product_id = good.get("id", "")
                        product_name = (good.get("name", "") or "").strip()
                        
                        # Debug: log all products including deleted ones
                        print(f"[AQSI] Product: ID={product_id}, Name={product_name}")
                            
                        product = OFDProduct(
                            product_id=product_id,
                            product_name=product_name,
                            category=good.get("group_id", "")  # Using group_id as category
                        )
                        products.append(product)
                    
                    # Check if there are more pages
                    total_pages = data.get("pages", 1)
                    if page >= total_pages:
                        has_more = False
                    else:
                        page += 1
                        
        except httpx.HTTPError as e:
            print(f"AQSI API HTTP error while fetching products: {e}")
            raise Exception(f"Failed to fetch products from AQSI: {str(e)}")
        except Exception as e:
            print(f"Error fetching products from AQSI: {e}")
            raise Exception(f"Failed to process products from AQSI: {str(e)}")
        
        print(f"[AQSI] Total products loaded: {len(products)}")
        return products
    
    async def get_receipts(
        self,
        from_date: date,
        to_date: date,
        limit: int | None = None
    ) -> List[OFDReceipt]:
        """Fetch receipts from AQSI API for specified date range.
        
        Automatically handles AQSI 90-day limitation by splitting large date ranges
        into multiple API requests.
        
        Args:
            from_date: Start date (inclusive)
            to_date: End date (inclusive)
            limit: Maximum number of receipts to return (None = no limit)
            
        Returns:
            List of OFDReceipt objects
        """
        # Calculate total days
        total_days = (to_date - from_date).days + 1
        
        # If range <= 90 days, fetch in one go
        if total_days <= self.MAX_DATE_RANGE_DAYS:
            return await self._fetch_receipts_chunk(from_date, to_date, limit)
        
        # Split into 90-day chunks
        all_receipts: List[OFDReceipt] = []
        current_start = from_date
        
        while current_start <= to_date:
            # Calculate chunk end date (max 90 days)
            chunk_end = min(
                current_start + timedelta(days=self.MAX_DATE_RANGE_DAYS - 1),
                to_date
            )
            
            # Fetch chunk
            chunk_receipts = await self._fetch_receipts_chunk(
                current_start,
                chunk_end,
                limit - len(all_receipts) if limit else None
            )
            all_receipts.extend(chunk_receipts)
            
            # Check if we hit the limit
            if limit and len(all_receipts) >= limit:
                return all_receipts[:limit]
            
            # Move to next chunk
            current_start = chunk_end + timedelta(days=1)
        
        return all_receipts
    
    async def _fetch_receipts_chunk(
        self,
        from_date: date,
        to_date: date,
        limit: int | None = None
    ) -> List[OFDReceipt]:
        """Fetch receipts for a single chunk (max 90 days).
        
        Internal method - use get_receipts() for public API.
        """
        receipts = []
        page = 1
        has_more = True
        
        # AQSI API expects ISO 8601 format with timezone
        # Adding one day to to_date as API uses non-inclusive end date
        from_datetime = datetime.combine(from_date, datetime.min.time()).isoformat()
        to_datetime = datetime.combine(
            to_date + timedelta(days=1),
            datetime.min.time()
        ).isoformat()
        
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT_SECONDS) as client:
                while has_more:
                    params: dict[str, str | int] = {
                        "pageSize": self.MAX_PAGE_SIZE,
                        "page": page,
                        "filtered.processedAtTzFrom": from_datetime,
                        "filtered.processedAtTzTo": to_datetime,
                        # Only get receipt type (not corrections)
                        "filtered.variant": "receipt"
                    }
                    
                    response = await client.get(
                        f"{self.base_url}/v4/Receipts",
                        headers=self._get_headers(),
                        params=params
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    
                    # Check if we have receipts in response
                    receipts_list = data.get("rows", [])
                    if not receipts_list:
                        has_more = False
                        break
                    
                    # Fetch details for each receipt
                    for receipt_summary in receipts_list:
                        receipt_id = receipt_summary.get("id")
                        if not receipt_id:
                            continue
                        
                        # Fetch full receipt details
                        detail_response = await client.get(
                            f"{self.base_url}/v4/Receipts/{receipt_id}",
                            headers=self._get_headers()
                        )
                        detail_response.raise_for_status()
                        
                        receipt_data = detail_response.json()
                        
                        # Parse receipt
                        receipt = self._parse_receipt(receipt_data)
                        if receipt:
                            receipts.append(receipt)
                            
                            # Check if we've hit the limit
                            if limit and len(receipts) >= limit:
                                has_more = False
                                break
                    
                    # Check if there are more pages
                    total_pages = data.get("pages", 1)
                    if page >= total_pages or (limit and len(receipts) >= limit):
                        has_more = False
                    else:
                        page += 1
                        
        except httpx.HTTPError as e:
            print(f"AQSI API HTTP error while fetching receipts: {e}")
            raise Exception(f"Failed to fetch receipts from AQSI: {str(e)}")
        except Exception as e:
            print(f"Error fetching receipts from AQSI: {e}")
            raise Exception(f"Failed to process receipts from AQSI: {str(e)}")
        
        return receipts[:limit] if limit else receipts
    
    def _parse_receipt(self, receipt_data: dict) -> OFDReceipt | None:
        """Parse AQSI receipt data into OFDReceipt format.
        
        Args:
            receipt_data: Raw receipt data from AQSI API
            
        Returns:
            OFDReceipt object or None if parsing fails
        """
        try:
            receipt_id = receipt_data.get("id", "")
            info = receipt_data.get("info", {})
            positions = receipt_data.get("positions", [])
            
            # Extract key information
            receipt_datetime = info.get("dateTime", "")
            doc_info = info.get("docInfo", {})
            fiscal_document_number = str(doc_info.get("number", ""))
            fiscal_sign = str(doc_info.get("fiscalAttribute", ""))
            total_amount = str(info.get("sum", 0) / 100)  # AQSI uses kopecks
            
            # Parse items
            items = []
            for pos in positions:
                # AQSI position structure (all data is in 'info' object):
                # - info.name: product name
                # - info.quantity: already in units (1 = 1 unit), NOT milliunits
                # - info.finalPrice: price in kopecks (25000 = 250.00 rubles)
                # - info.totalAmount: often 0, calculate instead
                # - externalId: at position level (not in info)
                
                pos_info = pos.get("info", {})
                product_name = (pos_info.get("name", "") or "").strip()
                
                # Get quantity (already in correct units, not milliunits!)
                quantity = pos_info.get("quantity", 0)
                
                # Get price in kopecks and convert to rubles
                final_price_kopecks = pos_info.get("finalPrice", 0)
                price_rubles = final_price_kopecks / 100
                
                # Calculate total (quantity * price)
                total_rubles = quantity * price_rubles

                item = OFDReceiptItem(
                    product_id=pos.get("externalId", ""),  # External ID at position level
                    product_name=product_name,
                    quantity=str(quantity),
                    price=str(price_rubles),
                    total=str(total_rubles)
                )
                items.append(item)
            
            return OFDReceipt(
                receipt_id=receipt_id,
                receipt_datetime=receipt_datetime,
                total_amount=total_amount,
                fiscal_document_number=fiscal_document_number,
                fiscal_sign=fiscal_sign,
                items=items,
                raw_data=receipt_data  # Store full raw data
            )
            
        except Exception as e:
            print(f"Error parsing AQSI receipt: {e}")
            return None
    
    async def get_receipt_details(self, receipt_id: str) -> OFDReceipt:
        """Get receipt details by ID from AQSI API.
        
        Args:
            receipt_id: Receipt ID
            
        Returns:
            OFDReceipt object
            
        Raises:
            Exception: If receipt not found or API error
        """
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT_SECONDS) as client:
                url = f"{self.base_url}/v4/Receipts/{receipt_id}"
                
                response = await client.get(
                    url,
                    headers=self._get_headers()
                )
                response.raise_for_status()
                
                receipt_data = response.json()
                
                # Parse receipt
                receipt = self._parse_receipt(receipt_data)
                
                if receipt is None:
                    raise Exception(f"Failed to parse receipt {receipt_id}")
                
                return receipt
                
        except httpx.HTTPStatusError as e:
            print(f"AQSI API HTTP error while fetching receipt {receipt_id}: {e}")
            raise Exception(f"Failed to fetch receipt from AQSI: {str(e)}")
        except Exception as e:
            print(f"Error fetching receipt {receipt_id} from AQSI: {e}")
            raise Exception(f"Failed to process receipt from AQSI: {str(e)}")
