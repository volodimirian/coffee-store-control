import { Fragment, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { techCardsApi, type TechCardItem, type TechCardItemCreate, type TechCardItemUpdate, type TechCardItemIngredient } from '~/shared/api/techCardsApi';
import { expenseCategoriesApi } from '~/shared/api/expenses';
import { unitsApi } from '~/shared/api/expenses';
import type { ExpenseCategory, Unit } from '~/shared/api/types';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import { Input } from '~/shared/ui';
import { getFilteredUnitsForCategory } from '~/shared/lib/helpers/unitHelpers';

interface TechCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: TechCardItem | null;
  mode: 'create' | 'edit' | 'view';
}

interface IngredientRow extends TechCardItemIngredient {
  tempId: string;
}

export default function TechCardModal({ isOpen, onClose, onSuccess, item, mode }: TechCardModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const isViewing = mode === 'view';
  const isEditMode = mode === 'edit';

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selling_price: '',
    is_active: true,
  });

  // Ingredients
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // Dropdown data
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dropdown data
  const loadDropdownData = useCallback(async () => {
    if (!currentLocation?.id) return;

    setLoadingData(true);
    setError(null);

    try {
      const [categoriesRes, unitsRes] = await Promise.all([
        expenseCategoriesApi.listByBusiness(currentLocation.id, { is_active: true, limit: 1000 }),
        unitsApi.list({ business_id: currentLocation.id, is_active: true, limit: 1000 }),
      ]);
      setCategories(categoriesRes.categories);
      setUnits(unitsRes.units);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setError(t('techCards.modal.loadDataError'));
    } finally {
      setLoadingData(false);
    }
  }, [currentLocation, t]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen, loadDropdownData]);

  // Populate form when editing
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name,
        description: item.description || '',
        selling_price: item.selling_price.toString(),
        is_active: item.is_active,
      });
      setIngredients(
        item.ingredients.map((ing, idx) => ({
          ...ing,
          tempId: `${idx}-${Date.now()}`,
        }))
      );
    } else if (!item && isOpen) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        selling_price: '',
        is_active: true,
      });
      setIngredients([]);
    }
  }, [item, isOpen]);

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        ingredient_category_id: 0,
        quantity: 0,
        unit_id: 0,
        notes: '',
        sort_order: ingredients.length,
        tempId: `new-${Date.now()}`,
      },
    ]);
  };

  const handleRemoveIngredient = (tempId: string) => {
    setIngredients(ingredients.filter((ing) => ing.tempId !== tempId));
  };

  const handleIngredientChange = (tempId: string, field: keyof TechCardItemIngredient, value: unknown) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.tempId === tempId ? { ...ing, [field]: value } : ing
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation?.id || isViewing) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name.trim()) {
        setError(t('techCards.modal.errors.nameRequired'));
        return;
      }
      if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
        setError(t('techCards.modal.errors.priceRequired'));
        return;
      }
      if (ingredients.length === 0) {
        setError(t('techCards.modal.errors.ingredientsRequired'));
        return;
      }

      // Validate ingredients
      for (const ing of ingredients) {
        if (!ing.ingredient_category_id || ing.ingredient_category_id === 0) {
          setError(t('techCards.modal.errors.ingredientCategoryRequired'));
          return;
        }
        if (!ing.quantity || ing.quantity <= 0) {
          setError(t('techCards.modal.errors.ingredientQuantityRequired'));
          return;
        }
        if (!ing.unit_id || ing.unit_id === 0) {
          setError(t('techCards.modal.errors.ingredientUnitRequired'));
          return;
        }
      }

      const ingredientsData: TechCardItemIngredient[] = ingredients.map((ing, idx) => ({
        ingredient_category_id: ing.ingredient_category_id,
        quantity: ing.quantity,
        unit_id: ing.unit_id,
        notes: ing.notes || undefined,
        sort_order: idx,
      }));

      if (isEditMode && item) {
        const updateData: TechCardItemUpdate = {
          name: formData.name,
          description: formData.description || undefined,
          selling_price: parseFloat(formData.selling_price),
          is_active: formData.is_active,
          ingredients: ingredientsData,
        };
        await techCardsApi.updateItem(currentLocation.id, item.id, updateData);
      } else {
        const createData: TechCardItemCreate = {
          name: formData.name,
          description: formData.description || undefined,
          selling_price: parseFloat(formData.selling_price),
          is_active: true,
          ingredients: ingredientsData,
        };
        await techCardsApi.createItem(currentLocation.id, createData);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save tech card item:', err);
      setError(t('techCards.modal.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isViewing ? onClose : () => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {isViewing
                      ? t('techCards.modal.viewTitle')
                      : isEditMode
                      ? t('techCards.modal.editTitle')
                      : t('techCards.modal.createTitle')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md p-1 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-6 mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t('techCards.fields.name')} <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1"
                            disabled={isViewing || loadingData}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {t('techCards.fields.sellingPrice')} <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.selling_price}
                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                            className="mt-1"
                            disabled={isViewing || loadingData}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('techCards.fields.description')}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={isViewing || loadingData}
                        />
                      </div>

                      {isEditMode && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={isViewing || loadingData}
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            {t('techCards.fields.isActive')}
                          </label>
                        </div>
                      )}

                      {/* Ingredients */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            {t('techCards.ingredients.title')} <span className="text-red-500">*</span>
                          </label>
                          {!isViewing && (
                            <button
                              type="button"
                              onClick={handleAddIngredient}
                              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                              disabled={loadingData}
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              {t('techCards.ingredients.add')}
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {ingredients.map((ing) => (
                            <div
                              key={ing.tempId}
                              className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="col-span-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('techCards.ingredients.ingredient')}
                                </label>
                                <SearchableSelect
                                  options={categories.map((cat) => ({
                                    id: cat.id,
                                    name: cat.name,
                                  }))}
                                  value={
                                    ing.ingredient_category_id
                                      ? categories.find((c) => c.id === ing.ingredient_category_id)
                                        ? {
                                            id: ing.ingredient_category_id,
                                            name: categories.find((c) => c.id === ing.ingredient_category_id)!.name,
                                          }
                                        : null
                                      : null
                                  }
                                  onChange={(selected: SelectOption | null) =>
                                    handleIngredientChange(
                                      ing.tempId,
                                      'ingredient_category_id',
                                      selected ? Number(selected.id) : 0
                                    )
                                  }
                                  placeholder={t('techCards.modal.selectIngredient')}
                                  searchPlaceholder={t('techCards.modal.searchIngredient')}
                                  noResultsText={t('techCards.modal.noIngredientsFound')}
                                  disabled={isViewing || loadingData}
                                />
                              </div>

                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('techCards.ingredients.quantity')}
                                </label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={ing.quantity || ''}
                                  onChange={(e) =>
                                    handleIngredientChange(ing.tempId, 'quantity', parseFloat(e.target.value) || 0)
                                  }
                                  disabled={isViewing || loadingData}
                                />
                              </div>

                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('techCards.ingredients.unit')}
                                </label>
                                <SearchableSelect
                                  options={
                                    ing.ingredient_category_id
                                      ? getFilteredUnitsForCategory(ing.ingredient_category_id, categories, units)
                                          .flatMap((g) => [g.unit, ...g.derived])
                                          .map((unit) => ({
                                            id: unit.id,
                                            name: `${unit.name} (${unit.symbol})`,
                                          }))
                                      : []
                                  }
                                  value={
                                    ing.unit_id
                                      ? units.find((u) => u.id === ing.unit_id)
                                        ? {
                                            id: ing.unit_id,
                                            name: `${units.find((u) => u.id === ing.unit_id)!.name} (${units.find((u) => u.id === ing.unit_id)!.symbol})`,
                                          }
                                        : null
                                      : null
                                  }
                                  onChange={(selected: SelectOption | null) =>
                                    handleIngredientChange(ing.tempId, 'unit_id', selected ? Number(selected.id) : 0)
                                  }
                                  placeholder={t('techCards.modal.selectUnit')}
                                  searchPlaceholder={t('techCards.modal.searchUnit')}
                                  noResultsText={t('techCards.modal.noUnitsFound')}
                                  disabled={isViewing || loadingData || !ing.ingredient_category_id}
                                />
                              </div>

                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('techCards.ingredients.notes')}
                                </label>
                                <Input
                                  type="text"
                                  value={ing.notes || ''}
                                  onChange={(e) =>
                                    handleIngredientChange(ing.tempId, 'notes', e.target.value)
                                  }
                                  disabled={isViewing || loadingData}
                                  placeholder={t('techCards.modal.optionalNotes')}
                                />
                              </div>

                              {!isViewing && (
                                <div className="col-span-1 flex items-end justify-center pb-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIngredient(ing.tempId)}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                    disabled={loadingData}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {ingredients.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm border border-dashed rounded-lg">
                              {t('techCards.modal.noIngredients')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      {isViewing ? t('common.close') : t('common.cancel')}
                    </button>
                    {!isViewing && (
                      <button
                        type="submit"
                        disabled={isSubmitting || loadingData}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? t('common.saving') : isEditMode ? t('common.save') : t('common.create')}
                      </button>
                    )}
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
