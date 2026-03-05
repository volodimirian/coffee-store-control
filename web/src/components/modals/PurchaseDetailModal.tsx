import { XMarkIcon, DocumentTextIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { parseISO, format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { PurchaseDetail } from '~/shared/api/expenses';
import { formatCurrency } from '~/shared/lib/helpers';

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  unitSymbol: string;
  date: string; // YYYY-MM-DD
  purchases: PurchaseDetail[];
}

export default function PurchaseDetailModal({
  isOpen,
  onClose,
  categoryName,
  unitSymbol,
  date,
  purchases,
}: PurchaseDetailModalProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  // Fix timezone issue - parse date correctly to avoid date shift
  const formattedDate = format(parseISO(date + 'T12:00:00'), 'dd MMMM yyyy', { locale: dateLocale });

  // Calculate totals
  const totalQuantity = purchases.reduce(
    (sum, purchase) => sum + parseFloat(purchase.original_quantity),
    0
  );

  // Group by invoice number
  const groupedByInvoice = purchases.reduce((acc, purchase) => {
    const key = purchase.invoice_number;
    if (!acc[key]) {
      acc[key] = {
        invoiceNumber: key,
        items: [],
        totalQty: 0,
      };
    }
    acc[key].items.push(purchase);
    acc[key].totalQty += parseFloat(purchase.original_quantity);
    return acc;
  }, {} as Record<string, { invoiceNumber: string; items: PurchaseDetail[]; totalQty: number }>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('expenses.inventoryTracking.purchaseDetails')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {categoryName} • {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {purchases.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {t('expenses.inventoryTracking.noPurchases')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary by Invoice */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  {t('expenses.inventoryTracking.purchasesByInvoice')}
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.invoices.number')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.itemsCount')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.totalQuantity')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Object.values(groupedByInvoice).map((invoice, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-right">
                            {invoice.items.length}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(invoice.totalQty, 2, '')} {unitSymbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Item List */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <ShoppingBagIcon className="h-5 w-5 mr-2" />
                  {t('expenses.inventoryTracking.itemDetails')}
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.invoices.number')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('common.quantity')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('common.unit')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.converted')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {purchases.map((purchase, idx) => {
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {purchase.invoice_number}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {formatCurrency(parseFloat(purchase.original_quantity), 2, '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {purchase.was_converted 
                                  ? purchase.original_unit_symbol 
                                  : unitSymbol}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {purchase.was_converted ? (
                                  <span className="text-blue-600">
                                    {formatCurrency(parseFloat(purchase.converted_quantity || '0'), 2, '')} {unitSymbol}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('expenses.inventoryTracking.totalInvoices')}: <span className="font-semibold">{Object.keys(groupedByInvoice).length}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-gray-600">{t('expenses.inventoryTracking.totalQuantity')}:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totalQuantity, 2, '')} {unitSymbol}
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
