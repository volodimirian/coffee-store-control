import { NavLink } from 'react-router-dom';
import { 
  DocumentTextIcon,
  CalendarDaysIcon,
  TagIcon,
  ScaleIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function BillingNavigation() {
  const { t } = useTranslation();
  
  const tabs = [
    {
      name: t('expenses.invoiceCalendar.title'),
      icon: CalendarDaysIcon,
      path: '/billing/invoice-calendar',
    },
    {
      name: t('billing.navigation.invoices'),
      icon: DocumentTextIcon,
      path: '/billing',
    },
    {
      name: t('billing.navigation.categories'),
      icon: TagIcon,
      path: '/billing/categories',
    },
    {
      name: t('billing.navigation.units'),
      icon: ScaleIcon,
      path: '/billing/units',
    },
    {
      name: t('billing.navigation.suppliers'),
      icon: BuildingOffice2Icon,
      path: '/billing/suppliers',
    },
  ];

  return (
    <div className="border-b border-gray-200 pb-5 mb-6">
      <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
        {tabs.map((tab) => (
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
