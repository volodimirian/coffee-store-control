import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon, MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '~/shared/context/AppContext';
import { LocationModal } from '../components/LocationModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import type { Location } from '~/shared/types/locations';

export default function LocationsPage() {
  const { t } = useTranslation();
  const { 
    currentLocation,
    locations,
    isLoadingLocations,
    deleteLocation,
    setCurrentLocation
  } = useAppContext();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsEditModalOpen(true);
  };

  const handleDelete = (location: Location) => {
    setDeletingLocation(location);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingLocation) {
      setIsDeleting(true);
      try {
        await deleteLocation(deletingLocation.id);
        setIsDeleteModalOpen(false);
        setDeletingLocation(null);
      } catch (error) {
        console.error('Failed to delete location:', error);
        // TODO: Show error toast
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setDeletingLocation(null);
  };

  const handleSetCurrent = (location: Location) => {
    setCurrentLocation(location);
  };

  const handleModalSuccess = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingLocation(null);
  };

  if (isLoadingLocations) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('locations.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('locations.description')}</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('locations.addNewLocation')}
          </button>
        </div>
      </div>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('locations.noLocations')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('locations.getStarted')}</p>
          <div className="mt-6">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('locations.addNewLocation')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`relative rounded-lg border ${
                currentLocation?.id === location.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
              } p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              {/* Current location indicator */}
              {currentLocation?.id === location.id && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('locations.currentLocation')}
                  </span>
                </div>
              )}

              <div className="flex items-start">
                <div className="mt-4 flex-shrink-0">
                  <MapPinIcon className={`h-6 w-6 ${
                    currentLocation?.id === location.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className={`ml-3 flex-1 min-w-0 mt-4`}>
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {location.name}
                  </h3>
                  {location.city && (
                    <p className="text-sm text-gray-500 mt-1">{location.city}</p>
                  )}
                  {location.address && (
                    <p className="text-sm text-gray-500 mt-1">{location.address}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {currentLocation?.id !== location.id && (
                    <button
                      onClick={() => handleSetCurrent(location)}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      {t('locations.selectLocation')}
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(location)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={t('locations.editLocation')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(location)}
                    disabled={isDeleting}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title={t('locations.deleteLocation')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      <LocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Edit Location Modal */}
      <LocationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleModalSuccess}
        location={editingLocation || undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('locations.deleteLocation')}
        message={t('locations.confirmDeleteMessage')}
        itemName={deletingLocation?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}
