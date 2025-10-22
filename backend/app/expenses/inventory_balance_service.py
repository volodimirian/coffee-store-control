"""Service layer for inventory balance calculations."""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.expenses.models import (
    InventoryBalance,
    InvoiceItem,
    Invoice,
    ExpenseRecord,
    ExpenseCategory,
    MonthPeriod,
    InvoiceStatus,
)


class InventoryBalanceService:
    """Service class for inventory balance calculations and management."""

    @staticmethod
    async def get_balance_by_category_and_period(
        session: AsyncSession,
        category_id: int,
        month_period_id: int,
    ) -> Optional[InventoryBalance]:
        """Get inventory balance for specific category and period."""
        result = await session.execute(
            select(InventoryBalance)
            .where(
                and_(
                    InventoryBalance.category_id == category_id,
                    InventoryBalance.month_period_id == month_period_id,
                )
            )
        )
        return result.scalars().first()

    @staticmethod
    async def create_or_update_balance(
        session: AsyncSession,
        category_id: int,
        month_period_id: int,
        unit_id: int,
        opening_balance: Decimal = Decimal("0"),
        purchases_total: Optional[Decimal] = None,
        usage_total: Optional[Decimal] = None,
    ) -> InventoryBalance:
        """Create new balance or update existing one."""
        # Check if balance already exists
        existing_balance = await InventoryBalanceService.get_balance_by_category_and_period(
            session, category_id, month_period_id
        )

        if existing_balance:
            # Update existing balance
            if purchases_total is not None:
                setattr(existing_balance, 'purchases_total', purchases_total)
            if usage_total is not None:
                setattr(existing_balance, 'usage_total', usage_total)
            
            # Recalculate closing balance
            opening = getattr(existing_balance, 'opening_balance')
            purchases = getattr(existing_balance, 'purchases_total')
            usage = getattr(existing_balance, 'usage_total')
            new_closing_balance = opening + purchases - usage
            setattr(existing_balance, 'closing_balance', new_closing_balance)
            setattr(existing_balance, 'last_calculated', datetime.utcnow())
            setattr(existing_balance, 'updated_at', datetime.utcnow())
            
            await session.flush()
            await session.refresh(existing_balance)
            return existing_balance
        else:
            # Create new balance
            if purchases_total is None:
                purchases_total = Decimal("0")
            if usage_total is None:
                usage_total = Decimal("0")
                
            closing_balance = opening_balance + purchases_total - usage_total
            
            new_balance = InventoryBalance(
                category_id=category_id,
                month_period_id=month_period_id,
                opening_balance=opening_balance,
                purchases_total=purchases_total,
                usage_total=usage_total,
                closing_balance=closing_balance,
                unit_id=unit_id,
                last_calculated=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(new_balance)
            await session.flush()
            await session.refresh(new_balance)
            return new_balance

    @staticmethod
    async def calculate_purchases_for_category(
        session: AsyncSession,
        category_id: int,
        month_period_id: int,
    ) -> Decimal:
        """Calculate total purchases for a category in a specific month from paid invoices."""
        # Get the month period to know date range
        period_result = await session.execute(
            select(MonthPeriod).where(MonthPeriod.id == month_period_id)
        )
        period = period_result.scalars().first()
        if not period:
            return Decimal("0")
        
        # Create date range for the month
        from datetime import date
        
        period_year = getattr(period, 'year')
        period_month = getattr(period, 'month')
        
        start_date = date(period_year, period_month, 1)
        if period_month == 12:
            end_date = date(period_year + 1, 1, 1)
        else:
            end_date = date(period_year, period_month + 1, 1)

        # Sum quantities from paid invoice items in this month
        result = await session.execute(
            select(func.sum(InvoiceItem.quantity))
            .join(Invoice)
            .where(
                and_(
                    InvoiceItem.category_id == category_id,
                    Invoice.paid_status == InvoiceStatus.PAID,
                    Invoice.invoice_date >= start_date,
                    Invoice.invoice_date < end_date,
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total)) if total else Decimal("0")

    @staticmethod
    async def calculate_usage_for_category(
        session: AsyncSession,
        category_id: int,
        month_period_id: int,
    ) -> Decimal:
        """Calculate total usage for a category in a specific month."""
        result = await session.execute(
            select(func.sum(ExpenseRecord.quantity_used))
            .where(
                and_(
                    ExpenseRecord.category_id == category_id,
                    ExpenseRecord.month_period_id == month_period_id,
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total)) if total else Decimal("0")

    @staticmethod
    async def get_previous_month_closing_balance(
        session: AsyncSession,
        category_id: int,
        current_period_id: int,
    ) -> Decimal:
        """Get closing balance from previous month for this category."""
        # Get current period info
        current_period_result = await session.execute(
            select(MonthPeriod).where(MonthPeriod.id == current_period_id)
        )
        current_period = current_period_result.scalars().first()
        if not current_period:
            return Decimal("0")
        
        # Find previous month period
        current_year = getattr(current_period, 'year')
        current_month = getattr(current_period, 'month')
        
        prev_year = current_year
        prev_month = current_month - 1
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1
        
        # Get previous month period
        prev_period_result = await session.execute(
            select(MonthPeriod)
            .where(
                and_(
                    MonthPeriod.business_id == current_period.business_id,
                    MonthPeriod.year == prev_year,
                    MonthPeriod.month == prev_month,
                )
            )
        )
        prev_period = prev_period_result.scalars().first()
        if not prev_period:
            return Decimal("0")
        
        # Get balance from previous month
        prev_balance = await InventoryBalanceService.get_balance_by_category_and_period(
            session, category_id, getattr(prev_period, 'id')
        )
        return getattr(prev_balance, 'closing_balance') if prev_balance else Decimal("0")

    @staticmethod
    async def recalculate_balance_for_category(
        session: AsyncSession,
        category_id: int,
        month_period_id: int,
    ) -> InventoryBalance:
        """Fully recalculate balance for a category in a specific month."""
        # Get category info for default unit
        category_result = await session.execute(
            select(ExpenseCategory).where(ExpenseCategory.id == category_id)
        )
        category = category_result.scalars().first()
        if not category:
            raise ValueError(f"Category {category_id} not found")

        # Calculate components
        opening_balance = await InventoryBalanceService.get_previous_month_closing_balance(
            session, category_id, month_period_id
        )
        purchases_total = await InventoryBalanceService.calculate_purchases_for_category(
            session, category_id, month_period_id
        )
        usage_total = await InventoryBalanceService.calculate_usage_for_category(
            session, category_id, month_period_id
        )

        # Create or update balance
        balance = await InventoryBalanceService.create_or_update_balance(
            session=session,
            category_id=category_id,
            month_period_id=month_period_id,
            unit_id=getattr(category, 'default_unit_id'),
            opening_balance=opening_balance,
            purchases_total=purchases_total,
            usage_total=usage_total,
        )
        
        return balance

    @staticmethod
    async def recalculate_all_balances_for_period(
        session: AsyncSession,
        month_period_id: int,
    ) -> List[InventoryBalance]:
        """Recalculate balances for all categories in a specific month period."""
        # Get all categories that have transactions in this period or previous periods
        categories_with_transactions = await session.execute(
            select(ExpenseCategory.id)
            .join(
                ExpenseRecord, 
                ExpenseRecord.category_id == ExpenseCategory.id,
                isouter=True
            )
            .join(
                InvoiceItem,
                InvoiceItem.category_id == ExpenseCategory.id,
                isouter=True
            )
            .where(
                (ExpenseRecord.month_period_id == month_period_id)
                | (InvoiceItem.id.isnot(None))
            )
            .distinct()
        )
        
        category_ids = [row[0] for row in categories_with_transactions.fetchall()]
        
        # Recalculate balance for each category
        recalculated_balances = []
        for category_id in category_ids:
            try:
                balance = await InventoryBalanceService.recalculate_balance_for_category(
                    session, category_id, month_period_id
                )
                recalculated_balances.append(balance)
            except ValueError:
                # Skip categories that don't exist
                continue
        
        return recalculated_balances

    @staticmethod
    async def get_balances_for_period(
        session: AsyncSession,
        month_period_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[InventoryBalance]:
        """Get all inventory balances for a specific month period."""
        result = await session.execute(
            select(InventoryBalance)
            .where(InventoryBalance.month_period_id == month_period_id)
            .offset(skip)
            .limit(limit)
            .order_by(InventoryBalance.category_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def transfer_closing_balances_to_next_month(
        session: AsyncSession,
        current_period_id: int,
        next_period_id: int,
    ) -> List[InventoryBalance]:
        """Transfer closing balances from current month to opening balances of next month."""
        # Get all balances from current period
        current_balances = await session.execute(
            select(InventoryBalance)
            .where(InventoryBalance.month_period_id == current_period_id)
        )
        
        transferred_balances = []
        for balance in current_balances.scalars().all():
            # Create opening balance for next month
            next_balance = await InventoryBalanceService.create_or_update_balance(
                session=session,
                category_id=getattr(balance, 'category_id'),
                month_period_id=next_period_id,
                unit_id=getattr(balance, 'unit_id'),
                opening_balance=getattr(balance, 'closing_balance'),
                purchases_total=Decimal("0"),
                usage_total=Decimal("0"),
            )
            transferred_balances.append(next_balance)
        
        return transferred_balances

    @staticmethod
    async def get_category_balance_history(
        session: AsyncSession,
        category_id: int,
        business_id: int,
        months_back: int = 12,
    ) -> List[InventoryBalance]:
        """Get balance history for a category over specified number of months."""
        # Get recent periods for this business
        periods_result = await session.execute(
            select(MonthPeriod)
            .where(MonthPeriod.business_id == business_id)
            .order_by(MonthPeriod.year.desc(), MonthPeriod.month.desc())
            .limit(months_back)
        )
        periods = list(periods_result.scalars().all())
        
        # Get balances for these periods
        period_ids = [getattr(p, 'id') for p in periods]
        balances_result = await session.execute(
            select(InventoryBalance)
            .where(
                and_(
                    InventoryBalance.category_id == category_id,
                    InventoryBalance.month_period_id.in_(period_ids),
                )
            )
            .order_by(InventoryBalance.month_period_id.desc())
        )
        
        return list(balances_result.scalars().all())

    @staticmethod
    async def get_low_stock_categories(
        session: AsyncSession,
        month_period_id: int,
        threshold: Decimal = Decimal("10"),
    ) -> List[InventoryBalance]:
        """Get categories with low stock (closing balance below threshold)."""
        result = await session.execute(
            select(InventoryBalance)
            .where(
                and_(
                    InventoryBalance.month_period_id == month_period_id,
                    InventoryBalance.closing_balance <= threshold,
                    InventoryBalance.closing_balance >= 0,  # Exclude negative balances
                )
            )
            .order_by(InventoryBalance.closing_balance.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_negative_balance_categories(
        session: AsyncSession,
        month_period_id: int,
    ) -> List[InventoryBalance]:
        """Get categories with negative balances (usage exceeded stock)."""
        result = await session.execute(
            select(InventoryBalance)
            .where(
                and_(
                    InventoryBalance.month_period_id == month_period_id,
                    InventoryBalance.closing_balance < 0,
                )
            )
            .order_by(InventoryBalance.closing_balance.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def calculate_average_monthly_usage(
        session: AsyncSession,
        category_id: int,
        business_id: int,
        months_count: int = 3,
    ) -> Decimal:
        """Calculate average monthly usage for a category over specified months."""
        # Get recent periods
        periods_result = await session.execute(
            select(MonthPeriod)
            .where(MonthPeriod.business_id == business_id)
            .order_by(MonthPeriod.year.desc(), MonthPeriod.month.desc())
            .limit(months_count)
        )
        periods = list(periods_result.scalars().all())
        
        if not periods:
            return Decimal("0")
        
        # Calculate total usage across these periods
        period_ids = [getattr(p, 'id') for p in periods]
        usage_result = await session.execute(
            select(func.sum(ExpenseRecord.quantity_used))
            .where(
                and_(
                    ExpenseRecord.category_id == category_id,
                    ExpenseRecord.month_period_id.in_(period_ids),
                )
            )
        )
        
        total_usage = usage_result.scalar()
        if total_usage:
            return Decimal(str(total_usage)) / len(periods)
        return Decimal("0")