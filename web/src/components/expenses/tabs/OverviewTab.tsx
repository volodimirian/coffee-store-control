import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { format, getDaysInMonth } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useAppContext } from '~/shared/context/AppContext';
import { 
  expenseCategoriesApi,
  monthPeriodsApi,
  invoicesApi,
} from '~/shared/api/expenses';
import type { ExpenseCategory, Invoice, InventoryBalance } from '~/shared/api/types';

interface CategoryBalance {
  category: ExpenseCategory;
  balance: InventoryBalance | null;
}

export default function OverviewTab() {
  const { t, i18n } = useTranslation();
  const { currentLocation } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [categoryBalances, setCategoryBalances] = useState<CategoryBalance[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({
    categoriesCount: 0,
    thisMonthTotal: '0',
    daysLeft: 0,
    pendingInvoicesCount: 0,
  });

  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const currentDate = new Date();

  useEffect(() => {
    loadData();
  }, [currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!currentLocation) return;

    setLoading(true);

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const daysInMonth = getDaysInMonth(currentDate);
      const today = currentDate.getDate();
      const daysLeft = daysInMonth - today;

      // 1. Get or create period for current month
      const periodsResponse = await monthPeriodsApi.list({
        business_id: currentLocation.id,
        limit: 1000,
      });
      
      let period = periodsResponse.periods.find(
        p => p.year === year && p.month === month
      );
      
      if (!period) {
        period = await monthPeriodsApi.create({
          business_id: currentLocation.id,
          name: format(currentDate, 'LLLL yyyy', { locale: dateLocale }),
          year,
          month,
          status: 'active',
        });
      }

      // 2. Load categories
      const categoriesResponse = await expenseCategoriesApi.listByBusiness(currentLocation.id, {
        is_active: true,
        limit: 1000,
      });

      // 3. For now, skip loading individual balances to avoid CORS issues
      // We'll show basic category info without detailed balance data
      const balances: CategoryBalance[] = categoriesResponse.categories.map(category => ({
        category,
        balance: null,
      }));
      
      setCategoryBalances(balances);

      // 4. Load recent invoices
      const invoicesResponse = await invoicesApi.list({
        business_id: currentLocation.id,
        skip: 0,
        limit: 5, // Last 5 invoices
      });

      setRecentInvoices(invoicesResponse.invoices);

      // Count pending invoices
      const pendingCount = invoicesResponse.invoices.filter(
        inv => inv.paid_status === 'pending'
      ).length;

      // 5. Set stats (for now, without balance totals due to CORS issues)
      setStats({
        categoriesCount: categoriesResponse.categories.length,
        thisMonthTotal: '0', // TODO: Calculate from invoices when CORS is fixed
        daysLeft,
        pendingInvoicesCount: pendingCount,
      });

    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.thisMonth')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : `₽${stats.thisMonthTotal}`}
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
                <ClipboardDocumentListIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.categoriesCount')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : stats.categoriesCount}
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
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.pendingInvoices')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : stats.pendingInvoicesCount}
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
                <CalendarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('expenses.overview.daysLeft')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : stats.daysLeft}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('expenses.overview.recentInvoices')}
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('common.loading')}</p>
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {t('expenses.overview.noInvoices')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('expenses.overview.noInvoicesDescription')}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('expenses.invoices.number')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('expenses.invoices.date')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('expenses.invoices.amount')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('expenses.invoices.table.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {invoice.invoice_number || `#${invoice.id}`}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: dateLocale })}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                            ₽{parseFloat(invoice.total_amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.paid_status === 'paid' 
                                ? 'bg-green-100 text-green-800'
                                : invoice.paid_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {t(`expenses.invoices.statuses.${invoice.paid_status}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Month Summary with Inventory Balance */}
          <div className="bg-white shadow rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {t('expenses.overview.inventorySummary')}
              </h3>
              
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">{t('common.loading')}</p>
                </div>
              ) : categoryBalances.length === 0 ? (
                <p className="text-sm text-gray-500">{t('expenses.overview.noCategories')}</p>
              ) : (
                <div className="space-y-4">
                  {categoryBalances.slice(0, 6).map(({ category, balance }) => {
                    if (!balance) return null;

                    const opening = parseFloat(balance.opening_balance || '0');
                    const purchases = parseFloat(balance.purchases_total || '0');
                    const usage = parseFloat(balance.usage_total || '0');
                    const closing = parseFloat(balance.closing_balance || '0');

                    return (
                      <div key={category.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          <span className={`text-sm font-bold ${
                            closing > opening ? 'text-green-600' : closing < opening ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {closing.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between">
                            <span>{t('expenses.overview.opening')}:</span>
                            <span>{opening.toFixed(2)}</span>
                          </div>
                          {purchases > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>+ {t('expenses.overview.purchases')}:</span>
                              <span>{purchases.toFixed(2)}</span>
                            </div>
                          )}
                          {usage > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>- {t('expenses.overview.usage')}:</span>
                              <span>{usage.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                            <span>= {t('expenses.overview.closing')}:</span>
                            <span>{closing.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {categoryBalances.length > 6 && (
                    <p className="text-xs text-gray-400 text-center pt-2">
                      {t('expenses.overview.andMore', { count: categoryBalances.length - 6 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
