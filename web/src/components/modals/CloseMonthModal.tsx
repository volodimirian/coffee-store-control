import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  LockClosedIcon 
} from '@heroicons/react/24/outline';

interface CloseMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  monthName: string;
  loading?: boolean;
}

export default function CloseMonthModal({
  isOpen,
  onClose,
  onConfirm,
  monthName,
  loading = false,
}: CloseMonthModalProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
  };

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
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <LockClosedIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        {t('expenses.periods.closeMonth')}
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-600">
                        {monthName}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      disabled={loading}
                      className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  <div className="flex items-start gap-3 mb-4">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">
                        {t('expenses.periods.closeWarning')}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>{t('expenses.periods.closeEffect1')}</li>
                        <li>{t('expenses.periods.closeEffect2')}</li>
                        <li>{t('expenses.periods.closeEffect3')}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">
                        {t('expenses.periods.canReopen')}
                      </span>{' '}
                      {t('expenses.periods.reopenHint')}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    <LockClosedIcon className="h-4 w-4" />
                    {loading ? t('common.processing') : t('expenses.periods.confirmClose')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
