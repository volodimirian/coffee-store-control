"""Service for managing monthly accounting periods."""

from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func

from app.expenses.models import MonthPeriod, MonthPeriodStatus
from app.expenses.schemas import MonthPeriodCreate, MonthPeriodUpdate


class MonthPeriodService:
    """Service for managing month periods and accounting cycles."""

    @staticmethod
    async def create_month_period(
        session: AsyncSession,
        period_data: MonthPeriodCreate,
        created_by_user_id: int,
    ) -> MonthPeriod:
        """Create a new monthly period for a business."""
        # Check if period for same business/year/month already exists
        existing_period = await MonthPeriodService.get_period_by_month(
            session=session,
            business_id=period_data.business_id,
            year=period_data.year,
            month=period_data.month,
        )
        if existing_period:
            raise ValueError(f"Period for {period_data.year}/{period_data.month:02d} already exists")

        period = MonthPeriod(
            name=period_data.name,
            business_id=period_data.business_id,
            year=period_data.year,
            month=period_data.month,
            status=period_data.status,
            is_active=period_data.is_active,
        )
        
        session.add(period)
        await session.flush()
        await session.refresh(period)
        return period

    @staticmethod
    async def get_period_by_id(
        session: AsyncSession,
        period_id: int,
        include_inactive: bool = False,
    ) -> Optional[MonthPeriod]:
        """Get period by ID."""
        query = select(MonthPeriod).where(MonthPeriod.id == period_id)
        
        if not include_inactive:
            query = query.where(MonthPeriod.is_active)
            
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_period_by_month(
        session: AsyncSession,
        business_id: int,
        year: int,
        month: int,
        include_inactive: bool = False,
    ) -> Optional[MonthPeriod]:
        """Get period by business, year, and month."""
        query = select(MonthPeriod).where(
            and_(
                MonthPeriod.business_id == business_id,
                MonthPeriod.year == year,
                MonthPeriod.month == month,
            )
        )
        
        if not include_inactive:
            query = query.where(MonthPeriod.is_active)
            
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_periods_by_business(
        session: AsyncSession,
        business_id: int,
        status: Optional[MonthPeriodStatus] = None,
        is_active: Optional[bool] = None,
        year: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MonthPeriod]:
        """Get all periods for a business with optional filtering."""
        query = select(MonthPeriod).where(MonthPeriod.business_id == business_id)
        
        if status:
            query = query.where(MonthPeriod.status == status)
            
        if is_active is not None:
            query = query.where(MonthPeriod.is_active == is_active)
            
        if year:
            query = query.where(MonthPeriod.year == year)
            
        query = query.order_by(MonthPeriod.year.desc(), MonthPeriod.month.desc()).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_current_period(
        session: AsyncSession,
        business_id: int,
    ) -> Optional[MonthPeriod]:
        """Get the current active period for a business."""
        query = select(MonthPeriod).where(
            and_(
                MonthPeriod.business_id == business_id,
                MonthPeriod.status == MonthPeriodStatus.ACTIVE,
                MonthPeriod.is_active,
            )
        ).order_by(MonthPeriod.year.desc(), MonthPeriod.month.desc())
        
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def count_periods_by_business(
        session: AsyncSession,
        business_id: int,
        status: Optional[MonthPeriodStatus] = None,
        is_active: Optional[bool] = None,
        year: Optional[int] = None,
    ) -> int:
        """Count periods for a business."""
        query = select(func.count(MonthPeriod.id)).where(MonthPeriod.business_id == business_id)
        
        if status:
            query = query.where(MonthPeriod.status == status)
            
        if is_active is not None:
            query = query.where(MonthPeriod.is_active == is_active)
            
        if year:
            query = query.where(MonthPeriod.year == year)
            
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def update_period(
        session: AsyncSession,
        period_id: int,
        period_data: MonthPeriodUpdate,
    ) -> Optional[MonthPeriod]:
        """Update period information."""
        period = await MonthPeriodService.get_period_by_id(session, period_id, include_inactive=True)
        if not period:
            return None

        # Update fields
        update_fields = period_data.dict(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(period, field, value)

        await session.flush()
        await session.refresh(period)
        return period

    @staticmethod
    async def close_period(
        session: AsyncSession,
        period_id: int,
    ) -> bool:
        """Close a period (change status to CLOSED)."""
        period = await MonthPeriodService.get_period_by_id(session, period_id)
        if not period:
            return False

        if str(getattr(period, 'status')) == str(MonthPeriodStatus.CLOSED):
            return True  # Already closed

        # Set status to closed
        setattr(period, 'status', MonthPeriodStatus.CLOSED)
        await session.flush()
        return True

    @staticmethod
    async def reopen_period(
        session: AsyncSession,
        period_id: int,
    ) -> bool:
        """Reopen a closed period (change status to ACTIVE)."""
        period = await MonthPeriodService.get_period_by_id(session, period_id, include_inactive=True)
        if not period:
            return False

        # Set status to active
        setattr(period, 'status', MonthPeriodStatus.ACTIVE)
        await session.flush()
        return True

    @staticmethod
    async def delete_period(
        session: AsyncSession,
        period_id: int,
    ) -> bool:
        """Soft delete period."""
        period = await MonthPeriodService.get_period_by_id(session, period_id)
        if not period:
            return False

        setattr(period, 'is_active', False)
        await session.flush()
        return True

    @staticmethod
    async def restore_period(
        session: AsyncSession,
        period_id: int,
    ) -> bool:
        """Restore soft-deleted period."""
        period = await MonthPeriodService.get_period_by_id(session, period_id, include_inactive=True)
        if not period:
            return False

        setattr(period, 'is_active', True)
        await session.flush()
        return True

    @staticmethod
    async def get_years_with_periods(
        session: AsyncSession,
        business_id: int,
    ) -> List[int]:
        """Get list of years that have periods for a business."""
        query = select(MonthPeriod.year).where(
            and_(
                MonthPeriod.business_id == business_id,
                MonthPeriod.is_active,
            )
        ).distinct().order_by(MonthPeriod.year.desc())
        
        result = await session.execute(query)
        return [year for year in result.scalars().all()]

    @staticmethod
    async def validate_period_transition(
        session: AsyncSession,
        business_id: int,
        from_status: MonthPeriodStatus,
        to_status: MonthPeriodStatus,
        period_id: int,
    ) -> tuple[bool, str]:
        """Validate if period status transition is allowed."""
        # Basic validation rules
        if from_status == to_status:
            return True, "No change needed"

        # Can't have multiple active periods
        if to_status == MonthPeriodStatus.ACTIVE:
            current_active = await MonthPeriodService.get_current_period(session, business_id)
            if current_active and getattr(current_active, 'id') != period_id:
                return False, f"Business already has an active period: {current_active.name}"

        # Allow ACTIVE -> CLOSED and CLOSED -> ACTIVE transitions
        valid_transitions = {
            MonthPeriodStatus.ACTIVE: [MonthPeriodStatus.CLOSED],
            MonthPeriodStatus.CLOSED: [MonthPeriodStatus.ACTIVE],
        }

        if to_status not in valid_transitions.get(from_status, []):
            return False, f"Cannot transition from {from_status} to {to_status}"

        return True, "Transition allowed"

    @staticmethod
    async def create_default_period(
        session: AsyncSession,
        business_id: int,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> MonthPeriod:
        """Create a default period for current month if none exists."""
        if not year or not month:
            now = datetime.utcnow()
            year = year or now.year
            month = month or now.month

        # Check if period already exists
        existing = await MonthPeriodService.get_period_by_month(
            session=session,
            business_id=business_id,
            year=year,
            month=month,
        )
        if existing:
            return existing

        # Create new period
        period_data = MonthPeriodCreate(
            name=f"{year}-{month:02d}",
            business_id=business_id,
            year=year,
            month=month,
            status=MonthPeriodStatus.ACTIVE,
            is_active=True,
        )
        
        return await MonthPeriodService.create_month_period(
            session=session,
            period_data=period_data,
            created_by_user_id=0,  # System created
        )
    