/**
 * API Response Types for Backend Integration
 * These types match the backend error code system and response formats
 */

// ============ Base API Types ============

export interface ApiErrorResponse {
  error_code: string;
  detail: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiErrorResponse;
}

// Delete operation result
export interface DeleteResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

// ============ Error Codes (matching backend) ============

export type ErrorCode = 
  // Authentication & Authorization
  | 'UNAUTHORIZED'
  | 'FORBIDDEN' 
  | 'USER_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
  | 'INVALID_ROLE'
  
  // Role-based access
  | 'BUYERS_NOT_ALLOWED'
  | 'SUPPLIERS_ONLY'
  | 'ADMIN_ONLY'
  
  // Business & Employees
  | 'BUSINESS_NOT_FOUND'
  | 'BUSINESS_ACCESS_DENIED'
  | 'BUSINESS_ID_MISMATCH'
  | 'USER_ALREADY_BUSINESS_MEMBER'
  | 'CANNOT_REMOVE_BUSINESS_OWNER'
  | 'ONLY_OWNER_CAN_DELETE'
  | 'ONLY_OWNER_CAN_RESTORE'
  | 'BUSINESS_OPERATION_FAILED'
  | 'EMPLOYEE_CREATION_FAILED'
  | 'EMPLOYEE_ROLE_NOT_FOUND'
  | 'PERMISSION_NOT_FOUND'
  | 'USER_NOT_BUSINESS_MEMBER'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'ONLY_OWNER_CAN_CREATE_EMPLOYEES'
  | 'ONLY_OWNER_CAN_MANAGE_PERMISSIONS'
  
  // Validation
  | 'VALIDATION_ERROR'
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  
  // General
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST';

// ============ User & Auth Types ============

export type UserRole = 'ADMIN' | 'BUSINESS_OWNER' | 'EMPLOYEE';

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
  role: {
    id: number;
    name: UserRole;
    description?: string;
  };
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ============ Expenses & Categories Types ============

export type UnitType = 'weight' | 'volume' | 'count';
export type MonthPeriodStatus = 'active' | 'closed' | 'archived';

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  unit_type: UnitType;
  base_unit_id?: number;
  conversion_factor: string; // Decimal as string
  business_id: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitCreate {
  name: string;
  symbol: string;
  unit_type: UnitType;
  business_id: number;
  base_unit_id?: number;
  conversion_factor?: string;
  description?: string;
  is_active?: boolean;
}

export interface UnitUpdate {
  name?: string;
  symbol?: string;
  unit_type?: UnitType;
  base_unit_id?: number;
  conversion_factor?: string;
  description?: string;
  is_active?: boolean;
}

export interface UnitListResponse {
  units: Unit[];
  total: number;
}

export interface MonthPeriod {
  id: number;
  name: string;
  year: number;
  month: number;
  status: MonthPeriodStatus;
  business_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthPeriodCreate {
  name: string;
  year: number;
  month: number;
  business_id: number;
  status?: MonthPeriodStatus;
  is_active?: boolean;
}

export interface MonthPeriodUpdate {
  name?: string;
  status?: MonthPeriodStatus;
  is_active?: boolean;
}

export interface MonthPeriodListResponse {
  periods: MonthPeriod[];
  total: number;
}

export interface ExpenseSection {
  id: number;
  name: string;
  business_id: number;
  created_by: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSectionCreate {
  name: string;
  business_id: number;
  order_index?: number;
  is_active?: boolean;
}

export interface ExpenseSectionUpdate {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface ExpenseSectionListResponse {
  sections: ExpenseSection[];
  total: number;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  section_id: number;
  business_id: number;
  default_unit_id: number;
  created_by: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryCreate {
  name: string;
  section_id: number;
  business_id: number;
  default_unit_id: number;
  order_index?: number;
  is_active?: boolean;
}

export interface ExpenseCategoryUpdate {
  name?: string;
  default_unit_id?: number;
  order_index?: number;
  is_active?: boolean;
}

export interface ExpenseCategoryListResponse {
  categories: ExpenseCategory[];
  total: number;
}

export interface SupplierContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  inn?: string; 
}

export interface Supplier {
  id: number;
  name: string;
  business_id: number;
  created_by: number;
  contact_info?: SupplierContactInfo;
  payment_terms_days: number; // Payment due days after invoice date
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  name: string;
  business_id: number;
  contact_info?: SupplierContactInfo;
  payment_terms_days?: number; // Default will be 14 days
  is_active?: boolean;
}

export interface SupplierUpdate {
  name?: string;
  contact_info?: SupplierContactInfo;
  payment_terms_days?: number;
  is_active?: boolean;
}

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
}

// ============ Invoice & InvoiceItem Types ============

export type InvoiceStatus = 'pending' | 'paid' | 'cancelled' | 'overdue';

export interface Invoice {
  id: number;
  business_id: number;
  supplier_id: number;
  invoice_number?: string;
  invoice_date: string;
  total_amount: string; // Decimal as string
  paid_status: InvoiceStatus;
  paid_date?: string;
  document_path?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  business_id: number;
  supplier_id: number;
  invoice_number?: string;
  invoice_date: string;
  total_amount: string;
  paid_status?: InvoiceStatus;
  paid_date?: string;
  document_path?: string;
}

export interface InvoiceUpdate {
  supplier_id?: number;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: string;
  paid_status?: InvoiceStatus;
  paid_date?: string;
  document_path?: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  category_id: number;
  quantity: string; // Decimal as string
  unit_id: number;
  unit_price: string; // Decimal as string
  total_price: string; // Decimal as string
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemWithConversion extends InvoiceItem {
  converted_quantity?: string; // Decimal as string
  original_unit_id?: number;
  original_quantity?: string; // Decimal as string
  invoice_number?: string;
}

export interface InvoiceItemCreate {
  invoice_id: number;
  category_id: number;
  quantity: string;
  unit_id: number;
  unit_price: string;
  total_price: string;
  notes?: string;
}

export interface InvoiceItemUpdate {
  category_id?: number;
  quantity?: string;
  unit_id?: number;
  unit_price?: string;
  total_price?: string;
  notes?: string;
}

// ============ Inventory Balance Types ============

export interface InventoryBalance {
  id: number;
  category_id: number;
  month_period_id: number;
  unit_id: number;
  opening_balance: string;
  purchases_total: string;
  usage_total: string;
  closing_balance: string;
  created_at: string;
  updated_at: string;
}

export interface LowStockCategory {
  category_id: number;
  category_name: string;
  current_stock: string;
  threshold: string;
  unit_symbol: string;
}

export interface BalanceRecalculationResponse {
  success: boolean;
  category_id: number;
  month_period_id: number;
  new_balance: InventoryBalance | null;
  message: string;
}

// ============ Generic API Response Wrappers ============

export type AuthResponse = TokenResponse;
export type UserResponse = User;

