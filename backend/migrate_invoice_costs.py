#!/usr/bin/env python3
"""
Migration script to populate ingredient_cost_history from existing paid invoices.
Run this once to backfill historical data for tech card cost calculations.

Usage:
    python migrate_invoice_costs.py
    python migrate_invoice_costs.py --check
    python migrate_invoice_costs.py --dry-run
"""

import asyncio
import sys
from pathlib import Path
from typing import cast

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, func

from app.core.db import async_session_maker
# Import core models first to ensure relationships resolve correctly
from app.core_models import Base, Business  # noqa: F401
from app.expenses.models import Invoice, InvoiceStatus
from app.tech_cards.service import IngredientCostService
from app.tech_cards.models import IngredientCostHistory


async def migrate_invoice_costs():
    """Migrate all paid invoices to ingredient_cost_history."""
    
    print("🔄 Starting migration of invoice costs to ingredient_cost_history...")
    
    async with async_session_maker() as session:
        try:
            # Get all paid invoices
            stmt = select(Invoice).where(Invoice.paid_status == InvoiceStatus.PAID)
            result = await session.execute(stmt)
            invoices = list(result.scalars().all())
            
            if not invoices:
                print("✅ No paid invoices found. Nothing to migrate.")
                return
            
            print(f"📊 Found {len(invoices)} paid invoices to process...")
            
            migrated_count = 0
            skipped_count = 0
            error_count = 0
            
            for invoice in invoices:
                try:
                    # Check if this invoice already has cost history
                    existing_stmt = select(func.count()).select_from(IngredientCostHistory).where(
                        IngredientCostHistory.invoice_id == invoice.id
                    )
                    existing_result = await session.execute(existing_stmt)
                    existing_count = existing_result.scalar() or 0
                    
                    if existing_count > 0:
                        print(f"⏭️  Invoice #{invoice.invoice_number} (ID: {invoice.id}) - already has {existing_count} cost records, skipping")
                        skipped_count += 1
                        continue
                    
                    # Sync costs for this invoice
                    count = await IngredientCostService.sync_invoice_costs(
                        session=session,
                        invoice_id=cast(int, invoice.id),
                        business_id=cast(int, invoice.business_id),
                    )
                    
                    if count > 0:
                        print(f"✅ Invoice #{invoice.invoice_number} (ID: {invoice.id}) - migrated {count} items")
                        migrated_count += 1
                    else:
                        print(f"⚠️  Invoice #{invoice.invoice_number} (ID: {invoice.id}) - no items to migrate")
                        skipped_count += 1
                        
                except Exception as e:
                    print(f"❌ Error processing invoice #{invoice.invoice_number} (ID: {invoice.id}): {e}")
                    error_count += 1
                    continue
            
            await session.commit()
            
            print("\n" + "="*60)
            print("📈 Migration Summary:")
            print(f"   ✅ Successfully migrated: {migrated_count} invoices")
            print(f"   ⏭️  Skipped (already exists): {skipped_count} invoices")
            print(f"   ❌ Errors: {error_count} invoices")
            print("="*60)
            
            if error_count > 0:
                print("\n⚠️  Some invoices failed to migrate. Check error messages above.")
            else:
                print("\n🎉 Migration completed successfully!")
                
        except Exception as e:
            print(f"\n❌ Fatal error during migration: {e}")
            await session.rollback()
            raise


async def check_migration_status():
    """Check how many invoices need migration."""
    
    async with async_session_maker() as session:
        try:
            # Count paid invoices
            paid_stmt = select(Invoice).where(Invoice.paid_status == InvoiceStatus.PAID)
            paid_result = await session.execute(paid_stmt)
            paid_count = len(list(paid_result.scalars().all()))
            
            print(f"📊 Total paid invoices: {paid_count}")
            
            if paid_count == 0:
                print("✅ No paid invoices in the system.")
            else:
                print(f"\n💡 Run this script to migrate {paid_count} invoices to ingredient_cost_history")
                
        except Exception as e:
            print(f"❌ Error checking status: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate invoice costs to history table")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check migration status without running migration"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without actually doing it"
    )
    
    args = parser.parse_args()
    
    if args.check:
        print("🔍 Checking migration status...\n")
        asyncio.run(check_migration_status())
    elif args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made\n")
        print("⚠️  Dry run mode not yet implemented. Run without --dry-run to migrate.")
    else:
        asyncio.run(migrate_invoice_costs())
