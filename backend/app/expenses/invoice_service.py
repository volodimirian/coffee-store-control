"""Service layer for invoice management."""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.expenses.models import Invoice, InvoiceItem, InvoiceStatus
from app.expenses.schemas import InvoiceCreate, InvoiceUpdate, InvoiceItemCreate, InvoiceItemUpdate
from app.expenses.inventory_balance_service import InventoryBalanceService
from app.tech_cards.service import IngredientCostService


class InvoiceService:
    """Service class for invoice operations."""

    @staticmethod
    async def create_invoice(
        session: AsyncSession,
        invoice_data: InvoiceCreate,
        created_by_user_id: int,
    ) -> Invoice:
        """Create a new invoice."""
        db_invoice = Invoice(
            business_id=invoice_data.business_id,
            supplier_id=invoice_data.supplier_id,
            invoice_number=invoice_data.invoice_number,
            invoice_date=invoice_data.invoice_date,
            total_amount=invoice_data.total_amount,
            paid_status=invoice_data.paid_status,
            paid_date=invoice_data.paid_date,
            document_path=invoice_data.document_path,
            created_by=created_by_user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(db_invoice)
        await session.flush()
        await session.refresh(db_invoice)
        return db_invoice

    @staticmethod
    async def get_invoice_by_id(
        session: AsyncSession, 
        invoice_id: int,
        load_items: bool = False,
    ) -> Optional[Invoice]:
        """Get invoice by ID."""
        query = select(Invoice).where(Invoice.id == invoice_id)
        
        if load_items:
            query = query.options(selectinload(Invoice.invoice_items))
        
        result = await session.execute(query)
        return result.scalars().first()

    @staticmethod
    async def get_invoices_by_business(
        session: AsyncSession, 
        business_id: int,
        supplier_id: Optional[int] = None,
        paid_status: Optional[InvoiceStatus] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Invoice]:
        """Get all invoices for a specific business with optional filtering."""
        query = select(Invoice).where(Invoice.business_id == business_id)
        
        if supplier_id is not None:
            query = query.where(Invoice.supplier_id == supplier_id)
            
        if paid_status is not None:
            query = query.where(Invoice.paid_status == paid_status)
            
        if date_from is not None:
            query = query.where(Invoice.invoice_date >= date_from)
            
        if date_to is not None:
            query = query.where(Invoice.invoice_date <= date_to)
            
        query = query.offset(skip).limit(limit).order_by(Invoice.invoice_date.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_invoice(
        session: AsyncSession,
        invoice_id: int,
        invoice_data: InvoiceUpdate,
    ) -> Optional[Invoice]:
        """Update invoice information."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return None

        update_data = invoice_data.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(invoice, field, value)
            setattr(invoice, 'updated_at', datetime.utcnow())
            await session.flush()
            await session.refresh(invoice)

        return invoice

    @staticmethod
    async def delete_invoice(session: AsyncSession, invoice_id: int) -> bool:
        """Delete invoice (hard delete for now, can be changed to soft delete)."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return False

        # First delete all invoice items
        items = await InvoiceItemService.get_items_by_invoice(session, invoice_id)
        for item in items:
            await session.delete(item)
        
        # Then delete the invoice
        await session.delete(invoice)
        await session.flush()
        return True

    @staticmethod
    async def mark_invoice_as_paid(
        session: AsyncSession,
        invoice_id: int,
        paid_date: Optional[datetime] = None,
    ) -> Optional[Invoice]:
        """Mark invoice as paid and update inventory balances for all categories."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return None

        setattr(invoice, 'paid_status', InvoiceStatus.PAID)
        setattr(invoice, 'paid_date', paid_date or datetime.utcnow())
        setattr(invoice, 'updated_at', datetime.utcnow())
        await session.flush()
        await session.refresh(invoice)
        
        # Update inventory balances for all categories in this invoice
        items = await InvoiceItemService.get_items_by_invoice(session, invoice_id)
        category_ids = set(getattr(item, 'category_id') for item in items)
        
        for category_id in category_ids:
            await InvoiceItemService._update_inventory_balance_if_paid(
                session, invoice_id, category_id
            )
        
        # Sync ingredient costs to cost history for tech card calculations
        await IngredientCostService.sync_invoice_costs(
            session=session,
            invoice_id=invoice_id,
            business_id=getattr(invoice, 'business_id'),
        )
        
        return invoice

    @staticmethod
    async def mark_invoice_as_cancelled(
        session: AsyncSession,
        invoice_id: int,
    ) -> Optional[Invoice]:
        """Mark invoice as cancelled and recalculate inventory balances if was paid."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return None
        
        # Check if invoice was paid (need to update balances)
        was_paid = getattr(invoice, 'paid_status') == InvoiceStatus.PAID

        setattr(invoice, 'paid_status', InvoiceStatus.CANCELLED)
        setattr(invoice, 'paid_date', None)
        setattr(invoice, 'updated_at', datetime.utcnow())
        await session.flush()
        await session.refresh(invoice)
        
        # If invoice was paid, recalculate inventory balances (remove purchases)
        if was_paid:
            items = await InvoiceItemService.get_items_by_invoice(session, invoice_id)
            category_ids = set(getattr(item, 'category_id') for item in items)
            
            for category_id in category_ids:
                # Recalculate balance now that invoice is no longer paid
                invoice_date = getattr(invoice, 'invoice_date')
                business_id = getattr(invoice, 'business_id')
                
                from app.expenses.models import MonthPeriod
                period_result = await session.execute(
                    select(MonthPeriod)
                    .where(
                        and_(
                            MonthPeriod.business_id == business_id,
                            MonthPeriod.year == invoice_date.year,
                            MonthPeriod.month == invoice_date.month,
                        )
                    )
                )
                period = period_result.scalars().first()
                
                if period:
                    await InventoryBalanceService.recalculate_balance_for_category(
                        session, category_id, getattr(period, 'id')
                    )
        
        return invoice

    @staticmethod
    async def search_invoices(
        session: AsyncSession,
        business_id: int,
        search_query: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Invoice]:
        """Search invoices by invoice number or supplier name."""
        from app.expenses.models import Supplier
        
        query = select(Invoice).join(Supplier).where(
            and_(
                Invoice.business_id == business_id,
                (
                    Invoice.invoice_number.ilike(f"%{search_query}%")
                    | Supplier.name.ilike(f"%{search_query}%")
                )
            )
        )
        
        query = query.offset(skip).limit(limit).order_by(Invoice.invoice_date.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_invoices_by_business(
        session: AsyncSession,
        business_id: int,
        paid_status: Optional[InvoiceStatus] = None,
    ) -> int:
        """Count invoices for a business."""
        query = select(func.count(Invoice.id)).where(Invoice.business_id == business_id)
        
        if paid_status is not None:
            query = query.where(Invoice.paid_status == paid_status)
            
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def get_total_amount_by_business(
        session: AsyncSession,
        business_id: int,
        paid_status: Optional[InvoiceStatus] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Decimal:
        """Get total invoice amount for a business with optional filtering."""
        query = select(func.sum(Invoice.total_amount)).where(Invoice.business_id == business_id)
        
        if paid_status is not None:
            query = query.where(Invoice.paid_status == paid_status)
            
        if date_from is not None:
            query = query.where(Invoice.invoice_date >= date_from)
            
        if date_to is not None:
            query = query.where(Invoice.invoice_date <= date_to)
            
        result = await session.execute(query)
        return result.scalar() or Decimal("0")

    @staticmethod
    async def update_overdue_statuses(session: AsyncSession, business_id: Optional[int] = None) -> int:
        """
        Update overdue statuses for pending invoices based on supplier payment terms.
        
        Args:
            session: Database session
            business_id: Optional business ID to filter invoices
            
        Returns:
            Number of invoices updated to overdue status
        """
        from sqlalchemy import text
        
        # Build the WHERE clause
        where_conditions = ["i.paid_status = 'pending'"]
        if business_id:
            where_conditions.append(f"i.business_id = {business_id}")
        
        where_clause = " AND ".join(where_conditions)
        
        # Update invoices to overdue status where payment is past due
        query = text(f"""
            UPDATE invoices i
            SET paid_status = 'overdue', updated_at = NOW()
            FROM suppliers s
            WHERE i.supplier_id = s.id
            AND {where_clause}
            AND CURRENT_DATE > (i.invoice_date::date + INTERVAL '1 day' * s.payment_terms_days)
        """)
        
        result = await session.execute(query)
        await session.commit()
        
        # Return number of affected rows
        return getattr(result, 'rowcount', 0)


class InvoiceItemService:
    """Service class for invoice item operations."""

    @staticmethod
    async def create_invoice_item(
        session: AsyncSession,
        item_data: InvoiceItemCreate,
    ) -> InvoiceItem:
        """Create a new invoice item and update inventory balance if invoice is paid."""
        # Calculate total_price if not provided
        total_price = item_data.total_price
        if total_price == 0:
            total_price = item_data.quantity * item_data.unit_price

        db_item = InvoiceItem(
            invoice_id=item_data.invoice_id,
            category_id=item_data.category_id,
            quantity=item_data.quantity,
            unit_id=item_data.unit_id,
            unit_price=item_data.unit_price,
            total_price=total_price,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(db_item)
        await session.flush()
        await session.refresh(db_item)
        
        # Update inventory balance if invoice is paid
        await InvoiceItemService._update_inventory_balance_if_paid(
            session, item_data.invoice_id, item_data.category_id
        )
        
        return db_item

    @staticmethod
    async def get_invoice_item_by_id(session: AsyncSession, item_id: int) -> Optional[InvoiceItem]:
        """Get invoice item by ID."""
        result = await session.execute(
            select(InvoiceItem).where(InvoiceItem.id == item_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_items_by_invoice(
        session: AsyncSession, 
        invoice_id: int,
    ) -> List[InvoiceItem]:
        """Get all items for a specific invoice."""
        result = await session.execute(
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
            .order_by(InvoiceItem.created_at)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_invoice_item(
        session: AsyncSession,
        item_id: int,
        item_data: InvoiceItemUpdate,
    ) -> Optional[InvoiceItem]:
        """Update invoice item information and recalculate inventory balance if needed."""
        item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
        if not item:
            return None

        # Track if category changed to update multiple balances
        old_category_id = getattr(item, 'category_id')
        category_changed = False
        
        update_data = item_data.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                if field == 'category_id' and value != old_category_id:
                    category_changed = True
                setattr(item, field, value)
            
            # Recalculate total_price if quantity or unit_price changed
            if 'quantity' in update_data or 'unit_price' in update_data:
                setattr(item, 'total_price', item.quantity * item.unit_price)
            
            setattr(item, 'updated_at', datetime.utcnow())
            await session.flush()
            await session.refresh(item)
            
            # Update inventory balances if invoice is paid
            invoice_id = getattr(item, 'invoice_id')
            new_category_id = getattr(item, 'category_id')
            
            if category_changed:
                # Update both old and new category balances
                await InvoiceItemService._update_inventory_balance_if_paid(
                    session, invoice_id, old_category_id
                )
                await InvoiceItemService._update_inventory_balance_if_paid(
                    session, invoice_id, new_category_id
                )
            else:
                # Update current category balance
                await InvoiceItemService._update_inventory_balance_if_paid(
                    session, invoice_id, new_category_id
                )

        return item

    @staticmethod
    async def delete_invoice_item(session: AsyncSession, item_id: int) -> bool:
        """Delete invoice item and update inventory balance if invoice was paid."""
        item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
        if not item:
            return False

        invoice_id = getattr(item, 'invoice_id')
        category_id = getattr(item, 'category_id')
        
        await session.delete(item)
        await session.flush()
        
        # Update inventory balance if invoice is paid
        await InvoiceItemService._update_inventory_balance_if_paid(
            session, invoice_id, category_id
        )
        
        return True

    @staticmethod
    async def get_items_by_category(
        session: AsyncSession,
        category_id: int,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[InvoiceItem]:
        """Get all invoice items for a specific category within date range."""
        query = select(InvoiceItem).join(Invoice).where(
            InvoiceItem.category_id == category_id
        )
        
        if date_from is not None:
            query = query.where(Invoice.invoice_date >= date_from)
            
        if date_to is not None:
            query = query.where(Invoice.invoice_date <= date_to)
            
        query = query.order_by(Invoice.invoice_date.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def calculate_average_unit_price(
        session: AsyncSession,
        category_id: int,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Decimal:
        """Calculate average unit price for a category within date range."""
        items = await InvoiceItemService.get_items_by_category(
            session, category_id, date_from, date_to
        )
        
        if not items:
            return Decimal("0")
            
        total_quantity = Decimal(str(sum(item.quantity for item in items)))
        total_cost = Decimal(str(sum(item.total_price for item in items)))
        
        if total_quantity > Decimal("0"):
            return total_cost / total_quantity
        return Decimal("0")

    @staticmethod
    async def recalculate_invoice_total(
        session: AsyncSession,
        invoice_id: int,
    ) -> Optional[Decimal]:
        """Recalculate and update invoice total based on its items."""
        items = await InvoiceItemService.get_items_by_invoice(session, invoice_id)
        total_amount = Decimal(str(sum(item.total_price for item in items)))
        
        # Update invoice total
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if invoice:
            setattr(invoice, 'total_amount', total_amount)
            setattr(invoice, 'updated_at', datetime.utcnow())
            await session.flush()
            return total_amount
            
        return None

    @staticmethod
    async def _update_inventory_balance_if_paid(
        session: AsyncSession,
        invoice_id: int,
        category_id: int,
    ) -> None:
        """
        Update inventory balance for category if the invoice is paid.
        This recalculates purchases_total from all paid invoice items.
        """
        # Get invoice to check paid status
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return
            
        # Only update inventory if invoice is paid
        if getattr(invoice, 'paid_status') != InvoiceStatus.PAID:
            return
            
        # Get the invoice date to determine which month period to update
        invoice_date = getattr(invoice, 'invoice_date')
        business_id = getattr(invoice, 'business_id')
        
        # Find the month period for this invoice
        from app.expenses.models import MonthPeriod
        period_result = await session.execute(
            select(MonthPeriod)
            .where(
                and_(
                    MonthPeriod.business_id == business_id,
                    MonthPeriod.year == invoice_date.year,
                    MonthPeriod.month == invoice_date.month,
                )
            )
        )
        period = period_result.scalars().first()
        
        if not period:
            # Period doesn't exist yet, don't update balance
            return
            
        # Recalculate the entire balance for this category and period
        # This will automatically sum all paid invoice items with proper unit conversion
        await InventoryBalanceService.recalculate_balance_for_category(
            session, category_id, getattr(period, 'id')
        )
