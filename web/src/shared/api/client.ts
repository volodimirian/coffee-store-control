import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getToken, logout, getRefreshToken, saveToken, hasRefreshToken, saveRefreshToken } from "~/shared/lib/helpers/storageHelpers";
import type { ApiErrorResponse, TokenResponse } from "~/shared/api/types";
import i18n from "~/shared/lib/i18n";

// Auto-logout functionality for 401 errors
let logoutHandler: (() => void) | null = null;
let translateFunction: ((key: string) => string) | null = null;

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  
  failedQueue = [];
};

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

// Request interceptor to add auth token and language header
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  
  // Add auth token if available
  const token = getToken();
  if (token) {
    // Add Bearer prefix to the clean token from localStorage
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add Accept-Language header based on current i18n language
  const currentLanguage = i18n.language || 'ru';
  config.headers['Accept-Language'] = currentLanguage;
  
  return config;
});

// Response interceptor to handle errors consistently
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorResponse>) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors
    if (err.response?.status === 401 && !originalRequest._retry) {
      // Try to refresh token if available
      if (hasRefreshToken() && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;
        
        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token');
          }
          
          // Call refresh endpoint
          const { data } = await axios.post<TokenResponse>(
            `${baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          // Save new tokens (refresh token is rotated on backend)
          saveToken(data.access_token);
          if (data.refresh_token) {
            saveRefreshToken(data.refresh_token);
          }
          
          // Update original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          
          processQueue(null, data.access_token);
          isRefreshing = false;
          
          // Retry original request
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          
          // Refresh failed, logout user
          if (logoutHandler && translateFunction) {
            try {
              const message = translateFunction('auth.sessionExpired');
              alert(message);
              logoutHandler();
            } catch (logoutErr) {
              console.error('Error in logout process:', logoutErr);
              logout();
            }
          } else {
            logout();
          }
          
          return Promise.reject(refreshError);
        }
      }
      
      // If refresh is in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }
      
      // No refresh token, logout
      if (logoutHandler && translateFunction) {
        try {
          const message = translateFunction('auth.sessionExpired');
          alert(message);
          logoutHandler();
        } catch (logoutErr) {
          console.error('Error in logout process:', logoutErr);
          logout();
        }
      } else {
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
