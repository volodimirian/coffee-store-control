"""Service for managing measurement units and conversions."""

from typing import List, Optional, Dict, Tuple
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload

from app.expenses.models import Unit
from app.expenses.schemas import UnitCreate, UnitUpdate


class UnitService:
    """Service for managing measurement units with conversion factors."""

    @staticmethod
    async def create_unit(
        session: AsyncSession,
        unit_data: UnitCreate,
        created_by_user_id: int,  # Keep parameter for future use but don't use it yet
    ) -> Unit:
        """Create a new measurement unit."""
        unit = Unit(
            business_id=unit_data.business_id,
            name=unit_data.name,
            symbol=unit_data.symbol,
            unit_type=unit_data.unit_type,
            base_unit_id=unit_data.base_unit_id,
            conversion_factor=unit_data.conversion_factor,
            description=unit_data.description,
            is_active=True,
        )
        session.add(unit)
        await session.flush()
        await session.refresh(unit)
        return unit

    @staticmethod
    async def get_unit_by_id(
        session: AsyncSession,
        unit_id: int,
        include_inactive: bool = False,
    ) -> Optional[Unit]:
        """Get unit by ID."""
        query = select(Unit).where(Unit.id == unit_id)
        
        if not include_inactive:
            query = query.where(Unit.is_active)
            
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_units_by_business(
        session: AsyncSession,
        business_id: int,
        unit_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Unit]:
        """Get all units for a business with optional filtering."""
        query = select(Unit).where(Unit.business_id == business_id)
        
        if unit_type:
            query = query.where(Unit.unit_type == unit_type)
            
        if is_active is not None:
            query = query.where(Unit.is_active == is_active)
            
        query = query.order_by(Unit.unit_type, Unit.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def search_units(
        session: AsyncSession,
        business_id: int,
        search_query: str,
        unit_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Unit]:
        """Search units by name or symbol."""
        search_pattern = f"%{search_query.lower()}%"
        
        query = select(Unit).where(
            and_(
                Unit.business_id == business_id,
                func.lower(Unit.name).like(search_pattern) | 
                func.lower(Unit.symbol).like(search_pattern)
            )
        )
        
        if unit_type:
            query = query.where(Unit.unit_type == unit_type)
            
        if is_active is not None:
            query = query.where(Unit.is_active == is_active)
            
        query = query.order_by(Unit.unit_type, Unit.name).offset(skip).limit(limit)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_units_by_business(
        session: AsyncSession,
        business_id: int,
        unit_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count units for a business."""
        query = select(func.count(Unit.id)).where(Unit.business_id == business_id)
        
        if unit_type:
            query = query.where(Unit.unit_type == unit_type)
            
        if is_active is not None:
            query = query.where(Unit.is_active == is_active)
            
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def update_unit(
        session: AsyncSession,
        unit_id: int,
        unit_data: UnitUpdate,
    ) -> Optional[Unit]:
        """Update unit information."""
        unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
        if not unit:
            return None

        # Update fields if provided
        update_data = unit_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(unit, field, value)

        await session.flush()
        await session.refresh(unit)
        return unit

    @staticmethod
    async def delete_unit(session: AsyncSession, unit_id: int) -> bool:
        """Soft delete a unit."""
        unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
        if not unit:
            return False

        setattr(unit, 'is_active', False)
        await session.flush()
        return True

    @staticmethod
    async def restore_unit(session: AsyncSession, unit_id: int) -> bool:
        """Restore a soft-deleted unit."""
        unit = await UnitService.get_unit_by_id(session, unit_id, include_inactive=True)
        if not unit:
            return False

        setattr(unit, 'is_active', True)
        await session.flush()
        return True

    @staticmethod
    async def get_base_units_by_business(
        session: AsyncSession,
        business_id: int,
        unit_type: Optional[str] = None,
    ) -> List[Unit]:
        """Get base units (units without parent conversion) for a business."""
        query = select(Unit).where(
            and_(
                Unit.business_id == business_id,
                Unit.base_unit_id.is_(None),
                Unit.is_active,
            )
        )
        
        if unit_type:
            query = query.where(Unit.unit_type == unit_type)
            
        query = query.order_by(Unit.unit_type, Unit.name)
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_unit_hierarchy(
        session: AsyncSession,
        business_id: int,
        unit_type: Optional[str] = None,
    ) -> Dict[str, List[Unit]]:
        """Get units organized by type with conversion hierarchies."""
        query = select(Unit).options(
            selectinload(Unit.base_unit),
            selectinload(Unit.derived_units)
        ).where(
            and_(
                Unit.business_id == business_id,
                Unit.is_active,
            )
        )
        
        if unit_type:
            query = query.where(Unit.unit_type == unit_type)
            
        result = await session.execute(query)
        units = result.scalars().all()
        
        # Organize by unit type
        hierarchy: Dict[str, List[Unit]] = {}
        for unit in units:
            unit_type_str = str(getattr(unit, 'unit_type'))
            if unit_type_str not in hierarchy:
                hierarchy[unit_type_str] = []
            hierarchy[unit_type_str].append(unit)
            
        return hierarchy

    @staticmethod
    async def convert_quantity(
        session: AsyncSession,
        quantity: Decimal,
        from_unit_id: int,
        to_unit_id: int,
    ) -> Tuple[Optional[Decimal], str]:
        """
        Convert quantity from one unit to another.
        Returns (converted_quantity, error_message).
        """
        if from_unit_id == to_unit_id:
            return quantity, ""
            
        # Get both units
        from_unit = await UnitService.get_unit_by_id(session, from_unit_id)
        to_unit = await UnitService.get_unit_by_id(session, to_unit_id)
        
        if not from_unit:
            return None, f"Source unit {from_unit_id} not found"
        if not to_unit:
            return None, f"Target unit {to_unit_id} not found"
            
        # Check if units are of the same type
        if str(from_unit.unit_type) != str(to_unit.unit_type):
            return None, f"Cannot convert between different unit types: {from_unit.unit_type} -> {to_unit.unit_type}"
            
        # Get conversion path to base unit for both units
        from_base_factor = await UnitService._get_base_conversion_factor(session, from_unit)
        to_base_factor = await UnitService._get_base_conversion_factor(session, to_unit)
        
        if from_base_factor is None:
            return None, f"Cannot determine base conversion for unit {from_unit.name}"
        if to_base_factor is None:
            return None, f"Cannot determine base conversion for unit {to_unit.name}"
            
        # Convert: from_unit -> base_unit -> to_unit
        # quantity_in_base = quantity * from_base_factor
        # converted_quantity = quantity_in_base / to_base_factor
        converted_quantity = (quantity * from_base_factor) / to_base_factor
        
        return converted_quantity, ""

    @staticmethod
    async def _get_base_conversion_factor(
        session: AsyncSession,
        unit: Unit,
    ) -> Optional[Decimal]:
        """
        Get the conversion factor to convert from this unit to its base unit.
        Returns accumulated conversion factor through the hierarchy.
        """
        if unit.base_unit_id is None:
            # This is a base unit
            return Decimal("1.0")
            
        # Follow the chain up to the base unit
        current_unit = unit
        total_factor = Decimal("1.0")
        visited_units = set()
        
        while getattr(current_unit, 'base_unit_id') is not None:
            if current_unit.id in visited_units:
                # Circular reference detected
                return None
                
            visited_units.add(current_unit.id)
            total_factor *= getattr(current_unit, 'conversion_factor')
            
            # Get the parent unit
            parent_unit = await UnitService.get_unit_by_id(
                session, 
                getattr(current_unit, 'base_unit_id')
            )
            if not parent_unit:
                return None
                
            current_unit = parent_unit
            
        return total_factor

    @staticmethod
    async def validate_unit_hierarchy(
        session: AsyncSession,
        unit_id: int,
        new_base_unit_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Validate that setting a base unit doesn't create circular references.
        Returns (is_valid, error_message).
        """
        if new_base_unit_id is None:
            return True, ""
            
        if unit_id == new_base_unit_id:
            return False, "Unit cannot be its own base unit"
            
        # Check if the new base unit eventually derives from this unit
        current_unit_id = new_base_unit_id
        visited_units = set()
        
        while current_unit_id is not None:
            if int(current_unit_id) == int(unit_id):
                return False, "Circular reference detected in unit hierarchy"
                
            if current_unit_id in visited_units:
                return False, "Circular reference detected in existing hierarchy"
                
            visited_units.add(current_unit_id)
            
            # Get the next unit in the chain
            unit = await UnitService.get_unit_by_id(session, current_unit_id)
            if not unit:
                return False, f"Base unit {current_unit_id} not found"
                
            current_unit_id = getattr(unit, 'base_unit_id')
            
        return True, ""
    