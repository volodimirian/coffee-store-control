import { NavLink } from 'react-router-dom';
import { 
  ChartBarIcon, 
  TableCellsIcon,
  TagIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import AccessSettingsModal from './AccessSettingsModal';

const tabs = [
  {
    name: 'Обзор',
    icon: ChartBarIcon,
    path: '/expenses',
  },
  {
    name: 'Учет расходов',
    icon: TableCellsIcon,
    path: '/expenses/inventory-tracking',
  },
  {
    name: 'Категории',
    icon: TagIcon,
    path: '/expenses/categories',
  },
  {
    name: 'Отчеты',
    icon: DocumentChartBarIcon,
    path: '/expenses/reports',
  },
];

export default function ExpensesNavigation() {
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  return (
    <>
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.name}
                to={tab.path}
                end={tab.path === '/expenses'} // Only for the overview tab
                className={({ isActive }) =>
                  `rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </div>
              </NavLink>
            ))}
          </div>
          
          <button
            onClick={() => setIsAccessModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Настройки доступа
          </button>
        </div>
      </div>
      
      <AccessSettingsModal 
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
      />
    </>
  );
}
