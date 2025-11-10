import type { ReactNode } from 'react';
import { usePermissions } from '~/shared/lib/usePermissions';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '~/shared/utils/permissions';
import type { Resource, Action } from '~/shared/utils/permissions';

interface ProtectedProps {
  children: ReactNode;
  /** Single permission check */
  permission?: {
    resource: Resource;
    action: Action;
  };
  /** Check if user has ANY of these permissions (OR logic) */
  anyOf?: Array<{
    resource: Resource;
    action: Action;
  }>;
  /** Check if user has ALL of these permissions (AND logic) */
  allOf?: Array<{
    resource: Resource;
    action: Action;
  }>;
  /** What to render when user doesn't have permission (default: null) */
  fallback?: ReactNode;
  /** Business ID to check permissions for (defaults to current location) */
  businessId?: number | null;
  /** Show loading state while checking permissions */
  showLoadingState?: boolean;
  /** Custom loading component */
  loadingFallback?: ReactNode;
}

/**
 * Protected component that conditionally renders children based on user permissions
 * 
 * @example Single permission
 * ```tsx
 * <Protected permission={{ resource: 'suppliers', action: 'create' }}>
 *   <Button>Create Supplier</Button>
 * </Protected>
 * ```
 * 
 * @example Any of multiple permissions
 * ```tsx
 * <Protected anyOf={[
 *   { resource: 'suppliers', action: 'view' },
 *   { resource: 'suppliers', action: 'edit' }
 * ]}>
 *   <SupplierList />
 * </Protected>
 * ```
 * 
 * @example All permissions required
 * ```tsx
 * <Protected allOf={[
 *   { resource: 'invoices', action: 'view' },
 *   { resource: 'invoices', action: 'approve' }
 * ]}>
 *   <ApproveButton />
 * </Protected>
 * ```
 * 
 * @example With fallback
 * ```tsx
 * <Protected 
 *   permission={{ resource: 'units', action: 'delete' }}
 *   fallback={<p>You don't have permission to delete units</p>}
 * >
 *   <DeleteButton />
 * </Protected>
 * ```
 */
export function Protected({
  children,
  permission,
  anyOf,
  allOf,
  fallback = null,
  businessId,
  showLoadingState = false,
  loadingFallback = null,
}: ProtectedProps) {
  const { permissions, isLoading } = usePermissions(businessId);

  // Show loading state if enabled
  if (isLoading && showLoadingState) {
    return <>{loadingFallback}</>;
  }

  // Wait for permissions to load before deciding
  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  // Check single permission
  if (permission) {
    hasAccess = hasPermission(permissions, permission.resource, permission.action);
  }
  // Check if user has ANY of the permissions
  else if (anyOf) {
    hasAccess = hasAnyPermission(permissions, anyOf);
  }
  // Check if user has ALL of the permissions
  else if (allOf) {
    hasAccess = hasAllPermissions(permissions, allOf);
  }
  // No permission check specified - deny by default
  else {
    hasAccess = false;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
