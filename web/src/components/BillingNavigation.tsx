import { NavLink } from 'react-router-dom';
import { 
  DocumentTextIcon,
  CalendarDaysIcon,
  TagIcon,
  ScaleIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '~/shared/lib/usePermissions';
import { can, hasAllPermissions } from '~/shared/utils/permissions';
import type { Resource } from '~/shared/utils/permissions';

interface Tab {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredPermission?: Resource;
  requiredPermissions?: Array<{ resource: Resource; action: 'view' | 'create' | 'edit' | 'delete' }>;
}

export default function BillingNavigation() {
  const { t } = useTranslation();
  const { permissions } = usePermissions();
  
  const tabs: Tab[] = [
    {
      name: t('expenses.invoiceCalendar.title'),
      icon: CalendarDaysIcon,
      path: '/billing/invoice-calendar',
      // Requires BOTH invoices and suppliers view permissions
      requiredPermissions: [
        { resource: 'invoices', action: 'view' },
        { resource: 'suppliers', action: 'view' },
      ],
    },
    {
      name: t('billing.navigation.invoices'),
      icon: DocumentTextIcon,
      path: '/billing',
      requiredPermission: 'invoices' as Resource,
    },
    {
      name: t('billing.navigation.categories'),
      icon: TagIcon,
      path: '/billing/categories',
      requiredPermission: 'categories' as Resource,
    },
    {
      name: t('billing.navigation.units'),
      icon: ScaleIcon,
      path: '/billing/units',
      requiredPermission: 'units' as Resource,
    },
    {
      name: t('billing.navigation.suppliers'),
      icon: BuildingOffice2Icon,
      path: '/billing/suppliers',
      requiredPermission: 'suppliers' as Resource,
    },
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter((tab) => {
    // Check for multiple required permissions (AND logic)
    if (tab.requiredPermissions) {
      return hasAllPermissions(permissions, tab.requiredPermissions);
    }
    
    // Check for single required permission
    if (tab.requiredPermission) {
      return can.view(permissions, tab.requiredPermission);
    }
    
    // No permission requirement - show by default
    return true;
  });

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
      <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end={tab.path === '/billing'} // Only for the invoices tab
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
