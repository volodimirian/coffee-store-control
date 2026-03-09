import { Fragment, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { techCardsApi, unitsApi } from '~/shared/api';
import type { StartingInventoryCreate, StartingInventoryWithCalculated } from '~/shared/api/techCardsApi';
import type { ExpenseCategory, Unit } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import { Input } from '~/shared/ui';
import { formatNumber } from '~/shared/lib/helpers';

interface StartingInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  categories: ExpenseCategory[];
  onSave: () => void;
}

interface FormData {
  [categoryId: number]: {
    quantity: string;
    unit_id: number;
    notes?: string;
  };
}

export default function StartingInventoryModal({
  isOpen,
  onClose,
  year,
  month,
  categories,
  onSave,
}: StartingInventoryModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<StartingInventoryWithCalculated[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [error, setError] = useState<string | null>(null);
  const [categoryUnits, setCategoryUnits] = useState<Map<number, Unit>>(new Map());

  const loadUnits = useCallback(async () => {
    const unitsMap = new Map<number, Unit>();
    
    for (const category of categories) {
      try {
        const unit = await unitsApi.get(category.default_unit_id);
        if (unit) {
          unitsMap.set(category.id, unit);
        }
      } catch (err) {
        console.error(`Failed to load unit for category ${category.id}:`, err);
      }
    }
    
    setCategoryUnits(unitsMap);
  }, [categories]);

  const loadExistingData = useCallback(async () => {
    if (!currentLocation) return;
    
    try {
      const data = await techCardsApi.getStartingInventoryForMonth(
        currentLocation.id,
        year,
        month
      );
      setExistingData(data);
      
      // Pre-fill form with existing values
      const initialForm: FormData = {};
      data.forEach((item: StartingInventoryWithCalculated) => {
        initialForm[item.category_id] = {
          quantity: item.quantity,
          unit_id: item.unit_id,
          notes: item.notes,
        };
      });
      setFormData(initialForm);
    } catch (err) {
      console.error('Failed to load starting inventory:', err);
      setError(t('errors.failedToLoad'));
    }
  }, [currentLocation, year, month, t]);

  useEffect(() => {
    if (isOpen && currentLocation) {
      loadExistingData();
      loadUnits();
    }
  }, [isOpen, currentLocation, loadExistingData, loadUnits]);

  const handleQuantityChange = (categoryId: number, quantity: string, unitId: number) => {
    setFormData(prev => ({
      ...prev,
      [categoryId]: {
        quantity,
        unit_id: unitId,
        notes: prev[categoryId]?.notes || '',
      },
    }));
  };

  const handleNotesChange = (categoryId: number, notes: string) => {
    setFormData(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        quantity: prev[categoryId]?.quantity || '',
        unit_id: prev[categoryId]?.unit_id || 0,
        notes,
      },
    }));
  };

  const handleSave = async () => {
    if (!currentLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare items to save (only those with quantity > 0)
      const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const items: StartingInventoryCreate[] = Object.entries(formData)
        .filter(([, data]) => parseFloat(data.quantity) > 0)
        .map(([categoryId, data]) => ({
          category_id: parseInt(categoryId),
          quantity: data.quantity,
          unit_id: data.unit_id,
          inventory_date: firstDay,
          notes: data.notes || undefined,
        }));
      
      if (items.length > 0) {
        await techCardsApi.bulkUpsertStartingInventory(
          currentLocation.id,
          year,
          month,
          items
        );
        onSave();
        onClose();
      } else {
        setError(t('expenses.startingInventory.noDataToSave'));
      }
    } catch (err) {
      console.error('Failed to save starting inventory:', err);
      setError(t('errors.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setExistingData([]);
    setError(null);
    onClose();
  };

  const getExistingForCategory = (categoryId: number): StartingInventoryWithCalculated | undefined => {
    return existingData.find(item => item.category_id === categoryId);
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
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                      {t('expenses.startingInventory.setStartingInventory')}
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('expenses.startingInventory.monthYear', { month, year })}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {categories.map(category => {
                      const existing = getExistingForCategory(category.id);
                      const hasDiscrepancy = existing && parseFloat(existing.discrepancy) !== 0;
                      const unit = categoryUnits.get(category.id);
                      
                      return (
                        <div
                          key={category.id}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{category.name}</h3>
                              {existing && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {t('expenses.startingInventory.calculated')}:{' '}
                                  {formatNumber(parseFloat(existing.calculated_quantity))}{' '}
                                  {existing.unit_symbol}
                                </div>
                              )}
                            </div>
                            {hasDiscrepancy && (
                              <div className="flex items-center text-xs text-amber-600">
                                <ExclamationTriangleIcon className="mr-1 h-4 w-4" />
                                {t('expenses.startingInventory.discrepancy')}:{' '}
                                {formatNumber(parseFloat(existing.discrepancy))}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                {t('expenses.startingInventory.actualQuantity')}
                              </label>
                              <Input
                                type="number"
                                step="0.001"
                                value={formData[category.id]?.quantity || ''}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    category.id,
                                    e.target.value,
                                    category.default_unit_id
                                  )
                                }
                                placeholder="0.000"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                {t('common.unit')}
                              </label>
                              <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                                {unit?.symbol || unit?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              {t('common.notes')} ({t('common.optional')})
                            </label>
                            <Input
                              type="text"
                              value={formData[category.id]?.notes || ''}
                              onChange={(e) =>
                                handleNotesChange(category.id, e.target.value)
                              }
                              placeholder={t('expenses.startingInventory.notesPlaceholder')}
                              maxLength={500}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={handleClose}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? t('common.saving') : t('common.saveAll')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
