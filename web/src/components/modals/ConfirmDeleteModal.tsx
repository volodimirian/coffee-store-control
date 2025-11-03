import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  // Option 1: Use predefined type with auto-generated translations
  type?: 'section' | 'category' | 'unit' | 'invoice' | 'employee' | 'location';
  // Option 2: Use custom title and message (overrides type-based translations)
  title?: string;
  message?: string;
  itemName?: string;
  isLoading?: boolean;
  isRevocable?: boolean;
  additionalInfo?: string; // Additional warning or info message
  confirmButtonText?: string; // Custom confirm button text
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  itemName,
  isLoading = false,
  isRevocable = false,
  additionalInfo,
  confirmButtonText,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
  };

  // Generate title and message based on type or use custom ones
  let modalTitle: string;
  let modalMessage: string;
  let modalConfirmButtonText: string;

  if (type && !title && !message) {
    // Use type-based translations
    modalTitle = t(`expenses.modals.confirmDelete.${type}.title`);
    modalMessage = t(`expenses.modals.confirmDelete.${type}.message`, { name: itemName });
    modalConfirmButtonText = confirmButtonText || t(`expenses.modals.confirmDelete.${type}.confirmButton`);
  } else {
    // Use custom title/message
    modalTitle = title || t('common.confirmDeletion');
    modalMessage = message || t('common.confirmDeletionMessage');
    modalConfirmButtonText = confirmButtonText || t('common.delete');
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start space-x-4">
                  {/* Warning Icon */}
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  
                  <div className="flex-1">
                    {/* Title */}
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-2">
                      {modalTitle}
                    </Dialog.Title>
                    
                    {/* Message */}
                    <div className="text-sm text-gray-500 mb-4">
                      <p>
                        {modalMessage}
                      </p>
                      
                      {/* Item name display (when provided and not already in message) */}
                      {itemName && (
                        <div className="bg-gray-50 rounded-md p-3 mt-2 mb-2">
                          <p className="text-sm font-medium text-gray-900">
                            {itemName}
                          </p>
                        </div>
                      )}
                      
                      {additionalInfo && (
                        <p className="mt-2 text-sm font-medium text-amber-700 bg-amber-50 p-2 rounded">
                          {additionalInfo}
                        </p>
                      )}
                      {!isRevocable && (
                        <p className="mt-2 text-xs text-red-600">
                          {t('common.actionCannotBeUndone')}
                        </p>
                      )}
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={onClose}
                        disabled={isLoading}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleConfirm}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('common.deleting')}
                          </>
                        ) : (
                          <>
                            <TrashIcon className="h-4 w-4 mr-2" />
                            {modalConfirmButtonText}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
