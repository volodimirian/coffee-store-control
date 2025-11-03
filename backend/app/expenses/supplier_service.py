"""Service layer for supplier management."""

from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
# from sqlalchemy.orm import selectinload  # Will use when needed

from app.expenses.models import Supplier
from app.expenses.schemas import SupplierCreate, SupplierUpdate


class SupplierService:
    """Service class for supplier operations."""

    @staticmethod
    async def create_supplier(
        session: AsyncSession,
        supplier_data: SupplierCreate,
        created_by_user_id: int,
    ) -> Supplier:
        """Create a new supplier."""
        db_supplier = Supplier(
            name=supplier_data.name,
            contact_info=supplier_data.contact_info,
            business_id=supplier_data.business_id,
            created_by=created_by_user_id,
            is_active=supplier_data.is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(db_supplier)
        await session.flush()
        await session.refresh(db_supplier)
        return db_supplier

    @staticmethod
    async def get_supplier_by_id(session: AsyncSession, supplier_id: int) -> Optional[Supplier]:
        """Get supplier by ID."""
        result = await session.execute(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_suppliers_by_business(
        session: AsyncSession, 
        business_id: int,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Supplier]:
        """Get all suppliers for a specific business."""
        query = select(Supplier).where(Supplier.business_id == business_id)
        
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
            
        query = query.offset(skip).limit(limit).order_by(Supplier.name)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_supplier(
        session: AsyncSession,
        supplier_id: int,
        supplier_data: SupplierUpdate,
    ) -> Optional[Supplier]:
        """Update supplier information."""
        supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
        if not supplier:
            return None

        update_data = supplier_data.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(supplier, field, value)
            setattr(supplier, 'updated_at', datetime.utcnow())
            await session.flush()
            await session.refresh(supplier)

        return supplier

    @staticmethod
    async def delete_supplier(session: AsyncSession, supplier_id: int) -> bool:
        """Soft delete supplier by setting is_active to False."""
        supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
        if not supplier:
            return False

        setattr(supplier, 'is_active', False)
        setattr(supplier, 'updated_at', datetime.utcnow())
        await session.flush()
        return True

    @staticmethod
    async def hard_delete_supplier(session: AsyncSession, supplier_id: int) -> bool:
        """Permanently delete supplier from database."""
        supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
        if not supplier:
            return False

        await session.delete(supplier)
        await session.flush()
        return True

    @staticmethod
    async def restore_supplier(session: AsyncSession, supplier_id: int) -> bool:
        """Restore soft-deleted supplier by setting is_active to True."""
        supplier = await SupplierService.get_supplier_by_id(session, supplier_id)
        if not supplier:
            return False

        setattr(supplier, 'is_active', True)
        setattr(supplier, 'updated_at', datetime.utcnow())
        await session.flush()
        return True

    @staticmethod
    async def search_suppliers(
        session: AsyncSession,
        business_id: int,
        search_query: str,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Supplier]:
        """Search suppliers by name within a business."""
        query = select(Supplier).where(
            and_(
                Supplier.business_id == business_id,
                Supplier.name.ilike(f"%{search_query}%")
            )
        )
        
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
            
        query = query.offset(skip).limit(limit).order_by(Supplier.name)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_suppliers_by_business(
        session: AsyncSession,
        business_id: int,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count suppliers for a business."""
        from sqlalchemy import func
        
        query = select(func.count(Supplier.id)).where(Supplier.business_id == business_id)
        
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
            
        result = await session.execute(query)
        return result.scalar() or 0
    