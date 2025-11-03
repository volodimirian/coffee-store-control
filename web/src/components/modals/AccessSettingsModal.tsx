import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface AccessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessSettingsModal({ isOpen, onClose }: AccessSettingsModalProps) {
  const { t } = useTranslation();
  
  const mockUsers = [
    { id: 1, name: 'Анна Иванова', email: 'anna@example.com', role: t('expenses.accessSettings.mockRoles.manager'), access: t('expenses.accessSettings.accessLevels.fullAccess') },
    { id: 2, name: 'Петр Сидоров', email: 'peter@example.com', role: t('expenses.accessSettings.mockRoles.employee'), access: t('expenses.accessSettings.accessLevels.readOnly') },
    { id: 3, name: 'Мария Петрова', email: 'maria@example.com', role: t('expenses.accessSettings.mockRoles.employee'), access: t('expenses.accessSettings.accessLevels.edit') },
  ];

  const [users] = useState(mockUsers);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">{t('expenses.accessSettings.close')}</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {t('expenses.accessSettings.title')}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('expenses.accessSettings.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {/* Users List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        {t('expenses.accessSettings.users')} ({users.length})
                      </h4>
                      <button className="text-sm text-blue-600 hover:text-blue-500">
                        {t('expenses.accessSettings.addUser')}
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('expenses.accessSettings.user')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('expenses.accessSettings.role')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('expenses.accessSettings.access')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('expenses.accessSettings.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{user.role}</td>
                              <td className="px-4 py-3">
                                <select className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                  <option value="read">{t('expenses.accessSettings.accessLevels.readOnly')}</option>
                                  <option value="edit">{t('expenses.accessSettings.accessLevels.edit')}</option>
                                  <option value="full">{t('expenses.accessSettings.accessLevels.fullAccess')}</option>
                                  <option value="none">{t('expenses.accessSettings.accessLevels.noAccess')}</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button className="text-blue-600 hover:text-blue-500 mr-3">
                                  {t('expenses.accessSettings.edit')}
                                </button>
                                <button className="text-red-600 hover:text-red-500">
                                  {t('expenses.accessSettings.delete')}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Access Rules */}
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      {t('expenses.accessSettings.accessRules')}
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">
                          {t('expenses.accessSettings.viewData')}
                        </h5>
                        <div className="space-y-2 text-sm text-gray-600">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" defaultChecked />
                            {t('expenses.accessSettings.permissions.allCategories')}
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" defaultChecked />
                            {t('expenses.accessSettings.permissions.historicalData')}
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" />
                            {t('expenses.accessSettings.permissions.totalsAndSums')}
                          </label>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">
                          {t('expenses.accessSettings.editing')}
                        </h5>
                        <div className="space-y-2 text-sm text-gray-600">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" />
                            {t('expenses.accessSettings.permissions.addRecords')}
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" />
                            {t('expenses.accessSettings.permissions.editExisting')}
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded mr-2" />
                            {t('expenses.accessSettings.permissions.deleteRecords')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    {t('expenses.accessSettings.cancel')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    {t('expenses.accessSettings.saveChanges')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
