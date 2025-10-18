import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '~/shared/context/AppContext';

export const LocationIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  // Don't render if no location is selected
  if (!currentLocation) {
    return null;
  }

  return (
    <div className="hidden lg:flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
      <MapPinIcon className="h-4 w-4 text-gray-500" />
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-gray-500 leading-tight">
          {t('locations.currentLocation')}
        </span>
        <span className="text-sm font-medium text-gray-900 truncate max-w-48">
          {currentLocation.name}
        </span>
      </div>
    </div>
  );
};

export default LocationIndicator;