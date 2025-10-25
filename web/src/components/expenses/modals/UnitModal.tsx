import { Fragment, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { unitsApi, type Unit, type UnitCreate, type UnitUpdate, type UnitType } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit?: Unit | null; // If provided, we're editing; otherwise, creating
}

export default function UnitModal({
  isOpen,
  onClose,
  onSuccess,
  unit = null,
}: UnitModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const isEditing = Boolean(unit);

  // Form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('weight');
  const [baseUnitId, setBaseUnitId] = useState<number | null>(null);
  const [conversionFactor, setConversionFactor] = useState('1');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseUnits, setBaseUnits] = useState<Unit[]>([]);
  const [loadingBaseUnits, setLoadingBaseUnits] = useState(false);

  // Initialize form with unit data when editing
  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setSymbol(unit.symbol);
      setUnitType(unit.unit_type);
      setBaseUnitId(unit.base_unit_id || null);
      setConversionFactor(unit.conversion_factor || '1');
      setDescription(unit.description || '');
      setIsActive(unit.is_active);
    } else {
      // Reset form when creating new
      setName('');
      setSymbol('');
      setUnitType('weight');
      setBaseUnitId(null);
      setConversionFactor('1');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [unit, isOpen]);

  const loadBaseUnits = useCallback(async () => {
    if (!currentLocation) return;

    setLoadingBaseUnits(true);
    try {
      const response = await unitsApi.list({
        business_id: currentLocation.id,
        unit_type: unitType,
        is_active: true,
      });
      // Filter to get only base units (those without base_unit_id)
      const bases = response.units.filter(u => !u.base_unit_id);
      setBaseUnits(bases);
    } catch (err) {
      console.error('Failed to load base units:', err);
    } finally {
      setLoadingBaseUnits(false);
    }
  }, [currentLocation, unitType]);

  // Load base units when modal opens
  useEffect(() => {
    if (isOpen && currentLocation) {
      loadBaseUnits();
    }
  }, [isOpen, currentLocation, loadBaseUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentLocation) {
      setError(t('expenses.units.modal.businessNotSelected'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && unit) {
        // Update existing unit
        const updateData: UnitUpdate = {
          name: name.trim(),
          symbol: symbol.trim(),
          unit_type: unitType,
          base_unit_id: baseUnitId || undefined,
          conversion_factor: baseUnitId ? conversionFactor : '1',
          description: description.trim() || undefined,
          is_active: isActive,
        };
        
        await unitsApi.update(unit.id, updateData);
      } else {
        // Create new unit
        const createData: UnitCreate = {
          name: name.trim(),
          symbol: symbol.trim(),
          unit_type: unitType,
          business_id: currentLocation.id,
          base_unit_id: baseUnitId || undefined,
          conversion_factor: baseUnitId ? conversionFactor : '1',
          description: description.trim() || undefined,
          is_active: true,
        };
        
        await unitsApi.create(createData);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save unit:', err);
      setError(
        isEditing
          ? t('expenses.units.modal.updateError')
          : t('expenses.units.modal.createError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const unitTypes: UnitType[] = ['weight', 'volume', 'count'];

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
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {isEditing
                      ? t('expenses.units.modal.edit.title')
                      : t('expenses.units.modal.add.title')}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="unit-name" className="block text-sm font-medium text-gray-700">
                      {t('expenses.units.modal.nameLabel')} *
                    </label>
                    <input
                      type="text"
                      id="unit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('expenses.units.modal.namePlaceholder')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                      minLength={1}
                      maxLength={100}
                    />
                  </div>

                  {/* Symbol */}
                  <div>
                    <label htmlFor="unit-symbol" className="block text-sm font-medium text-gray-700">
                      {t('expenses.units.modal.symbolLabel')} *
                    </label>
                    <input
                      type="text"
                      id="unit-symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder={t('expenses.units.modal.symbolPlaceholder')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                      minLength={1}
                      maxLength={10}
                    />
                  </div>

                  {/* Unit Type */}
                  <div>
                    <label htmlFor="unit-type" className="block text-sm font-medium text-gray-700">
                      {t('expenses.units.modal.unitTypeLabel')} *
                    </label>
                    <select
                      id="unit-type"
                      value={unitType}
                      onChange={(e) => {
                        setUnitType(e.target.value as UnitType);
                        setBaseUnitId(null); // Reset base unit when type changes
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      {unitTypes.map((type) => (
                        <option key={type} value={type}>
                          {t(`expenses.units.unitTypes.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Unit */}
                  <div>
                    <label htmlFor="base-unit" className="block text-sm font-medium text-gray-700">
                      {t('expenses.units.modal.baseUnitLabel')}
                    </label>
                    <select
                      id="base-unit"
                      value={baseUnitId || ''}
                      onChange={(e) => setBaseUnitId(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      disabled={loadingBaseUnits}
                    >
                      <option value="">{t('expenses.units.modal.baseUnitDescription')}</option>
                      {baseUnits.map((baseUnit) => (
                        <option key={baseUnit.id} value={baseUnit.id}>
                          {baseUnit.name} ({baseUnit.symbol})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('expenses.units.modal.baseUnitDescription')}
                    </p>
                  </div>

                  {/* Conversion Factor (only if base unit is selected) */}
                  {baseUnitId && (
                    <div>
                      <label htmlFor="conversion-factor" className="block text-sm font-medium text-gray-700">
                        {t('expenses.units.modal.conversionFactorLabel')} *
                      </label>
                      <input
                        type="number"
                        id="conversion-factor"
                        value={conversionFactor}
                        onChange={(e) => setConversionFactor(e.target.value)}
                        step="0.0001"
                        min="0.0001"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {t('expenses.units.modal.conversionFactorDescription')}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label htmlFor="unit-description" className="block text-sm font-medium text-gray-700">
                      {t('expenses.units.modal.descriptionLabel')}
                    </label>
                    <textarea
                      id="unit-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('expenses.units.modal.descriptionPlaceholder')}
                      rows={3}
                      maxLength={500}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Active Status (only when editing) */}
                  {isEditing && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="unit-active"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="unit-active" className="ml-2 block text-sm text-gray-700">
                        {t('expenses.units.modal.activeLabel')}
                      </label>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      disabled={isLoading}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isEditing ? t('expenses.units.modal.updating') : t('expenses.units.modal.creating')}
                        </>
                      ) : (
                        isEditing
                          ? t('expenses.units.modal.edit.saveButton')
                          : t('expenses.units.modal.add.createButton')
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
