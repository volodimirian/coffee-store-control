import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ofdAPI } from '~/shared/api';
import type { SyncSalesResponse } from '~/shared/api/ofd';
import Input from '~/shared/ui/Input';

export default function SalesSync() {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncSalesResponse | null>(null);
  const [error, setError] = useState('');

  const handleSync = async () => {
    if (!startDate || !endDate) {
      setError(t('sales.selectDates'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSyncStats(null);

    try {
      // TODO: Get connection_id from selected connection
      const connectionId = 1; // Placeholder
      
      const data = await ofdAPI.syncSales(connectionId, {
        start_date: startDate,
        end_date: endDate,
      });
      
      setSyncStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sales.syncError'));
    } finally {
      setIsLoading(false);
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

      {/* Sync Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('sales.syncTitle')}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSync}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
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
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
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
              <p className="text-sm text-yellow-700">{t('sales.duplicates')}</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-900">
                {syncStats.duplicate_receipts}
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

      {/* Sales List - TODO: Add table */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('sales.salesList')}
        </h2>
        <p className="text-sm text-gray-500">{t('sales.comingSoon')}</p>
      </div>
    </div>
  );
}
