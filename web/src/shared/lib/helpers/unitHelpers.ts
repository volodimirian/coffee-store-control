import type { Unit, ExpenseCategory } from '~/shared/api';

export interface GroupedUnit {
  unit: Unit;
  derived: Unit[];
}

/**
 * Groups units by base unit for hierarchical display
 * Returns base units with their derived units
 */
export function groupUnits(units: Unit[]): GroupedUnit[] {
  const baseUnits = units.filter(u => !u.base_unit_id);
  const result: GroupedUnit[] = [];

  baseUnits.forEach(baseUnit => {
    const derivedUnits = units.filter(u => u.base_unit_id === baseUnit.id);
    result.push({ unit: baseUnit, derived: derivedUnits });
  });

  return result;
}

/**
 * Filters and groups units by category's unit type
 * Only returns units that match the category's default unit type (weight/volume/count)
 */
export function getFilteredUnitsForCategory(
  categoryId: number,
  categories: ExpenseCategory[],
  units: Unit[]
): GroupedUnit[] {
  if (!categoryId || categoryId === 0) {
    return groupUnits(units);
  }

  const category = categories.find(c => c.id === categoryId);
  if (!category) {
    return groupUnits(units);
  }

  // Find the default unit of the category to determine unit_type
  const defaultUnit = units.find(u => u.id === category.default_unit_id);
  if (!defaultUnit) {
    return groupUnits(units);
  }

  // Filter units by the same unit_type
  const filteredUnits = units.filter(u => u.unit_type === defaultUnit.unit_type);
  return groupUnits(filteredUnits);
}
