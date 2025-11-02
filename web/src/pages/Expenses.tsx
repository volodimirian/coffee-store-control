import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { Outlet } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import ExpensesNavigation from '~/components/expenses/ExpensesNavigation';
import AccessSettingsModal from '~/components/modals/AccessSettingsModal';

export default function Expenses() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const [isAccessSettingsOpen, setIsAccessSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-6 text-gray-900">
              {t('navigation.expenseTracking')}
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              {t('expenses.page.description')}{' '}
              <span className="font-medium text-gray-900">
                {currentLocation?.name || t('expenses.page.defaultLocation')}
              </span>
            </p>
          </div>
          
          {/* Global Access Settings */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsAccessSettingsOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              {t('expenses.page.accessSettings')}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ExpensesNavigation />

      {/* Page Content */}
      <div className="rounded-xl bg-white p-6 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2">
        <Outlet />
      </div>

      {/* Access Settings Modal */}
      <AccessSettingsModal 
        isOpen={isAccessSettingsOpen}
        onClose={() => setIsAccessSettingsOpen(false)}
      />
    </div>
  );
}
