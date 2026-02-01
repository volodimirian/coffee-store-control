import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { ofdAPI, type OFDConnection, type OFDProvider } from '~/shared/api/ofd';
import { useAppContext } from '~/shared/context/AppContext';
import { Protected } from '~/shared/ui';
import { usePermissions } from '~/shared/lib/usePermissions';
import { can } from '~/shared/utils/permissions';
import { useToast } from '~/shared/lib/useToast';
import Toast from '~/shared/ui/Toast';
import OFDConnectionModal from '~/components/modals/OFDConnectionModal';
import ConfirmDeleteModal from '~/components/modals/ConfirmDeleteModal';
import ProductMappings from '~/components/ProductMappings';
import { format } from 'date-fns';

export default function OFDIntegration() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();
  const { toast, success, error: showError, hideToast } = useToast();

  // Active tab
  const [activeTab, setActiveTab] = useState<'connections' | 'mappings'>('connections');

  const [connections, setConnections] = useState<OFDConnection[]>([]);
  const [providers, setProviders] = useState<OFDProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<OFDConnection | null>(null);
  const [connectionMode, setConnectionMode] = useState<'create' | 'edit'>('create');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<OFDConnection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Testing connection
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);

  // Load providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await ofdAPI.getProviders();
        setProviders(data);
      } catch (err) {
        console.error('Failed to load OFD providers:', err);
      }
    };
    loadProviders();
  }, []);

  // Load connections
  const loadConnections = useCallback(async () => {
    if (!currentLocation) {
      setError(t('ofd.errors.loadingError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await ofdAPI.getConnections(currentLocation.id);
      setConnections(data);
    } catch (err) {
      console.error('Failed to load OFD connections:', err);
      setError(t('ofd.errors.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, t]);

  useEffect(() => {
    if (!isLoadingPermissions && can.view(permissions, 'ofd_connections')) {
      loadConnections();
    }
  }, [isLoadingPermissions, permissions, loadConnections]);

  // Handlers
  const handleCreateConnection = () => {
    setSelectedConnection(null);
    setConnectionMode('create');
    setIsConnectionModalOpen(true);
  };

  const handleEditConnection = (connection: OFDConnection) => {
    setSelectedConnection(connection);
    setConnectionMode('edit');
    setIsConnectionModalOpen(true);
  };

  const handleDeleteClick = (connection: OFDConnection) => {
    setConnectionToDelete(connection);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;

    setIsDeleting(true);
    try {
      await ofdAPI.deleteConnection(connectionToDelete.id);
      success(t('ofd.deleteSuccess'));
      await loadConnections();
      setIsDeleteModalOpen(false);
      setConnectionToDelete(null);
    } catch (err) {
      console.error('Failed to delete connection:', err);
      showError(t('ofd.errors.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestConnection = async (connectionId: number) => {
    setTestingConnectionId(connectionId);
    try {
      const result = await ofdAPI.testConnection(connectionId);
      if (result.success) {
        success(t('ofd.testSuccess'));
      } else {
        showError(
          t('ofd.testFailed'),
          result.error || t('ofd.unknownError')
        );
      }
      // Reload connections regardless of test result to show updated sync status
      await loadConnections();
    } catch (err) {
      console.error('Failed to test connection:', err);
      const errorMessage = err instanceof Error ? err.message : t('ofd.unknownError');
      showError(t('ofd.testFailed'), errorMessage);
      // Reload connections even on error to show updated status
      await loadConnections();
    } finally {
      setTestingConnectionId(null);
    }
  };

  const handleConnectionSaved = () => {
    success(
      connectionMode === 'create' 
        ? t('ofd.createSuccess')
        : t('ofd.updateSuccess')
    );
    loadConnections();
    setIsConnectionModalOpen(false);
  };

  // Format sync status
  const getSyncStatusBadge = (connection: OFDConnection) => {
    if (!connection.last_sync_status) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          {t('ofd.status.notSynced')}
        </span>
      );
    }

    if (connection.last_sync_status === 'success') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          {t('ofd.status.success')}
        </span>
      );
    }

    if (connection.last_sync_status === 'error' || connection.last_sync_status === 'failed') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          {t('ofd.status.failed')}
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
        {connection.last_sync_status}
      </span>
    );
  };

  if (isLoadingPermissions) {
    return <div className="p-6 text-center">{t('common.loading')}</div>;
  }

  if (!can.view(permissions, 'ofd_connections')) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t('permissions.noAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('ofd.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('ofd.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('connections')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'connections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {t('ofd.tabs.connections')}
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'mappings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {t('ofd.tabs.productMappings')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          {/* Action button */}
          <div className="flex justify-end">
            <Protected permission={{ resource: 'ofd_connections', action: 'create' }}>
              <button
                onClick={handleCreateConnection}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('ofd.addConnection')}
              </button>
            </Protected>
          </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Connections table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ofd.table.provider')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ofd.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ofd.table.lastSync')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ofd.table.syncStatus')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : connections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('ofd.noConnections')}
                  </td>
                </tr>
              ) : (
                connections.map(connection => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {connection.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {connection.is_active ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {connection.last_sync_at
                        ? format(new Date(connection.last_sync_at), 'dd.MM.yyyy HH:mm')
                        : t('ofd.neverSynced')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSyncStatusBadge(connection)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTestConnection(connection.id)}
                          disabled={testingConnectionId === connection.id}
                          className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          title={t('ofd.testConnection')}
                        >
                          <SignalIcon className="w-5 h-5" />
                        </button>
                        <Protected permission={{ resource: 'ofd_connections', action: 'edit' }}>
                          <button
                            onClick={() => handleEditConnection(connection)}
                            className="text-blue-600 hover:text-blue-700"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </Protected>
                        <Protected permission={{ resource: 'ofd_connections', action: 'delete' }}>
                          <button
                            onClick={() => handleDeleteClick(connection)}
                            className="text-red-600 hover:text-red-700"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </Protected>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {activeTab === 'mappings' && (
        <ProductMappings businessId={currentLocation!.id} connections={connections} />
      )}

      {/* Modals */}
      {isConnectionModalOpen && (
        <OFDConnectionModal
          connection={selectedConnection}
          mode={connectionMode}
          providers={providers}
          onClose={() => setIsConnectionModalOpen(false)}
          onSave={handleConnectionSaved}
        />
      )}

      {isDeleteModalOpen && connectionToDelete && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          title={t('ofd.deleteConnectionTitle')}
          message={t('ofd.deleteConnectionMessage', {
            provider: connectionToDelete.provider_name,
          })}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setConnectionToDelete(null);
          }}
          isLoading={isDeleting}
        />
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </div>
  );
}
