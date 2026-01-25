"""
Service for optimized inventory tracking data.
Combines sections, categories, invoices, and invoice items into single response.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import cast
from sqlalchemy import select, and_
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
)
from app.expenses.unit_service import UnitService


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

        # 4. Group invoice items by category and date for fast lookup
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

                    daily_data_list.append(
                        DayDataSchema(
                            date=date_str,
                            purchases_qty=purchases_qty,
                            purchases_amount=purchases_amount,
                            usage_qty=Decimal("0"),  # TODO: Add from expense records
                            usage_amount=Decimal("0"),  # TODO: Add from expense records
                            purchase_details=purchase_details,
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
