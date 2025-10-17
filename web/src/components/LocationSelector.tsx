import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';
import { AddLocationModal } from './AddLocationModal';
import type { Location } from '~/shared/types/locations';

export const LocationSelector: React.FC = () => {
  const { t } = useTranslation();
  const { 
    user,
    currentLocation,
    locations,
    isLoadingLocations,
    setCurrentLocation
  } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Hide LocationSelector for employees with only one location
  if (user?.role?.name === 'EMPLOYEE' && locations.length <= 1) {
    return null;
  }

  const handleLocationSelect = async (locationId: number) => {
    try {
      const location = locations.find((loc: Location) => loc.id === locationId);
      if (location) {
        setCurrentLocation(location);
      }
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to switch location:', error);
    }
  };

  const handleAddNew = () => {
    setIsDropdownOpen(false);
    setIsAddModalOpen(true);
  };

  const handleModalSuccess = () => {
    // Modal will close automatically, locations will refresh via AppContext
    console.log('Location created successfully');
  };

  if (isLoadingLocations) {
    return (
      <div className="px-3 py-2">
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="relative px-3 py-2" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between p-2 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <MapPinIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-gray-500">{t('locations.currentLocation')}</div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {currentLocation?.name || t('locations.selectLocation')}
            </div>
          </div>
        </div>
        <ChevronDownIcon 
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Add new location button - only for admins and business owners - FIXED at top */}
          {(user?.role?.name === 'ADMIN' || user?.role?.name === 'BUSINESS_OWNER') && (
            <div className="border-b border-gray-100">
              <button
                onClick={handleAddNew}
                className="w-full flex items-center space-x-2 p-3 text-blue-600 hover:bg-blue-50 transition-colors duration-150"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{t('locations.addNewLocation')}</span>
              </button>
            </div>
          )}
          
          {/* Scrollable locations list */}
          <div className="max-h-60 overflow-y-auto">
            {locations.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {t('locations.noLocations')}
              </div>
            ) : (
              locations.map((location: Location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location.id)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors duration-150 ${
                    currentLocation?.id === location.id 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-900'
                  }`}
                >
                  <div className="font-medium">{location.name}</div>
                  {location.address && (
                    <div className="text-sm text-gray-500 mt-1">{location.address}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
