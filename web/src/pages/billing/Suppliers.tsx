import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { suppliersApi, type Supplier } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import SupplierModal from '~/components/modals/SupplierModal';
import ConfirmDeleteModal from '~/components/modals/ConfirmDeleteModal';

type SupplierWithInvoiceInfo = Supplier & {
  _hasInvoices?: boolean;
  _invoiceCount?: number;
};

export default function Suppliers() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierWithInvoiceInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    if (!currentLocation) {
      setError(t('billing.suppliers.loadingError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const skip = (currentPage - 1) * pageSize;
      const is_active = activeFilter === 'all' ? undefined : activeFilter === 'active';
      
      const response = await suppliersApi.list({
        business_id: currentLocation.id,
        is_active,
        search: debouncedSearchQuery.trim() || undefined,
        skip,
        limit: pageSize,
      });

      setSuppliers(response.suppliers);
      setTotalSuppliers(response.total);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(t('billing.suppliers.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, activeFilter, debouncedSearchQuery, currentPage, pageSize, t]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSave = async () => {
    setIsSupplierModalOpen(false);
    await loadSuppliers();
  };

  const handleDeleteClick = async (supplier: Supplier) => {
    try {
      // Проверяем есть ли инвойсы у поставщика
      const invoiceCheck = await suppliersApi.hasInvoices(supplier.id);
      
      if (invoiceCheck.has_invoices) {
        // Если есть инвойсы, показываем предупреждение о мягком удалении
        setSupplierToDelete({
          ...supplier,
          _hasInvoices: true,
          _invoiceCount: invoiceCheck.invoice_count
        });
      } else {
        // Если нет инвойсов, можно удалить жестко
        setSupplierToDelete({
          ...supplier,
          _hasInvoices: false,
          _invoiceCount: 0
        });
      }
      
      setIsDeleteModalOpen(true);
    } catch (err) {
      console.error('Failed to check supplier invoices:', err);
      // В случае ошибки просто открываем модал с мягким удалением
      setSupplierToDelete(supplier);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      // Use permanent deletion if supplier has no invoices, soft delete if they do
      const permanent = !supplierToDelete._hasInvoices;
      await suppliersApi.delete(supplierToDelete.id, permanent);
      await loadSuppliers();
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      setError(t('billing.suppliers.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSupplier = async (supplier: Supplier) => {
    try {
      await suppliersApi.restore(supplier.id);
      await loadSuppliers();
    } catch (err) {
      console.error('Failed to restore supplier:', err);
      setError(t('billing.suppliers.restoreError'));
    }
  };

  const handleToggleSupplierStatus = async (supplier: Supplier) => {
    try {
      if (supplier.is_active) {
        // Деактивировать поставщика (мягкое удаление)
        await suppliersApi.delete(supplier.id, false);
      } else {
        // Активировать поставщика (восстановление)
        await suppliersApi.restore(supplier.id);
      }
      await loadSuppliers();
    } catch (err) {
      console.error('Failed to toggle supplier status:', err);
      setError(supplier.is_active ? t('billing.suppliers.deleteError') : t('billing.suppliers.restoreError'));
    }
  };

  const totalPages = Math.ceil(totalSuppliers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('billing.suppliers.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('billing.suppliers.description')}
          </p>
        </div>
        <button
          onClick={handleCreateSupplier}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('billing.suppliers.create')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('billing.suppliers.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="flex-shrink-0">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">{t('billing.suppliers.filters.all')}</option>
            <option value="active">{t('billing.suppliers.filters.active')}</option>
            <option value="inactive">{t('billing.suppliers.filters.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('billing.suppliers.loading')}
            </div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-sm text-gray-500">
              {debouncedSearchQuery || activeFilter !== 'all'
                ? t('billing.suppliers.noResults')
                : t('billing.suppliers.empty')
              }
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {suppliers
              .sort((a, b) => {
                // Сначала активные поставщики, потом неактивные
                if (a.is_active !== b.is_active) {
                  return a.is_active ? -1 : 1;
                }
                // Внутри группы сортируем по имени
                return a.name.localeCompare(b.name);
              })
              .map((supplier) => (
              <li key={supplier.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {supplier.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {t('billing.suppliers.taxId')}: {supplier.tax_id}
                        </p>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            {t('billing.suppliers.paymentTerms')}: {supplier.payment_terms_days} {t('billing.suppliers.days')}
                          </span>
                          {supplier.contact_info?.phone && (
                            <span>
                              {t('billing.suppliers.phone')}: {supplier.contact_info.phone}
                            </span>
                          )}
                          {supplier.contact_info?.email && (
                            <span>
                              {t('billing.suppliers.email')}: {supplier.contact_info.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleToggleSupplierStatus(supplier)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${
                            supplier.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
                              : 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
                          }`}
                          title={supplier.is_active ? t('billing.suppliers.deactivate') : t('billing.suppliers.activate')}
                        >
                          {supplier.is_active ? t('billing.suppliers.active') : t('billing.suppliers.inactive')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="text-blue-600 hover:text-blue-900"
                      title={t('billing.suppliers.edit')}
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    
                    {supplier.is_active ? (
                      <button
                        onClick={() => handleDeleteClick(supplier)}
                        className="text-red-600 hover:text-red-900"
                        title={t('billing.suppliers.delete')}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestoreSupplier(supplier)}
                        className="text-green-600 hover:text-green-900"
                        title={t('billing.suppliers.restore')}
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next')}
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t('common.pagination.showing')} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> {t('common.pagination.to')} <span className="font-medium">{Math.min(currentPage * pageSize, totalSuppliers)}</span> {t('common.pagination.of')} <span className="font-medium">{totalSuppliers}</span> {t('common.pagination.results')}
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('common.pagination.first')}</span>
                  <span className="text-sm">«</span>
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('common.previous')}</span>
                  <span className="text-sm">‹</span>
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('common.next')}</span>
                  <span className="text-sm">›</span>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">{t('common.pagination.last')}</span>
                  <span className="text-sm">»</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleSupplierSave}
        supplier={selectedSupplier}
        businessId={currentLocation?.id}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={
          supplierToDelete?._hasInvoices 
            ? t('billing.suppliers.deleteWithInvoicesTitle')
            : t('billing.suppliers.deleteWithoutInvoicesTitle')
        }
        message={
          supplierToDelete?._hasInvoices 
            ? t('billing.suppliers.deleteWithInvoicesMessage', { count: supplierToDelete._invoiceCount })
            : t('billing.suppliers.deleteWithoutInvoicesMessage')
        }
        isRevocable={supplierToDelete?._hasInvoices}
        itemName={supplierToDelete?.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
