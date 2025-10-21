"""Service for managing expense categories."""

from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload

from app.expenses.models import ExpenseCategory
from app.expenses.schemas import ExpenseCategoryCreate, ExpenseCategoryUpdate


class ExpenseCategoryService:
    """Service for managing expense categories."""

    @staticmethod
    async def create_category(
        session: AsyncSession,
        category_data: ExpenseCategoryCreate,
        created_by_user_id: int,
    ) -> ExpenseCategory:
        """Create a new expense category."""
        # Get next order index for this section
        next_order = await ExpenseCategoryService._get_next_order_index(
            session=session,
            section_id=category_data.section_id,
        )

        category = ExpenseCategory(
            name=category_data.name,
            section_id=category_data.section_id,
            business_id=category_data.business_id,
            default_unit_id=category_data.default_unit_id,
            created_by=created_by_user_id,
            order_index=category_data.order_index if category_data.order_index is not None else next_order,
            is_active=category_data.is_active,
        )
        
        session.add(category)
        await session.flush()
        await session.refresh(category)
        return category

    @staticmethod
    async def get_category_by_id(
        session: AsyncSession,
        category_id: int,
        include_inactive: bool = False,
        include_relations: bool = False,
    ) -> Optional[ExpenseCategory]:
        """Get category by ID."""
        query = select(ExpenseCategory).where(ExpenseCategory.id == category_id)
        
        if not include_inactive:
            query = query.where(ExpenseCategory.is_active)
            
        if include_relations:
            query = query.options(
                selectinload(ExpenseCategory.section),
                selectinload(ExpenseCategory.default_unit)
            )
            
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_categories_by_section(
        session: AsyncSession,
        section_id: int,
        is_active: Optional[bool] = None,
        include_relations: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ExpenseCategory]:
        """Get all categories for a section."""
        query = select(ExpenseCategory).where(ExpenseCategory.section_id == section_id)
        
        if is_active is not None:
            query = query.where(ExpenseCategory.is_active == is_active)
            
        if include_relations:
            query = query.options(
                selectinload(ExpenseCategory.section),
                selectinload(ExpenseCategory.default_unit)
            )
            
        query = query.order_by(ExpenseCategory.order_index, ExpenseCategory.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_categories_by_business(
        session: AsyncSession,
        business_id: int,
        is_active: Optional[bool] = None,
        include_relations: bool = False,
        skip: int = 0,
        limit: int = 200,
    ) -> List[ExpenseCategory]:
        """Get all categories for a business through sections."""
        from app.expenses.models import ExpenseSection
        
        query = select(ExpenseCategory).join(ExpenseSection).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.is_active,
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseCategory.is_active == is_active)
            
        if include_relations:
            query = query.options(
                selectinload(ExpenseCategory.section),
                selectinload(ExpenseCategory.default_unit)
            )
            
        query = query.order_by(
            ExpenseSection.order_index, 
            ExpenseCategory.order_index, 
            ExpenseCategory.name
        ).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_categories_by_section(
        session: AsyncSession,
        section_id: int,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count categories for a section."""
        query = select(func.count(ExpenseCategory.id)).where(ExpenseCategory.section_id == section_id)
        
        if is_active is not None:
            query = query.where(ExpenseCategory.is_active == is_active)
            
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def update_category(
        session: AsyncSession,
        category_id: int,
        category_data: ExpenseCategoryUpdate,
    ) -> Optional[ExpenseCategory]:
        """Update category information."""
        category = await ExpenseCategoryService.get_category_by_id(session, category_id, include_inactive=True)
        if not category:
            return None

        # Update fields
        update_fields = category_data.dict(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(category, field, value)

        await session.flush()
        await session.refresh(category)
        return category

    @staticmethod
    async def delete_category(
        session: AsyncSession,
        category_id: int,
    ) -> bool:
        """Soft delete category."""
        category = await ExpenseCategoryService.get_category_by_id(session, category_id)
        if not category:
            return False

        setattr(category, 'is_active', False)
        await session.flush()
        return True

    @staticmethod
    async def restore_category(
        session: AsyncSession,
        category_id: int,
    ) -> bool:
        """Restore soft-deleted category."""
        category = await ExpenseCategoryService.get_category_by_id(session, category_id, include_inactive=True)
        if not category:
            return False

        setattr(category, 'is_active', True)
        await session.flush()
        return True

    @staticmethod
    async def reorder_categories(
        session: AsyncSession,
        section_id: int,
        category_orders: List[tuple[int, int]],  # [(category_id, new_order), ...]
    ) -> bool:
        """Reorder categories within a section."""
        try:
            for category_id, new_order in category_orders:
                category = await ExpenseCategoryService.get_category_by_id(session, category_id)
                if category and getattr(category, 'section_id') == section_id:
                    setattr(category, 'order_index', new_order)
            
            await session.flush()
            return True
        except Exception:
            return False

    @staticmethod
    async def _get_next_order_index(
        session: AsyncSession,
        section_id: int,
    ) -> int:
        """Get next order index for a new category."""
        query = select(func.max(ExpenseCategory.order_index)).where(
            and_(
                ExpenseCategory.section_id == section_id,
                ExpenseCategory.is_active,
            )
        )
        
        result = await session.execute(query)
        max_order = result.scalar() or 0
        return max_order + 1

    @staticmethod
    async def search_categories(
        session: AsyncSession,
        section_id: int,
        search_query: str,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ExpenseCategory]:
        """Search categories by name within a section."""
        query = select(ExpenseCategory).where(
            and_(
                ExpenseCategory.section_id == section_id,
                ExpenseCategory.name.ilike(f"%{search_query}%")
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseCategory.is_active == is_active)
            
        query = query.order_by(ExpenseCategory.order_index, ExpenseCategory.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def search_categories_by_business_period(
        session: AsyncSession,
        business_id: int,
        month_period_id: int,
        search_query: str,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ExpenseCategory]:
        """Search categories by name across all sections in a business period."""
        from app.expenses.models import ExpenseSection
        
        query = select(ExpenseCategory).join(ExpenseSection).where(
            and_(
                ExpenseSection.business_id == business_id,
                ExpenseSection.is_active,
                ExpenseCategory.name.ilike(f"%{search_query}%")
            )
        )
        
        if is_active is not None:
            query = query.where(ExpenseCategory.is_active == is_active)
            
        query = query.order_by(
            ExpenseSection.order_index, 
            ExpenseCategory.order_index, 
            ExpenseCategory.name
        ).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def activate_all_categories_in_section(
        session: AsyncSession,
        section_id: int,
    ) -> bool:
        """Activate all categories in a section."""
        try:
            # Get all categories in the section (including inactive ones)
            query = select(ExpenseCategory).where(
                ExpenseCategory.section_id == section_id
            )
            result = await session.execute(query)
            categories = list(result.scalars().all())
            
            # Activate all categories
            for category in categories:
                setattr(category, 'is_active', True)
            
            await session.flush()
            return True
        except Exception:
            return False

    @staticmethod
    async def deactivate_all_categories_in_section(
        session: AsyncSession,
        section_id: int,
    ) -> bool:
        """Deactivate all categories in a section."""
        try:
            # Get all active categories in the section
            query = select(ExpenseCategory).where(
                and_(
                    ExpenseCategory.section_id == section_id,
                    ExpenseCategory.is_active
                )
            )
            result = await session.execute(query)
            categories = list(result.scalars().all())
            
            # Deactivate all categories
            for category in categories:
                setattr(category, 'is_active', False)
            
            await session.flush()
            return True
        except Exception:
            return False