"""Technology Card service for recipe management and cost calculations."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, cast

from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.tech_cards.models import (
    TechCardItem,
    TechCardItemIngredient,
    IngredientCostHistory,
    ApprovalStatus,
)
from app.tech_cards.schemas import (
    TechCardItemCreate,
    TechCardItemUpdate,
    TechCardItemApprovalUpdate,
    IngredientCostSummary,
)
from app.expenses.models import ExpenseCategory, Unit, Invoice
from app.expenses.unit_service import UnitService


class TechCardService:
    """Service for managing technology cards (recipes)."""

    @staticmethod
    async def create_tech_card_item(
        session: AsyncSession,
        business_id: int,
        user_id: int,
        item_data: TechCardItemCreate,
    ) -> TechCardItem:
        """Create a new technology card item with ingredients."""
        # Create the tech card item
        tech_item = TechCardItem(
            business_id=business_id,
            name=item_data.name,
            description=item_data.description,
            selling_price=item_data.selling_price,
            is_active=item_data.is_active,
            approval_status=ApprovalStatus.DRAFT.value,
            created_by=user_id,
        )
        session.add(tech_item)
        await session.flush()

        # Create ingredients
        for idx, ingredient_data in enumerate(item_data.ingredients):
            ingredient = TechCardItemIngredient(
                item_id=tech_item.id,
                ingredient_category_id=ingredient_data.ingredient_category_id,
                quantity=ingredient_data.quantity,
                unit_id=ingredient_data.unit_id,
                notes=ingredient_data.notes,
                sort_order=ingredient_data.sort_order if ingredient_data.sort_order else idx,
            )
            session.add(ingredient)

        await session.commit()
        await session.refresh(tech_item, ["ingredients"])
        return tech_item

    @staticmethod
    async def get_tech_card_item(
        session: AsyncSession,
        item_id: int,
        business_id: int,
    ) -> Optional[TechCardItem]:
        """Get tech card item by ID."""
        stmt = (
            select(TechCardItem)
            .options(selectinload(TechCardItem.ingredients))
            .where(
                and_(
                    TechCardItem.id == item_id,
                    TechCardItem.business_id == business_id,
                )
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_tech_card_items(
        session: AsyncSession,
        business_id: int,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None,
        approval_status: Optional[str] = None,
    ) -> tuple[list[TechCardItem], int]:
        """List tech card items with filters."""
        # Build base query
        conditions = [TechCardItem.business_id == business_id]

        if is_active is not None:
            conditions.append(TechCardItem.is_active == is_active)
        if approval_status is not None:
            conditions.append(TechCardItem.approval_status == approval_status)

        # Count total
        count_stmt = select(func.count()).select_from(TechCardItem).where(and_(*conditions))
        total = await session.scalar(count_stmt)

        # Get paginated items
        stmt = (
            select(TechCardItem)
            .options(selectinload(TechCardItem.ingredients))
            .where(and_(*conditions))
            .order_by(desc(TechCardItem.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await session.execute(stmt)
        items = list(result.scalars().all())

        return items, total or 0

    @staticmethod
    async def update_tech_card_item(
        session: AsyncSession,
        item_id: int,
        business_id: int,
        update_data: TechCardItemUpdate,
    ) -> Optional[TechCardItem]:
        """Update tech card item."""
        item = await TechCardService.get_tech_card_item(session, item_id, business_id)
        if not item:
            return None

        # Update basic fields
        update_dict = update_data.model_dump(exclude_unset=True, exclude={"ingredients"})
        for field, value in update_dict.items():
            setattr(item, field, value)

        # Update ingredients if provided
        if update_data.ingredients is not None:
            # Delete existing ingredients
            for ingredient in item.ingredients:
                await session.delete(ingredient)

            # Create new ingredients
            for idx, ingredient_data in enumerate(update_data.ingredients):
                ingredient = TechCardItemIngredient(
                    item_id=item.id,
                    ingredient_category_id=ingredient_data.ingredient_category_id,
                    quantity=ingredient_data.quantity,
                    unit_id=ingredient_data.unit_id,
                    notes=ingredient_data.notes,
                    sort_order=ingredient_data.sort_order if ingredient_data.sort_order else idx,
                )
                session.add(ingredient)

        # Reset approval if item was approved and is being edited
        if item.approval_status == ApprovalStatus.APPROVED.value:
            item.approval_status = ApprovalStatus.DRAFT.value
            item.approved_by = None
            item.approved_at = None

        await session.commit()
        await session.refresh(item)
        return item

    @staticmethod
    async def delete_tech_card_item(
        session: AsyncSession,
        item_id: int,
        business_id: int,
    ) -> bool:
        """Delete tech card item."""
        item = await TechCardService.get_tech_card_item(session, item_id, business_id)
        if not item:
            return False

        await session.delete(item)
        await session.commit()
        return True

    @staticmethod
    async def update_approval_status(
        session: AsyncSession,
        item_id: int,
        business_id: int,
        user_id: int,
        approval_data: TechCardItemApprovalUpdate,
    ) -> Optional[TechCardItem]:
        """Approve or reject tech card item."""
        item = await TechCardService.get_tech_card_item(session, item_id, business_id)
        if not item:
            return None

        item.approval_status = approval_data.approval_status
        item.approved_by = user_id
        item.approved_at = datetime.utcnow()

        await session.commit()
        await session.refresh(item)
        return item

    @staticmethod
    async def calculate_item_cost(
        session: AsyncSession,
        item_id: int,
        business_id: int,
    ) -> Optional[Decimal]:
        """
        Calculate total cost of tech card item based on ingredient costs.
        Uses weighted average from recent invoices.
        """
        item = await TechCardService.get_tech_card_item(session, item_id, business_id)
        if not item:
            return None

        total_cost = Decimal("0")

        for ingredient in item.ingredients:
            ingredient_cost = await IngredientCostService.get_ingredient_average_cost(
                session=session,
                business_id=business_id,
                category_id=ingredient.ingredient_category_id,
                target_unit_id=ingredient.unit_id,
            )

            if ingredient_cost is None:
                # Cannot calculate if ingredient has no cost history
                return None

            total_cost += ingredient_cost * ingredient.quantity

        return total_cost


class IngredientCostService:
    """Service for tracking and calculating ingredient costs."""

    @staticmethod
    async def sync_invoice_costs(
        session: AsyncSession,
        invoice_id: int,
        business_id: int,
    ) -> int:
        """
        Sync ingredient costs from invoice items to cost history.
        Called when invoice is approved.
        Returns count of cost records created.
        """
        # Get invoice with items
        invoice_stmt = (
            select(Invoice)
            .options(selectinload(Invoice.invoice_items))
            .where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.business_id == business_id,
                )
            )
        )
        result = await session.execute(invoice_stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            return 0

        count = 0
        for item in invoice.invoice_items:
            # Calculate cost per unit
            cost_per_unit = item.unit_price

            # Create cost history record
            cost_record = IngredientCostHistory(
                category_id=item.category_id,
                business_id=business_id,
                invoice_id=invoice_id,
                invoice_item_id=item.id,
                cost_per_unit=cost_per_unit,
                unit_id=item.unit_id,
                purchase_date=invoice.invoice_date,
                quantity_purchased=item.quantity,
                total_cost=item.total_price,
            )
            session.add(cost_record)
            count += 1

        await session.commit()
        return count

    @staticmethod
    async def get_ingredient_average_cost(
        session: AsyncSession,
        business_id: int,
        category_id: int,
        target_unit_id: int,
        num_invoices: int = 3,
    ) -> Optional[Decimal]:
        """
        Calculate weighted average cost for ingredient.
        Converts all costs to target unit before averaging.
        Fetches more records if conversion fails to ensure we get the requested number.
        
        Args:
            session: Database session
            business_id: Business ID
            category_id: Ingredient category ID
            target_unit_id: Unit to return cost in
            num_invoices: Number of recent invoices to use (default 3)
            
        Returns:
            Average cost per target unit, or None if no data
        """
        # Fetch more records than needed to account for conversion failures
        # We'll keep fetching until we have enough successful conversions or run out of records
        max_fetch_attempts = 3  # How many times to try fetching more records
        records_per_fetch = num_invoices * 2  # Fetch 2x more to account for failures
        offset = 0
        successful_records: list[tuple[IngredientCostHistory, Decimal]] = []
        
        for attempt in range(max_fetch_attempts):
            # Get recent cost records
            stmt = (
                select(IngredientCostHistory)
                .where(
                    and_(
                        IngredientCostHistory.category_id == category_id,
                        IngredientCostHistory.business_id == business_id,
                    )
                )
                .order_by(desc(IngredientCostHistory.purchase_date))
                .limit(records_per_fetch)
                .offset(offset)
            )
            result = await session.execute(stmt)
            cost_records = list(result.scalars().all())

            if not cost_records:
                # No more records available
                break

            # Try to convert each record
            for record in cost_records:
                if len(successful_records) >= num_invoices:
                    # We have enough successful records
                    break
                    
                # Convert quantity to target unit
                converted_qty, error = await UnitService.convert_quantity(
                    session=session,
                    quantity=record.quantity_purchased,
                    from_unit_id=record.unit_id,
                    to_unit_id=target_unit_id,
                )

                if converted_qty is not None and not error:
                    # Conversion successful - add to successful records
                    successful_records.append((record, converted_qty))
            
            # Check if we have enough successful records
            if len(successful_records) >= num_invoices:
                break
                
            # If we fetched fewer records than requested, no point trying again
            if len(cost_records) < records_per_fetch:
                break
                
            # Prepare for next fetch
            offset += records_per_fetch

        # If no successful conversions, return None
        if not successful_records:
            return None

        # Calculate weighted average from successful records
        total_quantity_in_target_unit = Decimal("0")
        total_cost = Decimal("0")

        for record, converted_qty in successful_records:
            total_quantity_in_target_unit += converted_qty
            total_cost += record.total_cost

        if total_quantity_in_target_unit == 0:
            return None

        average_cost_per_unit = total_cost / total_quantity_in_target_unit
        return average_cost_per_unit

    @staticmethod
    async def get_ingredient_cost_summary(
        session: AsyncSession,
        business_id: int,
        category_id: int,
    ) -> Optional[IngredientCostSummary]:
        """Get cost summary for an ingredient."""
        # Get category info
        category = await session.get(ExpenseCategory, category_id)
        if not category:
            return None

        # Get base unit for this category's unit type
        # This is a simplified approach - in reality you'd need to determine
        # the appropriate base unit based on the category's typical unit type
        stmt = (
            select(IngredientCostHistory)
            .where(
                and_(
                    IngredientCostHistory.category_id == category_id,
                    IngredientCostHistory.business_id == business_id,
                )
            )
            .order_by(desc(IngredientCostHistory.purchase_date))
            .limit(3)
        )
        result = await session.execute(stmt)
        records = list(result.scalars().all())

        if not records:
            return None

        # For now, use the most recent record's unit as base
        # In production, determine proper base unit
        base_unit_id = records[0].unit_id
        base_unit = await session.get(Unit, base_unit_id)
        
        if not base_unit:
            return None

        avg_cost = await IngredientCostService.get_ingredient_average_cost(
            session=session,
            business_id=business_id,
            category_id=category_id,
            target_unit_id=base_unit_id,
        )

        if avg_cost is None:
            return None

        return IngredientCostSummary(
            category_id=category_id,
            category_name=cast(str, category.name),
            average_cost_per_base_unit=avg_cost,
            base_unit_name=cast(str, base_unit.name),
            base_unit_symbol=cast(str, base_unit.symbol),
            invoices_analyzed=len(records),
            date_range_from=min(r.purchase_date for r in records),
            date_range_to=max(r.purchase_date for r in records),
        )
