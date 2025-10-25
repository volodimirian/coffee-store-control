import { NavLink } from 'react-router-dom';
import { 
  ChartBarIcon, 
  TableCellsIcon,
  TagIcon,
  ScaleIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function ExpensesNavigation() {
  const { t } = useTranslation();
  
  const tabs = [
    {
      name: t('expenses.navigation.overview'),
      icon: ChartBarIcon,
      path: '/expenses',
    },
    {
      name: t('expenses.navigation.inventoryTracking'),
      icon: TableCellsIcon,
      path: '/expenses/inventory-tracking',
    },
    {
      name: t('expenses.navigation.categories'),
      icon: TagIcon,
      path: '/expenses/categories',
    },
    {
      name: t('expenses.navigation.units'),
      icon: ScaleIcon,
      path: '/expenses/units',
    },
    {
      name: t('expenses.navigation.reports'),
      icon: DocumentChartBarIcon,
      path: '/expenses/reports',
    },
  ];
  return (
    <div className="border-b border-gray-200 pb-5 mb-6">
      <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">{tabs.map((tab) => (
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
    </div>
  );
}
