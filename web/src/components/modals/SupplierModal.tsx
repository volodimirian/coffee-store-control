import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { 
  suppliersApi, 
  type SupplierCreate, 
  type SupplierUpdate, 
  type Supplier 
} from '~/shared/api';
import { PhoneInput } from '~/shared/ui';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  supplier?: Supplier | null;
  businessId?: number;
}

export default function SupplierModal({
  isOpen,
  onClose,
  onSave,
  supplier,
  businessId,
}: SupplierModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '', // Отдельное поле для ИНН
    payment_terms_days: 14,
    is_active: true,
    contact_info: {
      phone: '',
      email: '',
      address: '',
      website: '',
      notes: '',
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!supplier;

  // Reset form when modal opens/closes or supplier changes
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          name: supplier.name,
          tax_id: supplier.tax_id === '0000000000000' ? '' : supplier.tax_id, // Очищаем дефолтное значение
          payment_terms_days: supplier.payment_terms_days,
          is_active: supplier.is_active,
          contact_info: {
            phone: supplier.contact_info?.phone || '',
            email: supplier.contact_info?.email || '',
            address: supplier.contact_info?.address || '',
            website: supplier.contact_info?.website || '',
            notes: supplier.contact_info?.notes || '',
          },
        });
      } else {
        setFormData({
          name: '',
          tax_id: '',
          payment_terms_days: 14,
          is_active: true,
          contact_info: {
            phone: '',
            email: '',
            address: '',
            website: '',
            notes: '',
          },
        });
      }
      setError(null);
      setErrors({});
    }
  }, [isOpen, supplier]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('billing.suppliers.validation.nameRequired');
    }

    if (!formData.tax_id.trim()) {
      newErrors.tax_id = t('billing.suppliers.validation.taxIdRequired');
    }

    if (formData.payment_terms_days < 1 || formData.payment_terms_days > 365) {
      newErrors.payment_terms_days = t('billing.suppliers.validation.paymentTermsRange');
    }

    if (formData.contact_info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_info.email)) {
      newErrors.email = t('billing.suppliers.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!businessId && !isEditMode) {
      setError(t('billing.suppliers.validation.businessRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clean up contact_info - remove empty fields
      const contactInfo = Object.entries(formData.contact_info)
        .filter(([, value]) => value.trim() !== '')
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

      if (isEditMode && supplier) {
        const updateData: SupplierUpdate = {
          name: formData.name.trim(),
          tax_id: formData.tax_id.trim(),
          payment_terms_days: formData.payment_terms_days,
          is_active: formData.is_active,
          contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
        };

        await suppliersApi.update(supplier.id, updateData);
      } else {
        const createData: SupplierCreate = {
          name: formData.name.trim(),
          tax_id: formData.tax_id.trim(),
          business_id: businessId!,
          payment_terms_days: formData.payment_terms_days,
          is_active: formData.is_active,
          contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
        };

        await suppliersApi.create(createData);
      }

      onSave();
    } catch (err: unknown) {
      console.error('Failed to save supplier:', err);
      
      // Type guard for axios error
      const isAxiosError = (error: unknown): error is { response?: { data?: { detail?: string } } } => {
        return typeof error === 'object' && error !== null && 'response' in error;
      };
      
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          isEditMode 
            ? t('billing.suppliers.updateError')
            : t('billing.suppliers.createError')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {isEditMode 
                      ? t('billing.suppliers.editTitle') 
                      : t('billing.suppliers.createTitle')
                    }
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      {t('billing.suppliers.basicInfo')}
                    </h4>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('billing.suppliers.name')} *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors.name ? 'border-red-300' : ''
                        }`}
                        placeholder={t('billing.suppliers.namePlaceholder')}
                        disabled={isLoading}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    {/* ИНН */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('billing.suppliers.taxId')} *
                      </label>
                      <input
                        type="text"
                        value={formData.tax_id}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          tax_id: e.target.value
                        }))}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors.tax_id ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder={t('billing.suppliers.taxIdPlaceholder')}
                        disabled={isLoading}
                        required
                      />
                      {errors.tax_id && (
                        <p className="mt-1 text-sm text-red-600">{errors.tax_id}</p>
                      )}
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('billing.suppliers.paymentTerms')} *
                      </label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={formData.payment_terms_days}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            payment_terms_days: parseInt(e.target.value) || 1 
                          }))}
                          className={`block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                            errors.payment_terms_days ? 'border-red-300' : ''
                          }`}
                          disabled={isLoading}
                        />
                        <span className="ml-2 text-sm text-gray-500">
                          {t('billing.suppliers.days')}
                        </span>
                      </div>
                      {errors.payment_terms_days && (
                        <p className="mt-1 text-sm text-red-600">{errors.payment_terms_days}</p>
                      )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        {t('billing.suppliers.isActive')}
                      </label>
                    </div>
                  </div>

                  {/* Additional Information - Collapsible */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAdditionalInfoExpanded(!isAdditionalInfoExpanded)}
                      className="flex items-center justify-between w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      <span className="text-sm font-medium text-blue-600">
                        {t('billing.suppliers.additionalInfo')}
                      </span>
                      <ChevronDownIcon 
                        className={`h-5 w-5 text-blue-600 transition-transform duration-200 ${
                          isAdditionalInfoExpanded ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isAdditionalInfoExpanded && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('billing.suppliers.phone')}
                        </label>
                        <PhoneInput
                          value={formData.contact_info.phone}
                          onChange={(value) => setFormData(prev => ({ 
                            ...prev, 
                            contact_info: { ...prev.contact_info, phone: value }
                          }))}
                          placeholder={t('billing.suppliers.phonePlaceholder')}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('billing.suppliers.email')}
                        </label>
                        <input
                          type="email"
                          value={formData.contact_info.email}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            contact_info: { ...prev.contact_info, email: e.target.value }
                          }))}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                            errors.email ? 'border-red-300' : ''
                          }`}
                          placeholder={t('billing.suppliers.emailPlaceholder')}
                          disabled={isLoading}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('billing.suppliers.website')}
                      </label>
                      <input
                        type="url"
                        value={formData.contact_info.website}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          contact_info: { ...prev.contact_info, website: e.target.value }
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder={t('billing.suppliers.websitePlaceholder')}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('billing.suppliers.address')}
                      </label>
                      <textarea
                        rows={2}
                        value={formData.contact_info.address}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          contact_info: { ...prev.contact_info, address: e.target.value }
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder={t('billing.suppliers.addressPlaceholder')}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t('billing.suppliers.notes')}
                          </label>
                          <textarea
                            rows={3}
                            value={formData.contact_info.notes}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              contact_info: { ...prev.contact_info, notes: e.target.value }
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder={t('billing.suppliers.notesPlaceholder')}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('common.saving')}
                        </div>
                      ) : (
                        isEditMode ? t('common.save') : t('common.create')
                      )}
                    </button>
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
