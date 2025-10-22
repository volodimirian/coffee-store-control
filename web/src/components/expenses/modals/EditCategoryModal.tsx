import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { expenseCategoriesApi, unitsApi, type ExpenseCategoryUpdate, type ExpenseCategory, type Unit } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: ExpenseCategory | null;
  onCategoryUpdated?: (category: ExpenseCategory) => void;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  category,
  onCategoryUpdated,
}: EditCategoryModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    default_unit_id: 0,
    order_index: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const { currentLocation } = useAppContext();

  // Initialize form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        default_unit_id: category.default_unit_id || 0,
        order_index: category.order_index || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    }
  }, [category]);

  // Load units when modal opens
  useEffect(() => {
    const loadUnits = async () => {
      if (!currentLocation?.id) return;

      setIsLoadingUnits(true);
      try {
        const response = await unitsApi.list({
          business_id: currentLocation.id,
          is_active: true,
          limit: 100,
        });
        setUnits(response.units);
      } catch (err) {
        console.error('Error loading units:', err);
        setError(t('expenses.modals.editCategory.unitsLoadError'));
      } finally {
        setIsLoadingUnits(false);
      }
    };

    if (isOpen && currentLocation?.id) {
      loadUnits();
    }
  }, [isOpen, currentLocation?.id, t]);

  const handleClose = () => {
    setFormData({ name: '', default_unit_id: 0, order_index: 0, is_active: true });
    setErrors({});
    setError(null);
    onClose();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!currentLocation?.id) {
      newErrors.business = t('expenses.modals.editCategory.selectBusinessFirst');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('expenses.modals.editCategory.nameRequired');
    } else if (formData.name.trim().length < 1) {
      newErrors.name = t('expenses.modals.editCategory.nameMinLength');
    } else if (formData.name.trim().length > 200) {
      newErrors.name = t('expenses.modals.editCategory.nameMaxLength');
    }

    if (!formData.default_unit_id || formData.default_unit_id <= 0) {
      newErrors.default_unit_id = t('expenses.modals.editCategory.unitRequired');
    }

    if (formData.order_index < 0) {
      newErrors.order_index = t('expenses.modals.editCategory.orderIndexValidation');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !category) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData: ExpenseCategoryUpdate = {
        name: formData.name.trim(),
        default_unit_id: formData.default_unit_id,
        order_index: formData.order_index,
        is_active: formData.is_active,
      };

      const updatedCategory = await expenseCategoriesApi.update(category.id, updateData);
      
      if (onCategoryUpdated) {
        onCategoryUpdated(updatedCategory);
      }

      handleClose();
    } catch (err) {
      console.error('Error updating category:', err);
      setError(
        err instanceof Error ? err.message : t('expenses.modals.editCategory.updateError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!category) {
    return null;
  }

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {t('expenses.modals.editCategory.title')}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  {/* Category Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      {t('expenses.modals.editCategory.nameLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder={t('expenses.modals.editCategory.namePlaceholder')}
                        autoComplete="off"
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Default Unit */}
                  <div>
                    <label htmlFor="default_unit_id" className="block text-sm font-medium text-gray-700">
                      {t('expenses.modals.editCategory.unitLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <select
                        id="default_unit_id"
                        value={formData.default_unit_id}
                        onChange={(e) => setFormData({ ...formData, default_unit_id: parseInt(e.target.value) || 0 })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        disabled={isLoadingUnits}
                      >
                        <option value={0}>
                          {isLoadingUnits ? t('common.loading') : t('expenses.modals.editCategory.selectUnit')}
                        </option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.symbol})
                          </option>
                        ))}
                      </select>
                      {errors.default_unit_id && (
                        <p className="mt-2 text-sm text-red-600">{errors.default_unit_id}</p>
                      )}
                    </div>
                    {units.length === 0 && !isLoadingUnits && (
                      <p className="mt-1 text-xs text-amber-600">
                        {t('expenses.modals.editCategory.noUnitsWarning')}
                      </p>
                    )}
                  </div>

                  {/* Order Index */}
                  <div>
                    <label htmlFor="order_index" className="block text-sm font-medium text-gray-700">
                      {t('expenses.modals.editCategory.orderLabel')}
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="order_index"
                        min="0"
                        value={formData.order_index}
                        onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0"
                      />
                      {errors.order_index && (
                        <p className="mt-2 text-sm text-red-600">{errors.order_index}</p>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('expenses.modals.editCategory.orderDescription')}
                    </p>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('expenses.modals.editCategory.activeLabel')}
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('expenses.modals.editCategory.activeDescription')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || units.length === 0}
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('common.saving')}
                        </>
                      ) : (
                        <>
                          <PencilIcon className="h-4 w-4 mr-2" />
                          {t('expenses.modals.editCategory.saveButton')}
                        </>
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