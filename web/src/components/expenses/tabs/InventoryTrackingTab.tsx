import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import AddSectionModal from '~/components/expenses/modals/AddSectionModal';
import CategoryModal from '~/components/expenses/modals/CategoryModal';
import { expenseSectionsApi, expenseCategoriesApi, monthPeriodsApi } from '~/shared/api/expenses';
import type { MonthPeriod } from '~/shared/api/types';

// Interface for table data structure
interface TableCategory {
  id: number;
  name: string;
  items: {
    id: number;
    name: string;
  }[];
}

export default function InventoryTrackingTab() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Handlers for modal success callbacks
  const handleSectionAdded = () => {
    setIsAddSectionModalOpen(false);
    loadData(); // Reload data after adding section
  };

  const handleItemAdded = () => {
    setIsAddItemModalOpen(false);
    loadData(); // Reload data after adding item
  };
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  
  // API data states
  const [categories, setCategories] = useState<TableCategory[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<MonthPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate days of current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const collapseAllSections = () => {
    setCollapsedSections(new Set(categories.map(cat => cat.id)));
  };

  const expandAllSections = () => {
    setCollapsedSections(new Set());
  };

  // Check if all sections are collapsed or expanded
  const allSectionsCollapsed = categories.length > 0 && categories.every(category => collapsedSections.has(category.id));
  const allSectionsExpanded = collapsedSections.size === 0;

  const toggleAllSections = () => {
    if (allSectionsCollapsed || (!allSectionsCollapsed && !allSectionsExpanded)) {
      expandAllSections();
    } else {
      collapseAllSections();
    }
  };

  // Load data functions
  const loadData = async () => {
    if (!currentLocation) return;
    
    try {
      setLoading(true);
      setError(null);

      // 1. Find current month period
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JS months are 0-indexed
      
      const periodsResponse = await monthPeriodsApi.list({
        business_id: currentLocation.id,
        status: 'active'
      });
      
      let period = periodsResponse.periods.find(p => p.year === year && p.month === month);
      
      // Create period if it doesn't exist
      if (!period) {
        period = await monthPeriodsApi.create({
          name: format(currentDate, 'LLLL yyyy', { locale: ru }),
          year,
          month,
          business_id: currentLocation.id,
          status: 'active'
        });
      }
      
      setCurrentPeriod(period);

      // 2. Load sections for this business
      const sectionsResponse = await expenseSectionsApi.list({
        business_id: currentLocation.id,
        include_categories: true
      });

      // 3. Load categories for each section and build table structure
      const tableData: TableCategory[] = [];
      
      for (const section of sectionsResponse.sections) {
        const categoriesResponse = await expenseCategoriesApi.listBySection(section.id, {
          include_relations: true
        });
        
        const sectionData: TableCategory = {
          id: section.id,
          name: section.name,
          items: categoriesResponse.categories.map(category => ({
            id: category.id,
            name: category.name
          }))
        };
        
        tableData.push(sectionData);
      }
      
      setCategories(tableData);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or date changes
  useEffect(() => {
    if (currentLocation) {
      console.log('Loading data for business:', currentLocation.id, currentLocation.name);
      loadData();
    }
  }, [currentDate, currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800 font-medium mb-2">Ошибка</div>
        <div className="text-red-600">{error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  // Show loading or message if no business selected
  if (!currentLocation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('expenses.inventoryTracking.selectBusiness')}</p>
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
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {t('expenses.inventoryTracking.todayButton')}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setIsAddItemModalOpen(true)}
              className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('expenses.inventoryTracking.addItemButton')}
            </button>
            <button 
              onClick={() => setIsAddSectionModalOpen(true)}
              className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500"
            >
              {t('expenses.inventoryTracking.addSectionButton')}
            </button>
          </div>
          
          <button 
            onClick={() => alert(t('expenses.inventoryTracking.exportAlert'))}
            className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {t('expenses.inventoryTracking.exportButton')}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r z-10">
                  <div className="flex items-center justify-between">
                    <span>{t('expenses.inventoryTracking.tableHeader')}</span>
                    <button
                      onClick={toggleAllSections}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title={allSectionsCollapsed ? t('expenses.inventoryTracking.expandAll') : t('expenses.inventoryTracking.collapseAll')}
                    >
                      {allSectionsCollapsed ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </th>
                {monthDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[80px]"
                  >
                    <div>{format(day, 'd')}</div>
                    <div className="text-[10px] text-gray-400">
                      {format(day, 'MMM', { locale: ru })}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.inventoryTracking.totalColumn')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {categories.map((category, categoryIndex) => {
                const isCollapsed = collapsedSections.has(category.id);
                return (
                  <React.Fragment key={`category-${category.id}`}>
                    {/* Add spacing between categories */}
                    {categoryIndex > 0 && (
                      <tr className="bg-gray-100">
                        <td colSpan={monthDays.length + 2} className="h-2"></td>
                      </tr>
                    )}
                    
                    {/* Category Header - Clickable */}
                    <tr className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors" onClick={() => toggleSectionCollapse(category.id)}>
                      <td className="sticky left-0 bg-blue-50 hover:bg-blue-100 px-4 py-3 font-medium text-blue-900 border-r z-10 min-w-[250px]">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold">{category.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-blue-600">({t('expenses.inventoryTracking.itemsCount', { count: category.items.length })})</span>
                            {isCollapsed ? (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      </td>
                      {monthDays.map((day) => (
                        <td key={day.toISOString()} className="px-3 py-3 border-r bg-blue-50 hover:bg-blue-100"></td>
                      ))}
                      <td className="px-4 py-3 text-center font-medium bg-blue-50 hover:bg-blue-100"></td>
                    </tr>
                    
                    {/* Category Items - Show/Hide based on collapse state */}
                    {!isCollapsed && category.items.map((item) => (
                      <tr key={`item-${item.id}`} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="sticky left-0 bg-white hover:bg-gray-50 px-6 py-2 text-sm text-gray-900 border-r z-10">
                          {item.name}
                        </td>
                        {monthDays.map((day) => (
                          <td key={day.toISOString()} className="px-3 py-2 border-r">
                            <input
                              type="number"
                              className="w-full p-1 text-center text-sm border-0 focus:ring-1 focus:ring-blue-500 rounded"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center text-sm font-medium">
                          0
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Day Highlight and Add Form */}
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-yellow-800">
              {t('expenses.inventoryTracking.currentDayTitle')}
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              {t('expenses.inventoryTracking.currentDayDescription')}
            </p>
          </div>
          <div className="text-sm text-yellow-700">
            {t('expenses.inventoryTracking.todayLabel')}: {format(new Date(), 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        onSectionAdded={handleSectionAdded}
      />

      <CategoryModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        mode="create"
        sectionId={categories.length > 0 ? categories[0].id : 1}
        onCategoryAdded={handleItemAdded}
      />
    </div>
  );
}
