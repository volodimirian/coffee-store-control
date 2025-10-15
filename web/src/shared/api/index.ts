/**
 * API Layer - Centralized exports
 * All API functions and types for the frontend
 */

// API Client and Types
export { api, ApiError, isApiError } from './client';
export type * from './types';

// API Services
export * from './authentication';
export * from './health';

// Error Handling
export { useApiError, useErrorHandler } from '../lib/useApiError';