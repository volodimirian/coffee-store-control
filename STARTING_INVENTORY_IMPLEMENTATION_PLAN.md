# Starting Inventory (Month Opening Balance) Implementation Plan

## 📋 Overview

Implement functionality to set and track starting inventory (leftover ingredients) at the beginning of each month. This allows users to manually input actual physical inventory counts, which are used for accurate inventory calculations and analytics.

---

## 🎯 Business Logic

### Dual-Value System

1. **Calculated Starting Balance** (Auto-generated)
   - System automatically calculates from previous month: `Previous Closing Balance = Opening + Purchases - Usage`
   - Always available as a reference
   - Shown in UI for comparison

2. **Manual Starting Balance** (User Input)
   - User performs physical inventory count
   - Manually enters actual quantities
   - Stored in `starting_inventory` table
   - **Takes priority** for current month calculations

3. **Priority Logic**
   ```
   IF manual_starting_inventory EXISTS:
       USE manual value for calculations
   ELSE:
       USE calculated value from previous month
   ```

4. **Analytics Value**
   - Track **discrepancy** = Manual - Calculated
   - Identify shrinkage, waste, theft, or data errors
   - Historical audit trail

### No Delete Operation

- Starting inventory is **historical data** - never delete
- Only allow **UPDATE** to correct mistakes
- Preserves audit trail for accounting

---

## 🗄️ Database Structure

### Existing Table: `starting_inventory`

```sql
CREATE TABLE starting_inventory (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    quantity NUMERIC(10,3) NOT NULL,
    unit_id INTEGER NOT NULL REFERENCES units(id),
    inventory_date DATE NOT NULL,  -- Usually first day of month
    created_by INTEGER NOT NULL REFERENCES users(id),
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(business_id, category_id, inventory_date)
);
```

**Key Points:**
- One record per category per month (enforced by unique constraint)
- `inventory_date` = first day of month (e.g., 2024-12-01)
- `quantity` in specified `unit_id`
- `notes` for explaining discrepancies

---

## 🏗️ Implementation Phases

---

## PHASE 1: Backend Service Layer

### File: `backend/app/tech_cards/service.py`

Create `StartingInventoryService` class:

```python
class StartingInventoryService:
    """Service for managing starting inventory (month opening balances)."""
    
    @staticmethod
    async def get_by_category_and_month(
        db: AsyncSession,
        business_id: int,
        category_id: int,
        year: int,
        month: int
    ) -> StartingInventory | None:
        """Get starting inventory for specific category and month."""
        # Query by inventory_date = first day of month
        first_day = date(year, month, 1)
        query = select(StartingInventory).where(
            StartingInventory.business_id == business_id,
            StartingInventory.category_id == category_id,
            StartingInventory.inventory_date == first_day
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all_for_month(
        db: AsyncSession,
        business_id: int,
        year: int,
        month: int
    ) -> list[StartingInventory]:
        """Get all starting inventories for a business in a specific month."""
        first_day = date(year, month, 1)
        query = (
            select(StartingInventory)
            .options(
                selectinload(StartingInventory.category),
                selectinload(StartingInventory.unit),
                selectinload(StartingInventory.created_by_user)
            )
            .where(
                StartingInventory.business_id == business_id,
                StartingInventory.inventory_date == first_day
            )
            .order_by(StartingInventory.category_id)
        )
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def create_or_update(
        db: AsyncSession,
        business_id: int,
        category_id: int,
        quantity: Decimal,
        unit_id: int,
        year: int,
        month: int,
        created_by: int,
        notes: str | None = None
    ) -> StartingInventory:
        """Create new or update existing starting inventory."""
        first_day = date(year, month, 1)
        
        # Check if exists
        existing = await StartingInventoryService.get_by_category_and_month(
            db, business_id, category_id, year, month
        )
        
        if existing:
            # Update existing
            existing.quantity = quantity
            existing.unit_id = unit_id
            existing.notes = notes
            existing.created_by = created_by  # Track who made the update
            existing.created_at = datetime.utcnow()  # Update timestamp
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            # Create new
            new_record = StartingInventory(
                business_id=business_id,
                category_id=category_id,
                quantity=quantity,
                unit_id=unit_id,
                inventory_date=first_day,
                created_by=created_by,
                notes=notes
            )
            db.add(new_record)
            await db.commit()
            await db.refresh(new_record)
            return new_record
    
    @staticmethod
    async def bulk_upsert(
        db: AsyncSession,
        business_id: int,
        year: int,
        month: int,
        inventory_data: list[dict],
        created_by: int
    ) -> list[StartingInventory]:
        """Bulk create or update starting inventories."""
        results = []
        for item in inventory_data:
            record = await StartingInventoryService.create_or_update(
                db=db,
                business_id=business_id,
                category_id=item['category_id'],
                quantity=item['quantity'],
                unit_id=item['unit_id'],
                year=year,
                month=month,
                created_by=created_by,
                notes=item.get('notes')
            )
            results.append(record)
        return results
    
    @staticmethod
    async def get_calculated_opening_balance(
        db: AsyncSession,
        category_id: int,
        year: int,
        month: int
    ) -> Decimal:
        """
        Calculate opening balance from previous month's closing balance.
        Closing Balance = Opening + Purchases - Usage
        """
        # Get previous month
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1
        
        # Get closing balance from inventory_balance table
        # (This assumes inventory_balance is populated)
        from app.expenses.models import InventoryBalance, MonthPeriod
        
        # Find previous month period
        period_query = select(MonthPeriod).where(
            MonthPeriod.year == prev_year,
            MonthPeriod.month == prev_month
        )
        period_result = await db.execute(period_query)
        prev_period = period_result.scalar_one_or_none()
        
        if not prev_period:
            return Decimal(0)
        
        # Get balance
        balance_query = select(InventoryBalance).where(
            InventoryBalance.category_id == category_id,
            InventoryBalance.month_period_id == prev_period.id
        )
        balance_result = await db.execute(balance_query)
        balance = balance_result.scalar_one_or_none()
        
        if not balance:
            return Decimal(0)
        
        return balance.closing_balance
```

