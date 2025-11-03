import { Fragment, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  invoicesApi,
  invoiceItemsApi,
  suppliersApi,
  expenseCategoriesApi,
  unitsApi,
  type Invoice,
  type InvoiceCreate,
  type InvoiceUpdate,
  type InvoiceItemCreate,
  type Supplier,
  type ExpenseCategory,
  type Unit,
} from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import { getFilteredUnitsForCategory } from '~/shared/lib/helpers/unitHelpers';

// Функция для форматирования чисел - убирает лишние нули после запятой
function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Если число целое, показываем без дробной части
  if (num % 1 === 0) {
    return num.toString();
  }
  
  // Для дробных чисел убираем лишние нули в конце
  return num.toFixed(4).replace(/\.?0+$/, '');
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null; // If provided, we're editing; otherwise, creating
}

interface LineItem {
  id?: number; // Exists only for existing items when editing
  category_id: number;
  quantity: string;
  unit_id: number;
  unit_price: string;
  total_price: string;
  notes?: string;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoice = null,
}: InvoiceModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const isEditing = Boolean(invoice);

  // Form state
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      category_id: 0,
      quantity: '',
      unit_id: 0,
      unit_price: '',
      total_price: '0',
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for dropdowns
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load invoice items when editing
  useEffect(() => {
    if (invoice && isOpen) {
      setSupplierId(invoice.supplier_id);
      setInvoiceNumber(invoice.invoice_number || '');
      // Convert invoice_date to YYYY-MM-DD format for date input
      const dateStr = invoice.invoice_date.split('T')[0]; // Extract date part from ISO string
      setInvoiceDate(dateStr);
      
      // Load invoice items
      const loadItems = async () => {
        try {
          const items = await invoiceItemsApi.list(invoice.id);
          if (items.length > 0) {
            setLineItems(
              items.map((item) => ({
                id: item.id,
                category_id: item.category_id,
                quantity: item.quantity,
                unit_id: item.unit_id,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
              }))
            );
          }
        } catch (err) {
          console.error('Failed to load invoice items:', err);
        }
      };
      loadItems();
    } else if (!invoice) {
      // Reset form when creating new
      setSupplierId(null);
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setLineItems([
        {
          category_id: 0,
          quantity: '',
          unit_id: 0,
          unit_price: '',
          total_price: '0',
        },
      ]);
    }
    setError(null);
  }, [invoice, isOpen]);

  // Load dropdowns data
  const loadDropdownData = useCallback(async () => {
    if (!currentLocation) return;

    setLoadingData(true);
    try {
      const [suppliersRes, categoriesRes, unitsRes] = await Promise.all([
        suppliersApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
        expenseCategoriesApi.listByBusiness(currentLocation.id, { is_active: true, limit: 1000 }),
        unitsApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
      ]);
      setSuppliers(suppliersRes.suppliers);
      setCategories(categoriesRes.categories);
      setUnits(unitsRes.units);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setError(t('expenses.invoices.modal.loadDataError'));
    } finally {
      setLoadingData(false);
    }
  }, [currentLocation, t]);

  useEffect(() => {
    if (isOpen && currentLocation) {
      loadDropdownData();
    }
  }, [isOpen, currentLocation, loadDropdownData]);

  // Calculate total amount
  const totalAmount = lineItems.reduce((sum, item) => {
    const price = parseFloat(item.total_price) || 0;
    return sum + price;
  }, 0);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        category_id: 0,
        quantity: '',
        unit_id: 0,
        unit_price: '',
        total_price: '0',
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total_price when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(field === 'quantity' ? (value as string) : updated[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unit_price' ? (value as string) : updated[index].unit_price) || 0;
      updated[index].total_price = (quantity * unitPrice).toFixed(2);
    }

    setLineItems(updated);
  };

  const validateForm = (): boolean => {
    if (!supplierId) {
      setError(t('expenses.invoices.modal.supplierRequired'));
      return false;
    }

    if (!invoiceDate) {
      setError(t('expenses.invoices.modal.dateRequired'));
      return false;
    }

    if (lineItems.length === 0) {
      setError(t('expenses.invoices.modal.itemsRequired'));
      return false;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.category_id || item.category_id === 0) {
        setError(t('expenses.invoices.modal.categoryRequired', { line: i + 1 }));
        return false;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        setError(t('expenses.invoices.modal.quantityRequired', { line: i + 1 }));
        return false;
      }
      if (!item.unit_id || item.unit_id === 0) {
        setError(t('expenses.invoices.modal.unitRequired', { line: i + 1 }));
        return false;
      }
      if (!item.unit_price || parseFloat(item.unit_price) < 0) {
        setError(t('expenses.invoices.modal.priceRequired', { line: i + 1 }));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentLocation || !validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && invoice) {
        // Update invoice
        const updateData: InvoiceUpdate = {
          supplier_id: supplierId!,
          invoice_number: invoiceNumber.trim() || undefined,
          invoice_date: invoiceDate,
          total_amount: totalAmount.toFixed(2),
        };
        await invoicesApi.update(invoice.id, updateData);

        // Delete old items and create new ones (simpler than diffing)
        const existingItems = await invoiceItemsApi.list(invoice.id);
        for (const item of existingItems) {
          await invoiceItemsApi.delete(item.id);
        }

        for (const item of lineItems) {
          const itemData: InvoiceItemCreate = {
            invoice_id: invoice.id,
            category_id: item.category_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes,
          };
          await invoiceItemsApi.create(itemData);
        }
      } else {
        // Create new invoice
        const createData: InvoiceCreate = {
          business_id: currentLocation.id,
          supplier_id: supplierId!,
          invoice_number: invoiceNumber.trim() || undefined,
          invoice_date: invoiceDate,
          total_amount: totalAmount.toFixed(2),
          paid_status: 'pending',
        };
        const newInvoice = await invoicesApi.create(createData);

        // Create line items
        for (const item of lineItems) {
          const itemData: InvoiceItemCreate = {
            invoice_id: newInvoice.id,
            category_id: item.category_id,
            quantity: item.quantity,
            unit_id: item.unit_id,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes,
          };
          await invoiceItemsApi.create(itemData);
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save invoice:', err);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const regularError = err as Error;
      const errorMessage = axiosError?.response?.data?.detail || regularError?.message || '';
      setError(errorMessage || (isEditing ? t('expenses.invoices.modal.updateError') : t('expenses.invoices.modal.createError')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {isEditing ? t('expenses.invoices.modal.editTitle') : t('expenses.invoices.modal.createTitle')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Invoice Header */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.supplier')} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={supplierId || ''}
                          onChange={(e) => setSupplierId(Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={loadingData}
                        >
                          <option value="">{t('expenses.invoices.modal.selectSupplier')}</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.invoiceNumber')}
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder={t('expenses.invoices.modal.invoiceNumberPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.invoiceDate')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Line Items */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.lineItems')} <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddLineItem}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          {t('expenses.invoices.modal.addItem')}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-gray-50">
                            <div className="col-span-3">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.category')}
                              </label>
                              <select
                                value={item.category_id}
                                onChange={(e) => handleLineItemChange(index, 'category_id', Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                disabled={loadingData}
                              >
                                <option value={0}>{t('expenses.invoices.modal.selectCategory')}</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.quantity')}
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                placeholder="0"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.unit')}
                              </label>
                              <select
                                value={item.unit_id}
                                onChange={(e) => handleLineItemChange(index, 'unit_id', Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                disabled={loadingData}
                              >
                                <option value={0}>{t('expenses.invoices.modal.selectUnit')}</option>
                                {getFilteredUnitsForCategory(item.category_id, categories, units).map(({ unit: baseUnit, derived }) => (
                                  <optgroup key={baseUnit.id} label={`${baseUnit.name} (${baseUnit.symbol})`}>
                                    <option value={baseUnit.id}>
                                      ✓ {baseUnit.name} ({baseUnit.symbol})
                                    </option>
                                    {derived.map((derivedUnit) => (
                                      <option key={derivedUnit.id} value={derivedUnit.id}>
                                        ↳ {derivedUnit.name} ({derivedUnit.symbol}) = {formatNumber(derivedUnit.conversion_factor)} {baseUnit.symbol}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.unitPrice')}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                placeholder="0.00"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.totalPrice')}
                              </label>
                              <input
                                type="text"
                                value={parseFloat(item.total_price).toFixed(2)}
                                disabled
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-sm font-medium text-gray-900"
                              />
                            </div>

                            <div className="col-span-1 flex items-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(index)}
                                disabled={lineItems.length === 1}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('expenses.invoices.modal.removeItem')}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{t('expenses.invoices.modal.totalAmount')}</p>
                        <p className="text-2xl font-bold text-gray-900">₽{totalAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        disabled={isLoading}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || loadingData}
                      >
                        {isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('common.saving')}
                          </span>
                        ) : (
                          t(isEditing ? 'common.update' : 'common.create')
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
