/**
 * OFD Integration API - Providers and Connections management
 */

import { api } from './client';

// ============ Types ============

export interface OFDProvider {
  id: number;
  code: string;
  name: string;
  base_url: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface OFDConnection {
  id: number;
  business_id: number;
  provider_id: number;
  provider_name: string | null;
  provider_base_url: string | null;
  api_key_preview: string | null;
  custom_base_url: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  first_import_date: string | null;
  last_imported_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OFDConnectionCreate {
  provider_id: number;
  api_key: string;
  custom_base_url?: string | null;
}

export interface OFDConnectionUpdate {
  api_key?: string | null;
  custom_base_url?: string | null;
  is_active?: boolean | null;
}

export interface OFDConnectionTestResponse {
  success: boolean;
  error: string | null;
}

export interface OFDProduct {
  id: string | null;  // Changed from product_id for consistency
  name: string;       // Changed from product_name for consistency
  category: string | null;
}

export interface OFDProductsResponse {
  items: OFDProduct[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TechCardItem {
  id: number;
  name: string;
  description: string | null;
  selling_price: string;
  is_active: boolean;
  approval_status: string;
}

export interface ProductMapping {
  id: number;
  connection_id: number;
  ofd_product_id: string | null;
  ofd_product_name: string;
  tech_card_item_id: number;
  tech_card_item_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductMappingCreate {
  ofd_product_id: string | null;
  ofd_product_name: string;
  tech_card_item_id: number;
}

export interface ProductMappingBulkCreate {
  mappings: ProductMappingCreate[];
}

export interface ProductMappingUpdate {
  tech_card_item_id?: number | null;
  is_active?: boolean | null;
}

export interface ProductMappingBulkResponse {
  success: ProductMapping[];
  errors: Array<{ ofd_product_name: string; error: string }>;
  total: number;
  created: number;
  failed: number;
}

export interface SyncSalesRequest {
  start_date?: string;
  end_date?: string;
}

export interface SyncSalesResponse {
  total_receipts: number;
  new_receipts: number;
  duplicate_receipts: number;
  updated_receipts: number;
  mapped_items: number;
  unmapped_items: number;
  errors: string[];
  actual_start_date: string;
  actual_end_date: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_mapping_id: number | null;
  tech_card_item_id: number | null;
  tech_card_item_name: string | null;
  ofd_product_id: string | null;
  ofd_product_name: string;
  quantity: string;
  price: string;
  total: string;
  is_mapped: boolean;
  processed: boolean;
}

export interface Sale {
  id: number;
  business_id: number;
  connection_id: number;
  ofd_receipt_id: string;
  receipt_datetime: string;
  total_amount: string;
  fiscal_document_number: string | null;
  fiscal_sign: string | null;
  processing_status: string;
  processing_error: string | null;
  processed_at: string | null;
  imported_at: string;
  updated_at: string | null;
  items_count: number;
  unmapped_items_count: number;
  items?: SaleItem[]; // Optional: only present in detail view
}

export interface SalesListResponse {
  items: Sale[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ============ Providers API ============

export const ofdAPI = {
  // Get all active OFD providers
  getProviders: async (): Promise<OFDProvider[]> => {
    const response = await api.get<OFDProvider[]>('/ofd/providers');
    return response.data;
  },

  // ============ Connections API ============

  // Get all connections for a business
  getConnections: async (businessId: number): Promise<OFDConnection[]> => {
    const response = await api.get<OFDConnection[]>(
      `/ofd/business/${businessId}/connections`
    );
    return response.data;
  },

  // Get connection by ID
  getConnection: async (connectionId: number): Promise<OFDConnection> => {
    const response = await api.get<OFDConnection>(
      `/ofd/connections/${connectionId}`
    );
    return response.data;
  },

  // Create new connection
  createConnection: async (
    businessId: number,
    data: OFDConnectionCreate
  ): Promise<OFDConnection> => {
    const response = await api.post<OFDConnection>(
      `/ofd/business/${businessId}/connections`,
      data
    );
    return response.data;
  },

  // Update connection
  updateConnection: async (
    connectionId: number,
    data: OFDConnectionUpdate
  ): Promise<OFDConnection> => {
    const response = await api.put<OFDConnection>(
      `/ofd/connections/${connectionId}`,
      data
    );
    return response.data;
  },

  // Delete connection
  deleteConnection: async (connectionId: number): Promise<void> => {
    await api.delete(`/ofd/connections/${connectionId}`);
  },

  // Test connection credentials
  testConnection: async (
    connectionId: number
  ): Promise<OFDConnectionTestResponse> => {
    const response = await api.post<OFDConnectionTestResponse>(
      `/ofd/connections/${connectionId}/test`
    );
    return response.data;
  },

  // ============ Product Mappings API ============

  // Get products from OFD provider with pagination and filtering
  getOFDProducts: async (
    connectionId: number,
    params?: {
      page?: number;
      page_size?: number;
      filter?: 'all' | 'mapped' | 'unmapped';
      search?: string;
    }
  ): Promise<OFDProductsResponse> => {
    const response = await api.get<OFDProductsResponse>(
      `/ofd/connections/${connectionId}/products`,
      { params }
    );
    return response.data;
  },

  // Get all product mappings for a connection
  getProductMappings: async (connectionId: number): Promise<ProductMapping[]> => {
    const response = await api.get<ProductMapping[]>(
      `/ofd/connections/${connectionId}/mappings`
    );
    return response.data;
  },

  // Create one or multiple product mappings
  createProductMappings: async (
    connectionId: number,
    data: ProductMappingBulkCreate
  ): Promise<ProductMappingBulkResponse> => {
    const response = await api.post<ProductMappingBulkResponse>(
      `/ofd/connections/${connectionId}/mappings`,
      data
    );
    return response.data;
  },

  // Update product mapping
  updateProductMapping: async (
    mappingId: number,
    data: ProductMappingUpdate
  ): Promise<ProductMapping> => {
    const response = await api.put<ProductMapping>(
      `/ofd/mappings/${mappingId}`,
      data
    );
    return response.data;
  },

  // Delete product mapping
  deleteProductMapping: async (mappingId: number): Promise<void> => {
    await api.delete(`/ofd/mappings/${mappingId}`);
  },

  // ============ Sales Sync API ============

  // Synchronize sales from OFD provider
  syncSales: async (
    connectionId: number,
    data: SyncSalesRequest
  ): Promise<SyncSalesResponse> => {
    const response = await api.post<SyncSalesResponse>(
      `/ofd/connections/${connectionId}/sync-sales`,
      data
    );
    return response.data;
  },

  // ============ Sales API ============

  // Get sales list for a business with pagination and filtering
  getSales: async (
    businessId: number,
    params?: {
      page?: number;
      page_size?: number;
      status?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<SalesListResponse> => {
    const response = await api.get<SalesListResponse>(
      `/ofd/business/${businessId}/sales`,
      { params }
    );
    return response.data;
  },

  // Get single sale details with items
  getSale: async (saleId: number): Promise<Sale> => {
    const response = await api.get<Sale>(`/ofd/sales/${saleId}`);
    return response.data;
  },

  // Update all sales processing status for a business
  updateSalesStatus: async (businessId: number): Promise<{ message: string; updated_counts: { processed: number; pending: number; partially_processed?: number; error: number } }> => {
    const response = await api.post(`/ofd/business/${businessId}/update-sales-status`);
    return response.data;
  },

  // Process a single sale (create ingredient expenses)
  processSale: async (saleId: number): Promise<{ success: boolean; processed_items: number; expenses_created: number; errors?: string[] }> => {
    const response = await api.post(`/ofd/sales/${saleId}/process`);
    return response.data;
  },
};
