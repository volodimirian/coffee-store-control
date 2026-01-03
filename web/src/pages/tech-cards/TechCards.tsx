import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '~/shared/context/AppContext';
import { Protected, Input } from '~/shared/ui';
import { techCardsApi, type TechCardItem } from '~/shared/api/techCardsApi';
import TechCardModal from '~/components/modals/TechCardModal';
import ConfirmModal from '~/components/modals/ConfirmModal';
import { formatCurrency } from '~/shared/lib/helpers';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';

export default function TechCards() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();

  // State
  const [items, setItems] = useState<TechCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TechCardItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: 'warning' | 'success' | 'info' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'warning',
    onConfirm: () => {},
  });

  // Load data
  const loadData = useCallback(async () => {
    if (!currentLocation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const itemsRes = await techCardsApi.listItems(currentLocation.id, {
        page: 1,
        page_size: 100,
        is_active: activeFilter ? activeFilter === 'true' : undefined,
        approval_status: statusFilter || undefined,
      });

      setItems(itemsRes.items);
    } catch (err) {
      console.error('Failed to load tech cards:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [currentLocation, statusFilter, activeFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter items by search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleCreate = () => {
    setSelectedItem(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (item: TechCardItem) => {
    setSelectedItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (item: TechCardItem) => {
    setSelectedItem(item);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: TechCardItem) => {
    if (!currentLocation?.id) return;
    
    setConfirmModal({
      isOpen: true,
      title: t('common.confirmDeletion'),
      message: t('techCards.confirmDelete', { name: item.name }),
      confirmText: t('common.delete'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await techCardsApi.deleteItem(currentLocation.id, item.id);
          await loadData();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          console.error('Failed to delete item:', err);
          // Show error in confirm modal or add error state
        }
      },
    });
  };

  const handleApprove = async (item: TechCardItem, status: 'approved' | 'rejected') => {
    if (!currentLocation?.id) return;
    
    const isApprove = status === 'approved';
    
    setConfirmModal({
      isOpen: true,
      title: isApprove ? t('techCards.actions.approve') : t('techCards.actions.reject'),
      message: isApprove ? t('techCards.confirmApprove') : t('techCards.confirmReject'),
      confirmText: isApprove ? t('techCards.actions.approve') : t('techCards.actions.reject'),
      type: isApprove ? 'success' : 'warning',
      onConfirm: async () => {
        try {
          await techCardsApi.updateApproval(currentLocation.id, item.id, status);
          await loadData();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          console.error('Failed to update approval:', err);
        }
      },
    });
  };

  const handleModalSuccess = () => {
    loadData();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`techCards.status.${status}`)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('techCards.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('techCards.description')}</p>
        </div>
        <Protected permission={{ resource: 'tech_card_items', action: 'create' }}>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('techCards.addItem')}
          </button>
        </Protected>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('techCards.filters.search')}
            </label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('techCards.filters.searchPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('techCards.filters.status')}
            </label>
            <SearchableSelect
              options={[
                { id: '', name: t('common.all') },
                { id: 'draft', name: t('techCards.status.draft') },
                { id: 'approved', name: t('techCards.status.approved') },
                { id: 'rejected', name: t('techCards.status.rejected') },
              ]}
              value={statusFilter ? { id: statusFilter, name: t(`techCards.status.${statusFilter}`) } : { id: '', name: t('common.all') }}
              onChange={(selected: SelectOption | null) => setStatusFilter(selected && selected.id !== '' ? String(selected.id) : '')}
              placeholder={t('techCards.filters.status')}
              searchPlaceholder={t('common.search')}
              noResultsText={t('common.noResults')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('techCards.filters.active')}
            </label>
            <SearchableSelect
              options={[
                { id: '', name: t('common.all') },
                { id: 'true', name: t('common.active') },
                { id: 'false', name: t('common.inactive') },
              ]}
              value={
                activeFilter === 'true'
                  ? { id: 'true', name: t('common.active') }
                  : activeFilter === 'false'
                  ? { id: 'false', name: t('common.inactive') }
                  : { id: '', name: t('common.all') }
              }
              onChange={(selected: SelectOption | null) => setActiveFilter(selected && selected.id !== '' ? String(selected.id) : '')}
              placeholder={t('techCards.filters.active')}
              searchPlaceholder={t('common.search')}
              noResultsText={t('common.noResults')}
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12 text-gray-500">
              {t('techCards.noItems')}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('techCards.fields.name')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('techCards.fields.sellingPrice')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('techCards.fields.cost')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('techCards.fields.margin')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('techCards.filters.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const cost = Number(item.total_ingredient_cost || 0);
                  const margin = Number(item.profit_margin || 0);
                  const marginPercent = Number(item.profit_percentage || 0);

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => handleView(item)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(item.selling_price, 2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {cost > 0 ? formatCurrency(cost, 2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {margin > 0 ? (
                          <div>
                            <div className="font-medium text-gray-900">{formatCurrency(margin, 2)}</div>
                            <div className={`text-xs ${marginPercent > 30 ? 'text-green-600' : marginPercent > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {formatCurrency(marginPercent, 2, '')}%
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(item.approval_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                        {item.approval_status === 'draft' && (
                          <Protected permission={{ resource: 'tech_card_items', action: 'approve' }}>
                            <button
                              onClick={() => handleApprove(item, 'approved')}
                              className="text-green-600 hover:text-green-900"
                              title={t('techCards.actions.approve')}
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          </Protected>
                        )}
                        <Protected permission={{ resource: 'tech_card_items', action: 'edit' }}>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('techCards.actions.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </Protected>
                        <Protected permission={{ resource: 'tech_card_items', action: 'delete' }}>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                            title={t('techCards.actions.delete')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </Protected>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <TechCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        item={selectedItem}
        mode={modalMode}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={t('common.cancel')}
        type={confirmModal.type}
      />
    </div>
  );
}
