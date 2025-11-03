import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addDays,
} from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import {
  suppliersApi,
  invoicesApi,
} from '~/shared/api/expenses';
import InvoiceModal from '~/components/modals/InvoiceModal';
import type {
  Supplier,
  Invoice,
} from '~/shared/api/types';

interface SupplierRow {
  supplier: Supplier;
  invoicesByDate: Map<string, Invoice[]>; // key: YYYY-MM-DD, value: invoices due on that date
}

export default function InvoiceCalendarTab() {
  const { t, i18n } = useTranslation();
  const { currentLocation } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [monthDays, setMonthDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [copiedTaxId, setCopiedTaxId] = useState<number | null>(null);

  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleInvoiceAdded = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
    loadData();
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleCopyTaxId = async (supplierId: number, taxId: string) => {
    try {
      await navigator.clipboard.writeText(taxId);
      setCopiedTaxId(supplierId);
      setTimeout(() => setCopiedTaxId(null), 2000);
    } catch (err) {
      console.error('Failed to copy tax ID:', err);
    }
  };

  // Get invoice status based on dates and paid_status
  const getInvoiceStatus = useCallback((invoice: Invoice, supplier: Supplier) => {
    if (invoice.paid_status === 'cancelled') return 'cancelled';
    if (invoice.paid_status === 'paid') return 'paid';

    const invoiceDate = parseISO(invoice.invoice_date);
    const paymentTerms = supplier.payment_terms_days || 14;
    const dueDate = addDays(invoiceDate, paymentTerms);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (isSameDay(dueDate, today)) return 'dueToday';
    if (dueDate < today) return 'overdue';
    return 'pending';
  }, []);

  // Get background color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'dueToday':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'cancelled':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const loadData = useCallback(async () => {
    if (!currentLocation) return;

    setLoading(true);
    setError(null);

    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      setMonthDays(monthDays);

      // Load suppliers
      const suppliersResponse = await suppliersApi.list({
        business_id: currentLocation.id,
        is_active: true,
        limit: 1000,
      });

      // Calculate date range for invoice filtering
      // We need to account for payment terms, so we fetch invoices from earlier
      // For example, if max payment terms is 90 days, we need invoices from (month_start - 90 days)
      const maxPaymentTermsDays = 90; // Conservative estimate for max payment terms
      const fetchFromDate = addDays(monthStart, -maxPaymentTermsDays);
      
      // Load invoices for this period with date filtering
      const invoicesResponse = await invoicesApi.list({
        business_id: currentLocation.id,
        date_from: format(fetchFromDate, 'yyyy-MM-dd'),
        date_to: format(monthEnd, 'yyyy-MM-dd'),
        skip: 0,
        limit: 1000,
      });

      // Build supplier rows with invoices mapped by due date
      const rows: SupplierRow[] = [];

      for (const supplier of suppliersResponse.suppliers) {
        const invoicesByDate = new Map<string, Invoice[]>();

        // Get invoices for this supplier
        const supplierInvoices = invoicesResponse.invoices.filter(
          (inv) => inv.supplier_id === supplier.id
        );

        for (const invoice of supplierInvoices) {
          const invoiceDate = parseISO(invoice.invoice_date);
          const paymentTerms = supplier.payment_terms_days || 14;
          const dueDate = addDays(invoiceDate, paymentTerms);

          // Only show invoices if due date is within the current month OR if already showing in month
          if (dueDate >= monthStart && dueDate <= monthEnd) {
            const dueDateKey = format(dueDate, 'yyyy-MM-dd');

            if (!invoicesByDate.has(dueDateKey)) {
              invoicesByDate.set(dueDateKey, []);
            }
            invoicesByDate.get(dueDateKey)!.push(invoice);
          }
        }

        // Only add supplier if they have invoices in this month
        if (invoicesByDate.size > 0 || supplierInvoices.length === 0) {
          rows.push({
            supplier,
            invoicesByDate,
          });
        }
      }

      setSupplierRows(rows);
    } catch (err) {
      console.error('Failed to load invoice calendar data:', err);
      setError(t('expenses.invoiceCalendar.loadingError'));
    } finally {
      setLoading(false);
    }
  }, [currentLocation, currentDate, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.invoiceCalendar.selectLocation')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800 font-medium mb-2">{t('common.error')}</div>
        <div className="text-red-600">{error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              aria-label={t('common.previous')}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              aria-label={t('common.next')}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {t('common.today')}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('expenses.invoiceCalendar.addInvoice')}
          </button>
        </div>
      </div>

      {/* Main Table */}
      {supplierRows.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <p className="text-gray-500 text-lg">{t('expenses.invoiceCalendar.noSuppliers')}</p>
          <p className="text-gray-400 text-sm mt-2">
            {t('expenses.invoiceCalendar.noSuppliersDescription')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r z-10 min-w-[250px]"
                  >
                    {t('expenses.invoiceCalendar.table.supplier')}
                  </th>
                  {monthDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <React.Fragment key={day.toISOString()}>
                      <th
                        className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider border-r min-w-[120px] ${
                          isToday ? 'bg-blue-100 text-blue-900' : 'text-gray-500'
                        }`}
                      >
                        <div className="font-semibold">{format(day, 'd')}</div>
                        <div className="text-[10px] opacity-75">
                          {format(day, 'EEE', { locale: dateLocale })}
                        </div>
                      </th>
                      {/* Spacing column */}
                      <th className="w-6 bg-gray-50"></th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {supplierRows.map((row) => {
                  const isCopied = copiedTaxId === row.supplier.id;
                  return (
                    <tr key={`supplier-${row.supplier.id}`} className="hover:bg-gray-50 border-b">
                      <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-3 text-sm border-r z-10">
                        <div className="font-medium text-gray-900">{row.supplier.name}</div>
                        {row.supplier.tax_id && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span>
                              {t('expenses.invoiceCalendar.taxIdLabel')}: {row.supplier.tax_id}
                            </span>
                            <button
                              onClick={() => handleCopyTaxId(row.supplier.id, row.supplier.tax_id!)}
                              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                              title={t('expenses.invoiceCalendar.copyTaxId')}
                            >
                              {isCopied ? (
                                <CheckIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="h-3 w-3 text-gray-600" />
                              )}
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-red-600 mt-1">
                          {t('expenses.invoiceCalendar.table.paymentTerms')}:{' '}
                          {row.supplier.payment_terms_days || 14} {t('expenses.invoiceCalendar.days')}
                        </div>
                      </td>
                      {monthDays.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayInvoices = row.invoicesByDate.get(dateKey) || [];
                        const isToday = isSameDay(day, new Date());

                        return (
                          <React.Fragment key={`${day.toISOString()}-supplier`}>
                            <td
                              className={`px-2 py-2 text-center align-top border-r min-w-[120px] ${
                                isToday ? 'bg-blue-50' : ''
                              }`}
                            >
                              {dayInvoices.length > 0 ? (
                                <div className="space-y-1">
                                  {dayInvoices.map((invoice) => {
                                    const status = getInvoiceStatus(invoice, row.supplier);
                                    const statusColor = getStatusColor(status);

                                    return (
                                      <div
                                        key={invoice.id}
                                        onClick={() => handleInvoiceClick(invoice)}
                                        className={`text-[10px] px-2 py-1 rounded border ${statusColor} cursor-pointer hover:opacity-80 hover:shadow-md transition-all text-center`}
                                        title={`${t('expenses.invoices.number')}: ${invoice.invoice_number || `#${invoice.id}`}\n${t('expenses.invoices.date')}: ${format(parseISO(invoice.invoice_date), 'dd.MM.yyyy')}\n${t('expenses.invoices.amount')}: ${parseFloat(invoice.total_amount).toFixed(2)} ₽\n${t('expenses.invoices.status.title')}: ${t(`expenses.invoiceCalendar.statuses.${status}`)}`}
                                      >
                                        <div className="font-semibold text-[11px]">
                                          {t('expenses.invoiceCalendar.invoiceNumber')}{invoice.invoice_number || invoice.id}
                                        </div>
                                        <div className="text-[10px] mt-0.5">
                                          {t('expenses.invoiceCalendar.invoiceFrom')} {format(parseISO(invoice.invoice_date), 'dd.MM.yyyy')}
                                        </div>
                                        <div className="font-bold text-[11px] mt-0.5">
                                          {parseFloat(invoice.total_amount).toFixed(2)} ₽
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-gray-400 text-xs">—</div>
                              )}
                            </td>
                            {/* Spacing column */}
                            <td className={`w-6 ${isToday ? 'bg-blue-50' : ''}`}></td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleInvoiceAdded}
        invoice={selectedInvoice}
      />
    </div>
  );
}
