import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { 
  ChartBarIcon, 
  TableCellsIcon,
  TagIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { classNames } from '~/shared/utils/classNames';

// Tab components
import OverviewTab from '~/components/expenses/tabs/OverviewTab';
import InventoryTrackingTab from '~/components/expenses/tabs/InventoryTrackingTab';
import CategoriesTab from '~/components/expenses/tabs/CategoriesTab';
import ReportsTab from '~/components/expenses/tabs/ReportsTab';

export default function ExpensesTabs() {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(1); // Start with "Учет расходов"
  
  const tabs = [
    {
      name: t('expenses.navigation.overview'),
      icon: ChartBarIcon,
      component: OverviewTab,
    },
    {
      name: t('expenses.navigation.inventoryTracking'),
      icon: TableCellsIcon,
      component: InventoryTrackingTab,
    },
    {
      name: t('expenses.navigation.categories'),
      icon: TagIcon,
      component: CategoriesTab,
    },
    {
      name: t('expenses.navigation.reports'),
      icon: DocumentChartBarIcon,
      component: ReportsTab,
    },
  ];

  return (
    <div className="w-full">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              <div className="flex items-center justify-center space-x-2">
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-6">
          {tabs.map((tab, index) => (
            <Tab.Panel
              key={index}
              className="rounded-xl bg-white p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2"
            >
              <tab.component />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
