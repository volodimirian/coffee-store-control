/**
 * Expenses API - Category, Section, Unit, and Supplier management
 */

import { api } from './client';
import type {
  Unit,
  UnitCreate,
  UnitUpdate,
  UnitListResponse,
  MonthPeriod,
  MonthPeriodCreate,
  MonthPeriodUpdate,
  MonthPeriodListResponse,
  ExpenseSection,
  ExpenseSectionCreate,
  ExpenseSectionUpdate,
  ExpenseSectionListResponse,
  ExpenseCategory,
  ExpenseCategoryCreate,
  ExpenseCategoryUpdate,
  ExpenseCategoryListResponse,
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  SupplierListResponse,
} from './types';

// ============ Units API ============

interface UnitListParams {
  business_id?: number;
  unit_type?: string;
  is_active?: boolean;
  include_conversions?: boolean;
  skip?: number;
  limit?: number;
  search?: string;
}

export const unitsApi = {
  /**
   * Get all units for a business
   */
  list: async (params: UnitListParams = {}): Promise<UnitListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<UnitListResponse>(
      `/expenses/units/business/${params.business_id}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get unit by ID
   */
  get: async (unitId: number, includeConversions = false): Promise<Unit> => {
    const response = await api.get<Unit>(
      `/expenses/units/${unitId}?include_conversions=${includeConversions}`
    );
    return response.data;
  },

  /**
   * Create new unit
   */
  create: async (data: UnitCreate): Promise<Unit> => {
    const response = await api.post<Unit>('/expenses/units/', data);
    return response.data;
  },

  /**
   * Update unit
   */
  update: async (unitId: number, data: UnitUpdate): Promise<Unit> => {
    const response = await api.put<Unit>(`/expenses/units/${unitId}`, data);
    return response.data;
  },

  /**
   * Delete unit (soft delete)
   */
  delete: async (unitId: number): Promise<void> => {
    await api.delete(`/expenses/units/${unitId}`);
  },

  /**
   * Restore deleted unit
   */
  restore: async (unitId: number): Promise<Unit> => {
    const response = await api.post<Unit>(`/expenses/units/${unitId}/restore`);
    return response.data;
  },
};

// ============ Month Periods API ============

interface MonthPeriodListParams {
  business_id: number;
  status?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export const monthPeriodsApi = {
  /**
   * Get all periods for a business
   */
  list: async (params: MonthPeriodListParams): Promise<MonthPeriodListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'business_id') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<MonthPeriodListResponse>(
      `/expenses/periods/business/${params.business_id}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get period by ID
   */
  get: async (periodId: number): Promise<MonthPeriod> => {
    const response = await api.get<MonthPeriod>(`/expenses/periods/${periodId}`);
    return response.data;
  },

  /**
   * Create new period
   */
  create: async (data: MonthPeriodCreate): Promise<MonthPeriod> => {
    const response = await api.post<MonthPeriod>('/expenses/periods/', data);
    return response.data;
  },

  /**
   * Update period
   */
  update: async (periodId: number, data: MonthPeriodUpdate): Promise<MonthPeriod> => {
    const response = await api.put<MonthPeriod>(`/expenses/periods/${periodId}`, data);
    return response.data;
  },

  /**
   * Delete period (soft delete)
   */
  delete: async (periodId: number): Promise<void> => {
    await api.delete(`/expenses/periods/${periodId}`);
  },
};

// ============ Expense Sections API ============

interface ExpenseSectionListParams {
  business_id: number;
  is_active?: boolean;
  include_categories?: boolean;
  skip?: number;
  limit?: number;
  search?: string;
}

export const expenseSectionsApi = {
  /**
   * Get all sections for a business
   */
  list: async (params: ExpenseSectionListParams): Promise<ExpenseSectionListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && 
          key !== 'business_id') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<ExpenseSectionListResponse>(
      `/expenses/sections/business/${params.business_id}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get section by ID
   */
  get: async (sectionId: number, includeCategories = false): Promise<ExpenseSection> => {
    const response = await api.get<ExpenseSection>(
      `/expenses/sections/${sectionId}?include_categories=${includeCategories}`
    );
    return response.data;
  },

  /**
   * Create new section
   */
  create: async (data: ExpenseSectionCreate): Promise<ExpenseSection> => {
    const response = await api.post<ExpenseSection>('/expenses/sections/', data);
    return response.data;
  },

  /**
   * Update section
   */
  update: async (sectionId: number, data: ExpenseSectionUpdate): Promise<ExpenseSection> => {
    const response = await api.put<ExpenseSection>(`/expenses/sections/${sectionId}`, data);
    return response.data;
  },

  /**
   * Delete section (soft delete)
   */
  delete: async (sectionId: number): Promise<void> => {
    await api.delete(`/expenses/sections/${sectionId}`);
  },

  /**
   * Restore deleted section
   */
  restore: async (sectionId: number): Promise<ExpenseSection> => {
    const response = await api.post<ExpenseSection>(`/expenses/sections/${sectionId}/restore`);
    return response.data;
  },

  /**
   * Deactivate section and all its categories
   */
  deactivate: async (sectionId: number): Promise<void> => {
    await api.patch(`/expenses/sections/${sectionId}/deactivate`);
  },

  /**
   * Activate section (categories remain inactive until manually activated)
   */
  activate: async (sectionId: number): Promise<void> => {
    await api.patch(`/expenses/sections/${sectionId}/activate`);
  },
};

// ============ Expense Categories API ============

interface ExpenseCategoryListParams {
  section_id?: number;
  business_id?: number;
  is_active?: boolean;
  include_relations?: boolean;
  skip?: number;
  limit?: number;
  search?: string;
}

export const expenseCategoriesApi = {
  /**
   * Get categories by section
   */
  listBySection: async (
    sectionId: number, 
    params: Omit<ExpenseCategoryListParams, 'section_id'> = {}
  ): Promise<ExpenseCategoryListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<ExpenseCategoryListResponse>(
      `/expenses/categories/section/${sectionId}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get categories by business
   */
  listByBusiness: async (
    businessId: number,
    params: Omit<ExpenseCategoryListParams, 'business_id'> = {}
  ): Promise<ExpenseCategoryListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<ExpenseCategoryListResponse>(
      `/expenses/categories/business/${businessId}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get category by ID
   */
  get: async (categoryId: number, includeRelations = false): Promise<ExpenseCategory> => {
    const response = await api.get<ExpenseCategory>(
      `/expenses/categories/${categoryId}?include_relations=${includeRelations}`
    );
    return response.data;
  },

  /**
   * Create new category
   */
  create: async (data: ExpenseCategoryCreate): Promise<ExpenseCategory> => {
    const response = await api.post<ExpenseCategory>('/expenses/categories/', data);
    return response.data;
  },

  /**
   * Update category
   */
  update: async (categoryId: number, data: ExpenseCategoryUpdate): Promise<ExpenseCategory> => {
    const response = await api.put<ExpenseCategory>(`/expenses/categories/${categoryId}`, data);
    return response.data;
  },

  /**
   * Delete category (soft delete)
   */
  delete: async (categoryId: number): Promise<void> => {
    await api.delete(`/expenses/categories/${categoryId}`);
  },

  /**
   * Restore deleted category
   */
  restore: async (categoryId: number): Promise<ExpenseCategory> => {
    const response = await api.post<ExpenseCategory>(`/expenses/categories/${categoryId}/restore`);
    return response.data;
  },

  /**
   * Deactivate category
   */
  deactivate: async (categoryId: number): Promise<void> => {
    await api.patch(`/expenses/categories/${categoryId}/deactivate`);
  },

  /**
   * Activate category
   */
  activate: async (categoryId: number): Promise<void> => {
    await api.patch(`/expenses/categories/${categoryId}/activate`);
  },

  /**
   * Activate all categories in a section
   */
  activateAllInSection: async (sectionId: number): Promise<void> => {
    await api.patch(`/expenses/categories/section/${sectionId}/activate-all-categories`);
  },

  /**
   * Deactivate all categories in a section
   */
  deactivateAllInSection: async (sectionId: number): Promise<void> => {
    await api.patch(`/expenses/categories/section/${sectionId}/deactivate-all-categories`);
  },
};

// ============ Suppliers API ============

interface SupplierListParams {
  business_id: number;
  is_active?: boolean;
  skip?: number;
  limit?: number;
  search?: string;
}

export const suppliersApi = {
  /**
   * Get all suppliers for a business
   */
  list: async (params: SupplierListParams): Promise<SupplierListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'business_id') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<SupplierListResponse>(
      `/expenses/suppliers/business/${params.business_id}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get supplier by ID
   */
  get: async (supplierId: number): Promise<Supplier> => {
    const response = await api.get<Supplier>(`/expenses/suppliers/${supplierId}`);
    return response.data;
  },

  /**
   * Create new supplier
   */
  create: async (data: SupplierCreate): Promise<Supplier> => {
    const response = await api.post<Supplier>('/expenses/suppliers/', data);
    return response.data;
  },

  /**
   * Update supplier
   */
  update: async (supplierId: number, data: SupplierUpdate): Promise<Supplier> => {
    const response = await api.put<Supplier>(`/expenses/suppliers/${supplierId}`, data);
    return response.data;
  },

  /**
   * Delete supplier (soft delete)
   */
  delete: async (supplierId: number): Promise<void> => {
    await api.delete(`/expenses/suppliers/${supplierId}`);
  },

  /**
   * Restore deleted supplier
   */
  restore: async (supplierId: number): Promise<Supplier> => {
    const response = await api.post<Supplier>(`/expenses/suppliers/${supplierId}/restore`);
    return response.data;
  },
};
