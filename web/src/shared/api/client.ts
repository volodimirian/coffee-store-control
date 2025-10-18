import axios, { AxiosError } from "axios";
import { getToken, logout } from "~/shared/lib/helpers";
import type { ApiErrorResponse } from "./types";

// Auto-logout functionality for 401 errors
let logoutHandler: (() => void) | null = null;
let translateFunction: ((key: string) => string) | null = null;

/**
 * Sets the logout handler and translation function for automatic logout on 401 errors
 */
export function setLogoutHandler(handler: () => void, t: (key: string) => string) {
  logoutHandler = handler;
  translateFunction = t;
}

const baseURL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api`;

export const api = axios.create({ baseURL });

// Custom API Error class
export class ApiError extends Error {
  code: string;
  status: number;
  originalError: AxiosError<ApiErrorResponse>;
  
  constructor(
    message: string,
    code: string,
    status: number,
    originalError: AxiosError<ApiErrorResponse>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.originalError = originalError;
  }
}

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    // Add Bearer prefix to the clean token from localStorage
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors consistently
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiErrorResponse>) => {
    // Handle 401 Unauthorized errors for auto-logout
    if (err.response?.status === 401 && logoutHandler && translateFunction) {
      try {
        // Show localized notification about expired session
        const message = translateFunction('auth.sessionExpired');
        alert(message);
        
        // Execute logout callback
        logoutHandler();
      } catch (logoutErr) {
        console.error('Error in logout process:', logoutErr);
        // Fallback to direct logout
        logout();
      }
      
      return Promise.reject(err);
    }
    
    // Extract error code and detail from backend response
    if (err.response?.data) {
      const { error_code, detail } = err.response.data;
      
      // Create a standardized error object
      const apiError = new ApiError(
        detail || error_code || 'Unknown error',
        error_code || 'UNKNOWN_ERROR',
        err.response.status,
        err
      );
      
      return Promise.reject(apiError);
    }
    
    // Fallback for network errors or other issues
    return Promise.reject(err);
  }
);

// Helper function to check if error is an API error with error code
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
