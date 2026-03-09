/**
 * Permission utilities for checking user access rights
 */

export type Resource = 
  | 'businesses'
  | 'categories'
  | 'subcategories'
  | 'units'
  | 'suppliers'
  | 'invoices'
  | 'tech_card_items'
  | 'ofd_connections'
  | 'product_mappings'
  | 'sales';

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'activate_deactivate'
  | 'approve'
  | 'reject'
  | 'manage_members'
  | 'grant_permissions'
  | 'sync'
  | 'reprocess';

export interface Permission {
  permission_name: string;
  resource: string;
  action: string;
  has_permission: boolean;
  source: 'role' | 'user' | 'both' | 'none';
  is_explicitly_granted: boolean;
  is_explicitly_revoked: boolean;
  business_id?: number | null;
}

export interface UserPermissions {
  user_id: number;
  business_id?: number | null;
  permissions: Permission[];
}

/**
 * Generate permission name from resource and action
 */
export function getPermissionName(resource: Resource, action: Action): string {
  return `${action}_${resource}`;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userPermissions: UserPermissions | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!userPermissions?.permissions) {
    return false;
  }

  const permissionName = getPermissionName(resource, action);
  const permission = userPermissions.permissions.find(
    (p) => p.permission_name === permissionName
  );

  return permission?.has_permission ?? false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: UserPermissions | null | undefined,
  checks: Array<{ resource: Resource; action: Action }>
): boolean {
  return checks.some(({ resource, action }) =>
    hasPermission(userPermissions, resource, action)
  );
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: UserPermissions | null | undefined,
  checks: Array<{ resource: Resource; action: Action }>
): boolean {
  return checks.every(({ resource, action }) =>
    hasPermission(userPermissions, resource, action)
  );
}

/**
 * Shorthand permission checkers for common actions
 */
export const can = {
  view: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'view'),
  
  create: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'create'),
  
  edit: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'edit'),
  
  delete: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'delete'),
  
  activateDeactivate: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'activate_deactivate'),
  
  approve: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'approve'),
  
  reject: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'reject'),
  
  manageMembers: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'manage_members'),
  
  grantPermissions: (permissions: UserPermissions | null | undefined, resource: Resource) =>
    hasPermission(permissions, resource, 'grant_permissions'),
};
