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

export type UserRole = 'ADMIN' | 'SUPPLIER' | 'BUYER';

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

// ============ Generic API Response Wrappers ============

export type AuthResponse = TokenResponse;
export type UserResponse = User;
