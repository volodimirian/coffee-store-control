"""
Cleanup script to remove duplicate month periods.
Keeps the most recent period and migrates any data from duplicates.
"""

import asyncio
from sqlalchemy import select, and_, func, delete, update

from app.core.db import async_session_maker
# Import all models to ensure relationships are properly resolved
from app.expenses import models as expense_models


async def cleanup_duplicate_periods():
    """Find and remove duplicate month periods for each business."""
    async with async_session_maker() as session:
        # Find all businesses with duplicate periods (same year/month)
        duplicates_query = (
            select(
                expense_models.MonthPeriod.business_id,
                expense_models.MonthPeriod.year,
                expense_models.MonthPeriod.month,
                func.count(expense_models.MonthPeriod.id).label('count')
            )
            .group_by(expense_models.MonthPeriod.business_id, expense_models.MonthPeriod.year, expense_models.MonthPeriod.month)
            .having(func.count(expense_models.MonthPeriod.id) > 1)
        )
        
        result = await session.execute(duplicates_query)
        duplicates = result.all()
        
        if not duplicates:
            print("✅ No duplicate periods found.")
            return
        
        print(f"🔍 Found {len(duplicates)} sets of duplicate periods:")
        
        for business_id, year, month, count in duplicates:
            print(f"\n📋 Business {business_id}, {year}-{month:02d}: {count} periods")
            
            # Get all periods for this business/year/month
            periods_query = (
                select(expense_models.MonthPeriod)
                .where(
                    and_(
                        expense_models.MonthPeriod.business_id == business_id,
                        expense_models.MonthPeriod.year == year,
                        expense_models.MonthPeriod.month == month,
                    )
                )
                .order_by(expense_models.MonthPeriod.updated_at.desc())  # Most recent first
            )
            periods_result = await session.execute(periods_query)
            periods = list(periods_result.scalars().all())
            
            # Keep the first one (most recently updated)
            keep_period = periods[0]
            print(f"   ✅ KEEPING: ID={keep_period.id}, status={keep_period.status}, updated={keep_period.updated_at}")
            
            # Process duplicates
            for duplicate_period in periods[1:]:
                print(f"   🗑️  REMOVING: ID={duplicate_period.id}, status={duplicate_period.status}, updated={duplicate_period.updated_at}")
                
                # Check if duplicate has any inventory balances
                balances_query = (
                    select(func.count())
                    .select_from(expense_models.InventoryBalance)
                    .where(expense_models.InventoryBalance.month_period_id == duplicate_period.id)
                )
                balance_count = await session.scalar(balances_query)
                
                if balance_count and balance_count > 0:
                    print(f"      ⚠️  Has {balance_count} inventory balances - checking for migration...")
                    
                    # Check if keep_period already has balances
                    keep_balances_query = (
                        select(func.count())
                        .select_from(expense_models.InventoryBalance)
                        .where(expense_models.InventoryBalance.month_period_id == keep_period.id)
                    )
                    keep_balance_count = await session.scalar(keep_balances_query)
                    
                    if keep_balance_count == 0:
                        # Migrate balances to keep_period
                        print(f"      🔄 Migrating {balance_count} balances to kept period...")
                        update_stmt = (
                            update(expense_models.InventoryBalance)
                            .where(expense_models.InventoryBalance.month_period_id == duplicate_period.id)
                            .values(month_period_id=keep_period.id)
                        )
                        await session.execute(update_stmt)
                    else:
                        # Both have balances - delete duplicate's balances
                        print(f"      🗑️  Both periods have balances. Deleting duplicate's {balance_count} balances...")
                        delete_stmt = delete(expense_models.InventoryBalance).where(
                            expense_models.InventoryBalance.month_period_id == duplicate_period.id
                        )
                        await session.execute(delete_stmt)
                
                # Delete the duplicate period
                await session.delete(duplicate_period)
            
            print(f"   ✅ Cleanup complete for {year}-{month:02d}")
        
        # Commit all changes
        await session.commit()
        print("\n✅ All duplicate periods cleaned up successfully!")
        
        # Verify cleanup
        verify_result = await session.execute(duplicates_query)
        remaining = verify_result.all()
        if remaining:
            print(f"⚠️  Warning: {len(remaining)} duplicate sets still remain")
        else:
            print("✅ Verification passed: No duplicates remaining")


async def ensure_single_active_period_per_business():
    """Ensure each business has at most one ACTIVE period."""
    async with async_session_maker() as session:
        # Find businesses with multiple active periods
        active_duplicates_query = (
            select(
                expense_models.MonthPeriod.business_id,
                func.count(expense_models.MonthPeriod.id).label('count')
            )
            .where(expense_models.MonthPeriod.status == 'active')
            .group_by(expense_models.MonthPeriod.business_id)
            .having(func.count(expense_models.MonthPeriod.id) > 1)
        )
        
        result = await session.execute(active_duplicates_query)
        duplicates = result.all()
        
        if not duplicates:
            print("✅ No businesses with multiple ACTIVE periods found.")
            return
        
        print(f"\n🔍 Found {len(duplicates)} businesses with multiple ACTIVE periods:")
        
        for business_id, count in duplicates:
            print(f"\n📋 Business {business_id}: {count} active periods")
            
            # Get all active periods for this business
            periods_query = (
                select(expense_models.MonthPeriod)
                .where(
                    and_(
                        expense_models.MonthPeriod.business_id == business_id,
                        expense_models.MonthPeriod.status == 'active',
                    )
                )
                .order_by(
                    expense_models.MonthPeriod.year.desc(),
                    expense_models.MonthPeriod.month.desc()
                )  # Most recent month first
            )
            periods_result = await session.execute(periods_query)
            periods = list(periods_result.scalars().all())
            
            # Keep only the most recent month as active
            keep_period = periods[0]
            print(f"   ✅ KEEPING ACTIVE: ID={keep_period.id}, {keep_period.year}-{keep_period.month:02d}")
            
            # Close all older active periods
            for old_period in periods[1:]:
                print(f"   🔒 CLOSING: ID={old_period.id}, {old_period.year}-{old_period.month:02d}")
                old_period.status = 'closed'
        
        await session.commit()
        print("\n✅ All businesses now have at most one ACTIVE period!")


async def main():
    """Run all cleanup tasks."""
    print("=" * 60)
    print("DATABASE CLEANUP: Duplicate Month Periods")
    print("=" * 60)
    
    print("\n1️⃣  Cleaning up duplicate periods (same business/year/month)...")
    await cleanup_duplicate_periods()
    
    print("\n2️⃣  Ensuring single ACTIVE period per business...")
    await ensure_single_active_period_per_business()
    
    print("\n" + "=" * 60)
    print("✅ CLEANUP COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