---

## PHASE 2: Backend API Endpoints

### File: `backend/app/tech_cards/router.py`

Add endpoints:

```python
from app.tech_cards.service import StartingInventoryService
from app.tech_cards.schemas import (
    StartingInventoryCreate,
    StartingInventoryOut,
    StartingInventoryWithCalculated,
)

# GET all for month
@router.get(
    "/business/{business_id}/starting-inventory",
    response_model=list[StartingInventoryWithCalculated]
)
async def get_starting_inventory_for_month(
    business_id: int,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """
    Get all starting inventories for a month.
    Returns manual values + calculated values for comparison.
    """
    user, validated_business_id = auth_data
    
    # Get manual entries
    manual_records = await StartingInventoryService.get_all_for_month(
        db, business_id, year, month
    )
    
    # For each category with manual entry, also get calculated value
    results = []
    for record in manual_records:
        calculated = await StartingInventoryService.get_calculated_opening_balance(
            db, record.category_id, year, month
        )
        
        results.append({
            **record.__dict__,
            'calculated_quantity': calculated,
            'discrepancy': record.quantity - calculated
        })
    
    return results


# POST create or update single
@router.post(
    "/business/{business_id}/starting-inventory",
    response_model=StartingInventoryOut
)
async def create_or_update_starting_inventory(
    business_id: int,
    data: StartingInventoryCreate,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Create or update starting inventory for a category."""
    user, validated_business_id = auth_data
    
    # Check permission
    await check_permission(
        db, user.id, validated_business_id,
        Resource.STARTING_INVENTORY, Action.CREATE
    )
    
    record = await StartingInventoryService.create_or_update(
        db=db,
        business_id=validated_business_id,
        category_id=data.category_id,
        quantity=data.quantity,
        unit_id=data.unit_id,
        year=year,
        month=month,
        created_by=user.id,
        notes=data.notes
    )
    
    return record


# POST bulk upsert
@router.post(
    "/business/{business_id}/starting-inventory/bulk",
    response_model=list[StartingInventoryOut]
)
async def bulk_upsert_starting_inventory(
    business_id: int,
    items: list[StartingInventoryCreate],
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Bulk create or update starting inventories."""
    user, validated_business_id = auth_data
    
    # Check permission
    await check_permission(
        db, user.id, validated_business_id,
        Resource.STARTING_INVENTORY, Action.CREATE
    )
    
    inventory_data = [
        {
            'category_id': item.category_id,
            'quantity': item.quantity,
            'unit_id': item.unit_id,
            'notes': item.notes
        }
        for item in items
    ]
    
    records = await StartingInventoryService.bulk_upsert(
        db=db,
        business_id=validated_business_id,
        year=year,
        month=month,
        inventory_data=inventory_data,
        created_by=user.id
    )
    
    return records


# GET single with calculated comparison
@router.get(
    "/business/{business_id}/starting-inventory/category/{category_id}",
    response_model=StartingInventoryWithCalculated
)
async def get_starting_inventory_for_category(
    business_id: int,
    category_id: int,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    auth_data: tuple[User, int] = Depends(validate_business_access)
):
    """Get starting inventory for specific category with calculated comparison."""
    user, validated_business_id = auth_data
    
    manual = await StartingInventoryService.get_by_category_and_month(
        db, validated_business_id, category_id, year, month
    )
    
    calculated = await StartingInventoryService.get_calculated_opening_balance(
        db, category_id, year, month
    )
    
    if manual:
        return {
            **manual.__dict__,
            'calculated_quantity': calculated,
            'discrepancy': manual.quantity - calculated
        }
    else:
        # Return calculated value only
        return {
            'category_id': category_id,
            'quantity': calculated,
            'calculated_quantity': calculated,
            'discrepancy': Decimal(0),
            'is_manual': False
        }
```

