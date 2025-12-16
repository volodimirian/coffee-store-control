import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import AddSectionModal from './AddSectionModal';
import CategoryModal from './CategoryModal';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sections?: Array<{ id: number; name: string }>;
}

type CreateType = 'section' | 'category' | null;

export default function CreateExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  sections = [],
}: CreateExpenseModalProps) {
  const { t } = useTranslation();
  const [createType, setCreateType] = useState<CreateType>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const handleClose = () => {
    setCreateType(null);
    setSelectedSectionId(null);
    onClose();
  };

  const handleSectionAdded = () => {
    setCreateType(null);
    onSuccess();
  };

  const handleCategoryAdded = () => {
    setCreateType(null);
    setSelectedSectionId(null);
    onSuccess();
  };

  const handleCreateSection = () => {
    setCreateType('section');
  };

  const handleCreateCategory = (sectionId?: number) => {
    if (sections.length === 0) {
      // Show message or create section first
      alert(t('expenses.modals.createExpense.noSectionsWarning'));
      return;
    }
    
    if (sectionId) {
      setSelectedSectionId(sectionId);
      setCreateType('category');
    } else if (sections.length === 1) {
      // Auto-select if only one section
      setSelectedSectionId(sections[0].id);
      setCreateType('category');
    } else {
      // Show section selector
      setCreateType('category');
    }
  };

  // If section modal is open
  if (createType === 'section') {
    return (
      <AddSectionModal
        isOpen={true}
        onClose={() => setCreateType(null)}
        onSectionAdded={handleSectionAdded}
      />
    );
  }

  // If category modal is open
  if (createType === 'category' && selectedSectionId) {
    return (
      <CategoryModal
        isOpen={true}
        onClose={() => {
          setCreateType(null);
          setSelectedSectionId(null);
        }}
        mode="create"
        sectionId={selectedSectionId}
        onCategoryAdded={handleCategoryAdded}
      />
    );
  }

  // Main selection modal
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
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
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {t('expenses.modals.createExpense.title')}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {/* Create Section Button */}
                  <button
                    onClick={handleCreateSection}
                    className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                        <PlusIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {t('expenses.modals.createExpense.createSection')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('expenses.modals.createExpense.createSectionDescription')}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Create Category - with section selection if multiple sections */}
                  {sections.length === 0 ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-100 bg-gray-50 cursor-not-allowed rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <PlusIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-400">
                            {t('expenses.modals.createExpense.createCategory')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('expenses.modals.createExpense.createSectionFirst')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : sections.length === 1 ? (
                    <button
                      onClick={() => handleCreateCategory(sections[0].id)}
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                          <PlusIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {t('expenses.modals.createExpense.createCategory')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('expenses.modals.createExpense.createCategoryDescription')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full p-4 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <PlusIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {t('expenses.modals.createExpense.createCategory')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('expenses.modals.createExpense.selectSection')}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 ml-13 max-h-40 overflow-y-auto">
                        {sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => handleCreateCategory(section.id)}
                            className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-500 transition-colors"
                          >
                            {section.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
