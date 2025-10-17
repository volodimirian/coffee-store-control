import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import type { LocationCreate } from '~/shared/types/locations';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { createLocation } = useAppContext();
  
  const [formData, setFormData] = useState<LocationCreate>({
    name: '',
    city: '',
    address: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required', { field: t('locations.locationName') });
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('validation.minLength', { field: t('locations.locationName'), min: 2 });
    }

    if (!formData.city.trim()) {
      newErrors.city = t('validation.required', { field: t('locations.city') });
    }

    if (!formData.address.trim()) {
      newErrors.address = t('validation.required', { field: t('locations.address') });
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
      await createLocation({
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim()
      });
      
      // Reset form
      setFormData({ name: '', city: '', address: '' });
      setErrors({});
      
      // Call success callback and close modal
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Failed to create location:', error);
      setErrors({ 
        submit: t('locations.failedToCreate') 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LocationCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', city: '', address: '' });
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
          className="fixed inset-0 transition-opacity"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('locations.addNewLocation')}
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

            {/* Location Name */}
            <div>
              <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('locations.locationName')}
              </label>
              <input
                id="locationName"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('locations.locationNamePlaceholder')}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                {t('locations.city')}
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('locations.cityPlaceholder')}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                  errors.city ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                {t('locations.address')}
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={t('locations.addressPlaceholder')}
                disabled={isSubmitting}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
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
                {isSubmitting ? t('common.loading') : t('locations.createLocation')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
