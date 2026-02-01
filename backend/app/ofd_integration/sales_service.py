"""Service for managing OFD sales synchronization."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.ofd_integration.models import (
    Sale,
    SaleItem,
    OFDConnection,
    ProductMapping,
)
from app.ofd_integration.service import OFDConnectionService
from app.core.security import decrypt_api_key


class SalesService:
    """Service for managing OFD sales synchronization."""

    @staticmethod
    async def sync_sales(
        session: AsyncSession,
        connection: OFDConnection,
        start_date: date,
        end_date: date,
        user_id: int,
    ) -> Dict[str, Any]:
        """Sync sales from OFD provider for date range.
        
        Args:
            session: Database session
            connection: OFD connection to sync from
            start_date: Start date for sync
            end_date: End date for sync
            user_id: ID of user initiating sync
            
        Returns:
            Dict with sync statistics: {
                "total_receipts": int,
                "new_receipts": int,
                "duplicate_receipts": int,
                "mapped_items": int,
                "unmapped_items": int,
                "errors": List[str]
            }
        """
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
            from_date=start_date,
            to_date=end_date,
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
            "mapped_items": 0,
            "unmapped_items": 0,
            "errors": []
        }
        
        # Process each receipt
        for receipt_data in receipts:
            try:
                # Check if receipt already exists
                existing = await session.execute(
                    select(Sale).where(
                        Sale.connection_id == connection.id,
                        Sale.ofd_receipt_id == receipt_data.receipt_id
                    )
                )
                if existing.scalar_one_or_none():
                    stats["duplicate_receipts"] = stats["duplicate_receipts"] + 1
                    continue
                
                # Create Sale record
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
