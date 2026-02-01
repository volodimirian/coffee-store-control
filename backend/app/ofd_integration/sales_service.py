"""Service for managing OFD sales synchronization."""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, desc

from app.ofd_integration.models import (
    Sale,
    SaleItem,
    OFDConnection,
    ProductMapping,
)
from app.ofd_integration.service import OFDConnectionService
from app.core.security import decrypt_api_key
from app.core_models import Business
from app.expenses.models import Invoice


class SalesService:
    """Service for managing OFD sales synchronization."""

    # Provider limitations
    AQSI_MAX_DAYS = 90  # AQSI allows max 3 months

    @staticmethod
    async def _determine_sync_dates(
        session: AsyncSession,
        connection: OFDConnection,
        start_date: date | None,
        end_date: date | None,
    ) -> tuple[date, date]:
        """Determine actual sync dates based on various factors.
        
        Logic:
        1. If start_date provided → use it
        2. Else if last_sync_at exists → use it as start
        3. Else check for last invoice date in business
        4. Else use business creation date
        5. Always limit to provider max range (e.g., 90 days for AQSI)
        
        Args:
            session: Database session
            connection: OFD connection
            start_date: User-provided start date (optional)
            end_date: User-provided end date (optional)
            
        Returns:
            Tuple of (actual_start_date, actual_end_date)
        """
        # Determine end date (default to today)
        actual_end_date = end_date or date.today()
        
        # Determine start date
        if start_date:
            # User explicitly provided start date
            actual_start_date = start_date
        elif connection.last_sync_at:
            # Use last sync date as starting point
            actual_start_date = connection.last_sync_at.date()
        else:
            # First time sync - need to determine starting point
            # Priority 1: Last invoice date
            last_invoice_result = await session.execute(
                select(Invoice.invoice_date)
                .where(Invoice.business_id == connection.business_id)
                .order_by(desc(Invoice.invoice_date))
                .limit(1)
            )
            last_invoice = last_invoice_result.scalar_one_or_none()
            
            if last_invoice:
                # Start from last invoice date
                actual_start_date = last_invoice.date() if isinstance(last_invoice, datetime) else last_invoice
            else:
                # Priority 2: Business creation date
                business_result = await session.execute(
                    select(Business.created_at)
                    .where(Business.id == connection.business_id)
                )
                business_created = business_result.scalar_one()
                actual_start_date = business_created.date()
        
        # Apply provider limitations (e.g., AQSI max 90 days)
        max_start_date = actual_end_date - timedelta(days=SalesService.AQSI_MAX_DAYS - 1)
        if actual_start_date < max_start_date:
            # Date range too large, limit it
            actual_start_date = max_start_date
        
        # Ensure start_date <= end_date
        if actual_start_date > actual_end_date:
            actual_start_date = actual_end_date
        
        return actual_start_date, actual_end_date

    @staticmethod
    async def sync_sales(
        session: AsyncSession,
        connection: OFDConnection,
        start_date: date | None,
        end_date: date | None,
        user_id: int,
    ) -> Dict[str, Any]:
        """Sync sales from OFD provider for date range.
        
        Args:
            session: Database session
            connection: OFD connection to sync from
            start_date: Start date for sync (optional, auto-determined)
            end_date: End date for sync (optional, defaults to today)
            user_id: ID of user initiating sync
            
        Returns:
            Dict with sync statistics: {
                "total_receipts": int,
                "new_receipts": int,
                "duplicate_receipts": int,
                "updated_receipts": int,
                "mapped_items": int,
                "unmapped_items": int,
                "errors": List[str],
                "actual_start_date": date,
                "actual_end_date": date
            }
        """
        # Determine actual sync dates
        actual_start_date, actual_end_date = await SalesService._determine_sync_dates(
            session=session,
            connection=connection,
            start_date=start_date,
            end_date=end_date
        )
        
        # Decrypt API key and get provider instance
        api_key = decrypt_api_key(connection.api_key_encrypted)
        base_url = connection.custom_base_url or connection.provider.base_url
        
        provider = OFDConnectionService._get_provider_instance(
            provider_code=connection.provider.code,
            api_key=api_key,
            base_url=base_url
        )
        
        # Fetch receipts from OFD
        receipts = await provider.get_receipts(
            from_date=actual_start_date,
            to_date=actual_end_date,
            limit=None  # Get all receipts
        )
        
        # Get all active mappings for this connection
        mappings_result = await session.execute(
            select(ProductMapping)
            .where(
                ProductMapping.connection_id == connection.id,
                ProductMapping.is_active
            )
            .options(selectinload(ProductMapping.tech_card_item))
        )
        mappings = list(mappings_result.scalars().all())
        
        # Create mapping lookup dict
        mapping_dict: Dict[str, ProductMapping] = {}
        for mapping in mappings:
            key = f"{mapping.ofd_product_id}_{mapping.ofd_product_name}"
            mapping_dict[key] = mapping
        
        # Statistics
        stats: Dict[str, Any] = {
            "total_receipts": len(receipts),
            "new_receipts": 0,
            "duplicate_receipts": 0,
            "updated_receipts": 0,
            "mapped_items": 0,
            "unmapped_items": 0,
            "errors": [],
            "actual_start_date": actual_start_date,
            "actual_end_date": actual_end_date
        }
        
        # Process each receipt
        for receipt_data in receipts:
            try:
                # Check if receipt already exists
                existing_result = await session.execute(
                    select(Sale)
                    .where(
                        Sale.connection_id == connection.id,
                        Sale.ofd_receipt_id == receipt_data.receipt_id
                    )
                    .options(selectinload(Sale.items))
                )
                existing_sale = existing_result.scalar_one_or_none()
                
                if existing_sale:
                    # Update existing receipt (updated_at will be set automatically by SQLAlchemy onupdate)
                    existing_sale.receipt_datetime = datetime.fromisoformat(
                        receipt_data.receipt_datetime.replace("Z", "+00:00")
                    )
                    existing_sale.total_amount = Decimal(receipt_data.total_amount)
                    existing_sale.fiscal_document_number = receipt_data.fiscal_document_number
                    existing_sale.fiscal_sign = receipt_data.fiscal_sign
                    existing_sale.raw_data = receipt_data.raw_data
                    
                    # Delete old items and recreate
                    for old_item in existing_sale.items:
                        await session.delete(old_item)
                    await session.flush()
                    
                    sale = existing_sale
                    stats["updated_receipts"] = stats["updated_receipts"] + 1
                else:
                    # Create new Sale record
                    sale = Sale(
                        business_id=connection.business_id,
                        connection_id=connection.id,
                        ofd_receipt_id=receipt_data.receipt_id,
                        receipt_datetime=datetime.fromisoformat(
                            receipt_data.receipt_datetime.replace("Z", "+00:00")
                        ),
                        total_amount=Decimal(receipt_data.total_amount),
                        fiscal_document_number=receipt_data.fiscal_document_number,
                        fiscal_sign=receipt_data.fiscal_sign,
                        raw_data=receipt_data.raw_data,
                        processing_status="pending",
                        imported_at=datetime.utcnow(),
                        imported_by=user_id,
                    )
                    session.add(sale)
                    await session.flush()  # Get sale.id
                    stats["new_receipts"] = stats["new_receipts"] + 1
                
                # Process receipt items
                items_data = receipt_data.items
                for item_data in items_data:
                    ofd_product_id = item_data.product_id
                    ofd_product_name = item_data.product_name
                    
                    # Try to find mapping
                    mapping_key = f"{ofd_product_id}_{ofd_product_name}"
                    product_mapping: ProductMapping | None = mapping_dict.get(mapping_key)
                    
                    is_mapped = product_mapping is not None
                    product_mapping_id = product_mapping.id if product_mapping else None
                    tech_card_item_id = product_mapping.tech_card_item_id if product_mapping else None
                    
                    if is_mapped:
                        stats["mapped_items"] = stats["mapped_items"] + 1
                    else:
                        stats["unmapped_items"] = stats["unmapped_items"] + 1
                    
                    # Create SaleItem
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        product_mapping_id=product_mapping_id,
                        tech_card_item_id=tech_card_item_id,
                        ofd_product_id=ofd_product_id,
                        ofd_product_name=ofd_product_name,
                        quantity=Decimal(item_data.quantity),
                        price=Decimal(item_data.price),
                        total=Decimal(item_data.total),
                        is_mapped=is_mapped,
                        processed=False,
                    )
                    session.add(sale_item)
                
                stats["new_receipts"] = stats["new_receipts"] + 1
                
            except Exception as e:
                stats["errors"].append(
                    f"Receipt {receipt_data.receipt_id}: {str(e)}"
                )
                continue
        
        return stats

    @staticmethod
    async def get_sales_by_business(
        session: AsyncSession,
        business_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[List[Sale], int]:
        """Get sales for a business with optional date filtering."""
        query = (
            select(Sale)
            .where(Sale.business_id == business_id)
            .options(selectinload(Sale.items))
            .order_by(Sale.receipt_datetime.desc())
        )
        
        if start_date:
            query = query.where(Sale.receipt_datetime >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.where(Sale.receipt_datetime <= datetime.combine(end_date, datetime.max.time()))
        
        # Get total count
        count_result = await session.execute(
            select(Sale.id).where(Sale.business_id == business_id)
        )
        total = len(list(count_result.scalars().all()))
        
        # Get paginated results
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await session.execute(query)
        sales = list(result.scalars().all())
        
        return sales, total

    @staticmethod
    async def get_sale_by_id(
        session: AsyncSession,
        sale_id: int,
    ) -> Sale | None:
        """Get sale by ID with items."""
        result = await session.execute(
            select(Sale)
            .where(Sale.id == sale_id)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.tech_card_item),
                selectinload(Sale.items).selectinload(SaleItem.product_mapping),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_unmapped_items(
        session: AsyncSession,
        business_id: int,
        limit: int = 100,
    ) -> List[SaleItem]:
        """Get unmapped sale items for a business."""
        result = await session.execute(
            select(SaleItem)
            .join(Sale)
            .where(
                Sale.business_id == business_id,
                SaleItem.is_mapped == False  # noqa: E712
            )
            .options(selectinload(SaleItem.sale))
            .order_by(Sale.receipt_datetime.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