---

## PHASE 3: Update Schemas

### File: `backend/app/tech_cards/schemas.py`

Add new schema for response with calculated value:

```python
class StartingInventoryWithCalculated(StartingInventoryOut):
    """Starting inventory with calculated comparison."""
    calculated_quantity: Decimal = Field(..., description="Calculated from previous month")
    discrepancy: Decimal = Field(..., description="Manual - Calculated")
    is_manual: bool = Field(default=True, description="Whether manual value exists")
```

---

## PHASE 4: Integrate with Inventory Tracking

### File: `backend/app/expenses/inventory_tracking_service.py`

Modify `get_month_summary()` to include starting inventory:

```python
from app.tech_cards.models import StartingInventory

class InventoryTrackingService:
    @staticmethod
    async def get_month_summary(...):
        # ... existing code ...
        
        # Load starting inventories for this month
        first_day = date(year, month, 1)
        starting_inv_query = (
            select(StartingInventory)
            .options(selectinload(StartingInventory.unit))
            .where(
                StartingInventory.business_id == business_id,
                StartingInventory.inventory_date == first_day
            )
        )
        starting_inv_result = await session.execute(starting_inv_query)
        starting_inventories = starting_inv_result.scalars().all()
        
        # Create lookup map
        starting_inv_map = {
            si.category_id: si for si in starting_inventories
        }
        
        # Add to each category in response
        for section in sections_data:
            for category in section['categories']:
                cat_id = category['category_id']
                if cat_id in starting_inv_map:
                    si = starting_inv_map[cat_id]
                    category['starting_quantity'] = str(si.quantity)
                    category['starting_unit_id'] = si.unit_id
                    category['starting_unit_symbol'] = si.unit.symbol
                else:
                    category['starting_quantity'] = None
                    category['starting_unit_id'] = None
                    category['starting_unit_symbol'] = None
        
        return sections_data
```

### File: `backend/app/expenses/inventory_tracking_schemas.py`

Update `CategoryDataSchema`:

```python
class CategoryDataSchema(BaseModel):
    category_id: int
    category_name: str
    unit_symbol: str
    default_unit_id: int
    daily_data: list[DayDataSchema]
    
    # NEW: Starting inventory fields
    starting_quantity: str | None = None
    starting_unit_id: int | None = None
    starting_unit_symbol: str | None = None
```

---

## PHASE 5: Permissions

### File: `backend/app/core/resource_permissions.py`

```python
class Resource(str, Enum):
    # ... existing ...
    STARTING_INVENTORY = "starting_inventory"
```

### File: `PERMISSIONS.md`

```
starting_inventory:
  VIEW = (BUSINESS_OWNER, EMPLOYEE)
  CREATE = (BUSINESS_OWNER, EMPLOYEE)  # Includes UPDATE via create_or_update
  EDIT = (BUSINESS_OWNER)              # For corrections
```

**Note:** No DELETE permission - starting inventory is historical data.

---

## PHASE 6: Frontend Types & API

### File: `web/src/shared/api/types.ts`

