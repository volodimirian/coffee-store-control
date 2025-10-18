"""Service layer for invoice management."""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.expenses.models import Invoice, InvoiceItem, InvoiceStatus
from app.expenses.schemas import InvoiceCreate, InvoiceUpdate, InvoiceItemCreate, InvoiceItemUpdate


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

        await session.delete(invoice)
        await session.flush()
        return True

    @staticmethod
    async def mark_invoice_as_paid(
        session: AsyncSession,
        invoice_id: int,
        paid_date: Optional[datetime] = None,
    ) -> Optional[Invoice]:
        """Mark invoice as paid."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return None

        setattr(invoice, 'paid_status', InvoiceStatus.PAID)
        setattr(invoice, 'paid_date', paid_date or datetime.utcnow())
        setattr(invoice, 'updated_at', datetime.utcnow())
        await session.flush()
        await session.refresh(invoice)
        return invoice

    @staticmethod
    async def mark_invoice_as_cancelled(
        session: AsyncSession,
        invoice_id: int,
    ) -> Optional[Invoice]:
        """Mark invoice as cancelled."""
        invoice = await InvoiceService.get_invoice_by_id(session, invoice_id)
        if not invoice:
            return None

        setattr(invoice, 'paid_status', InvoiceStatus.CANCELLED)
        setattr(invoice, 'paid_date', None)
        setattr(invoice, 'updated_at', datetime.utcnow())
        await session.flush()
        await session.refresh(invoice)
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


class InvoiceItemService:
    """Service class for invoice item operations."""

    @staticmethod
    async def create_invoice_item(
        session: AsyncSession,
        item_data: InvoiceItemCreate,
    ) -> InvoiceItem:
        """Create a new invoice item."""
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
        """Update invoice item information."""
        item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
        if not item:
            return None

        update_data = item_data.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(item, field, value)
            
            # Recalculate total_price if quantity or unit_price changed
            if 'quantity' in update_data or 'unit_price' in update_data:
                setattr(item, 'total_price', item.quantity * item.unit_price)
            
            setattr(item, 'updated_at', datetime.utcnow())
            await session.flush()
            await session.refresh(item)

        return item

    @staticmethod
    async def delete_invoice_item(session: AsyncSession, item_id: int) -> bool:
        """Delete invoice item (hard delete)."""
        item = await InvoiceItemService.get_invoice_item_by_id(session, item_id)
        if not item:
            return False

        await session.delete(item)
        await session.flush()
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