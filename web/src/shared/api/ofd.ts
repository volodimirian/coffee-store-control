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
};
