"""
Simple SQL-based cleanup for duplicate month periods.
Avoids ORM relationship issues.
"""

import asyncio
import asyncpg


async def cleanup_duplicates():
    """Clean up duplicate periods using direct SQL."""
    # Connect to database
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='app',
        password='app',
        database='app'
    )
    
    print("=" * 60)
    print("DATABASE CLEANUP: Duplicate Month Periods")
    print("=" * 60)
    
    try:
        # Find duplicates
        duplicates_sql = """
            SELECT business_id, year, month, COUNT(*) as count
            FROM month_periods
            GROUP BY business_id, year, month
            HAVING COUNT(*) > 1
        """
        
        duplicates = await conn.fetch(duplicates_sql)
        
        if not duplicates:
            print("\n✅ No duplicate periods found!")
            return
        
        print(f"\n🔍 Found {len(duplicates)} sets of duplicate periods:\n")
        
        for row in duplicates:
            business_id, year, month, count = row['business_id'], row['year'], row['month'], row['count']
            print(f"📋 Business {business_id}, {year}-{month:02d}: {count} periods")
            
            # Get all periods for this combination
            periods_sql = """
                SELECT id, name, status, updated_at, is_active
                FROM month_periods
                WHERE business_id = $1 AND year = $2 AND month = $3
                ORDER BY updated_at DESC
            """
            periods = await conn.fetch(periods_sql, business_id, year, month)
            
            # Keep the first one (most recent)
            keep_period = periods[0]
            print(f"   ✅ KEEPING: ID={keep_period['id']}, status={keep_period['status']}, updated={keep_period['updated_at']}")
            
            # Process duplicates
            for duplicate in periods[1:]:
                dup_id = duplicate['id']
                print(f"   🗑️  REMOVING: ID={dup_id}, status={duplicate['status']}, updated={duplicate['updated_at']}")
                
                # Check for inventory balances
                balance_count_sql = "SELECT COUNT(*) FROM inventory_balances WHERE month_period_id = $1"
                balance_count = await conn.fetchval(balance_count_sql, dup_id)
                
                if balance_count > 0:
                    print(f"      ⚠️  Has {balance_count} inventory balances")
                    
                    # Check if keep period has balances
                    keep_balance_count = await conn.fetchval(balance_count_sql, keep_period['id'])
                    
                    if keep_balance_count == 0:
                        # Migrate balances
                        print(f"      🔄 Migrating {balance_count} balances to kept period...")
                        await conn.execute(
                            "UPDATE inventory_balances SET month_period_id = $1 WHERE month_period_id = $2",
                            keep_period['id'], dup_id
                        )
                    else:
                        # Delete duplicate's balances
                        print(f"      🗑️  Both have balances. Deleting duplicate's {balance_count} balances...")
                        await conn.execute(
                            "DELETE FROM inventory_balances WHERE month_period_id = $1",
                            dup_id
                        )
                
                # Delete the duplicate period
                await conn.execute(
                    "DELETE FROM month_periods WHERE id = $1",
                    dup_id
                )
            
            print(f"   ✅ Cleanup complete for {year}-{month:02d}\n")
        
        print("=" * 60)
        print("✅ All duplicates cleaned up!")
        
        # Verify
        verify = await conn.fetch(duplicates_sql)
        if verify:
            print(f"⚠️  Warning: {len(verify)} duplicate sets still exist")
        else:
            print("✅ Verification passed: No duplicates remaining")
        
        # Ensure only one active period per business
        print("\n" + "="*60)
        print("Ensuring single ACTIVE period per business...")
        print("="*60 + "\n")
        
        multiple_active_sql = """
            SELECT business_id, COUNT(*) as count
            FROM month_periods
            WHERE status = 'active'
            GROUP BY business_id
            HAVING COUNT(*) > 1
        """
        
        multiple_active = await conn.fetch(multiple_active_sql)
        
        if not multiple_active:
            print("✅ No businesses with multiple ACTIVE periods")
        else:
            print(f"🔍 Found {len(multiple_active)} businesses with multiple ACTIVE periods:\n")
            
            for row in multiple_active:
                business_id, count = row['business_id'], row['count']
                print(f"📋 Business {business_id}: {count} active periods")
                
                # Get all active periods, most recent first
                active_periods_sql = """
                    SELECT id, name, year, month
                    FROM month_periods
                    WHERE business_id = $1 AND status = 'active'
                    ORDER BY year DESC, month DESC
                """
                active_periods = await conn.fetch(active_periods_sql, business_id)
                
                # Keep first (most recent), close others
                keep = active_periods[0]
                print(f"   ✅ KEEPING ACTIVE: ID={keep['id']}, {keep['year']}-{keep['month']:02d}")
                
                for old_period in active_periods[1:]:
                    print(f"   🔒 CLOSING: ID={old_period['id']}, {old_period['year']}-{old_period['month']:02d}")
                    await conn.execute(
                        "UPDATE month_periods SET status = 'closed' WHERE id = $1",
                        old_period['id']
                    )
                print()
            
            print("✅ All businesses now have at most one ACTIVE period!")
        
        print("\n" + "="*60)
        print("✅ CLEANUP COMPLETE!")
        print("="*60)
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
