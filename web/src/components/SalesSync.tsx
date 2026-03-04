import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ofdAPI } from '~/shared/api';
import type { SyncSalesResponse, OFDConnection, Sale } from '~/shared/api/ofd';
import Input from '~/shared/ui/Input';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import { useAppContext } from '~/shared/context/AppContext';
import SaleDetailModal from '~/components/modals/SaleDetailModal';

export default function SalesSync() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const [connections, setConnections] = useState<OFDConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncSalesResponse | null>(null);
  const [error, setError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Sales list state
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  
  // Sale detail modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showUnmappedAlert, setShowUnmappedAlert] = useState(true);

  const loadConnections = useCallback(async () => {
    if (!currentLocation) return;
    
    setIsLoadingConnections(true);
    try {
      const data = await ofdAPI.getConnections(currentLocation.id);
      const activeConnections = data.filter((c) => c.is_active);
      setConnections(activeConnections);
      
      // Auto-select first active connection
      if (activeConnections.length > 0) {
        setSelectedConnectionId(activeConnections[0].id);
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
      setError(t('sales.loadConnectionsError'));
    } finally {
      setIsLoadingConnections(false);
    }
  }, [currentLocation, t]);

  const loadSales = useCallback(async () => {
    if (!currentLocation) return;
    
    setIsLoadingSales(true);
    try {
      const data = await ofdAPI.getSales(currentLocation.id, {
        page: salesPage,
        page_size: 20,
      });
      setSales(data.items);
      setSalesTotalPages(data.pages);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setIsLoadingSales(false);
    }
  }, [currentLocation, salesPage]);

  // Load connections and sales on mount
  useEffect(() => {
    if (currentLocation) {
      loadConnections();
      loadSales();
    }
  }, [currentLocation, loadConnections, loadSales]);

  // Fetch sale details when selected
  useEffect(() => {
    const fetchSaleDetail = async () => {
      if (!selectedSale) {
        setSaleDetail(null);
        return;
      }
      
      setIsLoadingDetail(true);
      try {
        const detail = await ofdAPI.getSale(selectedSale.id);
        setSaleDetail(detail);
      } catch (err) {
        console.error('Failed to load sale details:', err);
      } finally {
        setIsLoadingDetail(false);
      }
    };
    
    fetchSaleDetail();
  }, [selectedSale]);

  const closeModal = () => {
    setSelectedSale(null);
    setSaleDetail(null);
  };

  const handleSync = async () => {
    if (!selectedConnectionId) {
      setError(t('sales.selectConnectionFirst'));
      return;
    }
    setIsLoading(true);
    setError('');
    setSyncStats(null);

    try {
      // Build request with optional dates
      const requestData: { start_date?: string; end_date?: string } = {};
      if (startDate) requestData.start_date = startDate;
      if (endDate) requestData.end_date = endDate;
      
      const data = await ofdAPI.syncSales(selectedConnectionId, requestData);
      
      setSyncStats(data);
      
      // Reload sales list after successful sync
      await loadSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sales.syncError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatuses = async () => {
    if (!currentLocation) return;
    
    setIsUpdatingStatus(true);
    try {
      const result = await ofdAPI.updateSalesStatus(currentLocation.id);
      console.log('[SalesSync] Updated statuses:', result);
      
      // Reload sales list to show updated statuses
      await loadSales();
      
      // Show success message (optional - you can add a toast notification)
      alert(t('sales.statusesUpdated', { 
        processed: result.updated_counts.processed, 
        pending: result.updated_counts.pending 
      }));
    } catch (err) {
      console.error('[SalesSync] Failed to update statuses:', err);
      setError(err instanceof Error ? err.message : t('sales.updateStatusError'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('sales.title')}
        </h1>
      </div>

      {/* Unmapped Items Alert */}
      {syncStats && syncStats.unmapped_items > 0 && showUnmappedAlert && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {t('sales.unmappedItemsAlert')}
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {t('sales.unmappedItemsDescription', { count: syncStats.unmapped_items })}
              </p>
              <div className="mt-3">
                <a
                  href="/tech-cards"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                >
                  {t('sales.mapProducts')}
                </a>
              </div>
            </div>
            <div className="ml-3 flex-shrink-0">
              <button
                onClick={() => setShowUnmappedAlert(false)}
                className="inline-flex rounded-md text-yellow-400 hover:text-yellow-600 focus:outline-none"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('sales.syncTitle')}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Connection Selector */}
          <div>
            <label
              htmlFor="connection"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('sales.connection')}
            </label>
            <SearchableSelect
              options={connections.map((c) => ({
                id: c.id,
                name: c.provider_name || `Connection #${c.id}`,
                subtitle: c.last_sync_at
                  ? `${t('sales.lastSync')}: ${new Date(c.last_sync_at).toLocaleDateString()}`
                  : t('sales.neverSynced'),
              }))}
              value={
                selectedConnectionId
                  ? {
                      id: selectedConnectionId,
                      name:
                        connections.find((c) => c.id === selectedConnectionId)
                          ?.provider_name || `Connection #${selectedConnectionId}`,
                    }
                  : null
              }
              onChange={(selected: SelectOption | null) =>
                setSelectedConnectionId(selected ? Number(selected.id) : null)
              }
              placeholder={t('sales.selectConnection')}
              searchPlaceholder={t('sales.searchConnection')}
              noResultsText={t('sales.noConnectionsFound')}
              disabled={isLoadingConnections || connections.length === 0}
            />
          </div>

          {/* Start Date */}
          <div>
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('sales.startDate')}
            </label>
            <Input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('sales.endDate')}
            </label>
            <Input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Sync Button */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isLoading || isUpdatingStatus}
              className="flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  {t('sales.syncing')}
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {t('sales.syncButton')}
                </>
              )}
            </button>
            
            {/* Update Statuses Button */}
            <button
              type="button"
              onClick={handleUpdateStatuses}
              disabled={isLoading || isUpdatingStatus}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:text-gray-500"
              title={t('sales.updateStatusesHint')}
            >
              {isUpdatingStatus ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Stats */}
        {syncStats && (
          <>
            {/* Actual Date Range Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                {t('sales.actualDateRange')}:{' '}
                <span className="font-medium">
                  {syncStats.actual_start_date}
                </span>
                {' '}—{' '}
                <span className="font-medium">
                  {syncStats.actual_end_date}
                </span>
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">{t('sales.totalReceipts')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {syncStats.total_receipts}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700">{t('sales.newReceipts')}</p>
                <p className="mt-1 text-2xl font-semibold text-green-900">
                  {syncStats.new_receipts}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-700">{t('sales.updatedReceipts')}</p>
                <p className="mt-1 text-2xl font-semibold text-yellow-900">
                  {syncStats.updated_receipts}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">{t('sales.mappedItems')}</p>
                <p className="mt-1 text-2xl font-semibold text-blue-900">
                  {syncStats.mapped_items}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-700">{t('sales.unmappedItems')}</p>
                <p className="mt-1 text-2xl font-semibold text-red-900">
                  {syncStats.unmapped_items}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Errors List */}
        {syncStats && syncStats.errors.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              {t('sales.errors')} ({syncStats.errors.length})
            </h3>
            <ul className="space-y-1 text-sm text-red-700">
              {syncStats.errors.slice(0, 5).map((err, idx) => (
                <li key={idx} className="truncate">
                  {err}
                </li>
              ))}
              {syncStats.errors.length > 5 && (
                <li className="text-red-600 font-medium">
                  {t('sales.moreErrors', { count: syncStats.errors.length - 5 })}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Sales List Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t('sales.salesList')}
          </h2>
        </div>

        {isLoadingSales ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">{t('sales.loadingSales')}</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">{t('sales.noSales')}</p>
            <p className="mt-1 text-xs text-gray-400">{t('sales.syncFirst')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.receiptDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.receiptId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.totalAmount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.itemsCount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.mappingStatus')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('sales.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => {
                    // Use counters from backend
                    const itemsCount = sale.items_count;
                    const unmappedItems = sale.unmapped_items_count;

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.receipt_datetime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {sale.ofd_receipt_id.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {parseFloat(sale.total_amount).toFixed(2)} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {itemsCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unmappedItems === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              {t('sales.allMapped')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircleIcon className="w-4 h-4 mr-1" />
                              {unmappedItems} {t('sales.unmapped')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sale.processing_status === 'processed'
                                ? 'bg-green-100 text-green-800'
                                : sale.processing_status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {t(`sales.status_${sale.processing_status}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {salesTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                  disabled={salesPage === 1}
                  className="px-3 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('sales.previous')}
                </button>
                <span className="text-sm text-gray-700">
                  {t('sales.pageOf', { current: salesPage, total: salesTotalPages })}
                </span>
                <button
                  onClick={() => setSalesPage((p) => Math.min(salesTotalPages, p + 1))}
                  disabled={salesPage === salesTotalPages}
                  className="px-3 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('sales.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={!!selectedSale}
        sale={saleDetail}
        isLoading={isLoadingDetail}
        onClose={closeModal}
        onMappingCreated={async () => {
          // Reload sale details
          if (selectedSale) {
            try {
              const updatedSale = await ofdAPI.getSale(selectedSale.id);
              setSaleDetail(updatedSale);
              // Also reload sales list to update counters
              await loadSales();
            } catch (err) {
              console.error('Failed to reload sale:', err);
            }
          }
        }}
      />
    </div>
  );
}
