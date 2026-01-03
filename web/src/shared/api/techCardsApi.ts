import { api } from '~/shared/api';

export interface TechCardItemIngredient {
  ingredient_category_id: number;
  quantity: number;
  unit_id: number;
  notes?: string;
  sort_order?: number;
}

export interface TechCardItem {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  selling_price: number;
  is_active: boolean;
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  ingredients: TechCardItemIngredient[];
  total_ingredient_cost?: number;
  profit_margin?: number;
  profit_percentage?: number;
  category_name?: string;
}

export interface TechCardItemCreate {
  name: string;
  description?: string;
  selling_price: number;
  is_active: boolean;
  ingredients: TechCardItemIngredient[];
}

export interface TechCardItemUpdate {
  name?: string;
  description?: string;
  selling_price?: number;
  is_active?: boolean;
  ingredients?: TechCardItemIngredient[];
}

export interface TechCardItemListResponse {
  items: TechCardItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TechCardItemFilters {
  page?: number;
  page_size?: number;
  category_id?: number;
  is_active?: boolean;
  approval_status?: string;
}

class TechCardsApi {
  /**
   * List tech card items with filters
   */
  async listItems(
    businessId: number,
    filters?: TechCardItemFilters
  ): Promise<TechCardItemListResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.category_id) params.append('category_id', filters.category_id.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.approval_status) params.append('approval_status', filters.approval_status);

    const queryString = params.toString();
    const url = `/tech-cards/business/${businessId}/items${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<TechCardItemListResponse>(url);
    return response.data;
  }

  /**
   * Get tech card item by ID
   */
  async getItem(businessId: number, itemId: number): Promise<TechCardItem> {
    const response = await api.get<TechCardItem>(
      `/tech-cards/business/${businessId}/items/${itemId}`
    );
    return response.data;
  }

  /**
   * Create new tech card item
   */
  async createItem(businessId: number, data: TechCardItemCreate): Promise<TechCardItem> {
    const response = await api.post<TechCardItem>(
      `/tech-cards/business/${businessId}/items`,
      data
    );
    return response.data;
  }

  /**
   * Update tech card item
   */
  async updateItem(
    businessId: number,
    itemId: number,
    data: TechCardItemUpdate
  ): Promise<TechCardItem> {
    const response = await api.put<TechCardItem>(
      `/tech-cards/business/${businessId}/items/${itemId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete tech card item
   */
  async deleteItem(businessId: number, itemId: number): Promise<void> {
    await api.delete(`/tech-cards/business/${businessId}/items/${itemId}`);
  }

  /**
   * Approve or reject tech card item
   */
  async updateApproval(
    businessId: number,
    itemId: number,
    approvalStatus: 'approved' | 'rejected'
  ): Promise<TechCardItem> {
    const response = await api.post<TechCardItem>(
      `/tech-cards/business/${businessId}/items/${itemId}/approval`,
      { approval_status: approvalStatus }
    );
    return response.data;
  }
}

export const techCardsApi = new TechCardsApi();
