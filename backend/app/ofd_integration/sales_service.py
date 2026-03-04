"""Service for managing OFD sales synchronization."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any, cast

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.ofd_integration.models import (
    Sale,
    SaleItem,
    SaleIngredientExpense,
    OFDConnection,
    ProductMapping,
)
from app.ofd_integration.service import OFDConnectionService
from app.core.security import decrypt_api_key
from app.core_models import Business
from app.expenses.models import Invoice, InvoiceItem
from app.tech_cards.models import TechCardItem, TechCardItemIngredient


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
        3. Else check for FIRST (oldest) invoice date in business
        4. Else use business creation date
        
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
            # Priority 1: First (oldest) invoice date
            first_invoice_result = await session.execute(
                select(Invoice.invoice_date)
                .where(Invoice.business_id == connection.business_id)
                .order_by(Invoice.invoice_date.asc())  # ASC = oldest first
                .limit(1)
            )
            first_invoice = first_invoice_result.scalar_one_or_none()
            
            if first_invoice:
                # Start from first invoice date
                actual_start_date = first_invoice.date()
            else:
                # Priority 2: Business creation date
                business_result = await session.execute(
                    select(Business.created_at)
                    .where(Business.id == connection.business_id)
                )
                business_created = business_result.scalar_one()
                actual_start_date = business_created.date()
        
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
        
        Provider handles pagination/chunking based on its own limitations.
        
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
        
        # Fetch receipts from OFD (provider handles pagination/chunking)
        receipts = await provider.get_receipts(
            from_date=actual_start_date,
            to_date=actual_end_date,
            limit=None  # Get all receipts
        )
        
        print(f"[SalesService] Fetched {len(receipts)} receipts from OFD provider")
        
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
        
        # Create mapping lookup dicts (prefer OFD product ID)
        mapping_dict: Dict[str, ProductMapping] = {}
        mapping_name_dict: Dict[str, ProductMapping] = {}
        for mapping in mappings:
            normalized_name = (mapping.ofd_product_name or "").strip()
            if mapping.ofd_product_id:
                mapping_dict[mapping.ofd_product_id] = mapping
            if normalized_name:
                mapping_name_dict[normalized_name] = mapping
        
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
        
        # Type hint for errors list
        errors_list: List[str] = cast(List[str], stats["errors"])
        
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
                        items_count=0,
                        unmapped_items_count=0,
                    )
                    session.add(sale)
                    await session.flush()  # Get sale.id
                    stats["new_receipts"] = stats["new_receipts"] + 1
                
                # Process receipt items
                items_count = 0
                unmapped_count = 0
                items_data = receipt_data.items
                for item_data in items_data:
                    ofd_product_id = item_data.product_id
                    ofd_product_name = (item_data.product_name or "").strip()
                    
                    # Debug: log if product name is empty
                    if not ofd_product_name or ofd_product_name.strip() == "":
                        print(f"[SalesService] Warning: Empty product name for item in receipt {receipt_data.receipt_id}")
                        print(f"  product_id: {ofd_product_id}")
                        print(f"  raw item_data: {item_data}")
                    
                    # Try to find mapping
                    product_mapping: ProductMapping | None = None
                    if ofd_product_id:
                        product_mapping = mapping_dict.get(ofd_product_id)
                    if not product_mapping and ofd_product_name:
                        product_mapping = mapping_name_dict.get(ofd_product_name)
                    
                    is_mapped = product_mapping is not None
                    product_mapping_id = product_mapping.id if product_mapping else None
                    tech_card_item_id = product_mapping.tech_card_item_id if product_mapping else None
                    
                    if is_mapped:
                        stats["mapped_items"] = stats["mapped_items"] + 1
                    else:
                        stats["unmapped_items"] = stats["unmapped_items"] + 1
                        unmapped_count += 1
                    
                    items_count += 1
                    
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
                
                # Update sale counters
                sale.items_count = items_count
                sale.unmapped_items_count = unmapped_count
                
            except Exception as e:
                errors_list.append(
                    f"Receipt {receipt_data.receipt_id}: {str(e)}"
                )
                print(f"[SalesService] Error processing receipt {receipt_data.receipt_id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Commit changes to database
        print(f"[SalesService] Committing {stats['new_receipts']} new and {stats['updated_receipts']} updated receipts to database")
        await session.commit()
        print("[SalesService] Successfully committed all changes")
        
        # Process ingredients for mapped sale items (automatic deduction)
        print("[SalesService] Starting automatic ingredient deduction for mapped sales...")
        process_stats = await SalesService.process_sale_items(
            session=session,
            business_id=connection.business_id
        )
        
        # Add processing stats to main stats
        stats["ingredients_processed"] = process_stats["total_processed"]
        stats["ingredient_expenses_created"] = process_stats["expenses_created"]
        if process_stats["errors"]:
            stats["errors"].extend(process_stats["errors"])
        
        print("[SalesService] Ingredient processing completed")
        
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

    @staticmethod
    async def process_sale_items(
        session: AsyncSession,
        business_id: int,
    ) -> Dict[str, Any]:
        """Process unprocessed mapped sale items - deduct ingredients from inventory.
        
        For each mapped sale item that hasn't been processed:
        1. Get the TechCardItem and its ingredients
        2. For each ingredient, calculate quantity to deduct
        3. Get average cost per unit from recent invoices
        4. Create SaleIngredientExpense record
        5. Mark sale_item as processed
        
        Args:
            session: Database session
            business_id: Business context
            
        Returns:
            Dict with processing statistics:
            {
                "total_processed": int,
                "expenses_created": int,
                "errors": List[str]
            }
        """
        stats = {
            "total_processed": 0,
            "expenses_created": 0,
            "errors": []
        }
        
        # Get all unprocessed mapped sale items
        # Use populate_existing to ensure fresh load after previous commit
        result = await session.execute(
            select(SaleItem)
            .join(Sale)
            .where(
                Sale.business_id == business_id,
                SaleItem.is_mapped == True,  # noqa: E712
                SaleItem.processed == False,  # noqa: E712
            )
            .options(
                selectinload(SaleItem.sale),
                selectinload(SaleItem.tech_card_item)
                    .selectinload(TechCardItem.ingredients)
                    .selectinload(TechCardItemIngredient.unit),
            )
            .order_by(SaleItem.id)
            .execution_options(populate_existing=True)
        )
        unprocessed_items = list(result.scalars().all())
        
        # Type hint for stats dict
        errors_list: List[str] = cast(List[str], stats["errors"])
        total_processed_count: int = 0
        expenses_created_count: int = 0
        
        print(f"[SalesService] Processing {len(unprocessed_items)} unprocessed mapped sale items")
        
        for sale_item in unprocessed_items:
            # Save ID early to avoid lazy-load issues in error handler
            sale_item_id = sale_item.id
            
            try:
                if not sale_item.tech_card_item or not sale_item.tech_card_item.ingredients:
                    # No ingredients to process, just mark as processed
                    sale_item.processed = True
                    total_processed_count += 1
                    continue
                
                # For each ingredient in the tech card
                for ingredient in sale_item.tech_card_item.ingredients:
                    # Save ingredient ID early
                    ingredient_category_id = ingredient.ingredient_category_id
                    
                    try:
                        # Calculate quantity to deduct
                        # Assume tech card is for 1 serving/portion
                        # sale_item.quantity is how many portions were sold
                        quantity_to_deduct = sale_item.quantity * ingredient.quantity
                        
                        # Get average cost per unit from recent invoices
                        # Get last 5 matching invoice items for this category
                        cost_result = await session.execute(
                            select(InvoiceItem)
                            .where(
                                InvoiceItem.category_id == ingredient.ingredient_category_id,
                            )
                            .options(
                                selectinload(InvoiceItem.invoice),
                                selectinload(InvoiceItem.unit),
                            )
                            .order_by(InvoiceItem.id.desc())
                            .limit(5)
                        )
                        recent_invoice_items = list(cost_result.scalars().all())
                        
                        # Calculate weighted average cost per unit (default to 0)
                        avg_cost_per_unit = Decimal(0)
                        if recent_invoice_items:
                            total_quantity = cast(Decimal, sum(item.quantity for item in recent_invoice_items))
                            total_cost = cast(Decimal, sum(
                                item.quantity * item.unit_price
                                for item in recent_invoice_items
                            ))
                            avg_cost_per_unit = total_cost / total_quantity
                        
                        # Calculate total cost for this ingredient expense
                        expense_cost = quantity_to_deduct * avg_cost_per_unit
                        
                        # Create SaleIngredientExpense record
                        ingredient_expense = SaleIngredientExpense(
                            sale_item_id=sale_item.id,
                            tech_card_item_id=sale_item.tech_card_item_id,
                            category_id=ingredient.ingredient_category_id,
                            quantity=quantity_to_deduct,
                            unit_id=ingredient.unit_id,
                            cost=expense_cost,
                        )
                        session.add(ingredient_expense)
                        expenses_created_count += 1
                        
                        print(f"[SalesService] Created expense: {quantity_to_deduct} {ingredient.unit.symbol} @ {avg_cost_per_unit} = {expense_cost}")
                        
                    except Exception as e:
                        error_msg = f"Error processing ingredient for sale_item {sale_item_id}, category {ingredient_category_id}: {str(e)}"
                        errors_list.append(error_msg)
                        print(f"[SalesService] {error_msg}")
                        continue
                
                # Mark sale item as processed
                sale_item.processed = True
                total_processed_count += 1
                
            except Exception as e:
                error_msg = f"Error processing sale_item {sale_item_id}: {str(e)}"
                errors_list.append(error_msg)
                print(f"[SalesService] {error_msg}")
                continue
        
        # Commit changes
        await session.commit()
        
        # Update processing_status for all affected Sales
        # Get unique sale_ids from processed items
        affected_sale_ids = set(item.sale_id for item in unprocessed_items)
        
        if affected_sale_ids:
            # Re-fetch Sales to check their processing status
            sales_result = await session.execute(
                select(Sale)
                .where(Sale.id.in_(affected_sale_ids))
                .options(selectinload(Sale.items))
            )
            affected_sales = sales_result.scalars().all()
            
            for sale in affected_sales:
                # Check if all mapped items are processed
                all_processed = all(
                    (not item.is_mapped) or item.processed 
                    for item in sale.items
                )
                
                if all_processed:
                    sale.processing_status = "processed"
                    sale.processed_at = datetime.utcnow()
                else:
                    # Some items still pending
                    sale.processing_status = "pending"
            
            # Commit status updates
            await session.commit()
            print(f"[SalesService] Updated processing_status for {len(affected_sales)} sales")
        
        # Update stats dict with counts
        stats["total_processed"] = total_processed_count
        stats["expenses_created"] = expenses_created_count
        
        print(f"[SalesService] Processed {total_processed_count} items, created {expenses_created_count} expenses")
        
        return stats

    @staticmethod
    async def update_sales_processing_status(
        session: AsyncSession,
        business_id: int,
    ) -> Dict[str, int]:
        """
        Update processing_status for all Sales based on their items' processed state.
        Useful for fixing status after migrations or bulk processing.
        
        Returns:
            Dict with counts of updated sales by status
        """
        # Get all Sales for business
        result = await session.execute(
            select(Sale)
            .where(Sale.business_id == business_id)
            .options(selectinload(Sale.items))
        )
        sales = result.scalars().all()
        
        updated_counts = {
            "processed": 0,
            "pending": 0,
            "error": 0,
        }
        
        for sale in sales:
            old_status = sale.processing_status
            
            # Determine new status based on items
            all_processed = all(
                (not item.is_mapped) or item.processed 
                for item in sale.items
            )
            
            if all_processed and sale.items_count > 0:
                sale.processing_status = "processed"
                if not sale.processed_at:
                    sale.processed_at = datetime.utcnow()
                updated_counts["processed"] += 1
            else:
                sale.processing_status = "pending"
                updated_counts["pending"] += 1
            
            # Log if status changed
            if old_status != sale.processing_status:
                print(f"[SalesService] Sale {sale.id}: {old_status} -> {sale.processing_status}")
        
        await session.commit()
        
        print(f"[SalesService] Updated processing status for {len(sales)} sales: {updated_counts}")
        return updated_counts
