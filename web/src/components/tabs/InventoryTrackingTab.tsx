import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { 
  monthPeriodsApi,
  inventoryTrackingApi,
  unitsApi,
  type PurchaseDetail,
  type SaleExpenseDetail,
} from '~/shared/api/expenses';
import CreateExpenseModal from '~/components/modals/CreateExpenseModal';
import InvoiceModal from '~/components/modals/InvoiceModal';
import CategoryModal from '~/components/modals/CategoryModal';
import SectionModal from '~/components/modals/SectionModal';
import ExpenseDetailModal from '~/components/modals/ExpenseDetailModal';
import PurchaseDetailModal from '~/components/modals/PurchaseDetailModal';
import UnitSelector from '~/components/UnitSelector';
import { Protected } from '~/shared/ui';
import { formatCurrencyCompact, formatCurrency } from '~/shared/lib/helpers';
import type { 
  ExpenseSection,
  ExpenseCategory,
  Unit,
} from '~/shared/api/types';

// Interface for table data structure by section
interface TableSection {
  section: ExpenseSection;
  categories: TableCategory[];
}

// Interface for category with daily data
interface TableCategory {
  category: ExpenseCategory;
  unitSymbol: string; // Unit symbol for display
  dailyData: Map<string, DayData>; // key: YYYY-MM-DD
}

// Data for each day
interface DayData {
  purchasesQty: number; // quantity from InvoiceItems (including PENDING)
  purchasesAmount: number; // money amount from InvoiceItems
  usageQty: number; // quantity from SaleIngredientExpense (OFD sales)
  usageAmount: number; // money amount from SaleIngredientExpense (OFD sales)
  purchaseDetails: PurchaseDetail[]; // details for tooltip
  saleExpenseDetails: SaleExpenseDetail[]; // OFD sale details for modal
}

