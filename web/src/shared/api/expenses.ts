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
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceListResponse,
  InvoiceItem,
  InvoiceItemWithConversion,
  InvoiceItemCreate,
  InvoiceItemUpdate,
  InvoiceStatus,
  InventoryBalance,
  LowStockCategory,
  BalanceRecalculationResponse,
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
   * Hard delete unit (permanently remove from database)
   */
  hardDelete: async (unitId: number): Promise<void> => {
    await api.delete(`/expenses/units/${unitId}/hard`);
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
   * Hard delete section (permanently remove from database)
   */
  hardDelete: async (sectionId: number): Promise<void> => {
    await api.delete(`/expenses/sections/${sectionId}/hard`);
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
   * Delete category (hard delete - permanently remove from database)
   */
  delete: async (categoryId: number): Promise<void> => {
    await api.delete(`/expenses/categories/${categoryId}`);
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
   * Delete supplier (soft delete by default, hard delete if permanent=true)
   */
  delete: async (supplierId: number, permanent: boolean = false): Promise<void> => {
    const queryParams = permanent ? '?permanent=true' : '';
    await api.delete(`/expenses/suppliers/${supplierId}${queryParams}`);
  },

  /**
   * Restore deleted supplier
   */
  restore: async (supplierId: number): Promise<Supplier> => {
    const response = await api.post<Supplier>(`/expenses/suppliers/${supplierId}/restore`);
    return response.data;
  },

  /**
   * Check if supplier has invoices
   */
  hasInvoices: async (supplierId: number): Promise<{ has_invoices: boolean; invoice_count: number }> => {
    const response = await api.get<{ has_invoices: boolean; invoice_count: number }>(`/expenses/suppliers/${supplierId}/has-invoices`);
    return response.data;
  },
};

// ============ Invoices API ============

interface InvoiceListParams {
  business_id: number;
  supplier_id?: number;
  paid_status?: InvoiceStatus;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export const invoicesApi = {
  /**
   * Get all invoices for a business
   */
  list: async (params: InvoiceListParams): Promise<InvoiceListResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'business_id') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get<InvoiceListResponse>(
      `/expenses/invoices/business/${params.business_id}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get invoice by ID
   */
  get: async (invoiceId: number, loadItems = false): Promise<Invoice> => {
    const queryParams = loadItems ? '?load_items=true' : '';
    const response = await api.get<Invoice>(`/expenses/invoices/${invoiceId}${queryParams}`);
    return response.data;
  },

  /**
   * Create new invoice
   */
  create: async (data: InvoiceCreate): Promise<Invoice> => {
    const response = await api.post<Invoice>('/expenses/invoices/', data);
    return response.data;
  },

  /**
   * Update invoice
   */
  update: async (invoiceId: number, data: InvoiceUpdate): Promise<Invoice> => {
    const response = await api.put<Invoice>(`/expenses/invoices/${invoiceId}`, data);
    return response.data;
  },

  /**
   * Delete invoice
   */
  delete: async (invoiceId: number): Promise<void> => {
    await api.delete(`/expenses/invoices/${invoiceId}`);
  },

  /**
   * Mark invoice as paid
   */
  markAsPaid: async (invoiceId: number, paidDate?: string): Promise<Invoice> => {
    const response = await api.post<Invoice>(`/expenses/invoices/${invoiceId}/mark-paid`, {
      paid_date: paidDate,
    });
    return response.data;
  },

  /**
   * Mark invoice as cancelled
   */
  markAsCancelled: async (invoiceId: number): Promise<Invoice> => {
    const response = await api.post<Invoice>(`/expenses/invoices/${invoiceId}/mark-cancelled`);
    return response.data;
  },

  /**
   * Search invoices
   */
  search: async (businessId: number, query: string, skip = 0, limit = 50): Promise<InvoiceListResponse> => {
    const response = await api.get<InvoiceListResponse>(
      `/expenses/invoices/business/${businessId}/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Update overdue statuses for pending invoices
   */
  updateOverdueStatuses: async (businessId?: number): Promise<{ message: string; updated_count: number }> => {
    const params = businessId ? { business_id: businessId } : {};
    const response = await api.post<{ message: string; updated_count: number }>(
      '/expenses/invoices/update-overdue-statuses',
      {},
      { params }
    );
    return response.data;
  },
};

// ============ Invoice Items API ============

export const invoiceItemsApi = {
  /**
   * Get all items for an invoice
   */
  list: async (invoiceId: number, convertToCategoryUnit: boolean = false): Promise<InvoiceItemWithConversion[]> => {
    const params = convertToCategoryUnit ? { convert_to_category_unit: true } : {};
    const response = await api.get<InvoiceItemWithConversion[]>(
      `/expenses/invoices/${invoiceId}/items`,
      { params }
    );
    return response.data;
  },

  /**
   * Create new invoice item
   */
  create: async (data: InvoiceItemCreate): Promise<InvoiceItem> => {
    const response = await api.post<InvoiceItem>(`/expenses/invoices/${data.invoice_id}/items`, data);
    return response.data;
  },

  /**
   * Update invoice item
   */
  update: async (invoiceId: number, itemId: number, data: InvoiceItemUpdate): Promise<InvoiceItem> => {
    const response = await api.put<InvoiceItem>(`/expenses/invoices/${invoiceId}/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Delete invoice item
   */
  delete: async (invoiceId: number, itemId: number): Promise<void> => {
    await api.delete(`/expenses/invoices/${invoiceId}/items/${itemId}`);
  },
};

// ============ Inventory Balance API ============

export const inventoryBalanceApi = {
  /**
   * Get inventory balance for category and period
   */
  getBalance: async (businessId: number, categoryId: number, monthPeriodId: number): Promise<InventoryBalance | null> => {
    const response = await api.get<InventoryBalance | null>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/period/${monthPeriodId}`
    );
    return response.data;
  },

  /**
   * Get purchases total for category in period
   */
  getPurchases: async (businessId: number, categoryId: number, monthPeriodId: number): Promise<string> => {
    const response = await api.get<string>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/period/${monthPeriodId}/purchases`
    );
    return response.data;
  },

  /**
   * Get usage total for category in period
   */
  getUsage: async (businessId: number, categoryId: number, monthPeriodId: number): Promise<string> => {
    const response = await api.get<string>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/period/${monthPeriodId}/usage`
    );
    return response.data;
  },

  /**
   * Get opening balance for category
   */
  getOpeningBalance: async (businessId: number, categoryId: number, monthPeriodId: number): Promise<string> => {
    const response = await api.get<string>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/period/${monthPeriodId}/opening-balance`
    );
    return response.data;
  },

  /**
   * Recalculate balance for category and period
   */
  recalculateBalance: async (businessId: number, categoryId: number, monthPeriodId: number): Promise<BalanceRecalculationResponse> => {
    const response = await api.post<BalanceRecalculationResponse>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/period/${monthPeriodId}/recalculate`
    );
    return response.data;
  },

  /**
   * Get low stock categories
   */
  getLowStock: async (businessId: number, monthPeriodId: number, threshold?: string): Promise<LowStockCategory[]> => {
    const response = await api.get<LowStockCategory[]>(
      `/expenses/inventory-balance/${businessId}/period/${monthPeriodId}/low-stock`,
      { params: { threshold } }
    );
    return response.data;
  },

  /**
   * Transfer closing balances to next month
   */
  transferBalances: async (businessId: number, currentPeriodId: number, nextPeriodId: number): Promise<{ success: boolean; message: string; transferred_count: number }> => {
    const response = await api.post<{ success: boolean; message: string; transferred_count: number }>(
      `/expenses/inventory-balance/${businessId}/period/${currentPeriodId}/transfer-balances/${nextPeriodId}`
    );
    return response.data;
  },

  /**
   * Get average monthly usage for category
   */
  getAverageUsage: async (businessId: number, categoryId: number, monthsBack: number = 6): Promise<string> => {
    const response = await api.get<string>(
      `/expenses/inventory-balance/${businessId}/category/${categoryId}/average-usage`,
      { params: { months_back: monthsBack } }
    );
    return response.data;
  },
};

// ============ Inventory Tracking API ============

export interface PurchaseDetail {
  invoice_number: string;
  original_quantity: string;
  original_unit_id?: number;
  original_unit_symbol?: string;
  converted_quantity?: string;
  was_converted: boolean;
}

export interface DayData {
  date: string;
  purchases_qty: string;
  purchases_amount: string;
  usage_qty: string;
  usage_amount: string;
  purchase_details: PurchaseDetail[];
}

export interface CategoryData {
  category_id: number;
  category_name: string;
  unit_symbol: string;
  daily_data: DayData[];
}

export interface SectionData {
  section_id: number;
  section_name: string;
  categories: CategoryData[];
}

export interface InventoryTrackingSummary {
  year: number;
  month: number;
  sections: SectionData[];
}

export const inventoryTrackingApi = {
  /**
   * Get complete inventory tracking data for a month (optimized - single request)
   * Replaces 800+ individual API calls with one batched request
   */
  getMonthSummary: async (businessId: number, year: number, month: number): Promise<InventoryTrackingSummary> => {
    const response = await api.get<InventoryTrackingSummary>(
      `/expenses/inventory-tracking/business/${businessId}/summary`,
      { params: { year, month } }
    );
    return response.data;
  },
};
