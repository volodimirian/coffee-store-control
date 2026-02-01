import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { ofdAPI, type OFDConnection, type OFDProduct, type ProductMapping } from '~/shared/api/ofd';
import { techCardsApi, type TechCardItem } from '~/shared/api/techCardsApi';
import SearchableSelect, { type SelectOption } from '~/shared/ui/SearchableSelect';
import { useToast } from '~/shared/lib/useToast';
import { Protected } from '~/shared/ui';

interface ProductMappingsProps {
  businessId: number;
  connections: OFDConnection[];
}

type FilterType = 'all' | 'mapped' | 'unmapped';

export default function ProductMappings({ businessId, connections }: ProductMappingsProps) {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();

  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [ofdProducts, setOfdProducts] = useState<OFDProduct[]>([]);
  const [existingMappings, setExistingMappings] = useState<ProductMapping[]>([]);
  const [techCardItems, setTechCardItems] = useState<TechCardItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for mapping selections
  const [mappingSelections, setMappingSelections] = useState<Record<string, number | null>>({});

  // Load tech card items on mount
  useEffect(() => {
    const loadTechCards = async () => {
      try {
        const response = await techCardsApi.listItems(businessId, { is_active: true, page_size: 1000 });
        setTechCardItems(response.items);
      } catch (err) {
        console.error('Failed to load tech card items:', err);
      }
    };
    loadTechCards();
  }, [businessId]);

  const loadProductsAndMappings = useCallback(async () => {
    if (!selectedConnectionId) return;

    setIsLoadingProducts(true);
    try {
      const [products, mappings] = await Promise.all([
        ofdAPI.getOFDProducts(selectedConnectionId),
        ofdAPI.getProductMappings(selectedConnectionId),
      ]);

      setOfdProducts(products);
      setExistingMappings(mappings);

      // Initialize selections from existing mappings
      const selections: Record<string, number | null> = {};
      mappings.forEach(mapping => {
        const key = getProductKey(mapping.ofd_product_id, mapping.ofd_product_name);
        selections[key] = mapping.tech_card_item_id;
      });
      setMappingSelections(selections);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      showError(t('ofd.mappings.errorLoadingProducts'), error.response?.data?.detail || error.message || '');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [selectedConnectionId, showError, t]);

  // Load products and mappings when connection changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadProductsAndMappings();
    } else {
      setOfdProducts([]);
      setExistingMappings([]);
      setMappingSelections({});
    }
  }, [selectedConnectionId, loadProductsAndMappings]);

  const getProductKey = (productId: string | null, productName: string): string => {
    return `${productId || 'null'}_${productName}`;
  };

  const handleSelectionChange = (productId: string | null, productName: string, techCardItemId: number | null) => {
    const key = getProductKey(productId, productName);
    setMappingSelections(prev => ({
      ...prev,
      [key]: techCardItemId,
    }));
  };

  const handleSave = async () => {
    if (!selectedConnectionId) return;

    // Collect only new/changed mappings
    const mappingsToCreate = ofdProducts
      .filter(product => {
        const key = getProductKey(product.id, product.name);
        const selectedId = mappingSelections[key];
        const existingMapping = existingMappings.find(
          m => m.ofd_product_id === product.id && m.ofd_product_name === product.name
        );

        // Create if: has selection AND (no existing mapping OR selection changed)
        return selectedId && (!existingMapping || existingMapping.tech_card_item_id !== selectedId);
      })
      .map(product => {
        const key = getProductKey(product.id, product.name);
        return {
          ofd_product_id: product.id,
          ofd_product_name: product.name,
          tech_card_item_id: mappingSelections[key]!,
        };
      });

    if (mappingsToCreate.length === 0) {
      showError(t('ofd.mappings.noChanges'), t('ofd.mappings.noChangesDescription'));
      return;
    }

    setIsSaving(true);
    try {
      const result = await ofdAPI.createProductMappings(selectedConnectionId, {
        mappings: mappingsToCreate,
      });

      success(
        t('ofd.mappings.saveSuccess'),
        t('ofd.mappings.saveSuccessDescription', {
          created: result.created,
          failed: result.failed,
        })
      );

      // Reload mappings
      await loadProductsAndMappings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      showError(t('ofd.mappings.errorLoadingProducts'), error.response?.data?.detail || error.message || '');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter products based on current filter and search
  const filteredProducts = ofdProducts.filter(product => {
    const hasMapping = existingMappings.some(
      m => m.ofd_product_id === product.id && m.ofd_product_name === product.name
    );

    // Apply filter
    if (filter === 'mapped' && !hasMapping) return false;
    if (filter === 'unmapped' && hasMapping) return false;

    // Apply search
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const techCardOptions: SelectOption[] = techCardItems.map(item => ({
    id: item.id,
    name: item.name,
  }));

  if (connections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('ofd.mappings.noConnections')}</p>
        <p className="text-sm text-gray-400 mt-2">{t('ofd.mappings.createConnectionFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('ofd.mappings.selectConnection')}
        </label>
        <SearchableSelect
          options={connections.map(conn => ({
            id: conn.id,
            name: conn.provider_name || 'Unknown',
          }))}
          value={
            selectedConnectionId
              ? connections.find(c => c.id === selectedConnectionId)
                ? { id: selectedConnectionId, name: connections.find(c => c.id === selectedConnectionId)!.provider_name || 'Unknown' }
                : null
              : null
          }
          onChange={(selected) => setSelectedConnectionId(selected ? Number(selected.id) : null)}
          placeholder={t('ofd.mappings.selectConnectionPlaceholder')}
        />
      </div>

      {selectedConnectionId && (
        <>
          {/* Actions and filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Protected permission={{ resource: 'product_mappings', action: 'view' }}>
                <button
                  onClick={loadProductsAndMappings}
                  disabled={isLoadingProducts}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoadingProducts ? 'animate-spin' : ''}`} />
                  {t('ofd.mappings.loadFromOFD')}
                </button>
              </Protected>

              {/* Filter buttons */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-gray-500" />
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('common.all')}
                </button>
                <button
                  onClick={() => setFilter('mapped')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filter === 'mapped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('ofd.mappings.mapped')}
                </button>
                <button
                  onClick={() => setFilter('unmapped')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filter === 'unmapped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('ofd.mappings.unmapped')}
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ofd.mappings.searchProducts')}
                className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Save button */}
              <Protected permission={{ resource: 'product_mappings', action: 'create' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="ml-auto px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </Protected>
            </div>
          </div>

          {/* Products table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ofd.mappings.ofdProduct')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ofd.mappings.techCardItem')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ofd.mappings.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingProducts ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t('ofd.mappings.noProducts')}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const key = getProductKey(product.id, product.name);
                      const selectedId = mappingSelections[key];
                      const existingMapping = existingMappings.find(
                        m => m.ofd_product_id === product.id && m.ofd_product_name === product.name
                      );

                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.id && (
                              <div className="text-xs text-gray-500">ID: {product.id}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <SearchableSelect
                              options={techCardOptions}
                              value={
                                selectedId
                                  ? techCardOptions.find(opt => opt.id === selectedId) || null
                                  : null
                              }
                              onChange={(selected) =>
                                handleSelectionChange(product.id, product.name, selected ? Number(selected.id) : null)
                              }
                              placeholder={t('ofd.mappings.selectTechCardItem')}
                              searchPlaceholder={t('ofd.mappings.searchTechCardItem')}
                              noResultsText={t('ofd.mappings.noTechCardItems')}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {existingMapping ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                {t('ofd.mappings.mapped')}
                              </span>
                            ) : selectedId ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                {t('ofd.mappings.pending')}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                {t('ofd.mappings.unmapped')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {filteredProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">
                {t('ofd.mappings.summary', {
                  total: ofdProducts.length,
                  mapped: existingMappings.length,
                  unmapped: ofdProducts.length - existingMappings.length,
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
