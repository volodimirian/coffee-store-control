"""
Final cleanup script for OFD sales data before correct resync.

This script removes ALL OFD-related data to allow fresh sync with correct unit handling:
- sale_ingredient_expenses (all deductions)
- sale_items (all receipt items)
- sales (all receipts)
- Resets last_sync_at for all OFD connections

Preserves:
- product_mappings (mapping configurations)
- ofd_connections (connection settings)
"""

import asyncio
from sqlalchemy import select, delete, update

from app.core.db import async_session_maker
from app.ofd_integration.models import (
    Sale,
    SaleItem,
    SaleIngredientExpense,
    OFDConnection,
)


async def cleanup_all_ofd_data():
    """Remove all OFD sales data for fresh resync."""
    async with async_session_maker() as session:
        try:
            # 1. Count records before deletion
            expenses_count_stmt = select(SaleIngredientExpense)
            expenses_result = await session.execute(expenses_count_stmt)
            expenses_count = len(expenses_result.scalars().all())
            
            items_count_stmt = select(SaleItem)
            items_result = await session.execute(items_count_stmt)
            items_count = len(items_result.scalars().all())
            
            sales_count_stmt = select(Sale)
            sales_result = await session.execute(sales_count_stmt)
            sales_count = len(sales_result.scalars().all())
            
            connections_count_stmt = select(OFDConnection)
            connections_result = await session.execute(connections_count_stmt)
            connections_count = len(connections_result.scalars().all())
            
            print("📊 Records to delete:")
            print(f"   - sale_ingredient_expenses: {expenses_count}")
            print(f"   - sale_items: {items_count}")
            print(f"   - sales: {sales_count}")
            print(f"   - ofd_connections to reset: {connections_count}")
            print()
            
            # 2. Delete sale_ingredient_expenses
            print("🗑️  Deleting sale_ingredient_expenses...")
            delete_expenses_stmt = delete(SaleIngredientExpense)
            await session.execute(delete_expenses_stmt)
            print(f"✅ Deleted {expenses_count} sale_ingredient_expenses records")
            
            # 3. Delete sale_items
            print("🗑️  Deleting sale_items...")
            delete_items_stmt = delete(SaleItem)
            await session.execute(delete_items_stmt)
            print(f"✅ Deleted {items_count} sale_items records")
            
            # 4. Delete sales
            print("🗑️  Deleting sales...")
            delete_sales_stmt = delete(Sale)
            await session.execute(delete_sales_stmt)
            print(f"✅ Deleted {sales_count} sales records")
            
            # 5. Reset last_sync_at for all OFD connections
            print("🔄 Resetting last_sync_at for OFD connections...")
            reset_sync_stmt = (
                update(OFDConnection)
                .values(last_sync_at=None)
            )
            result = await session.execute(reset_sync_stmt)
            print(f"✅ Reset last_sync_at for {result.rowcount} OFD connections")
            
            # 6. Commit all changes
            await session.commit()
            
            print()
            print("=" * 60)
            print("✅ CLEANUP COMPLETED SUCCESSFULLY")
            print("=" * 60)
            print()
            print("📋 Summary:")
            print(f"   ✓ Deleted {expenses_count} expense deductions")
            print(f"   ✓ Deleted {items_count} sale items")
            print(f"   ✓ Deleted {sales_count} sales")
            print(f"   ✓ Reset {result.rowcount} OFD connections")
            print()
            print("🔄 Next steps:")
            print("   1. Go to OFD Integration page")
            print("   2. Click 'Sync Sales' button")
            print("   3. Data will be synced with CORRECT units from tech cards")
            print("   4. Click 'Update Status' to process receipts")
            print()
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    print()
    print("=" * 60)
    print("🧹 OFD SALES DATA CLEANUP SCRIPT")
    print("=" * 60)
    print()
    print("⚠️  WARNING: This will delete ALL OFD sales data!")
    print("   - All receipts (sales)")
    print("   - All receipt items (sale_items)")
    print("   - All ingredient deductions (sale_ingredient_expenses)")
    print()
    print("✅ Will preserve:")
    print("   - Product mappings")
    print("   - OFD connection settings")
    print()
    
    response = input("Type 'YES' to continue: ")
    
    if response == "YES":
        print()
        asyncio.run(cleanup_all_ofd_data())
    else:
        print("❌ Cleanup cancelled")
