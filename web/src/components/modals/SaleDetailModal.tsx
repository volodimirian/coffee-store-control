import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon, PlusIcon, CogIcon } from '@heroicons/react/24/outline';
import type { Sale, SaleItem } from '~/shared/api/ofd';
import { ofdAPI } from '~/shared/api';
import { techCardsApi, type TechCardItem } from '~/shared/api/techCardsApi';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import TechCardModal from './TechCardModal';
import { useToast } from '~/shared/lib/useToast';
import Toast from '~/shared/ui/Toast';

interface SaleDetailModalProps {
  isOpen: boolean;
  sale: Sale | null;
  isLoading: boolean;
  onClose: () => void;
  onMappingCreated?: () => void;
}

export default function SaleDetailModal({
  isOpen,
  sale,
  isLoading,
  onClose,
  onMappingCreated,
}: SaleDetailModalProps) {
  const { t } = useTranslation();
  const { toast, success, error: showError, hideToast } = useToast();
  const [techCards, setTechCards] = useState<TechCardItem[]>([]);
  const [isLoadingTechCards, setIsLoadingTechCards] = useState(false);
  const [mappingInProgress, setMappingInProgress] = useState<Record<number, number | null>>({});
  const [isCreatingTechCard, setIsCreatingTechCard] = useState(false);
  const [selectedItemForCreate, setSelectedItemForCreate] = useState<SaleItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load tech cards when modal opens
  useEffect(() => {
    const loadTechCards = async () => {
      if (!isOpen || !sale) return;
      
      setIsLoadingTechCards(true);
      try {
        const response = await techCardsApi.listItems(sale.business_id, {
          is_active: true,
        });
        setTechCards(response.items);
      } catch (err) {
        console.error('Failed to load tech cards:', err);
      } finally {
        setIsLoadingTechCards(false);
      }
    };
    
    loadTechCards();
  }, [isOpen, sale]);

  const handleCreateMapping = async (item: SaleItem, techCardItemId: number) => {
    if (!sale) return;
    
    try {
      await ofdAPI.createProductMappings(sale.connection_id, {
        mappings: [{
          ofd_product_id: item.ofd_product_id,
          ofd_product_name: item.ofd_product_name,
          tech_card_item_id: techCardItemId,
        }],
      });
      
      // Clear selection
      setMappingInProgress(prev => ({ ...prev, [item.id]: null }));
      
      // Notify parent to reload
      if (onMappingCreated) {
        await onMappingCreated();
      }
    } catch (err) {
      console.error('Failed to create mapping:', err);
      alert(t('sales.mappingError'));
    }
  };

  const handleTechCardCreated = async () => {
    if (!selectedItemForCreate || !sale) return;
    
    // Reload tech cards list
    try {
      const response = await techCardsApi.listItems(sale.business_id, {
        is_active: true,
      });
      setTechCards(response.items);
    } catch (err) {
      console.error('Failed to reload tech cards:', err);
    }
    
    // Close create modal and notify parent
    setIsCreatingTechCard(false);
    setSelectedItemForCreate(null);
    
    if (onMappingCreated) {
      onMappingCreated();
    }
  };

  const handleProcessSale = async () => {
    if (!sale) return;
    
    setIsProcessing(true);
    try {
      const result = await ofdAPI.processSale(sale.id);
      
      success(
        t('sales.saleProcessed'),
        t('sales.saleProcessedDetails', {
          items: result.processed_items,
          expenses: result.expenses_created,
        })
      );
      
      // Reload sale data
      if (onMappingCreated) {
        await onMappingCreated();
      }
    } catch (err) {
      console.error('Failed to process sale:', err);
      showError(
        t('sales.processSaleError'),
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('sales.receiptDetails')}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t('sales.receiptId')}: {sale.ofd_receipt_id}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t('sales.loadingDetails')}</p>
              </div>
            ) : sale ? (
              <div className="space-y-6">
                {/* Receipt Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">{t('sales.receiptDate')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(sale.receipt_datetime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('sales.totalAmount')}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {parseFloat(sale.total_amount).toFixed(2)} ₽
                    </p>
                  </div>
                  {sale.fiscal_document_number && (
                    <div>
                      <p className="text-xs text-gray-500">{t('sales.fiscalDocument')}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {sale.fiscal_document_number}
                      </p>
                    </div>
                  )}
                  {sale.fiscal_sign && (
                    <div>
                      <p className="text-xs text-gray-500">{t('sales.fiscalSign')}</p>
                      <p className="text-sm font-mono text-gray-900">
                        {sale.fiscal_sign}
                      </p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    {t('sales.receiptItems')}
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('sales.productName')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('sales.quantity')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('sales.price')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('sales.total')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('sales.mapping')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sale.items?.map((item) => (
                          <tr key={item.id} className={!item.is_mapped ? 'bg-red-50' : ''}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.ofd_product_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {parseFloat(item.quantity)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {parseFloat(item.price).toFixed(2)} ₽
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {parseFloat(item.total).toFixed(2)} ₽
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.is_mapped ? (
                                <div className="flex items-center text-green-700">
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  <span className="text-xs">
                                    {item.tech_card_item_name || t('sales.mapped')}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-[200px]">
                                      <SearchableSelect
                                        options={techCards.map(tc => ({
                                          id: tc.id.toString(),
                                          name: tc.name,
                                        }))}
                                        value={mappingInProgress[item.id] ? {
                                          id: mappingInProgress[item.id]!.toString(),
                                          name: techCards.find(tc => tc.id === mappingInProgress[item.id])?.name || '',
                                        } : null}
                                        onChange={(selected: SelectOption | null) => {
                                          if (selected) {
                                            setMappingInProgress(prev => ({ 
                                              ...prev, 
                                              [item.id]: Number(selected.id) 
                                            }));
                                          }
                                        }}
                                        placeholder={t('sales.selectTechCard')}
                                        searchPlaceholder={t('sales.searchTechCard')}
                                        noResultsText={t('sales.noTechCardsFound')}
                                        disabled={isLoadingTechCards}
                                      />
                                    </div>
                                    {mappingInProgress[item.id] && (
                                      <button
                                        onClick={() => handleCreateMapping(item, mappingInProgress[item.id]!)}
                                        className="flex items-center px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        {t('sales.link')}
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedItemForCreate(item);
                                      setIsCreatingTechCard(true);
                                    }}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    {t('sales.createNewTechCard')}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t('sales.failedToLoadDetails')}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div>
              {sale && sale.items && sale.items.some(item => item.is_mapped && !item.processed) && (
                <button
                  onClick={handleProcessSale}
                  disabled={isProcessing}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CogIcon className="h-4 w-4 mr-2" />
                  {isProcessing ? t('sales.processing') : t('sales.processSale')}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      {/* Tech Card Create Modal */}
      <TechCardModal
        isOpen={isCreatingTechCard}
        onClose={() => {
          setIsCreatingTechCard(false);
          setSelectedItemForCreate(null);
        }}
        onSuccess={handleTechCardCreated}
        mode="create"
        initialName={selectedItemForCreate?.ofd_product_name}
        initialPrice={selectedItemForCreate?.price}
      />

      {/* Toast Notifications */}
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
