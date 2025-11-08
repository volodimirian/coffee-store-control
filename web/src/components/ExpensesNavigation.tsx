import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { 
  ChartBarIcon, 
  TableCellsIcon,
  TagIcon,
  ScaleIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '~/shared/lib/usePermissions';
import { can } from '~/shared/utils/permissions';
import type { Resource } from '~/shared/utils/permissions';

interface Tab {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredPermission?: Resource;
}

export default function ExpensesNavigation() {
  const { t } = useTranslation();
  const { permissions, isLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  
  const tabs: Tab[] = [
    {
      name: t('expenses.navigation.overview'),
      icon: ChartBarIcon,
      path: '/expenses',
      // Overview always visible - access already checked in Sidebar
    },
    {
      name: t('expenses.navigation.inventoryTracking'),
      icon: TableCellsIcon,
      path: '/expenses/inventory-tracking',
      requiredPermission: 'invoices' as Resource, // Inventory tracking requires invoices view
    },
    {
      name: t('expenses.navigation.categories'),
      icon: TagIcon,
      path: '/expenses/categories',
      requiredPermission: 'categories' as Resource,
    },
    {
      name: t('expenses.navigation.units'),
      icon: ScaleIcon,
      path: '/expenses/units',
      requiredPermission: 'units' as Resource,
    },
    {
      name: t('expenses.navigation.reports'),
      icon: DocumentChartBarIcon,
      path: '/expenses/reports',
      // Reports always visible - access already checked in Sidebar
    },
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter((tab) => {
    // If no required permission, tab is always visible (access already checked in Sidebar)
    if (!tab.requiredPermission) {
      return true;
    }
    
    // Check for single required permission
    return can.view(permissions, tab.requiredPermission);
  });

  // Redirect to first available tab if current page is not accessible
  useEffect(() => {
    if (isLoading || !permissions || visibleTabs.length === 0) return;

    // Check if current path matches any visible tab
    const currentTabIsVisible = visibleTabs.some(tab => tab.path === location.pathname);

    // If current tab is not visible, redirect to first available tab
    if (!currentTabIsVisible) {
      navigate(visibleTabs[0].path, { replace: true });
    }
  }, [isLoading, permissions, location.pathname, visibleTabs, navigate]);

  // Wait for permissions to load before filtering
  if (isLoading) {
    return (
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 animate-pulse h-12"></div>
      </div>
    );
  }

  // If no tabs are visible, show message
  if (visibleTabs.length === 0) {
    return (
      <div className="border-b border-gray-200 pb-5 mb-6">
        <div className="rounded-xl bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            {t('errors.INSUFFICIENT_PERMISSIONS')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 pb-5 mb-6">
      <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">{visibleTabs.map((tab) => (
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
