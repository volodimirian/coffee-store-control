"""
Service for optimized inventory tracking data.
Combines sections, categories, invoices, and invoice items into single response.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import cast
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from collections import defaultdict

from app.expenses.models import (
    ExpenseSection,
    Invoice,
    InvoiceItem,
    Unit,
)
from app.expenses.inventory_tracking_schemas import (
    InventoryTrackingSummaryResponse,
    SectionDataSchema,
    CategoryDataSchema,
    DayDataSchema,
    PurchaseDetailSchema,
    SaleExpenseDetailSchema,
)
from app.expenses.unit_service import UnitService

# Import OFD integration models for sale expenses
try:
    from app.ofd_integration.models import SaleIngredientExpense, Sale
    OFD_AVAILABLE = True
except ImportError:
    OFD_AVAILABLE = False


class InventoryTrackingService:
    """Service for getting optimized inventory tracking data."""

    @staticmethod
    async def get_month_summary(
        session: AsyncSession,
        business_id: int,
        year: int,
        month: int,
    ) -> InventoryTrackingSummaryResponse:
        """
        Get complete inventory tracking data for a month in ONE query.
        Returns all sections, categories, and daily data optimized.
        
        This replaces hundreds of individual API calls with efficient batched queries.
        """
        # Calculate month date range
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        # 1. Load ALL sections with categories in ONE query using selectinload
        sections_stmt = (
            select(ExpenseSection)
            .where(ExpenseSection.business_id == business_id)
            .options(selectinload(ExpenseSection.expense_categories))
            .order_by(ExpenseSection.id)
        )
        sections_result = await session.execute(sections_stmt)
        sections = sections_result.scalars().all()

        # 2. Load ALL units for symbol mapping
        units_stmt = select(Unit).where(Unit.business_id == business_id)
        units_result = await session.execute(units_stmt)
        units = units_result.scalars().all()
        units_map: dict[int, str] = {cast(int, unit.id): cast(str, unit.symbol) for unit in units}

        # 3. Load ALL invoices for the month (PENDING and PAID)
        invoices_stmt = (
            select(Invoice)
            .where(
                and_(
                    Invoice.business_id == business_id,
                    Invoice.invoice_date >= month_start,
                    Invoice.invoice_date < month_end,
                    Invoice.paid_status.in_(["pending", "paid"]),
                )
            )
            .options(selectinload(Invoice.invoice_items))
        )
        invoices_result = await session.execute(invoices_stmt)
        invoices = invoices_result.scalars().all()

        # 4. Load sale ingredient expenses (from OFD integration) for the month
        # NOTE: This section can be easily extracted to separate endpoint later if needed
        sales_expenses_by_category_date: dict[int, dict[str, list]] = defaultdict(lambda: defaultdict(list))
        
        if OFD_AVAILABLE:
            # Import SaleItem model needed for join
            from app.ofd_integration.models import SaleItem
            
            # Query sale_ingredient_expenses joined with sales to get receipt info
            # IMPORTANT: Filter and group by RECEIPT DATE (receipt_datetime), not created_at!
            sales_expenses_stmt = (
                select(SaleIngredientExpense)
                .join(SaleIngredientExpense.sale_item)
                .join(SaleItem.sale)
                .where(
                    and_(
                        Sale.business_id == business_id,
                        func.date(Sale.receipt_datetime) >= month_start,
                        func.date(Sale.receipt_datetime) < month_end,
                    )
                )
                .options(
                    selectinload(SaleIngredientExpense.sale_item).selectinload(SaleItem.sale),
                    selectinload(SaleIngredientExpense.tech_card_item),
                )
            )
            
            try:
                sales_expenses_result = await session.execute(sales_expenses_stmt)
                sales_expenses = sales_expenses_result.scalars().all()
                
                # Group by category_id and RECEIPT DATE (not created_at!)
                for expense in sales_expenses:
                    # Use receipt date from Sale, not expense created_at
                    receipt_date = expense.sale_item.sale.receipt_datetime.date()
                    date_str = receipt_date.strftime("%Y-%m-%d")
                    category_id = int(expense.category_id)
                    sales_expenses_by_category_date[category_id][date_str].append(expense)
            except Exception as e:
                # If OFD tables don't exist or query fails, continue without sales data
                print(f"[InventoryTracking] Warning: Could not load sale expenses: {e}")
                pass

        # 5. Group invoice items by category and date for fast lookup
        # Structure: category_id -> date_str -> list[InvoiceItem]
        items_by_category_date: dict[int, dict[str, list[InvoiceItem]]] = defaultdict(lambda: defaultdict(list))
        
        for invoice in invoices:
            date_str = invoice.invoice_date.strftime("%Y-%m-%d")
            for item in invoice.invoice_items:
                items_by_category_date[int(item.category_id)][date_str].append(item)

        # 5. Build response structure
        response_sections = []

        for section in sections:
            response_categories = []

            for category in section.expense_categories:
                # Generate all days for the month
                daily_data_list = []
                current_date = month_start
                
                while current_date < month_end:
                    date_str = current_date.strftime("%Y-%m-%d")
                    
                    # Get items for this category on this date
                    day_items = items_by_category_date[cast(int, category.id)].get(date_str, [])
                    
                    purchases_qty = Decimal("0")
                    purchases_amount = Decimal("0")
                    purchase_details = []

                    for item in day_items:
                        # Convert to category default unit if needed
                        item_qty = Decimal(str(item.quantity))
                        item_unit_id = cast(int, item.unit_id)
                        category_unit_id = cast(int, category.default_unit_id)
                        
                        qty_to_use = item_qty
                        was_converted = False
                        original_qty = item_qty
                        original_unit_id = item_unit_id
                        converted_qty = None
                        
                        if item_unit_id != category_unit_id:
                            # Need conversion
                            converted_result, error = await UnitService.convert_quantity(
                                session, 
                                item_qty, 
                                item_unit_id, 
                                category_unit_id
                            )
                            if converted_result is not None and not error:
                                qty_to_use = converted_result
                                converted_qty = converted_result
                                was_converted = True
                        
                        purchases_qty += qty_to_use
                        purchases_amount += item_qty * Decimal(str(item.unit_price))

                        # Build purchase detail - invoice_number is from related Invoice
                        invoice_num = f"#{cast(int, item.invoice_id)}"  # Default fallback
                        original_unit_symbol = units_map.get(original_unit_id) if was_converted else None

                        purchase_details.append(
                            PurchaseDetailSchema(
                                invoice_number=invoice_num,
                                original_quantity=original_qty,
                                original_unit_id=original_unit_id if was_converted else None,
                                original_unit_symbol=original_unit_symbol,
                                converted_quantity=converted_qty,
                                was_converted=was_converted,
                            )
                        )

                    # Process sales expenses (OFD deductions) for this category/date
                    day_sale_expenses = sales_expenses_by_category_date[cast(int, category.id)].get(date_str, [])
                    
                    usage_qty = Decimal("0")
                    usage_amount = Decimal("0")
                    sale_expense_details = []
                    
                    for expense in day_sale_expenses:
                        # Add quantity and cost to usage totals
                        usage_qty += Decimal(str(expense.quantity))
                        usage_amount += Decimal(str(expense.cost))
                        
                        # Get unit symbol from expense (as stored in DB)
                        expense_unit_symbol = units_map.get(cast(int, expense.unit_id), "")
                        
                        # Build sale expense detail for modal
                        # Return data AS IS from DB - conversion will happen on frontend
                        sale_expense_details.append(
                            SaleExpenseDetailSchema(
                                sale_id=cast(int, expense.sale_item.sale_id),
                                receipt_id=cast(str, expense.sale_item.sale.ofd_receipt_id),
                                receipt_datetime=expense.sale_item.sale.receipt_datetime.isoformat(),
                                tech_card_item_name=cast(str, expense.tech_card_item.name),
                                quantity_sold=Decimal(str(expense.sale_item.quantity)),
                                ingredient_quantity=Decimal(str(expense.quantity)),
                                unit_symbol=expense_unit_symbol,
                                cost=Decimal(str(expense.cost)),
                            )
                        )

                    daily_data_list.append(
                        DayDataSchema(
                            date=date_str,
                            purchases_qty=purchases_qty,
                            purchases_amount=purchases_amount,
                            usage_qty=usage_qty,
                            usage_amount=usage_amount,
                            purchase_details=purchase_details,
                            sale_expense_details=sale_expense_details,
                        )
                    )

                    # Move to next day
                    current_date = current_date + timedelta(days=1)
                    if current_date >= month_end:
                        break

                unit_symbol = units_map.get(cast(int, category.default_unit_id), "")

                response_categories.append(
                    CategoryDataSchema(
                        category_id=cast(int, category.id),
                        category_name=cast(str, category.name),
                        unit_symbol=unit_symbol,
                        default_unit_id=cast(int, category.default_unit_id),
                        daily_data=daily_data_list,
                    )
                )

            response_sections.append(
                SectionDataSchema(
                    section_id=cast(int, section.id),
                    section_name=cast(str, section.name),
                    categories=response_categories,
                )
            )

        return InventoryTrackingSummaryResponse(
            year=year,
            month=month,
            sections=response_sections,
        )
