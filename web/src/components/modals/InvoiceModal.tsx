import { Fragment, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  invoicesApi,
  invoiceItemsApi,
  suppliersApi,
  expenseCategoriesApi,
  expenseSectionsApi,
  unitsApi,
  type Invoice,
  type InvoiceCreate,
  type InvoiceUpdate,
  type InvoiceItemCreate,
  type Supplier,
  type ExpenseCategory,
  type ExpenseSection,
  type Unit,
} from '~/shared/api';
import CreateExpenseModal from './CreateExpenseModal';
import SupplierModal from '~/components/modals/SupplierModal';
import { useAppContext } from '~/shared/context/AppContext';
import { Protected } from '~/shared/ui';
import { getFilteredUnitsForCategory } from '~/shared/lib/helpers/unitHelpers';
import { formatCurrency as formatCurrencyDisplay, formatNumber } from '~/shared/lib/helpers';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import Input from '~/shared/ui/Input';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null; // If provided, we're editing; otherwise, creating
  mode?: 'create' | 'edit' | 'view'; // View mode for read-only access
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
  mode,
}: InvoiceModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const actualMode = mode || (invoice ? 'edit' : 'create');
  const isViewing = actualMode === 'view';
  const isEditing = actualMode === 'edit';

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
  const [sections, setSections] = useState<ExpenseSection[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Create expense modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create supplier modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                quantity: String(parseFloat(item.quantity)), // Keep natural decimal display
                unit_id: item.unit_id,
                unit_price: String(parseFloat(item.unit_price)), // Keep natural decimal display
                total_price: String(parseFloat(item.total_price)), // Keep natural decimal display
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
      const [suppliersRes, categoriesRes, sectionsRes, unitsRes] = await Promise.all([
        suppliersApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
        expenseCategoriesApi.listByBusiness(currentLocation.id, { is_active: true, limit: 1000 }),
        expenseSectionsApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
        unitsApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
      ]);
      setSuppliers(suppliersRes.suppliers);
      setCategories(categoriesRes.categories);
      setSections(sectionsRes.sections);
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

  // Helper function to convert units to flat list with labels
  const getUnitsOptionsForCategory = (categoryId: number): SelectOption[] => {
    const filteredUnits = getFilteredUnitsForCategory(categoryId, categories, units);
    const options: SelectOption[] = [];
    
    filteredUnits.forEach(({ unit: baseUnit, derived }) => {
      // Add base unit
      options.push({
        id: baseUnit.id,
        name: `${baseUnit.name} (${baseUnit.symbol})`,
      });
      
      // Add derived units
      derived.forEach((derivedUnit) => {
        options.push({
          id: derivedUnit.id,
          name: `↳ ${derivedUnit.name} (${derivedUnit.symbol}) = ${formatNumber(derivedUnit.conversion_factor)} ${baseUnit.symbol}`,
        });
      });
    });
    
    return options;
  };

  const handleCreateSuccess = async () => {
    await loadDropdownData();
    setIsCreateModalOpen(false);
  };

  const handleSupplierCreated = async () => {
    await loadDropdownData();
    setIsSupplierModalOpen(false);
  };

  // Handler for decimal input fields (quantity, unit_price)
  const handleDecimalFieldChange = (index: number, field: keyof LineItem, value: string, maxDecimals: number = 2) => {
    // Allow only empty string or positive decimal numbers
    if (value === '') {
      handleLineItemChange(index, field, value);
      return;
    }
    
    // Check if it matches decimal pattern
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    // Check decimal places limit
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return; // Don't allow more decimal places than limit
    }
    
    handleLineItemChange(index, field, value);
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total_price when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(field === 'quantity' ? (value as string) : updated[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unit_price' ? (value as string) : updated[index].unit_price) || 0;
      // Always keep 2 decimal places for total_price
      updated[index].total_price = (quantity * unitPrice).toFixed(2);
    }

    // Auto-calculate unit_price when total_price changes
    if (field === 'total_price') {
      const quantity = parseFloat(updated[index].quantity) || 0;
      const totalPrice = parseFloat(value as string) || 0;
      if (quantity > 0) {
        // Always keep 2 decimal places for unit_price
        const calculatedPrice = totalPrice / quantity;
        updated[index].unit_price = calculatedPrice.toFixed(2);
      }
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

  const handleDelete = async () => {
    if (!invoice) return;

    setIsLoading(true);
    setError(null);

    try {
      await invoicesApi.delete(invoice.id);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to delete invoice:', err);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const regularError = err as Error;
      const errorMessage = axiosError?.response?.data?.detail || regularError?.message || '';
      setError(errorMessage || t('expenses.invoices.modal.deleteError'));
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
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
    <>
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
              <Dialog.Panel className="w-full max-w-4xl transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {isViewing ? t('expenses.invoices.modal.viewTitle') : isEditing ? t('expenses.invoices.modal.editTitle') : t('expenses.invoices.modal.createTitle')}
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
                        <div className="mt-1">
                          <SearchableSelect
                            options={suppliers.map((s) => ({ 
                              id: s.id, 
                              name: s.name,
                              subtitle: s.tax_id ? `ИНН: ${s.tax_id}` : undefined
                            }))}
                            value={suppliers.find((s) => s.id === supplierId)
                              ? { 
                                  id: supplierId!, 
                                  name: suppliers.find((s) => s.id === supplierId)!.name,
                                  subtitle: suppliers.find((s) => s.id === supplierId)!.tax_id 
                                    ? `ИНН: ${suppliers.find((s) => s.id === supplierId)!.tax_id}` 
                                    : undefined
                                }
                              : null
                            }
                            onChange={(selected: SelectOption | null) =>
                              setSupplierId(selected ? Number(selected.id) : null)
                            }
                            placeholder={t('expenses.invoices.modal.selectSupplier')}
                            searchPlaceholder={t('expenses.invoices.modal.searchSupplier')}
                            noResultsText={t('expenses.invoices.modal.noSuppliersFound')}
                            disabled={isViewing || loadingData}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.invoiceNumber')}
                        </label>
                        <div className="mt-1">
                          <Input
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder={t('expenses.invoices.modal.invoiceNumberPlaceholder')}
                            disabled={isViewing}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.invoiceDate')} <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1">
                          <Input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            disabled={isViewing}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('expenses.invoices.modal.lineItems')} <span className="text-red-500">*</span>
                        </label>
                        {!isViewing && (
                          <div className="flex items-center gap-2">
                            <Protected permission={{ resource: 'suppliers', action: 'create' }}>
                              <button
                                type="button"
                                onClick={() => setIsSupplierModalOpen(true)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                {t('billing.suppliers.create')}
                              </button>
                            </Protected>
                            <Protected anyOf={[
                              { resource: 'categories', action: 'create' },
                              { resource: 'subcategories', action: 'create' }
                            ]}>
                              <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                {t('expenses.categories.addCategory')}
                              </button>
                            </Protected>
                            <button
                              type="button"
                              onClick={handleAddLineItem}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              {t('expenses.invoices.modal.addItem')}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Scrollable Line Items Container */}
                      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-gray-50">
                            <div className="col-span-3">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.category')}
                              </label>
                              <div className="mt-1">
                                <SearchableSelect
                                  options={categories.map((cat) => {
                                    const section = sections.find((sec) => sec.id === cat.section_id);
                                    return {
                                      id: cat.id,
                                      name: cat.name,
                                      subtitle: section?.name
                                    };
                                  })}
                                  value={item.category_id ? (() => {
                                    const category = categories.find((cat) => cat.id === item.category_id);
                                    const section = sections.find((sec) => sec.id === category?.section_id);
                                    return category ? {
                                      id: category.id,
                                      name: category.name,
                                      subtitle: section?.name
                                    } : null;
                                  })() : null
                                  }
                                  onChange={(selected: SelectOption | null) => 
                                    handleLineItemChange(index, 'category_id', selected ? Number(selected.id) : 0)
                                  }
                                  placeholder={t('expenses.invoices.modal.selectCategory')}
                                  searchPlaceholder={t('expenses.invoices.modal.searchCategory')}
                                  noResultsText={t('expenses.invoices.modal.noCategoriesFound')}
                                  disabled={isViewing || loadingData}
                                />
                              </div>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.quantity')}
                              </label>
                              <div className="mt-1">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.quantity}
                                  onChange={(e) => handleDecimalFieldChange(index, 'quantity', e.target.value, 3)}
                                  placeholder="0"
                                  disabled={isViewing}
                                />
                              </div>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.unit')}
                              </label>
                              <div className="mt-1">
                                <SearchableSelect
                                  options={getUnitsOptionsForCategory(item.category_id)}
                                  value={
                                    item.unit_id 
                                      ? getUnitsOptionsForCategory(item.category_id).find((opt) => opt.id === item.unit_id) || null
                                      : null
                                  }
                                  onChange={(selected: SelectOption | null) =>
                                    handleLineItemChange(index, 'unit_id', selected ? Number(selected.id) : 0)
                                  }
                                  placeholder={t('expenses.invoices.modal.selectUnit')}
                                  searchPlaceholder={t('expenses.invoices.modal.searchUnit')}
                                  noResultsText={t('expenses.invoices.modal.noUnitsFound')}
                                  disabled={isViewing || loadingData || !item.category_id}
                                  truncateOptions={false}
                                />
                              </div>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.unitPrice')}
                              </label>
                              <div className="mt-1">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.unit_price}
                                  onChange={(e) => handleDecimalFieldChange(index, 'unit_price', e.target.value, 2)}
                                  placeholder="0.00"
                                  disabled={isViewing}
                                />
                              </div>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600">
                                {t('expenses.invoices.modal.totalPrice')}
                              </label>
                              <div className="mt-1">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.total_price}
                                  onChange={(e) => handleDecimalFieldChange(index, 'total_price', e.target.value, 2)}
                                  placeholder="0.00"
                                  disabled={isViewing}
                                  className="font-medium text-gray-900"
                                />
                              </div>
                            </div>

                            {!isViewing && (
                              <div className="col-span-1 flex items-end justify-center h-full">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(index)}
                                  disabled={lineItems.length === 1}
                                  className="p-2 mb-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('expenses.invoices.modal.removeItem')}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{t('expenses.invoices.modal.totalAmount')}</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrencyDisplay(totalAmount)}</p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        {isEditing && !isViewing && invoice && (
                          <Protected permission={{ resource: 'invoices', action: 'delete' }}>
                            {!showDeleteConfirm ? (
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                                disabled={isLoading}
                              >
                                {t('common.delete')}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{t('common.confirmDelete')}?</span>
                                <button
                                  type="button"
                                  onClick={handleDelete}
                                  className="px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                                  disabled={isLoading}
                                >
                                  {t('common.yes')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                  disabled={isLoading}
                                >
                                  {t('common.no')}
                                </button>
                              </div>
                            )}
                          </Protected>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                          disabled={isLoading}
                        >
                          {isViewing ? t('common.close') : t('common.cancel')}
                        </button>
                        {!isViewing && (
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
                        )}
                      </div>
                    </div>
                  </div>
                </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>

    {/* Create Expense Modal (Section or Category) */}
    <CreateExpenseModal
      isOpen={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      onSuccess={handleCreateSuccess}
      sections={sections}
    />

    {/* Create Supplier Modal */}
    <SupplierModal
      isOpen={isSupplierModalOpen}
      onClose={() => setIsSupplierModalOpen(false)}
      onSave={handleSupplierCreated}
      businessId={currentLocation?.id}
    />
    </>
  );
}
