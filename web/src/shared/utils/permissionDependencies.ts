/**
 * Permission dependencies configuration
 * Defines which permissions require other permissions to function properly
 */

export interface PermissionDependency {
  requiredFor: string[]; // List of permissions that depend on this permission
  affects: string[]; // What features will stop working if this permission is revoked
}

export const permissionDependencies: Record<string, PermissionDependency> = {
  // Suppliers
  'view_suppliers': {
    requiredFor: ['create_invoices', 'edit_invoices'],
    affects: ['permissions.dependencies.features.createInvoices', 'permissions.dependencies.features.editInvoices']
  },
  
  // Invoices
  'view_invoices': {
    requiredFor: [],
    affects: ['permissions.dependencies.features.inventoryTracking']
  },
  
  // Units
  'view_units': {
    requiredFor: [],
    affects: ['permissions.dependencies.features.inventoryTracking']
  },
  
  // Categories (sections)
  'view_categories': {
    requiredFor: [],
    affects: ['permissions.dependencies.features.inventoryTracking', 'permissions.dependencies.features.expenseReports']
  },
  
  // Subcategories
  'view_subcategories': {
    requiredFor: [],
    affects: ['permissions.dependencies.features.inventoryTracking', 'permissions.dependencies.features.expenseDetails']
  },
};

/**
 * Get permissions that will be automatically disabled if the given permission is revoked
 */
export function getDependentPermissions(permissionName: string): string[] {
  const dependency = permissionDependencies[permissionName];
  return dependency ? dependency.requiredFor : [];
}

/**
 * Get features that will stop working if the given permission is revoked
 */
export function getAffectedFeatures(permissionName: string): string[] {
  const dependency = permissionDependencies[permissionName];
  return dependency ? dependency.affects : [];
}

/**
 * Check if revoking a permission will affect other permissions
 */
export function hasDependentPermissions(permissionName: string): boolean {
  const dependents = getDependentPermissions(permissionName);
  return dependents.length > 0;
}

/**
 * Get all permissions that need to be enabled for the given permission to work
 */
export function getRequiredPermissions(permissionName: string): string[] {
  const required: string[] = [];
  
  // Check which permissions list this one as required
  Object.entries(permissionDependencies).forEach(([perm, dep]) => {
    if (dep.requiredFor.includes(permissionName)) {
      required.push(perm);
    }
  });
  
  return required;
}
