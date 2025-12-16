import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useAppContext } from '~/shared/context/AppContext';
import { 
  invoicesApi,
} from '~/shared/api/expenses';
import { formatCurrency } from '~/shared/lib/helpers';
import type { Invoice } from '~/shared/api/types';
import InvoiceModal from '~/components/modals/InvoiceModal';
import { Protected } from '~/shared/ui';

export default function OverviewTab() {
  const { t, i18n } = useTranslation();
  const { currentLocation } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({
    thisMonthTotal: '0',
    pendingInvoicesCount: 0,
  });
  
  // Modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  useEffect(() => {
    loadData();
  }, [currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!currentLocation) return;

    setLoading(true);

    try {
      // Load recent invoices
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

      // Calculate this month total (only paid invoices)
      const thisMonthInvoices = invoicesResponse.invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        const now = new Date();
        return invoiceDate.getMonth() === now.getMonth() && 
               invoiceDate.getFullYear() === now.getFullYear() &&
               invoice.paid_status === 'paid';
      });
      
      const thisMonthTotal = thisMonthInvoices.reduce((sum, invoice) => {
        return sum + parseFloat(invoice.total_amount);
      }, 0).toFixed(2);

      setStats({
        thisMonthTotal,
        pendingInvoicesCount: pendingCount,
      });

    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSuccess = () => {
    setIsInvoiceModalOpen(false);
    loadData(); // Reload data after creating invoice
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('expenses.overview.title')}</h2>
        <Protected permission={{ resource: 'invoices', action: 'create' }}>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            {t('expenses.overview.addExpense')}
          </button>
        </Protected>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* Main Content Area */}
      <div>
        {/* Recent Invoices */}
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
                          {formatCurrency(invoice.total_amount)}
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

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={handleInvoiceSuccess}
          mode="create"
        />
      )}
    </div>
  );
}
