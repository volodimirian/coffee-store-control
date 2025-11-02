import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { Outlet } from 'react-router-dom';
import BillingNavigation from '~/components/billing/BillingNavigation';

export default function Billing() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-6 text-gray-900">
              {t('navigation.billing')}
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              {t('billing.page.description')}{' '}
              <span className="font-medium text-gray-900">
                {currentLocation?.name || t('billing.page.defaultLocation')}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <BillingNavigation />

      {/* Page Content */}
      <div className="rounded-xl bg-white p-6 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2">
        <Outlet />
      </div>
    </div>
  );
}