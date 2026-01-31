import { Fragment, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ofdAPI, type OFDConnection, type OFDProvider } from '~/shared/api/ofd';
import { useAppContext } from '~/shared/context/AppContext';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import Input from '~/shared/ui/Input';
import { useToast } from '~/shared/lib/useToast';
import Toast from '~/shared/ui/Toast';

interface OFDConnectionModalProps {
  connection: OFDConnection | null;
  mode: 'create' | 'edit';
  providers: OFDProvider[];
  onClose: () => void;
  onSave: () => void;
}

export default function OFDConnectionModal({
  connection,
  mode,
  providers,
  onClose,
  onSave,
}: OFDConnectionModalProps) {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const { toast, error: showError, hideToast } = useToast();

  // Form state
  const [providerId, setProviderId] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when connection changes
  useEffect(() => {
    if (connection && mode === 'edit') {
      setProviderId(connection.provider_id);
      setApiKey(''); // Don't show existing API key for security
      setCustomBaseUrl(connection.custom_base_url || '');
      setIsActive(connection.is_active);
    } else {
      // Reset for create mode
      setProviderId(null);
      setApiKey('');
      setCustomBaseUrl('');
      setIsActive(true);
    }
    setError(null);
  }, [connection, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentLocation) {
      setError(t('errors.noLocationSelected'));
      return;
    }

    if (!providerId) {
      setError(t('ofd.errors.selectProvider'));
      return;
    }

    if (!apiKey && mode === 'create') {
      setError(t('ofd.errors.apiKeyRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await ofdAPI.createConnection(currentLocation.id, {
          provider_id: providerId,
          api_key: apiKey,
          custom_base_url: customBaseUrl || null,
        });
      } else if (connection) {
        await ofdAPI.updateConnection(connection.id, {
          api_key: apiKey || null, // Only update if provided
          custom_base_url: customBaseUrl || null,
          is_active: isActive,
        });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save OFD connection:', err);
      let errorMessage = t('ofd.errors.saveError');
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: { code?: string; message?: string } | string } } }).response;
        const detail = response?.data?.detail;
        
        // Check if detail is an object with code
        if (detail && typeof detail === 'object' && 'code' in detail) {
          const errorCode = detail.code;
          const translationKey = `ofd.errors.${errorCode}`;
          const translation = t(translationKey);
          
          // If translation exists (not equal to key), use it
          if (translation !== translationKey) {
            errorMessage = translation;
          } else if (detail.message) {
            errorMessage = detail.message;
          }
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert providers to SelectOption format
  const providerOptions: SelectOption[] = providers.map(p => ({
    id: p.id,
    name: p.name,
    subtitle: p.description || undefined,
  }));

  const selectedProvider = providerOptions.find(p => p.id === providerId) || null;
  
  // Get selected provider full data for showing default base URL
  const selectedProviderData = providerId 
    ? providers.find(p => p.id === providerId)
    : null;

  return (
    <>
      <Transition appear show={true} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {mode === 'create'
                      ? t('ofd.modal.titleCreate')
                      : t('ofd.modal.titleEdit')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Provider selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('ofd.modal.provider')} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={providerOptions}
                      value={selectedProvider}
                      onChange={(selected) => setProviderId(selected ? Number(selected.id) : null)}
                      placeholder={t('ofd.modal.selectProvider')}
                      searchPlaceholder={t('ofd.modal.searchProvider')}
                      noResultsText={t('ofd.modal.noProvidersFound')}
                      disabled={mode === 'edit'} // Can't change provider when editing
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('ofd.modal.apiKey')}
                      {mode === 'create' && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        mode === 'edit'
                          ? t('ofd.modal.apiKeyPlaceholderEdit')
                          : t('ofd.modal.apiKeyPlaceholder')
                      }
                      required={mode === 'create'}
                    />
                    {mode === 'edit' && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('ofd.modal.apiKeyHint')}
                      </p>
                    )}
                  </div>

                  {/* Custom Base URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('ofd.modal.customUrl')}
                    </label>
                    <Input
                      type="url"
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder={selectedProviderData?.base_url || connection?.provider_base_url || t('ofd.modal.customUrlPlaceholder')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedProviderData?.base_url || connection?.provider_base_url 
                        ? t('ofd.modal.customUrlHintWithDefault', { 
                            url: selectedProviderData?.base_url || connection?.provider_base_url 
                          })
                        : t('ofd.modal.customUrlHint')}
                    </p>
                  </div>

                  {/* Active status (only for edit mode) */}
                  {mode === 'edit' && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                        {t('ofd.modal.isActive')}
                      </label>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                      disabled={isLoading}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
    <Toast
      show={toast.show}
      type={toast.type}
      title={toast.title}
      message={toast.message}
      onClose={hideToast}
    />
    </>
  );
}