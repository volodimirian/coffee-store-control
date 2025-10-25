import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { unitsApi, type Unit } from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import { getShowInactivePreference, setShowInactivePreference } from '~/shared/lib/helpers';
import UnitModal from '~/components/expenses/modals/UnitModal';
import ConfirmDeleteModal from '~/components/expenses/modals/ConfirmDeleteModal';

interface BaseUnitGroup {
  baseUnit: Unit | null; // null for standalone units without base
  derivedUnits: Unit[];
}

export default function UnitsTab() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(() => getShowInactivePreference());

  // Modal states
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load units
  const loadUnits = useCallback(async () => {
    if (!currentLocation) {
      setError(t('expenses.units.loadingError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await unitsApi.list({
        business_id: currentLocation.id,
        is_active: showInactive ? undefined : true,
        limit: 1000,
      });
      setUnits(response.units);
    } catch (err) {
      console.error('Failed to load units:', err);
      setError(t('expenses.units.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, showInactive, t]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Group units by base unit
  const groupedUnits = useCallback((): BaseUnitGroup[] => {
    const baseUnitsMap = new Map<number | null, BaseUnitGroup>();

    // First pass: create groups for base units
    units.forEach(unit => {
      if (!unit.base_unit_id) {
        // This is a base unit
        if (!baseUnitsMap.has(unit.id)) {
          baseUnitsMap.set(unit.id, {
            baseUnit: unit,
            derivedUnits: [],
          });
        }
      }
    });

    // Second pass: add derived units to their base unit groups
    units.forEach(unit => {
      if (unit.base_unit_id) {
        // This is a derived unit
        const group = baseUnitsMap.get(unit.base_unit_id);
        if (group) {
          group.derivedUnits.push(unit);
        } else {
          // Base unit doesn't exist or isn't loaded yet
          // Create a placeholder group
          if (!baseUnitsMap.has(unit.base_unit_id)) {
            baseUnitsMap.set(unit.base_unit_id, {
              baseUnit: null,
              derivedUnits: [unit],
            });
          } else {
            baseUnitsMap.get(unit.base_unit_id)?.derivedUnits.push(unit);
          }
        }
      }
    });

    return Array.from(baseUnitsMap.values());
  }, [units]);

  const handleToggleShowInactive = () => {
    const newValue = !showInactive;
    setShowInactive(newValue);
    setShowInactivePreference(newValue);
  };

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setIsUnitModalOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsUnitModalOpen(true);
  };

  const handleDeleteUnit = (unit: Unit) => {
    setUnitToDelete(unit);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;

    setIsDeleting(true);
    try {
      await unitsApi.hardDelete(unitToDelete.id);
      await loadUnits();
      setIsDeleteModalOpen(false);
      setUnitToDelete(null);
    } catch (err) {
      console.error('Failed to delete unit:', err);
      setError(t('expenses.units.errorDeleteUnit'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUnitStatus = async (unitId: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // Deactivate
        await unitsApi.update(unitId, { is_active: false });
      } else {
        // Activate via restore
        await unitsApi.restore(unitId);
      }
      await loadUnits();
    } catch (err) {
      console.error('Failed to toggle unit status:', err);
      setError(t('expenses.units.loadingError'));
    }
  };

  const handleModalSuccess = () => {
    loadUnits();
  };

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.units.loadingError')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('expenses.units.loadingData')}</p>
      </div>
    );
  }

  const groups = groupedUnits();
  const activeGroups = groups.filter(g => g.baseUnit?.is_active !== false);
  const inactiveGroups = groups.filter(g => g.baseUnit?.is_active === false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('expenses.units.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.units.description')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleShowInactive}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              title={showInactive ? t('expenses.units.hideInactive') : t('expenses.units.showInactive')}
            >
              {showInactive ? (
                <>
                  <EyeSlashIcon className="h-4 w-4 mr-2" />
                  {t('expenses.units.hideInactive')}
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  {t('expenses.units.showInactive')}
                </>
              )}
            </button>
            <button
              onClick={handleAddUnit}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('expenses.units.addUnit')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Units List */}
      {groups.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">{t('expenses.units.noUnits')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('expenses.units.noUnitsDescription')}</p>
          <button
            onClick={handleAddUnit}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('expenses.units.createFirstUnit')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Units */}
          {activeGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">{t('expenses.units.activeUnits')}</h3>
              {activeGroups.map((group, idx) => (
                <BaseUnitCard
                  key={group.baseUnit?.id || `group-${idx}`}
                  group={group}
                  onEditUnit={handleEditUnit}
                  onDeleteUnit={handleDeleteUnit}
                  onToggleStatus={handleToggleUnitStatus}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Inactive Units */}
          {showInactive && inactiveGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-500">{t('expenses.units.inactiveUnits')}</h3>
              {inactiveGroups.map((group, idx) => (
                <BaseUnitCard
                  key={group.baseUnit?.id || `inactive-group-${idx}`}
                  group={group}
                  onEditUnit={handleEditUnit}
                  onDeleteUnit={handleDeleteUnit}
                  onToggleStatus={handleToggleUnitStatus}
                  isInactive
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => {
          setIsUnitModalOpen(false);
          setSelectedUnit(null);
        }}
        onSuccess={handleModalSuccess}
        unit={selectedUnit}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUnitToDelete(null);
        }}
        onConfirm={confirmDelete}
        type="unit"
        itemName={unitToDelete?.name}
        isLoading={isDeleting}
      />
    </div>
  );
}

// Separate component for base unit card with derived units
interface BaseUnitCardProps {
  group: BaseUnitGroup;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (unit: Unit) => void;
  onToggleStatus: (unitId: number, currentStatus: boolean) => void;
  isInactive?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function BaseUnitCard({
  group,
  onEditUnit,
  onDeleteUnit,
  onToggleStatus,
  isInactive = false,
  t,
}: BaseUnitCardProps) {
  const { baseUnit, derivedUnits } = group;

  if (!baseUnit) {
    return null; // Skip groups without base unit (shouldn't happen in normal flow)
  }

  return (
    <div className={`bg-white shadow rounded-lg border overflow-hidden ${isInactive ? 'opacity-75' : ''}`}>
      {/* Base Unit Header */}
      <div className={`px-4 py-3 border-b border-gray-200 ${isInactive ? 'bg-gray-50' : 'bg-blue-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-lg font-medium ${isInactive ? 'text-gray-600' : 'text-gray-900'}`}>
                  {baseUnit.name} ({baseUnit.symbol})
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                }`}>
                  {t('expenses.units.baseUnit')}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isInactive ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-800'
                }`}>
                  {t(`expenses.units.unitTypes.${baseUnit.unit_type}`)}
                </span>
              </div>
              {baseUnit.description && (
                <p className="mt-1 text-xs text-gray-500">{baseUnit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {baseUnit.is_active ? (
              <button
                onClick={() => onToggleStatus(baseUnit.id, true)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
                title={t('expenses.units.deactivate')}
              >
                <EyeSlashIcon className="h-3 w-3 mr-1" />
                {t('expenses.units.deactivate')}
              </button>
            ) : (
              <button
                onClick={() => onToggleStatus(baseUnit.id, false)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                title={t('expenses.units.activate')}
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                {t('expenses.units.activate')}
              </button>
            )}
            <button
              onClick={() => onEditUnit(baseUnit)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
              title={t('expenses.units.editUnit')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDeleteUnit(baseUnit)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
              title={t('expenses.units.deleteUnit')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Derived Units */}
      {derivedUnits.length > 0 && (
        <div className="px-4 py-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('expenses.units.derivedUnitsCount', { count: derivedUnits.length })}
          </h4>
          <div className="grid gap-3">
            {derivedUnits.map(unit => (
              <div
                key={unit.id}
                className={`border rounded-lg p-3 ${
                  unit.is_active
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-200 bg-gray-50'
                } transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-medium text-gray-900">
                        {unit.name} ({unit.symbol})
                      </h5>
                      {!unit.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {t('expenses.units.inactiveUnits')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {t('expenses.units.conversionInfo', {
                        value: unit.conversion_factor,
                        fromSymbol: unit.symbol,
                        toSymbol: baseUnit.symbol,
                      })}
                    </p>
                    {unit.description && (
                      <p className="text-xs text-gray-500 mt-1">{unit.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {unit.is_active ? (
                      <button
                        onClick={() => onToggleStatus(unit.id, true)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
                        title={t('expenses.units.deactivate')}
                      >
                        <EyeSlashIcon className="h-3 w-3 mr-1" />
                        {t('expenses.units.deactivate')}
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleStatus(unit.id, false)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                        title={t('expenses.units.activate')}
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        {t('expenses.units.activate')}
                      </button>
                    )}
                    <button
                      onClick={() => onEditUnit(unit)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title={t('expenses.units.editUnit')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteUnit(unit)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title={t('expenses.units.deleteUnit')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
