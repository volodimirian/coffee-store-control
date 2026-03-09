import { XMarkIcon, ShoppingCartIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { parseISO, format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { SaleExpenseDetail } from '~/shared/api/expenses';
import type { Unit } from '~/shared/api/types';
import { formatCurrency } from '~/shared/lib/helpers';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  selectedUnitId: number;
  availableUnits: Unit[];
  date: string; // YYYY-MM-DD
  saleExpenses: SaleExpenseDetail[];
}

export default function ExpenseDetailModal({
  isOpen,
  onClose,
  categoryName,
  selectedUnitId,
  availableUnits,
  date,
  saleExpenses,
}: ExpenseDetailModalProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  // Fix timezone issue - parse date correctly to avoid date shift
  const formattedDate = format(parseISO(date + 'T12:00:00'), 'dd MMMM yyyy', { locale: dateLocale });

  // Find selected unit for display
  const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const displayUnitSymbol = selectedUnit?.symbol || '';

  // Convert quantity from actual unit (from receipt) to selected unit
  const convertModalQuantity = (qty: number, fromUnitSymbol: string): number => {
    // Find unit by symbol from the receipt data
    const fromUnit = availableUnits.find((u) => u.symbol === fromUnitSymbol);
    const toUnit = availableUnits.find((u) => u.id === selectedUnitId);

    if (!fromUnit || !toUnit || fromUnit.id === selectedUnitId) {
      return qty;
    }

    const fromFactor = parseFloat(fromUnit.conversion_factor?.toString() || '1');
    const toFactor = parseFloat(toUnit.conversion_factor?.toString() || '1');

    return (qty * fromFactor) / toFactor;
  };

  // Calculate totals with conversion
  const totalQuantity = saleExpenses.reduce(
    (sum, expense) => sum + convertModalQuantity(parseFloat(expense.ingredient_quantity), expense.unit_symbol),
    0
  );
  const totalCost = saleExpenses.reduce(
    (sum, expense) => sum + parseFloat(expense.cost),
    0
  );

  // Group by tech_card_item_name for summary with conversion
  const groupedByProduct = saleExpenses.reduce((acc, expense) => {
    const key = expense.tech_card_item_name;
    if (!acc[key]) {
      acc[key] = {
        name: key,
        receipts: [],
        totalQty: 0,
        totalCost: 0,
      };
    }
    acc[key].receipts.push(expense);
    acc[key].totalQty += convertModalQuantity(parseFloat(expense.ingredient_quantity), expense.unit_symbol);
    acc[key].totalCost += parseFloat(expense.cost);
    return acc;
  }, {} as Record<string, { name: string; receipts: SaleExpenseDetail[]; totalQty: number; totalCost: number }>);

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
              {t('expenses.inventoryTracking.expenseDetails')}
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
          {saleExpenses.length === 0 ? (
            <div className="text-center py-8">
              <ReceiptRefundIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {t('expenses.inventoryTracking.noExpenses')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary by Product */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  {t('expenses.inventoryTracking.expensesByProduct')}
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.product')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.receiptsCount')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.quantity')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          {t('expenses.inventoryTracking.cost')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Object.values(groupedByProduct).map((product, idx) => {
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">
                              {product.receipts.length}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {formatCurrency(product.totalQty, 2, '')} {displayUnitSymbol}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(product.totalCost, 2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Receipt List */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <ReceiptRefundIcon className="h-5 w-5 mr-2" />
                  {t('expenses.inventoryTracking.receiptDetails')}
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.receiptId')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.dateTime')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.product')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.soldQty')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.ingredientQty')}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                            {t('expenses.inventoryTracking.cost')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {saleExpenses.map((expense, idx) => {
                          const receiptDate = new Date(expense.receipt_datetime);
                          const receiptTime = format(receiptDate, 'HH:mm');
                          const convertedQty = convertModalQuantity(parseFloat(expense.ingredient_quantity), expense.unit_symbol);
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="font-mono text-xs">
                                  {expense.receipt_id.slice(-8)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {receiptTime}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {expense.tech_card_item_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {formatCurrency(parseFloat(expense.quantity_sold), 0, '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {formatCurrency(convertedQty, 2, '')} {displayUnitSymbol}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                {formatCurrency(parseFloat(expense.cost), 2)}
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

        {/* Footer with Totals */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('expenses.inventoryTracking.totalReceipts')}: <span className="font-semibold">{saleExpenses.length}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-gray-600">{t('expenses.inventoryTracking.totalQuantity')}:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totalQuantity, 2, '')} {displayUnitSymbol}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">{t('expenses.inventoryTracking.totalCost')}:</span>{' '}
                <span className="font-semibold text-red-600">
                  -{formatCurrency(totalCost, 2)}
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
