import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, FunnelIcon, EyeIcon } from '@heroicons/react/24/outline';
import { invoicesApi, suppliersApi, type Invoice, type InvoiceStatus, type Supplier } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import { Protected } from '~/shared/ui';
import { usePermissions } from '~/shared/lib/usePermissions';
import { can } from '~/shared/utils/permissions';
import InvoiceModal from '~/components/modals/InvoiceModal';
import ConfirmDeleteModal from '~/components/modals/ConfirmDeleteModal';
import { formatCurrency } from '~/shared/lib/helpers';

export default function InvoicesTab() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceMode, setInvoiceMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<number | 'all'>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load suppliers for filter - only if user has permission
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!currentLocation) return;
      // Only load suppliers if user has permission to view them
      if (!isLoadingPermissions && !can.view(permissions, 'suppliers')) {
        return;
      }
      try {
        const response = await suppliersApi.list({
          business_id: currentLocation.id,
          is_active: true,
          limit: 1000,
        });
        setSuppliers(response.suppliers);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      }
    };
    loadSuppliers();
  }, [currentLocation, isLoadingPermissions, permissions]);

  // Helper to determine if invoice is overdue
  const isOverdue = useCallback((invoice: Invoice): boolean => {
    if (invoice.paid_status !== 'pending') return false;
    
    // Get supplier payment terms
    const supplier = suppliers.find(s => s.id === invoice.supplier_id);
    const paymentTerms = supplier?.payment_terms_days || 14; // Default to 14 days if supplier not found
    
    const invoiceDate = new Date(invoice.invoice_date);
    const paymentDueDate = new Date(invoiceDate);
    paymentDueDate.setDate(invoiceDate.getDate() + paymentTerms);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    paymentDueDate.setHours(0, 0, 0, 0);
    return today > paymentDueDate;
  }, [suppliers]);

  // Load invoices
  const loadInvoices = useCallback(async () => {
    if (!currentLocation) {
      setError(t('expenses.invoices.loadingError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const skip = (currentPage - 1) * pageSize;
      
      // Use search API if there's a search query
      if (debouncedSearchQuery.trim()) {
        const response = await invoicesApi.search(
          currentLocation.id,
          debouncedSearchQuery.trim(),
          skip,
          pageSize
        );
        setInvoices(response.invoices);
        setTotalInvoices(response.total);
      } else {
        // Use regular list API with filters
        const response = await invoicesApi.list({
          business_id: currentLocation.id,
          paid_status: statusFilter === 'all' || statusFilter === 'overdue' ? undefined : statusFilter,
          supplier_id: supplierFilter === 'all' ? undefined : supplierFilter,
          date_from: dateFromFilter || undefined,
          date_to: dateToFilter || undefined,
          skip,
          limit: pageSize,
        });
        
        let filteredInvoices = response.invoices;
        
        // Apply overdue filter on frontend
        if (statusFilter === 'overdue') {
          filteredInvoices = response.invoices.filter(invoice => isOverdue(invoice));
        }
        
        setInvoices(filteredInvoices);
        setTotalInvoices(statusFilter === 'overdue' ? filteredInvoices.length : response.total);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(t('expenses.invoices.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, statusFilter, supplierFilter, dateFromFilter, dateToFilter, debouncedSearchQuery, currentPage, pageSize, t, isOverdue]);

  useEffect(() => {
    // Only load invoices if user has permission
    if (!isLoadingPermissions && can.view(permissions, 'invoices')) {
      loadInvoices();
    }
  }, [loadInvoices, isLoadingPermissions, permissions]);

  // Helper to get supplier name
  const getSupplierName = (supplierId: number) => {
    // If user doesn't have permission to view suppliers, show generic name
    if (!can.view(permissions, 'suppliers')) {
      return `Supplier #${supplierId}`;
    }
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : t('expenses.invoices.unknownSupplier');
  };  // Helper to get payment date
  const getPaymentDate = (invoice: Invoice): string => {
    if (invoice.paid_status === 'paid' && invoice.paid_date) {
      return new Date(invoice.paid_date).toLocaleDateString();
    }
    
    // Get supplier payment terms
    const supplier = suppliers.find(s => s.id === invoice.supplier_id);
    const paymentTerms = supplier?.payment_terms_days || 14; // Default to 14 days if supplier not found
    
    // For pending/cancelled/overdue, add payment terms to invoice_date
    const invoiceDate = new Date(invoice.invoice_date);
    const paymentDate = new Date(invoiceDate);
    paymentDate.setDate(invoiceDate.getDate() + paymentTerms);
    return paymentDate.toLocaleDateString();
  };

  // Helper to get display status
  const getDisplayStatus = (invoice: Invoice): string => {
    if (isOverdue(invoice)) {
      return 'overdue';
    }
    return invoice.paid_status;
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, supplierFilter, dateFromFilter, dateToFilter, searchQuery]);

  // Clear all filters
  const handleClearFilters = () => {
    setStatusFilter('all');
    setSupplierFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSearchQuery('');
  };

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setInvoiceMode('create');
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceMode('edit');
    setIsInvoiceModalOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceMode('view');
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

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  // Check permissions
  if (isLoadingPermissions) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!can.view(permissions, 'invoices')) {
    return (
      <div className="text-center py-12">
        <div className="rounded-xl bg-yellow-50 p-8 inline-block">
          <p className="text-sm text-yellow-800">
            {t('errors.INSUFFICIENT_PERMISSIONS')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('expenses.invoices.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.invoices.description')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              {t('common.filters')}
            </button>
            <Protected 
              allOf={[
                { resource: 'invoices', action: 'create' },
                { resource: 'suppliers', action: 'view' }
              ]}
            >
              <button
                onClick={handleAddInvoice}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('expenses.invoices.addInvoice')}
              </button>
            </Protected>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('expenses.invoices.filters.status')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">{t('expenses.invoices.filters.all')}</option>
                  <option value="pending">{t('expenses.invoices.filters.pending')}</option>
                  <option value="paid">{t('expenses.invoices.filters.paid')}</option>
                  <option value="cancelled">{t('expenses.invoices.filters.cancelled')}</option>
                  <option value="overdue">{t('expenses.invoices.filters.overdue')}</option>
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('expenses.invoices.filters.supplier')}
                </label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">{t('expenses.invoices.filters.allSuppliers')}</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('expenses.invoices.filters.dateFrom')}
                </label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('expenses.invoices.filters.dateTo')}
                </label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Search and Clear */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('expenses.invoices.filters.searchPlaceholder')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('common.clearFilters')}
              </button>
            </div>
          </div>
        )}

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
          <Protected 
            allOf={[
              { resource: 'invoices', action: 'create' },
              { resource: 'suppliers', action: 'view' }
            ]}
          >
            <button
              onClick={handleAddInvoice}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('expenses.invoices.createFirstInvoice')}
            </button>
          </Protected>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden relative">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.createdDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.paymentDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.invoices.table.invoiceNumber')}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPaymentDate(invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSupplierName(invoice.supplier_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number || `#${invoice.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(getDisplayStatus(invoice))}`}>
                      {t(`expenses.invoices.status.${getDisplayStatus(invoice)}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {invoice.paid_status === 'pending' && (
                        <>
                          <Protected permission={{ resource: 'invoices', action: 'approve' }}>
                            <button
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="text-green-600 hover:text-green-900"
                              title={t('expenses.invoices.actions.markAsPaid')}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          </Protected>
                          <Protected permission={{ resource: 'invoices', action: 'reject' }}>
                            <button
                              onClick={() => handleMarkAsCancelled(invoice)}
                              className="text-red-600 hover:text-red-900"
                              title={t('expenses.invoices.actions.markAsCancelled')}
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </Protected>
                        </>
                      )}
                      {/* Show eye icon only if has view permission but NOT edit permission */}
                      {can.view(permissions, 'invoices') && 
                       !can.edit(permissions, 'invoices') && (
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('expenses.invoices.actions.view')}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      )}
                      {/* Show edit icon only if has both edit and view_suppliers permissions */}
                      <Protected 
                        allOf={[
                          { resource: 'invoices', action: 'edit' },
                          { resource: 'suppliers', action: 'view' }
                        ]}
                      >
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('expenses.invoices.actions.edit')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </Protected>
                      <Protected permission={{ resource: 'invoices', action: 'delete' }}>
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          className="text-red-600 hover:text-red-900"
                          title={t('expenses.invoices.actions.delete')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </Protected>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalInvoices > pageSize && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalInvoices / pageSize), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalInvoices / pageSize)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.next')}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {t('common.showing')} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> {t('common.to')}{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, totalInvoices)}</span> {t('common.of')}{' '}
                    <span className="font-medium">{totalInvoices}</span> {t('common.results')}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{t('common.previous')}</span>
                      ←
                    </button>
                    {Array.from({ length: Math.ceil(totalInvoices / pageSize) }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        const totalPages = Math.ceil(totalInvoices / pageSize);
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                        return (
                          <Fragment key={page}>
                            {showEllipsisBefore && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </Fragment>
                        );
                      })}
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalInvoices / pageSize), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalInvoices / pageSize)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{t('common.next')}</span>
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
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
        mode={invoiceMode}
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
