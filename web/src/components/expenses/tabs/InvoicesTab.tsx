import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { invoicesApi, type Invoice, type InvoiceStatus } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import InvoiceModal from '~/components/expenses/modals/InvoiceModal';
import ConfirmDeleteModal from '~/components/expenses/modals/ConfirmDeleteModal';

export default function InvoicesTab() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  // Load invoices
  const loadInvoices = useCallback(async () => {
    if (!currentLocation) {
      setError(t('expenses.invoices.loadingError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await invoicesApi.list({
        business_id: currentLocation.id,
        paid_status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 1000,
      });
      setInvoices(response.invoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(t('expenses.invoices.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, statusFilter, t]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      await invoicesApi.delete(invoiceToDelete.id);
      await loadInvoices();
      setIsDeleteModalOpen(false);
      setInvoiceToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete invoice:', err);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const regularError = err as Error;
      const errorMessage = axiosError?.response?.data?.detail || regularError?.message || '';
      setError(errorMessage || t('expenses.invoices.errorDeleteInvoice'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (invoice.paid_status === 'paid') return;

    try {
      await invoicesApi.markAsPaid(invoice.id, new Date().toISOString().split('T')[0]);
      await loadInvoices();
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
      setError(t('expenses.invoices.errorMarkAsPaid'));
    }
  };

  const handleMarkAsCancelled = async (invoice: Invoice) => {
    if (invoice.paid_status === 'cancelled') return;

    try {
      await invoicesApi.markAsCancelled(invoice.id);
      await loadInvoices();
    } catch (err) {
      console.error('Failed to mark invoice as cancelled:', err);
      setError(t('expenses.invoices.errorMarkAsCancelled'));
    }
  };

  const handleModalSuccess = () => {
    loadInvoices();
  };

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.invoices.loadingError')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.invoices.loadingData')}</p>
      </div>
    );
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('expenses.invoices.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.invoices.description')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <option value="all">{t('expenses.invoices.filters.all')}</option>
              <option value="pending">{t('expenses.invoices.filters.pending')}</option>
              <option value="paid">{t('expenses.invoices.filters.paid')}</option>
              <option value="cancelled">{t('expenses.invoices.filters.cancelled')}</option>
            </select>
            <button
              onClick={handleAddInvoice}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('expenses.invoices.addInvoice')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">{t('expenses.invoices.noInvoices')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('expenses.invoices.noInvoicesDescription')}</p>
          <button
            onClick={handleAddInvoice}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('expenses.invoices.createFirstInvoice')}
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.invoiceNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.totalAmount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number || `#${invoice.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* TODO: Load supplier name - для простоты пока supplier_id */}
                    Supplier #{invoice.supplier_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₽{parseFloat(invoice.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(invoice.paid_status)}`}>
                      {t(`expenses.invoices.status.${invoice.paid_status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {invoice.paid_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleMarkAsPaid(invoice)}
                            className="text-green-600 hover:text-green-900"
                            title={t('expenses.invoices.actions.markAsPaid')}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleMarkAsCancelled(invoice)}
                            className="text-red-600 hover:text-red-900"
                            title={t('expenses.invoices.actions.markAsCancelled')}
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('expenses.invoices.actions.edit')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="text-red-600 hover:text-red-900"
                        title={t('expenses.invoices.actions.delete')}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={handleModalSuccess}
        invoice={selectedInvoice}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={confirmDelete}
        type="invoice"
        itemName={invoiceToDelete?.invoice_number || `#${invoiceToDelete?.id}`}
        isLoading={isDeleting}
      />
    </div>
  );
}
