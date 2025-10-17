import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { USER_ROLES } from '~/shared/api/authentication';
import {
  HomeIcon,
  UserIcon,
  CubeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { LocationSelector } from '~/components/LocationSelector';
import { useAppContext } from '~/shared/context/AppContext';

interface MenuItem {
  id: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    icon: HomeIcon,
    labelKey: 'navigation.dashboard',
  },
  {
    id: 'account',
    path: '/account',
    icon: UserIcon,
    labelKey: 'navigation.account',
  },
  {
    id: 'products',
    path: '/products',
    icon: CubeIcon,
    labelKey: 'navigation.products',
  },
  {
    id: 'orders',
    path: '/orders',
    icon: ShoppingCartIcon,
    labelKey: 'navigation.orders',
  },
  {
    id: 'analytics',
    path: '/analytics',
    icon: ChartBarIcon,
    labelKey: 'navigation.analytics',
  },
  {
    id: 'settings',
    path: '/settings',
    icon: CogIcon,
    labelKey: 'navigation.settings',
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

function LocationSelectorWrapper() {
  const { user } = useAppContext();
  
  // Show LocationSelector only for:
  // 1. Admins (always)
  // 2. Business owners (always)  
  // 3. Employees who have access to multiple locations
  const shouldShowLocationSelector = () => {
    if (!user) return false;
    
    // Admin always sees location selector
    if (user.role?.name === USER_ROLES.ADMIN) return true;
    
    // Business owner always sees location selector
    if (user.role?.name === USER_ROLES.BUSINESS_OWNER) return true;
    
    // For employees, check if they have access to multiple locations
    // This will be determined by the LocationContext data
    if (user.role?.name === USER_ROLES.EMPLOYEE) {
      try {
        // TODO:We'll check this inside LocationSelector component
        return true; // Let LocationSelector decide based on location count
      } catch {
        return false;
      }
    }
    
    return false;
  };

  if (!shouldShowLocationSelector()) {
    return null;
  }

  return <LocationSelector />;
}

export default function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const iconClass = (isActive: boolean) =>
    `flex-shrink-0 w-5 h-5 transition-colors duration-200 ${
      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900">
              {t('common.brandName')}
            </span>
          )}
          {isCollapsed && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                aria-label={t('navigation.openSidebar')}
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Desktop close button - only when expanded */}
        {!isCollapsed && (
          <button
            onClick={onToggle}
            className="hidden lg:block p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            aria-label={t('navigation.closeSidebar')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
          aria-label={t('navigation.closeSidebar')}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Location Selector */}
      {!isCollapsed && (
        <div className="border-b border-gray-200">
          <LocationSelectorWrapper />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={linkClass}
            onClick={() => {
              // Close mobile sidebar when navigating
              if (window.innerWidth < 1024) {
                onMobileClose();
              }
            }}
          >
            {({ isActive }) => (
              <>
                <item.icon className={iconClass(isActive)} />
                {!isCollapsed && (
                  <span className="ml-3 truncate">
                    {t(item.labelKey)}
                  </span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            v0.1.0
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>
    </>
  );
}