```typescript
export interface StartingInventory {
  id: number;
  business_id: number;
  category_id: number;
  quantity: string;
  unit_id: number;
  inventory_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
  
  // Nested
  category_name?: string;
  unit_name?: string;
  unit_symbol?: string;
  created_by_name?: string;
}

export interface StartingInventoryWithCalculated extends StartingInventory {
  calculated_quantity: string;
  discrepancy: string;
  is_manual: boolean;
}

export interface StartingInventoryCreate {
  category_id: number;
  quantity: string;
  unit_id: number;
  notes?: string;
}
```

### File: `web/src/shared/api/startingInventory.ts`

```typescript
import { api } from './client';
import type { 
  StartingInventory, 
  StartingInventoryCreate,
  StartingInventoryWithCalculated 
} from './types';

export const startingInventoryApi = {
  /**
   * Get all starting inventories for a month
   */
  getForMonth: async (
    businessId: number,
    year: number,
    month: number
  ): Promise<StartingInventoryWithCalculated[]> => {
    const response = await api.get(
      `/tech-cards/business/${businessId}/starting-inventory`,
      { params: { year, month } }
    );
    return response.data;
  },

  /**
   * Get starting inventory for specific category
   */
  getForCategory: async (
    businessId: number,
    categoryId: number,
    year: number,
    month: number
  ): Promise<StartingInventoryWithCalculated> => {
    const response = await api.get(
      `/tech-cards/business/${businessId}/starting-inventory/category/${categoryId}`,
      { params: { year, month } }
    );
    return response.data;
  },

  /**
   * Create or update single starting inventory
   */
  createOrUpdate: async (
    businessId: number,
    year: number,
    month: number,
    data: StartingInventoryCreate
  ): Promise<StartingInventory> => {
    const response = await api.post(
      `/tech-cards/business/${businessId}/starting-inventory`,
      data,
      { params: { year, month } }
    );
    return response.data;
  },

  /**
   * Bulk create or update starting inventories
   */
  bulkUpsert: async (
    businessId: number,
    year: number,
    month: number,
    items: StartingInventoryCreate[]
  ): Promise<StartingInventory[]> => {
    const response = await api.post(
      `/tech-cards/business/${businessId}/starting-inventory/bulk`,
      items,
      { params: { year, month } }
    );
    return response.data;
  },
};
```

---

## PHASE 7: Frontend UI - Modal Component

### File: `web/src/components/modals/StartingInventoryModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { startingInventoryApi } from '~/shared/api/startingInventory';
import { Input } from '~/shared/ui';
import { formatCurrency } from '~/shared/lib/helpers';
import type { 
  StartingInventoryCreate, 
  StartingInventoryWithCalculated,
  ExpenseCategory,
  Unit 
} from '~/shared/api/types';

interface StartingInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  categories: ExpenseCategory[];
  onSave: () => void;
}

