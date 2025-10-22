import { 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function OverviewTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.totalExpenses')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ₽12,345
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.thisMonth')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ₽2,456
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.categoriesCount')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    8
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.daysLeft')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    12
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('expenses.overview.lastExpenses')}
              </h3>
              
              {/* Placeholder for expense table */}
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('expenses.overview.noExpensesTitle')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('expenses.overview.noExpensesDescription')}
                </p>
                <div className="mt-6">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('expenses.overview.addFirstExpense')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('expenses.overview.quickActions')}
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('expenses.overview.addCategory')}
                </button>
                <button className="w-full flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  {t('expenses.overview.viewReports')}
                </button>
              </div>
            </div>
          </div>

          {/* Current Month Summary */}
          <div className="bg-white shadow rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('expenses.overview.monthSummary')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('expenses.overview.categoryItems.coffee')}</span>
                  <span className="font-medium">₽850</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('expenses.overview.categoryItems.milk')}</span>
                  <span className="font-medium">₽320</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('expenses.overview.categoryItems.syrups')}</span>
                  <span className="font-medium">₽245</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('expenses.overview.categoryItems.equipment')}</span>
                  <span className="font-medium">₽180</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between font-medium">
                  <span>{t('expenses.overview.total')}</span>
                  <span>₽1,595</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
