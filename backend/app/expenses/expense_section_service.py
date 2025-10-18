"""Service for managing expense sections and categories."""

from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload

from app.expenses.models import ExpenseSection
from app.expenses.schemas import ExpenseSectionCreate, ExpenseSectionUpdate


class ExpenseSectionService:
    """Service for managing expense sections."""

    @staticmethod
    async def create_section(
        session: AsyncSession,
        section_data: ExpenseSectionCreate,
        created_by_user_id: int,
    ) -> ExpenseSection:
        """Create a new expense section."""
        # Get next order index for this business/period
        next_order = await ExpenseSectionService._get_next_order_index(
            session=session,
            business_id=section_data.business_id,
            month_period_id=section_data.month_period_id,
        )

        section = ExpenseSection(
            name=section_data.name,
            business_id=section_data.business_id,
            month_period_id=section_data.month_period_id,
            created_by=created_by_user_id,
            order_index=section_data.order_index if section_data.order_index is not None else next_order,
            is_active=section_data.is_active,
        )
        
        session.add(section)
        await session.flush()
        await session.refresh(section)
        return section

    @staticmethod
    async def get_section_by_id(
        session: AsyncSession,
        section_id: int,
        include_inactive: bool = False,
        include_categories: bool = False,
    ) -> Optional[ExpenseSection]:
        """Get section by ID."""
        query = select(ExpenseSection).where(ExpenseSection.id == section_id)
        
        if not include_inactive:
            query = query.where(ExpenseSection.is_active)
            
        if include_categories:
            query = query.options(selectinload(ExpenseSection.expense_categories))
            
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_sections_by_business_period(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
        is_active: Optional[bool] = None,
        include_categories: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ExpenseSection]:
        """Get all sections for a business period."""
        query = select(ExpenseSection).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.month_period_id == month_period_id,
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseSection.is_active == is_active)
            
        if include_categories:
            query = query.options(selectinload(ExpenseSection.expense_categories))
            
        query = query.order_by(ExpenseSection.order_index, ExpenseSection.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_sections_by_business_period(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count sections for a business period."""
        query = select(func.count(ExpenseSection.id)).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.month_period_id == month_period_id,
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseSection.is_active == is_active)
            
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def update_section(
        session: AsyncSession,
        section_id: int,
        section_data: ExpenseSectionUpdate,
    ) -> Optional[ExpenseSection]:
        """Update section information."""
        section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
        if not section:
            return None

        # Update fields
        update_fields = section_data.dict(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(section, field, value)

        await session.flush()
        await session.refresh(section)
        return section

    @staticmethod
    async def delete_section(
        session: AsyncSession,
        section_id: int,
    ) -> bool:
        """Soft delete section."""
        section = await ExpenseSectionService.get_section_by_id(session, section_id)
        if not section:
            return False

        setattr(section, 'is_active', False)
        await session.flush()
        return True

    @staticmethod
    async def restore_section(
        session: AsyncSession,
        section_id: int,
    ) -> bool:
        """Restore soft-deleted section."""
        section = await ExpenseSectionService.get_section_by_id(session, section_id, include_inactive=True)
        if not section:
            return False

        setattr(section, 'is_active', True)
        await session.flush()
        return True

    @staticmethod
    async def reorder_sections(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
        section_orders: List[tuple[int, int]],  # [(section_id, new_order), ...]
    ) -> bool:
        """Reorder sections within a business period."""
        try:
            for section_id, new_order in section_orders:
                section = await ExpenseSectionService.get_section_by_id(session, section_id)
                if section and getattr(section, 'business_id') == business_id and getattr(section, 'month_period_id') == month_period_id:
                    setattr(section, 'order_index', new_order)
            
            await session.flush()
            return True
        except Exception:
            return False

    @staticmethod
    async def _get_next_order_index(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
    ) -> int:
        """Get next order index for a new section."""
        query = select(func.max(ExpenseSection.order_index)).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.month_period_id == month_period_id,
                ExpenseSection.is_active,
            )
        )
        
        result = await session.execute(query)
        max_order = result.scalar() or 0
        return max_order + 1

    @staticmethod
    async def search_sections(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
        search_query: str,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ExpenseSection]:
        """Search sections by name within a business period."""
        query = select(ExpenseSection).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.month_period_id == month_period_id,
                ExpenseSection.name.ilike(f"%{search_query}%")
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseSection.is_active == is_active)
            
        query = query.order_by(ExpenseSection.order_index, ExpenseSection.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())
    