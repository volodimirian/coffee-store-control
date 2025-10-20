import React, { useState } from 'react';
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
import AddSectionModal from '~/components/expenses/modals/AddSectionModal';
import AddCategoryModal from '~/components/expenses/modals/AddCategoryModal';

// Mock data - later we'll replace with API calls
const mockCategories = [
  {
    id: 1,
    name: 'КОФЕ',
    items: [
      { id: 1, name: 'Кофе' },
      { id: 2, name: 'Кофе' },
    ]
  },
  {
    id: 2,
    name: 'МОЛОКО',
    items: [
      { id: 3, name: 'Молоко' },
      { id: 4, name: 'Сливки' },
      { id: 5, name: 'Безлактозное' },
      { id: 6, name: 'Банановое' },
      { id: 7, name: 'Кокосовое' },
    ]
  },
  {
    id: 3,
    name: 'СИРОПЫ',
    items: [
      { id: 8, name: 'Карамель' },
      { id: 9, name: 'Соленая карамель' },
      { id: 10, name: 'Фундук' },
      { id: 11, name: 'Миндаль' },
      { id: 12, name: 'Фундук/Пекан' },
    ]
  }
];

export default function InventoryTrackingTab() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  
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
    setCollapsedSections(new Set(mockCategories.map(cat => cat.id)));
  };

  const expandAllSections = () => {
    setCollapsedSections(new Set());
  };

  // Check if all sections are collapsed or expanded
  const allSectionsCollapsed = mockCategories.length > 0 && mockCategories.every(category => collapsedSections.has(category.id));
  const allSectionsExpanded = collapsedSections.size === 0;

  const toggleAllSections = () => {
    if (allSectionsCollapsed || (!allSectionsCollapsed && !allSectionsExpanded)) {
      expandAllSections();
    } else {
      collapseAllSections();
    }
  };

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
              {mockCategories.map((category, categoryIndex) => {
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
        monthPeriodId={1} // TODO: Get from context/API
        onSectionAdded={(section) => {
          console.log('Section added:', section);
          // TODO: Refresh data or update state
        }}
      />

      <AddCategoryModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        sectionId={1} // TODO: Allow user to select section
        onCategoryAdded={(category) => {
          console.log('Category added:', category);
          // TODO: Refresh data or update state
        }}
      />
    </div>
  );
}
