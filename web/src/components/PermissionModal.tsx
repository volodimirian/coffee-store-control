import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { employeesApi } from '~/shared/api/employees';
import type { Employee } from '~/shared/types/locations';
import { useApiError } from '~/shared/lib/useApiError';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  businessId: number;
  employee: Employee;
}

// Available permissions - can be fetched from backend in the future
const AVAILABLE_PERMISSIONS = [
  { name: 'view_expenses', labelKey: 'permissions.view_expenses', resource: 'expenses' },
  { name: 'create_expenses', labelKey: 'permissions.create_expenses', resource: 'expenses' },
  { name: 'edit_expenses', labelKey: 'permissions.edit_expenses', resource: 'expenses' },
  { name: 'delete_expenses', labelKey: 'permissions.delete_expenses', resource: 'expenses' },
  { name: 'view_categories', labelKey: 'permissions.view_categories', resource: 'categories' },
  { name: 'manage_categories', labelKey: 'permissions.manage_categories', resource: 'categories' },
  { name: 'view_inventory', labelKey: 'permissions.view_inventory', resource: 'inventory' },
  { name: 'manage_inventory', labelKey: 'permissions.manage_inventory', resource: 'inventory' },
  { name: 'view_reports', labelKey: 'permissions.view_reports', resource: 'reports' },
  { name: 'manage_invoices', labelKey: 'permissions.manage_invoices', resource: 'invoices' },
];

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  employee
}) => {
  const { t } = useTranslation();
  const { getErrorMessage } = useApiError();
  
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected permissions from employee
  useEffect(() => {
    if (employee && employee.permissions) {
      setSelectedPermissions(new Set(employee.permissions));
    }
  }, [employee, isOpen]);

  const handleTogglePermission = (permissionName: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionName)) {
        newSet.delete(permissionName);
      } else {
        newSet.add(permissionName);
      }
      return newSet;
    });
    
    // Clear error when user makes changes
    if (error) {
      setError(null);
    }
  };

  const handleSelectAll = () => {
    const allPermissions = new Set(AVAILABLE_PERMISSIONS.map(p => p.name));
    setSelectedPermissions(allPermissions);
  };

  const handleDeselectAll = () => {
    setSelectedPermissions(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Determine which permissions to grant and which to revoke
      const currentPermissions = new Set(employee.permissions || []);
      const permissionsToGrant = Array.from(selectedPermissions).filter(
        p => !currentPermissions.has(p)
      );
      const permissionsToRevoke = Array.from(currentPermissions).filter(
        p => !selectedPermissions.has(p)
      );

      // Grant new permissions
      if (permissionsToGrant.length > 0) {
        await employeesApi.grantPermissions(businessId, employee.user_id, {
          permission_names: permissionsToGrant,
          business_id: businessId
        });
      }

      // Revoke removed permissions
      if (permissionsToRevoke.length > 0) {
        await employeesApi.revokePermissions(businessId, employee.user_id, {
          permission_names: permissionsToRevoke,
          business_id: businessId
        });
      }
      
      // Call success callback and close modal
      onSuccess?.();
      onClose();
      
    } catch (err) {
      console.error('Failed to update permissions:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedPermissions(new Set(employee.permissions || []));
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group permissions by resource
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl transform bg-white rounded-lg shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('permissions.managePermissions')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('permissions.managingFor', { name: employee.username })}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mb-4 flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isSubmitting}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
              >
                {t('permissions.selectAll')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={isSubmitting}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
              >
                {t('permissions.deselectAll')}
              </button>
            </div>

            {/* Permissions Grid */}
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                <div key={resource}>
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {t(`permissions.resource.${resource}`)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map(permission => (
                      <label
                        key={permission.name}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPermissions.has(permission.name)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(permission.name)}
                          onChange={() => handleTogglePermission(permission.name)}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          {t(permission.labelKey)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                {t('permissions.selectedCount', { 
                  count: selectedPermissions.size, 
                  total: AVAILABLE_PERMISSIONS.length 
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? t('common.loading') : t('permissions.savePermissions')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