export default function StartingInventoryModal({
  isOpen,
  onClose,
  year,
  month,
  categories,
  onSave,
}: StartingInventoryModalProps) {
  const { t } = useTranslation();
  const { businessId } = useAppContext();
  
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<Map<number, StartingInventoryWithCalculated>>(new Map());
  const [formData, setFormData] = useState<Map<number, StartingInventoryCreate>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadExistingData();
    }
  }, [isOpen, year, month]);

  const loadExistingData = async () => {
    try {
      const data = await startingInventoryApi.getForMonth(businessId!, year, month);
      const dataMap = new Map(data.map(item => [item.category_id, item]));
      setExistingData(dataMap);
      
      // Pre-fill form with existing values
      const formMap = new Map();
      data.forEach(item => {
        formMap.set(item.category_id, {
          category_id: item.category_id,
          quantity: item.quantity,
          unit_id: item.unit_id,
          notes: item.notes,
        });
      });
      setFormData(formMap);
    } catch (error) {
      console.error('Failed to load starting inventory:', error);
    }
  };

  const handleQuantityChange = (categoryId: number, quantity: string, unitId: number) => {
    const newFormData = new Map(formData);
    newFormData.set(categoryId, {
      category_id: categoryId,
      quantity,
      unit_id: unitId,
      notes: formData.get(categoryId)?.notes,
    });
    setFormData(newFormData);
  };

  const handleNotesChange = (categoryId: number, notes: string) => {
    const existing = formData.get(categoryId);
    if (existing) {
      const newFormData = new Map(formData);
      newFormData.set(categoryId, { ...existing, notes });
      setFormData(newFormData);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const items = Array.from(formData.values()).filter(item => 
        parseFloat(item.quantity) > 0
      );
      
      if (items.length > 0) {
        await startingInventoryApi.bulkUpsert(businessId!, year, month, items);
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save starting inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('startingInventory.setStartingInventory')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('startingInventory.monthYear', { month: month, year: year })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {categories.map(category => {
              const existing = existingData.get(category.id);
              const hasDiscrepancy = existing && parseFloat(existing.discrepancy) !== 0;
              
              return (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      {existing && (
                        <div className="text-xs text-gray-500 mt-1">
                          {t('startingInventory.calculated')}: {formatCurrency(parseFloat(existing.calculated_quantity), 3, '')} {existing.unit_symbol}
                        </div>
                      )}
                    </div>
                    {hasDiscrepancy && (
                      <div className="flex items-center text-amber-600 text-xs">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {t('startingInventory.discrepancy')}: {formatCurrency(parseFloat(existing.discrepancy), 3, '')}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t('startingInventory.actualQuantity')}
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        value={formData.get(category.id)?.quantity || ''}
                        onChange={(e) => handleQuantityChange(
                          category.id, 
                          e.target.value, 
                          category.default_unit_id
                        )}
                        placeholder="0.000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t('common.unit')}
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                        {category.unit_symbol}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('common.notes')} ({t('common.optional')})
                    </label>
                    <Input
                      type="text"
                      value={formData.get(category.id)?.notes || ''}
                      onChange={(e) => handleNotesChange(category.id, e.target.value)}
                      placeholder={t('startingInventory.notesPlaceholder')}
                      maxLength={500}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('common.saveAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## PHASE 8: Integrate into Inventory Tracking Tab

### File: `web/src/components/tabs/InventoryTrackingTab.tsx`

Changes needed:

1. **Add state for modal**:
```typescript
const [isStartingInventoryModalOpen, setIsStartingInventoryModalOpen] = useState(false);
const [startingInventoryData, setStartingInventoryData] = useState<Map<number, string>>(new Map());
```

2. **Load starting inventory data**:
```typescript
useEffect(() => {
  if (tableSections.length > 0) {
    loadStartingInventory();
  }
}, [tableSections, currentDate]);

const loadStartingInventory = async () => {
  try {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    const data = await startingInventoryApi.getForMonth(businessId!, year, month);
    const dataMap = new Map(
      data.map(item => [item.category_id, item.quantity])
    );
    setStartingInventoryData(dataMap);
  } catch (error) {
    console.error('Failed to load starting inventory:', error);
  }
};
```

3. **Add button in header**:
```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-2xl font-bold">
    {t('expenses.inventoryTracking.title')} - {monthName} {year}
  </h2>
  
  <Protected permission={{ resource: 'starting_inventory', action: 'create' }}>
    <button
      onClick={() => setIsStartingInventoryModalOpen(true)}
      className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
    >
      <PlusIcon className="h-5 w-5 mr-2" />
      {t('startingInventory.setStartingInventory')}
    </button>
  </Protected>
</div>
```

4. **Add "Starting" column in table header**:
```tsx
<th className="sticky top-0 px-2 py-2 text-center text-xs font-medium text-gray-700 border-x bg-gray-100">
  {t('startingInventory.starting')}
</th>
```

5. **Display starting quantity in rows**:
```tsx
<td className="px-2 py-2 text-center text-xs border-x whitespace-nowrap">
  {(() => {
    const startingQty = startingInventoryData.get(tableCategory.category.id);
    if (startingQty) {
      const convertedQty = convertQuantityBySymbol(
        parseFloat(startingQty),
        tableCategory.unitSymbol,
        selectedUnitId,
        tableCategory.category.id
      );
      return (
        <div className="text-gray-700 font-semibold">
          {formatQty(convertedQty)}
        </div>
      );
    }
    return <div className="text-gray-400">—</div>;
  })()}
</td>
```

6. **Add modal component**:
```tsx
<StartingInventoryModal
  isOpen={isStartingInventoryModalOpen}
  onClose={() => setIsStartingInventoryModalOpen(false)}
  year={currentDate.getFullYear()}
  month={currentDate.getMonth() + 1}
  categories={allCategories}
  onSave={loadStartingInventory}
/>
```

---

## PHASE 9: Translations

### File: `web/public/locales/ru.json`

```json
{
  "startingInventory": {
    "setStartingInventory": "Установить начальные остатки",
    "starting": "Начало",
    "monthYear": "{{month}}/{{year}}",
    "actualQuantity": "Фактическое количество",
    "calculated": "Расчётное",
    "discrepancy": "Расхождение",
    "notesPlaceholder": "Причина расхождения (опционально)",
    "title": "Начальные остатки"
  }
}
```

### File: `web/public/locales/en.json`

```json
{
  "startingInventory": {
    "setStartingInventory": "Set Starting Inventory",
    "starting": "Starting",
    "monthYear": "{{month}}/{{year}}",
    "actualQuantity": "Actual Quantity",
    "calculated": "Calculated",
    "discrepancy": "Discrepancy",
    "notesPlaceholder": "Reason for discrepancy (optional)",
    "title": "Starting Inventory"
  }
}
```

---

## 📊 UI Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Inventory Tracking - December 2024  [Set Starting Inventory]│
└─────────────────────────────────────────────────────────────┘
                            ↓ Click
┌─────────────────────────────────────────────────────────────┐
│ Set Starting Inventory - 12/2024                       [X]  │
├─────────────────────────────────────────────────────────────┤
│ Category: Молоко 3,2%                    ⚠ Discrepancy: 5   │
│ Calculated: 45.000 л                                        │
│ ┌─────────────────────────┐ ┌──────┐                        │
│ │ Actual Quantity: 50.000 │ │  л   │                        │
│ └─────────────────────────┘ └──────┘                        │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Notes: Physical count revealed extra stock            │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                                    [Cancel]  [Save All]     │
└─────────────────────────────────────────────────────────────┘
                            ↓ Save
┌─────────────────────────────────────────────────────────────┐
│ Section    │Starting│ 01 │ 02 │ 03 │ ... │ Total │ Amount  │
├────────────┼────────┼────┼────┼────┼─────┼───────┼─────────┤
│ Молоко 3,2%│ 50 л  │+10 │ -5 │ +3 │ ... │ 58 л  │ 4,500₽ │
│            │       │-2  │ 0  │ -8 │ ... │       │         │
└────────────┴────────┴────┴────┴────┴─────┴───────┴─────────┘
```

---

## ✅ Implementation Checklist

### Backend:
- [ ] Add `StartingInventoryService` to `backend/app/tech_cards/service.py`
- [ ] Add API endpoints to `backend/app/tech_cards/router.py`
- [ ] Add `StartingInventoryWithCalculated` schema
- [ ] Update `InventoryTrackingService` to include starting inventory
- [ ] Update `CategoryDataSchema` with starting inventory fields
- [ ] Add `STARTING_INVENTORY` resource to permissions
- [ ] Test endpoints with Thunder Client / Postman

### Frontend:
- [ ] Add types to `web/src/shared/api/types.ts`
- [ ] Create `web/src/shared/api/startingInventory.ts`
- [ ] Create `StartingInventoryModal.tsx` component
- [ ] Update `InventoryTrackingTab.tsx`:
  - [ ] Add state for modal and data
  - [ ] Add "Set Starting Inventory" button
  - [ ] Add "Starting" column to table
  - [ ] Load and display starting inventory
  - [ ] Convert starting quantities with selected units
- [ ] Add translations (ru.json, en.json)
- [ ] Wrap UI with `<Protected>` component

### Testing:
- [ ] Test create starting inventory
- [ ] Test update existing values
- [ ] Test bulk upsert
- [ ] Verify calculations: Manual takes priority over calculated
- [ ] Test unit conversions
- [ ] Test discrepancy display
- [ ] Verify no delete option exists

---

## 🎯 Key Features Summary

1. ✅ **Manual input** for actual physical inventory count
2. ✅ **Calculated comparison** from previous month
3. ✅ **Discrepancy tracking** for audit trail
4. ✅ **No delete** - preserves historical data
5. ✅ **Unit conversion** support
6. ✅ **Bulk input** for efficiency
7. ✅ **Month-by-month** storage for analytics
8. ✅ **Notes field** for explanations

---

## 🚀 Next Steps

Ready to start implementation when you are! Suggest starting with:
1. **Phase 1-2**: Backend service + endpoints
2. **Test with API client**
3. **Phase 6-7**: Frontend API + Modal
4. **Phase 8**: Integration into table

Let me know when to begin! 🎉
