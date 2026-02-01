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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 25;

  // Local state for mapping selections
  const [mappingSelections, setMappingSelections] = useState<Record<string, number | null>>({});

  // Load tech card items on mount (load all for dropdown)
  useEffect(() => {
    const loadTechCards = async () => {
      try {
        let allItems: TechCardItem[] = [];
        let page = 1;
        const pageSize = 100;
        
        // Load first page to get total count
        const firstResponse = await techCardsApi.listItems(businessId, { 
          is_active: true, 
          page_size: pageSize,
          page: 1
        });
        
        allItems = [...firstResponse.items];
        const totalPages = Math.ceil(firstResponse.total / pageSize);
        
        // Load remaining pages (if any)
        if (totalPages > 1) {
          for (page = 2; page <= totalPages; page++) {
            const response = await techCardsApi.listItems(businessId, { 
              is_active: true, 
              page_size: pageSize,
              page
            });
            allItems = [...allItems, ...response.items];
          }
        }
        
        setTechCardItems(allItems);
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
      const [productsResponse, mappings] = await Promise.all([
        ofdAPI.getOFDProducts(selectedConnectionId, {
          page: currentPage,
          page_size: pageSize,
          filter,
          search: searchQuery || undefined
        }),
        ofdAPI.getProductMappings(selectedConnectionId),
      ]);

      setOfdProducts(productsResponse.items);
      setTotalPages(productsResponse.pages);
      setTotalItems(productsResponse.total);
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
  }, [selectedConnectionId, currentPage, pageSize, filter, searchQuery, showError, t]);

  // Load products and mappings when connection or filters change
  useEffect(() => {
    if (selectedConnectionId) {
      loadProductsAndMappings();
    } else {
      setOfdProducts([]);
      setExistingMappings([]);
      setMappingSelections({});
      setCurrentPage(1);
      setTotalPages(1);
      setTotalItems(0);
    }
  }, [selectedConnectionId, loadProductsAndMappings]);
  
  // Reset to page 1 when filter or search changes
  useEffect(() => {
    if (selectedConnectionId) {
      setCurrentPage(1);
    }
  }, [filter, searchQuery, selectedConnectionId]);

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

  // Products are already filtered on server
  const filteredProducts = ofdProducts;

  const techCardOptions: SelectOption[] = techCardItems.map(item => ({
    id: item.id,
    name: item.name,
  }));
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ofd.mappings.ofdProduct')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
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
                          <td className="px-6 py-4 relative">
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.next')}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t('common.showing')} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> - 
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> {t('common.of')} 
                      <span className="font-medium">{totalItems}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('common.previous')}</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('common.next')}</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {filteredProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">
                {t('common.total')}: {totalItems}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
