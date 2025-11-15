import React, { useState, useEffect } from 'react';
import { XMarkIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { employeesApi, permissionsApi } from '~/shared/api/employees';
import type { Employee, UserPermissionDetail } from '~/shared/types/locations';
import { useApiError } from '~/shared/lib/useApiError';
import { 
  getDependentPermissions, 
  getAffectedFeatures,
  hasDependentPermissions,
  getRequiredPermissions 
} from '~/shared/utils/permissionDependencies';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  businessId: number;
  employee: Employee;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  employee
}) => {
  const { t } = useTranslation();
  const { getErrorMessage } = useApiError();
  
  const [permissionDetails, setPermissionDetails] = useState<UserPermissionDetail[]>([]);
  const [modifiedPermissions, setModifiedPermissions] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch permission details from backend
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isOpen || !employee) return;
      
      setIsLoading(true);
      setError(null);
      setModifiedPermissions(new Map());
      
      try {
        const detail = await permissionsApi.getUserPermissionsDetail(businessId, employee.user_id);
        setPermissionDetails(detail.permissions);
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPermissions();
  }, [isOpen, employee, businessId, getErrorMessage]);

  const handleTogglePermission = (permissionName: string) => {
    // Get the current effective permission (considering modifications)
    const permission = permissionDetails.find(p => p.permission_name === permissionName);
    if (!permission) return;
    
    const currentEffectiveValue = getEffectivePermission(permission);
    const newValue = !currentEffectiveValue;
    
    setModifiedPermissions(prev => {
      const newMap = new Map(prev);
      newMap.set(permissionName, newValue);
      return newMap;
    });
    
    if (error) {
      setError(null);
    }
  };

  const handleSelectAll = () => {
    const newModified = new Map<string, boolean>();
    permissionDetails.forEach(perm => {
      if (!perm.has_permission) {
        newModified.set(perm.permission_name, true);
      }
    });
    setModifiedPermissions(newModified);
  };

  const handleDeselectAll = () => {
    const newModified = new Map<string, boolean>();
    permissionDetails.forEach(perm => {
      if (perm.has_permission) {
        newModified.set(perm.permission_name, false);
      }
    });
    setModifiedPermissions(newModified);
  };

  const getEffectivePermission = (perm: UserPermissionDetail): boolean => {
    if (modifiedPermissions.has(perm.permission_name)) {
      return modifiedPermissions.get(perm.permission_name)!;
    }
    return perm.has_permission;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modifiedPermissions.size === 0) {
      // No changes made
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Separate permissions to grant and revoke
      const permissionsToGrant: string[] = [];
      const permissionsToRevoke: string[] = [];
      
      modifiedPermissions.forEach((shouldHave, permName) => {
        if (shouldHave) {
          permissionsToGrant.push(permName);
        } else {
          permissionsToRevoke.push(permName);
        }
      });

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
      setModifiedPermissions(new Map());
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group permissions by resource
  const groupedPermissions = permissionDetails.reduce((acc, perm) => {
    const resource = perm.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, UserPermissionDetail[]>);

  const getTotalSelected = (): number => {
    return permissionDetails.filter(perm => getEffectivePermission(perm)).length;
  };

  const getPermissionBadge = (perm: UserPermissionDetail): string => {
    if (modifiedPermissions.has(perm.permission_name)) {
      return 'modified';
    }
    if (perm.source === 'role') {
      return 'from-role';
    }
    if (perm.is_explicitly_granted) {
      return 'granted';
    }
    if (perm.is_explicitly_revoked) {
      return 'revoked';
    }
    return '';
  };

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

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
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
                        {t(`permissions.resource.${resource}`, resource)}
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {permissions.map(permission => {
                          const isChecked = getEffectivePermission(permission);
                          const badge = getPermissionBadge(permission);
                          const dependents = getDependentPermissions(permission.permission_name);
                          const affected = getAffectedFeatures(permission.permission_name);
                          const required = getRequiredPermissions(permission.permission_name);
                          const hasWarnings = !isChecked && hasDependentPermissions(permission.permission_name);
                          const hasInfo = isChecked && required.length > 0;
                          
                          return (
                            <div key={permission.permission_name} className="relative group">
                              <label
                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(permission.permission_name)}
                                    disabled={isSubmitting}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <div className="ml-3 flex-1 flex items-center">
                                    <span className="text-sm text-gray-700">
                                      {t(`permissions.names.${permission.permission_name}`, permission.permission_name)}
                                    </span>
                                    {badge && (
                                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        badge === 'modified' ? 'bg-yellow-100 text-yellow-800' :
                                        badge === 'from-role' ? 'bg-purple-100 text-purple-800' :
                                        badge === 'granted' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {badge === 'modified' ? t('permissions.badge.modified') :
                                         badge === 'from-role' ? t('permissions.badge.fromRole') :
                                         badge === 'granted' ? t('permissions.badge.explicitlyGranted') :
                                         t('permissions.badge.explicitlyRevoked')}
                                      </span>
                                    )}
                                    {hasWarnings && (
                                      <ExclamationTriangleIcon className="ml-2 h-4 w-4 text-yellow-500" />
                                    )}
                                    {hasInfo && (
                                      <InformationCircleIcon className="ml-2 h-4 w-4 text-blue-500" />
                                    )}
                                  </div>
                                </div>
                              </label>
                              
                              {/* Tooltip with dependencies info */}
                              {(hasWarnings || hasInfo) && (
                                <div className="hidden group-hover:block absolute left-0 right-0 top-full mt-1 z-10 p-3 bg-white border border-gray-300 rounded-lg shadow-lg text-xs">
                                  {!isChecked && dependents.length > 0 && (
                                    <div className="mb-2">
                                      <p className="font-medium text-yellow-700 flex items-center">
                                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                        {t('permissions.dependencies.willBeRevoked')}
                                      </p>
                                      <ul className="mt-1 ml-4 list-disc text-gray-600">
                                        {dependents.map(dep => (
                                          <li key={dep}>{t(`permissions.names.${dep}`, dep)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {!isChecked && affected.length > 0 && (
                                    <div className={dependents.length > 0 ? 'mt-2' : ''}>
                                      <p className="font-medium text-red-700">{t('permissions.dependencies.affectsLabel')}</p>
                                      <ul className="mt-1 ml-4 list-disc text-gray-600">
                                        {affected.map(feature => (
                                          <li key={feature}>{t(feature, feature)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {isChecked && required.length > 0 && (
                                    <div>
                                      <p className="font-medium text-blue-700 flex items-center">
                                        <InformationCircleIcon className="h-3 w-3 mr-1" />
                                        {t('permissions.dependencies.needsPermissions')}
                                      </p>
                                      <ul className="mt-1 ml-4 list-disc text-gray-600">
                                        {required.map(req => (
                                          <li key={req}>{t(`permissions.names.${req}`, req)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    {t('permissions.selectedCount', { 
                      count: getTotalSelected(), 
                      total: permissionDetails.length 
                    })}
                  </p>
                  {modifiedPermissions.size > 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      {t('permissions.modificationsCount', { count: modifiedPermissions.size })}
                    </p>
                  )}
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
                    disabled={isSubmitting || modifiedPermissions.size === 0}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? t('common.loading') : t('permissions.savePermissions')}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
