import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { employeesApi } from '~/shared/api/employees';
import { useApiError } from '~/shared/lib/useApiError';

interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  businessId: number;
}

interface UserSearchResult {
  user_id: number;
  username: string;
  email: string;
  role: string | null;
}

export const AssignEmployeeModal: React.FC<AssignEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId
}) => {
  const { t } = useTranslation();
  const { getErrorMessage } = useApiError();
  
  const [email, setEmail] = useState('');
  const [roleInBusiness, setRoleInBusiness] = useState('employee');
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearch = async () => {
    if (!email.trim()) {
      setErrors({ email: t('validation.required', { field: t('auth.email') }) });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: t('validation.invalidEmail') });
      return;
    }

    setIsSearching(true);
    setErrors({});
    setFoundUser(null);
    
    try {
      const result = await employeesApi.searchUserByEmail(email.trim());
      setFoundUser(result);
    } catch (error: unknown) {
      console.error('Failed to search user:', error);
      setErrors({ search: getErrorMessage(error) });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssign = async () => {
    if (!foundUser) return;

    setIsAssigning(true);
    setErrors({});
    
    try {
      await employeesApi.assignEmployeeToBusiness(businessId, {
        user_id: foundUser.user_id,
        business_id: businessId,
        role_in_business: roleInBusiness,
      });
      
      // Reset form
      setEmail('');
      setRoleInBusiness('employee');
      setFoundUser(null);
      setErrors({});
      
      // Call success callback and close modal
      onSuccess?.();
      onClose();
      
    } catch (error: unknown) {
      console.error('Failed to assign employee:', error);
      setErrors({ 
        assign: getErrorMessage(error)
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isSearching && !isAssigning) {
      setEmail('');
      setRoleInBusiness('employee');
      setFoundUser(null);
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('employees.assignExisting')}
            </h3>
            <button
              onClick={handleClose}
              disabled={isSearching || isAssigning}
              className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Error messages */}
            {(errors.search || errors.assign) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.search || errors.assign}</p>
              </div>
            )}

            {/* Email Search */}
            <div>
              <label htmlFor="search-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('employees.searchByEmail')}
              </label>
              <div className="flex space-x-2">
                <input
                  id="search-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: '', search: '' }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder={t('auth.emailAddress')}
                  disabled={isSearching || isAssigning}
                  className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || isAssigning}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Found User Display */}
            {foundUser && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">{foundUser.username}</p>
                    <p className="text-xs text-green-700">{foundUser.email}</p>
                    {foundUser.role && (
                      <p className="text-xs text-green-600 mt-1">
                        {t('employees.globalRole')}: {foundUser.role}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection - only shown when user is found */}
            {foundUser && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('employees.roleInBusiness')}
                </label>
                <select
                  id="role"
                  value={roleInBusiness}
                  onChange={(e) => setRoleInBusiness(e.target.value)}
                  disabled={isAssigning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="employee">{t('employees.role.employee')}</option>
                  <option value="manager">{t('employees.role.manager')}</option>
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSearching || isAssigning}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.cancel')}
              </button>
              {foundUser && (
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={isAssigning}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssigning ? t('common.loading') : t('employees.assignToBusiness')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
