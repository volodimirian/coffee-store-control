import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { employeesApi } from '~/shared/api/employees';
import type { Employee, EmployeeCreateRequest } from '~/shared/types/locations';
import { useApiError } from '~/shared/lib/useApiError';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  businessId: number;
  employee?: Employee; // If employee is passed, then edit mode
}

interface EmployeeFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role_in_business: string;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  employee
}) => {
  const { t } = useTranslation();
  const { getErrorMessage } = useApiError();
  
  const isEditMode = !!employee;
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role_in_business: 'employee'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing
  useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.email,
        username: employee.username,
        password: '', // Never pre-fill password
        confirmPassword: '',
        role_in_business: employee.role_in_business
      });
    } else {
      setFormData({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role_in_business: 'employee'
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('validation.required', { field: t('auth.email') });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = t('validation.required', { field: t('auth.username') });
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('validation.minLength', { field: t('auth.username'), min: 3 });
    }

    // Password validation (only for create mode or if password is entered in edit mode)
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = t('validation.required', { field: t('auth.password') });
      } else if (formData.password.length < 6) {
        newErrors.password = t('validation.minLength', { field: t('auth.password'), min: 6 });
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t('validation.required', { field: t('auth.confirmPassword') });
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('validation.passwordMismatch');
      }
    }

    // Role validation
    if (!formData.role_in_business) {
      newErrors.role_in_business = t('validation.required', { field: t('employees.role') });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isEditMode && employee) {
        // Update employee role
        await employeesApi.updateEmployeeRole(businessId, employee.user_id, formData.role_in_business);
      } else {
        // Create new employee
        const createData: EmployeeCreateRequest = {
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password,
          business_id: businessId,
          role_in_business: formData.role_in_business
        };
        
        await employeesApi.createEmployee(businessId, createData);
      }
      
      // Reset form
      setFormData({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role_in_business: 'employee'
      });
      setErrors({});
      
      // Call success callback and close modal
      onSuccess?.();
      onClose();
      
    } catch (error: unknown) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} employee:`, error);
      
      setErrors({ 
        submit: getErrorMessage(error)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role_in_business: 'employee'
      });
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
              {t(isEditMode ? 'employees.editEmployee' : 'employees.addEmployee')}
            </h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Submit error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('auth.emailAddress')}
                disabled={isSubmitting || isEditMode} // Can't change email in edit mode
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.username')}
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder={t('auth.username')}
                disabled={isSubmitting || isEditMode} // Can't change username in edit mode
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Password - only in create mode */}
            {!isEditMode && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={t('auth.password')}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.confirmPassword')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder={t('auth.confirmPassword')}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                {t('employees.role.employee')} {/* Label text */}
              </label>
              <select
                id="role"
                value={formData.role_in_business}
                onChange={(e) => handleInputChange('role_in_business', e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  errors.role_in_business ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="employee">{t('employees.role.employee')}</option>
                <option value="manager">{t('employees.role.manager')}</option>
              </select>
              {errors.role_in_business && (
                <p className="mt-1 text-sm text-red-600">{errors.role_in_business}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
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
                {isSubmitting ? t('common.loading') : t(isEditMode ? 'common.save' : 'common.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
