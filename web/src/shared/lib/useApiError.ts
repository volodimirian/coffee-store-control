import { useTranslation } from 'react-i18next';
import { isApiError } from '~/shared/api/client';
import type { ErrorCode } from '~/shared/api/types';

/**
 * Hook for handling API errors with localized messages
 */
export function useApiError() {
  const { t } = useTranslation();

  const getErrorMessage = (error: unknown): string => {
    // Check if it's our custom API error
    if (isApiError(error)) {
      // Try to get localized error message using error code
      const errorKey = `errors.${error.code}`;
      const localizedMessage = t(errorKey);
      
      // If translation exists (doesn't return the key) and it's not a title key, use it
      if (localizedMessage !== errorKey && !error.code.includes('_title')) {
        return localizedMessage;
      }
      
      // Fallback to the original message from backend
      return error.message;
    }
    
    // Handle standard errors
    if (error instanceof Error) {
      return error.message;
    }
    
    // Fallback for unknown errors
    return t('common.error');
  };

  const getErrorCode = (error: unknown): ErrorCode | null => {
    if (isApiError(error)) {
      return error.code as ErrorCode;
    }
    return null;
  };

  const isErrorCode = (error: unknown, code: ErrorCode): boolean => {
    return getErrorCode(error) === code;
  };

  // Helper functions for common error checks
  const isUnauthorized = (error: unknown): boolean => 
    isErrorCode(error, 'UNAUTHORIZED');

  const isForbidden = (error: unknown): boolean => 
    isErrorCode(error, 'FORBIDDEN');

  const isValidationError = (error: unknown): boolean => 
    isErrorCode(error, 'VALIDATION_ERROR');

  const isNotFound = (error: unknown): boolean => 
    isErrorCode(error, 'NOT_FOUND') || 
    isErrorCode(error, 'USER_NOT_FOUND') ||
    isErrorCode(error, 'CATEGORY_NOT_FOUND') ||
    isErrorCode(error, 'SUBCATEGORY_NOT_FOUND') ||
    isErrorCode(error, 'PRODUCT_NOT_FOUND');

  const isConflict = (error: unknown): boolean => 
    isErrorCode(error, 'CONFLICT') ||
    isErrorCode(error, 'EMAIL_ALREADY_EXISTS') ||
    isErrorCode(error, 'USERNAME_ALREADY_EXISTS') ||
    isErrorCode(error, 'CATEGORY_NAME_EXISTS') ||
    isErrorCode(error, 'SUBCATEGORY_NAME_EXISTS');

  return {
    getErrorMessage,
    getErrorCode,
    isErrorCode,
    isUnauthorized,
    isForbidden,
    isValidationError,
    isNotFound,
    isConflict,
  };
}

/**
 * Hook for displaying error messages in UI components
 * Returns formatted error message and helper functions
 */
export function useErrorHandler() {
  const { getErrorMessage, ...errorChecks } = useApiError();

  const handleError = (error: unknown): string => {
    console.error('API Error:', error);
    return getErrorMessage(error);
  };

  return {
    handleError,
    ...errorChecks,
  };
}