export default function InventoryTrackingTab() {
  const { t, i18n } = useTranslation();
  const { currentLocation } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tableSections, setTableSections] = useState<TableSection[]>([]);
  const [monthDays, setMonthDays] = useState<Date[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [selectedSection, setSelectedSection] = useState<ExpenseSection | null>(null);
  const [selectedSectionIdForCreate, setSelectedSectionIdForCreate] = useState<number | null>(null);
  
  // Expense detail modal state
  const [isExpenseDetailModalOpen, setIsExpenseDetailModalOpen] = useState(false);
  const [expenseDetailData, setExpenseDetailData] = useState<{
    categoryName: string;
    selectedUnitId: number;
    availableUnits: Unit[];
    date: string;
    saleExpenses: SaleExpenseDetail[];
  } | null>(null);

  // Purchase detail modal state
  const [isPurchaseDetailModalOpen, setIsPurchaseDetailModalOpen] = useState(false);
  const [purchaseDetailData, setPurchaseDetailData] = useState<{
    categoryName: string;
    unitSymbol: string;
    date: string;
    purchases: PurchaseDetail[];
  } | null>(null);

  // Unit conversion state
  const [categoryUnits, setCategoryUnits] = useState<Map<number, {
    availableUnits: Unit[];
    selectedUnitId: number;
    defaultUnitId: number;
  }>>(new Map());

  // Get locale for date-fns
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  // Helper function to format quantity (remove .00 for whole numbers)
  const formatQty = (value: number): string => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };

  // Convert quantity by unit symbol (used for actual receipt/invoice data)
  const convertQuantityBySymbol = (
    quantity: number,
    fromUnitSymbol: string,
    toUnitId: number,
    categoryId: number
  ): number => {
    const categoryUnitData = categoryUnits.get(categoryId);
    if (!categoryUnitData) {
      return quantity;
    }

    const fromUnit = categoryUnitData.availableUnits.find((u) => u.symbol === fromUnitSymbol);
    const toUnit = categoryUnitData.availableUnits.find((u) => u.id === toUnitId);

    if (!fromUnit || !toUnit || fromUnit.id === toUnitId) {
      return quantity;
    }

    const fromFactor = parseFloat(fromUnit.conversion_factor?.toString() || '1');
    const toFactor = parseFloat(toUnit.conversion_factor?.toString() || '1');

    return (quantity * fromFactor) / toFactor;
  };

  // Handle unit selection change for a category
  const handleUnitChange = useCallback((categoryId: number, newUnitId: number) => {
    setCategoryUnits((prev) => {
      const newMap = new Map(prev);
      const categoryData = newMap.get(categoryId);
      if (categoryData) {
        newMap.set(categoryId, {
          ...categoryData,
          selectedUnitId: newUnitId,
        });
      }
      return newMap;
    });
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const toggleSectionCollapse = (sectionId: number) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleAddCategory = (sectionId: number) => {
    setSelectedSectionIdForCreate(sectionId);
    setIsEditCategoryModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadData();
  };

  const handleInvoiceSuccess = () => {
    setIsInvoiceModalOpen(false);
    loadData(); // Reload data after creating invoice
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsEditCategoryModalOpen(true);
  };

  const handleEditSection = (section: ExpenseSection) => {
    setSelectedSection(section);
    setIsEditSectionModalOpen(true);
  };

  const handleCategoryUpdated = () => {
    setIsEditCategoryModalOpen(false);
    setSelectedCategory(null);
    setSelectedSectionIdForCreate(null);
    loadData();
  };

  const handleSectionUpdated = () => {
    setIsEditSectionModalOpen(false);
    setSelectedSection(null);
    loadData();
  };

  const handleExpenseCellClick = (
    categoryName: string,
    selectedUnitId: number,
    availableUnits: Unit[],
    date: string,
    saleExpenses: SaleExpenseDetail[]
  ) => {
    if (saleExpenses.length > 0) {
      setExpenseDetailData({
        categoryName,
        selectedUnitId,
        availableUnits,
        date,
        saleExpenses,
      });
      setIsExpenseDetailModalOpen(true);
    }
  };

  const handlePurchaseCellClick = (
    categoryName: string,
    unitSymbol: string,
    date: string,
    purchases: PurchaseDetail[]
  ) => {
    if (purchases.length > 0) {
      setPurchaseDetailData({
        categoryName,
        unitSymbol,
        date,
        purchases,
      });
      setIsPurchaseDetailModalOpen(true);
    }
  };

  // Load all data for the current month
  const loadData = useCallback(async () => {
    if (!currentLocation) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate days of current month inside callback
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      // Store monthDays for rendering
      setMonthDays(monthDays);

      // 1. Get or create period for current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const periodsResponse = await monthPeriodsApi.list({
        business_id: currentLocation.id,
        limit: 1000,
      });
      
      let period = periodsResponse.periods.find(
        p => p.year === year && p.month === month
      );
      
      if (!period) {
        // Create new period
        period = await monthPeriodsApi.create({
          business_id: currentLocation.id,
          name: format(currentDate, 'LLLL yyyy', { locale: dateLocale }),
          year,
          month,
          status: 'active',
        });
      }
      // Period created or found - we don't need to store it

      // 2. OPTIMIZED: Get ALL data in ONE request (replaces 800+ requests)
      const summaryData = await inventoryTrackingApi.getMonthSummary(
        currentLocation.id,
        year,
        month
      );

      // 3. Transform backend data to component format
      const sections: TableSection[] = summaryData.sections.map((sectionData) => {
        const tableCategories: TableCategory[] = sectionData.categories.map((categoryData) => {
          // Convert daily data array to Map for fast lookup
          const dailyDataMap = new Map<string, DayData>();
          
          categoryData.daily_data.forEach((dayData) => {
            dailyDataMap.set(dayData.date, {
              purchasesQty: parseFloat(dayData.purchases_qty),
              purchasesAmount: parseFloat(dayData.purchases_amount),
              usageQty: parseFloat(dayData.usage_qty),
              usageAmount: parseFloat(dayData.usage_amount),
              purchaseDetails: dayData.purchase_details,
              saleExpenseDetails: dayData.sale_expense_details || [],
            });
          });

          return {
            category: {
              id: categoryData.category_id,
              name: categoryData.category_name,
              default_unit_id: categoryData.default_unit_id,
            } as ExpenseCategory,
            unitSymbol: categoryData.unit_symbol,
            dailyData: dailyDataMap,
          };
        });

        return {
          section: {
            id: sectionData.section_id,
            name: sectionData.section_name,
          } as ExpenseSection,
          categories: tableCategories,
        };
      });

      // Load available units for each category BEFORE setting table sections
      const unitsMap = new Map<number, {
        availableUnits: Unit[];
        selectedUnitId: number;
        defaultUnitId: number;
      }>();

      await Promise.all(
        sections.flatMap((section) =>
          section.categories.map(async (category) => {
            try {
              const availableUnits = await unitsApi.getConvertible(category.category.default_unit_id);
              
              // Check localStorage for saved preference
              const savedUnitId = localStorage.getItem(`inventoryTracking_unit_${category.category.id}`);
              let selectedUnitId = category.category.default_unit_id;
              
              if (savedUnitId) {
                const unitId = parseInt(savedUnitId, 10);
                // Verify saved unit is still available
                if (availableUnits.some((u) => u.id === unitId)) {
                  selectedUnitId = unitId;
                }
              }

              unitsMap.set(category.category.id, {
                availableUnits,
                selectedUnitId,
                defaultUnitId: category.category.default_unit_id,
              });
            } catch (err) {
              console.error(`Failed to load units for category ${category.category.id}:`, err);
              // If failed, just use default unit
              unitsMap.set(category.category.id, {
                availableUnits: [],
                selectedUnitId: category.category.default_unit_id,
                defaultUnitId: category.category.default_unit_id,
              });
            }
          })
        )
      );

      // Set both states together to ensure units are available when rendering
      setCategoryUnits(unitsMap);
      setTableSections(sections);
    } catch (err) {
      console.error('Failed to load inventory tracking data:', err);
      setError(t('expenses.inventoryTracking.loadingError'));
    } finally {
      setLoading(false);
    }
  }, [currentLocation, currentDate, dateLocale, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.inventoryTracking.selectLocation')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800 font-medium mb-2">{t('common.error')}</div>
        <div className="text-red-600">{error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              aria-label={t('common.previous')}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              aria-label={t('common.next')}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {t('common.today')}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Protected permission={{ resource: 'invoices', action: 'create' }}>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('expenses.overview.addExpense')}
            </button>
          </Protected>
          <Protected anyOf={[
            { resource: 'categories', action: 'create' },
            { resource: 'subcategories', action: 'create' }
          ]}>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('expenses.modals.createExpense.createButton')}
            </button>
          </Protected>
        </div>
      </div>

      {/* Main Table */}
      {tableSections.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <p className="text-gray-500 text-lg">{t('expenses.inventoryTracking.noCategories')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('expenses.inventoryTracking.noCategoriesDescription')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    rowSpan={2}
                    className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r z-10 min-w-[250px]"
                  >
                    {t('expenses.inventoryTracking.table.category')}
                  </th>
                  {monthDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <React.Fragment key={day.toISOString()}>
                        <th
                          colSpan={2}
                          className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider border-x ${
                            isToday ? 'bg-blue-100 text-blue-900' : 'text-gray-500'
                          }`}
                        >
                          <div className="font-semibold">{format(day, 'd')}</div>
                          <div className="text-[10px] opacity-75">
                            {format(day, 'EEE', { locale: dateLocale })}
                          </div>
                        </th>
                        {/* Spacing column */}
                        <th className="px-6 bg-gray-50"></th>
                      </React.Fragment>
                    );
                  })}
                  <th 
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l"
                  >
                    {t('expenses.inventoryTracking.table.total')}
                  </th>
                </tr>
                <tr>
                  {monthDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <React.Fragment key={`${day.toISOString()}-sub`}>
                        <th className={`px-2 py-1 text-center text-[10px] font-medium uppercase border-x min-w-[60px] ${
                          isToday ? 'bg-blue-50 text-blue-800' : 'text-gray-400'
                        }`}>
                          {t('expenses.inventoryTracking.table.qty')}
                        </th>
                        <th className={`px-2 py-1 text-center text-[10px] font-medium uppercase border-x min-w-[80px] ${
                          isToday ? 'bg-blue-50 text-blue-800' : 'text-gray-400'
                        }`}>
                          {t('expenses.inventoryTracking.table.amount')}
                        </th>
                        {/* Spacing column */}
                        <th className="px-6 bg-gray-50"></th>
                      </React.Fragment>
                    );
                  })}
                  <th className="px-2 py-1 text-center text-[10px] font-medium uppercase text-gray-400 border-x min-w-[60px]">
                    {t('expenses.inventoryTracking.table.qty')}
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] font-medium uppercase text-gray-400 min-w-[80px]">
                    {t('expenses.inventoryTracking.table.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {tableSections.map((tableSection, sectionIndex) => {
                  const isCollapsed = collapsedSections.has(tableSection.section.id);
                  
                  // Calculate section totals
                  const sectionDailyTotals = new Map<string, { purchasesAmount: number; usageAmount: number }>();
                  let sectionGrandTotal = 0;
                  
                  tableSection.categories.forEach(tableCategory => {
                    monthDays.forEach(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayData = tableCategory.dailyData.get(dateKey);
                      if (dayData) {
                        if (!sectionDailyTotals.has(dateKey)) {
                          sectionDailyTotals.set(dateKey, { purchasesAmount: 0, usageAmount: 0 });
                        }
                        const totals = sectionDailyTotals.get(dateKey)!;
                        totals.purchasesAmount += dayData.purchasesAmount;
                        totals.usageAmount += dayData.usageAmount;
                        sectionGrandTotal += dayData.purchasesAmount - dayData.usageAmount;
                      }
                    });
                  });
                  
                  return (
                    <React.Fragment key={`section-${tableSection.section.id}`}>
                      {/* Spacing between sections */}
                      {sectionIndex > 0 && (
                        <tr className="bg-gray-100">
                          <td colSpan={monthDays.length * 3 + 4} className="h-8"></td>
                        </tr>
                      )}
                      
                      {/* Section Header with Totals */}
                      <tr className="bg-blue-50 hover:bg-blue-100">
                        <td 
                          className="sticky left-0 bg-blue-50 hover:bg-blue-100 px-4 py-3 font-medium text-blue-900 border-r z-10 cursor-pointer"
                          onClick={() => toggleSectionCollapse(tableSection.section.id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{tableSection.section.name}</span>
                            <div className="flex items-center space-x-2">
                              <Protected permission={{ resource: 'categories', action: 'edit' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSection(tableSection.section);
                                  }}
                                  className="p-1 hover:bg-blue-200 rounded transition-colors"
                                  title={t('expenses.categories.editSection')}
                                >
                                  <PencilIcon className="h-4 w-4 text-blue-600" />
                                </button>
                              </Protected>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddCategory(tableSection.section.id);
                                }}
                                className="p-1 hover:bg-blue-200 rounded transition-colors"
                                title={t('expenses.categories.add')}
                              >
                                <PlusIcon className="h-4 w-4 text-blue-600" />
                              </button>
                              <span className="text-xs text-blue-600">
                                ({tableSection.categories.length})
                              </span>
                              {isCollapsed ? (
                                <ChevronDownIcon className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronUpIcon className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </td>
                        {monthDays.map((day) => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const dayTotals = sectionDailyTotals.get(dateKey);
                          const isToday = isSameDay(day, new Date());
                          
                          return (
                            <React.Fragment key={`${day.toISOString()}-section`}>
                              {/* Skip Quantity Column for section header */}
                              <td className={`px-1 py-2 text-center text-xs border-x whitespace-nowrap ${isToday ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'}`}>
                                <div className="text-blue-600 text-[10px]">—</div>
                              </td>
                              
                              {/* Amount Column - show section totals */}
                              <td className={`px-1 py-2 text-center text-xs border-x whitespace-nowrap ${isToday ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'}`}>
                                {dayTotals && (dayTotals.purchasesAmount !== 0 || dayTotals.usageAmount !== 0) ? (
                                  <div className="space-y-0.5">
                                    {dayTotals.purchasesAmount !== 0 && (
                                      <div className="text-green-600 font-semibold text-[10px]">
                                        {formatCurrencyCompact(dayTotals.purchasesAmount)}
                                      </div>
                                    )}
                                    {dayTotals.usageAmount !== 0 && (
                                      <div className="text-red-600 font-semibold text-[10px]">
                                        {formatCurrencyCompact(dayTotals.usageAmount)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-blue-600 text-[10px]">{formatCurrencyCompact(0)}</div>
                                )}
                              </td>
                              {/* Spacing column between days */}
                              <td className={`px-6 bg-gray-50`}></td>
                            </React.Fragment>
                          );
                        })}
                        <td className="px-2 py-2 text-center text-xs bg-blue-50 hover:bg-blue-100 border-x whitespace-nowrap">
                          <div className="text-blue-600 text-[10px]">—</div>
                        </td>
                        <td className="px-2 py-2 text-center text-xs bg-blue-50 hover:bg-blue-100 whitespace-nowrap">
                          <div className="font-bold text-blue-900">
                            {formatCurrencyCompact(sectionGrandTotal)}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Category Rows */}
                      {!isCollapsed && tableSection.categories.map((tableCategory) => {
                        // Get unit data for this category
                        const categoryUnitData = categoryUnits.get(tableCategory.category.id);
                        const selectedUnitId = categoryUnitData?.selectedUnitId || tableCategory.category.default_unit_id;
                        const selectedUnit = categoryUnitData?.availableUnits.find((u) => u.id === selectedUnitId);

                        // Calculate totals with proper conversion
                        let totalPurchasesAmount = 0;
                        let totalUsageAmount = 0;
                        let totalPurchasesQty = 0;
                        let totalUsageQty = 0;
                        
                        monthDays.forEach(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const dayData = tableCategory.dailyData.get(dateKey);
                          if (dayData) {
                            totalPurchasesAmount += dayData.purchasesAmount;
                            totalUsageAmount += dayData.usageAmount;
                            
                            // Convert and sum purchases from actual records
                            totalPurchasesQty += dayData.purchaseDetails.reduce((sum, detail) => {
                              const qty = parseFloat(detail.original_quantity);
                              return sum + convertQuantityBySymbol(
                                qty,
                                detail.original_unit_symbol || '',
                                selectedUnitId,
                                tableCategory.category.id
                              );
                            }, 0);
                            
                            // Convert and sum expenses from actual records
                            totalUsageQty += dayData.saleExpenseDetails.reduce((sum, detail) => {
                              const qty = parseFloat(detail.ingredient_quantity);
                              return sum + convertQuantityBySymbol(
                                qty,
                                detail.unit_symbol,
                                selectedUnitId,
                                tableCategory.category.id
                              );
                            }, 0);
                          }
                        });

                        return (
                          <tr key={`category-${tableCategory.category.id}`} className="group hover:bg-gray-50 border-b border-gray-100">
                            <td className="sticky left-0 bg-white hover:bg-gray-50 px-6 py-2 text-sm text-gray-900 border-r z-10">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {tableCategory.category.name}
                                    {selectedUnit && ` (${selectedUnit.symbol})`}
                                  </span>
                                  {categoryUnitData && categoryUnitData.availableUnits.length > 1 && (
                                    <UnitSelector
                                      categoryId={tableCategory.category.id}
                                      defaultUnitId={selectedUnitId}
                                      availableUnits={categoryUnitData.availableUnits}
                                      onUnitChange={(unitId) => handleUnitChange(tableCategory.category.id, unitId)}
                                    />
                                  )}
                                </div>
                                <Protected permission={{ resource: 'subcategories', action: 'edit' }}>
                                  <button
                                    onClick={() => handleEditCategory(tableCategory.category)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={t('expenses.categories.editCategory')}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                </Protected>
                              </div>
                            </td>
                            {monthDays.map((day) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const dayData = tableCategory.dailyData.get(dateKey);
                              const isToday = isSameDay(day, new Date());
                              
                              // Convert quantities for display - sum converted values from actual records
                              const displayPurchasesQty = dayData
                                ? dayData.purchaseDetails.reduce((sum, detail) => {
                                    const qty = parseFloat(detail.original_quantity);
                                    return sum + convertQuantityBySymbol(
                                      qty,
                                      detail.original_unit_symbol || '',
                                      selectedUnitId,
                                      tableCategory.category.id
                                    );
                                  }, 0)
                                : 0;

                              const displayUsageQty = dayData
                                ? dayData.saleExpenseDetails.reduce((sum, detail) => {
                                    const qty = parseFloat(detail.ingredient_quantity);
                                    return sum + convertQuantityBySymbol(
                                      qty,
                                      detail.unit_symbol,
                                      selectedUnitId,
                                      tableCategory.category.id
                                    );
                                  }, 0)
                                : 0;
                              
                              return (
                                <React.Fragment key={`${day.toISOString()}-cat`}>
                                  {/* Quantity Column */}
                                  <td 
                                    className={`px-1 py-2 text-center text-xs border-x whitespace-nowrap ${isToday ? 'bg-blue-50' : ''}`}
                                    title={dayData && dayData.purchaseDetails.length > 0 ? 
                                      dayData.purchaseDetails.map(detail => 
                                        detail.was_converted 
                                          ? `${t('expenses.invoices.number')}: ${detail.invoice_number}\n${t('common.original')}: ${formatQty(parseFloat(detail.original_quantity))} ${detail.original_unit_symbol || ''}\n${t('common.converted')}: ${formatQty(detail.converted_quantity ? parseFloat(detail.converted_quantity) : 0)} ${tableCategory.unitSymbol}`
                                          : `${t('expenses.invoices.number')}: ${detail.invoice_number}\n${t('common.quantity')}: ${formatQty(parseFloat(detail.original_quantity))} ${tableCategory.unitSymbol}`
                                      ).join('\n---\n')
                                      : undefined
                                    }
                                  >
                                    {dayData ? (
                                      <div className="space-y-0.5">
                                        {dayData.purchasesQty !== 0 && (
                                          <div 
                                            className="text-green-600 cursor-pointer hover:underline"
                                            onClick={() => handlePurchaseCellClick(
                                              tableCategory.category.name,
                                              selectedUnit?.symbol || tableCategory.unitSymbol,
                                              dateKey,
                                              dayData.purchaseDetails
                                            )}
                                            title={t('expenses.inventoryTracking.clickForPurchaseDetails')}
                                          >
                                            {formatQty(displayPurchasesQty)}
                                          </div>
                                        )}
                                        {dayData.usageQty !== 0 && (
                                          <div 
                                            className="text-red-600 cursor-pointer hover:underline"
                                            onClick={() => handleExpenseCellClick(
                                              tableCategory.category.name,
                                              selectedUnitId,
                                              categoryUnitData?.availableUnits || [],
                                              dateKey,
                                              dayData.saleExpenseDetails
                                            )}
                                            title={t('expenses.inventoryTracking.clickForDetails')}
                                          >
                                            -{formatQty(displayUsageQty)}
                                          </div>
                                        )}
                                        {dayData.purchasesQty === 0 && dayData.usageQty === 0 && (
                                          <div className="text-gray-400">0</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">0</div>
                                    )}
                                  </td>
                                  
                                  {/* Amount Column */}
                                  <td 
                                    className={`px-1 py-2 text-center text-xs border-x whitespace-nowrap ${isToday ? 'bg-blue-50' : ''}`}
                                  >
                                    {dayData ? (
                                      <div className="space-y-0.5">
                                        {dayData.purchasesAmount !== 0 && (
                                          <div 
                                            className="text-green-600 font-semibold cursor-pointer hover:underline"
                                            onClick={() => handlePurchaseCellClick(
                                              tableCategory.category.name,
                                              tableCategory.unitSymbol,
                                              dateKey,
                                              dayData.purchaseDetails
                                            )}
                                            title={t('expenses.inventoryTracking.clickForPurchaseDetails')}
                                          >
                                            +{formatCurrency(dayData.purchasesAmount, 2)}
                                          </div>
                                        )}
                                        {dayData.usageAmount !== 0 && (
                                          <div 
                                            className="text-red-600 font-semibold cursor-pointer hover:underline"
                                            onClick={() => handleExpenseCellClick(
                                              tableCategory.category.name,
                                              selectedUnitId,
                                              categoryUnitData?.availableUnits || [],
                                              dateKey,
                                              dayData.saleExpenseDetails
                                            )}
                                            title={t('expenses.inventoryTracking.clickForDetails')}
                                          >
                                            -{formatCurrency(dayData.usageAmount, 2)}
                                          </div>
                                        )}
                                        {dayData.purchasesAmount === 0 && dayData.usageAmount === 0 && (
                                          <div className="text-gray-400">{formatCurrency(0, 2)}</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">{formatCurrency(0, 2)}</div>
                                    )}
                                  </td>
                                  {/* Spacing column between days */}
                                  <td className={`px-6 bg-gray-50`}></td>
                                </React.Fragment>
                              );
                            })}
                            <td className="px-2 py-2 text-center text-xs border-x whitespace-nowrap">
                              <div className="space-y-0.5">
                                {totalPurchasesQty !== 0 && (
                                  <div className="text-green-600 font-semibold">
                                    +{formatQty(totalPurchasesQty)}
                                  </div>
                                )}
                                {totalUsageQty !== 0 && (
                                  <div className="text-red-600 font-semibold">
                                    -{formatQty(totalUsageQty)}
                                  </div>
                                )}
                                {totalPurchasesQty === 0 && totalUsageQty === 0 && (
                                  <div className="text-gray-400">0</div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center text-xs whitespace-nowrap">
                              <div className="space-y-0.5">
                                {totalPurchasesAmount !== 0 && (
                                  <div className="text-green-600 font-semibold">
                                    +{formatCurrency(totalPurchasesAmount, 2)}
                                  </div>
                                )}
                                {totalUsageAmount !== 0 && (
                                  <div className="text-red-600 font-semibold">
                                    -{formatCurrency(totalUsageAmount, 2)}
                                  </div>
                                )}
                                {totalPurchasesAmount === 0 && totalUsageAmount === 0 && (
                                  <div className="text-gray-400">{formatCurrency(0, 2)}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        sections={tableSections.map(ts => ({ id: ts.section.id, name: ts.section.name }))}
      />

      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={handleInvoiceSuccess}
          mode="create"
        />
      )}

      {/* Category Modal (Create or Edit) */}
      {isEditCategoryModalOpen && (
        <CategoryModal
          isOpen={isEditCategoryModalOpen}
          onClose={() => {
            setIsEditCategoryModalOpen(false);
            setSelectedCategory(null);
            setSelectedSectionIdForCreate(null);
          }}
          mode={selectedCategory ? "edit" : "create"}
          sectionId={selectedSectionIdForCreate || undefined}
          category={selectedCategory || undefined}
          onCategoryAdded={selectedCategory ? undefined : handleCategoryUpdated}
          onCategoryUpdated={selectedCategory ? handleCategoryUpdated : undefined}
        />
      )}

      {/* Edit Section Modal */}
      {isEditSectionModalOpen && selectedSection && (
        <SectionModal
          isOpen={isEditSectionModalOpen}
          onClose={() => {
            setIsEditSectionModalOpen(false);
            setSelectedSection(null);
          }}
          mode="edit"
          section={selectedSection}
          onSectionUpdated={handleSectionUpdated}
        />
      )}

      {/* Expense Detail Modal - shows sale expenses from OFD */}
      <ExpenseDetailModal
        isOpen={isExpenseDetailModalOpen}
        onClose={() => {
          setIsExpenseDetailModalOpen(false);
          setExpenseDetailData(null);
        }}
        categoryName={expenseDetailData?.categoryName || ''}
        selectedUnitId={expenseDetailData?.selectedUnitId || 0}
        availableUnits={expenseDetailData?.availableUnits || []}
        date={expenseDetailData?.date || ''}
        saleExpenses={expenseDetailData?.saleExpenses || []}
      />

      {/* Purchase Detail Modal - shows invoices purchases */}
      <PurchaseDetailModal
        isOpen={isPurchaseDetailModalOpen}
        onClose={() => {
          setIsPurchaseDetailModalOpen(false);
          setPurchaseDetailData(null);
        }}
        categoryName={purchaseDetailData?.categoryName || ''}
        unitSymbol={purchaseDetailData?.unitSymbol || ''}
        date={purchaseDetailData?.date || ''}
        purchases={purchaseDetailData?.purchases || []}
      />
    </div>
  );
}
