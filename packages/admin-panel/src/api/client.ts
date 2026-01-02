/**
 * LEO Frontend - Axios HTTP Client
 * Configured with JWT authentication and error handling
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for API requests
 * Uses VITE_API_URL environment variable if set, otherwise falls back to
 * relative /api path (which gets proxied in development)
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'leo_access_token';
const REFRESH_TOKEN_KEY = 'leo_refresh_token';

// ============================================================================
// Token Storage Utilities
// ============================================================================

export const tokenStorage = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);
  },
};

// ============================================================================
// Axios Instance Creation
// ============================================================================

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // ---------------------------------------------------------------------------
  // Request Interceptor - Add JWT Authorization Header
  // ---------------------------------------------------------------------------
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = tokenStorage.getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError): Promise<never> => {
      return Promise.reject(error);
    }
  );

  // ---------------------------------------------------------------------------
  // Response Interceptor - Handle 401 and Errors
  // ---------------------------------------------------------------------------
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];

  const processQueue = (error: Error | null, token: string | null = null): void => {
    failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else if (token) {
        promise.resolve(token);
      }
    });
    failedQueue = [];
  };

  client.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
      return response;
    },
    async (error: AxiosError<ApiError>): Promise<AxiosResponse> => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Skip refresh for auth endpoints
        if (originalRequest.url?.includes('/auth/')) {
          tokenStorage.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Queue requests while refreshing
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(client(originalRequest));
              },
              reject: (err: Error) => {
                reject(err);
              },
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
          isRefreshing = false;
          tokenStorage.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        }

        try {
          // Attempt token refresh
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          tokenStorage.setTokens(accessToken, newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          isRefreshing = false;

          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          isRefreshing = false;
          tokenStorage.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      const apiError: ApiError = error.response?.data ?? {
        statusCode: error.response?.status ?? 500,
        message: error.message || 'An unexpected error occurred',
        error: 'UnknownError',
        timestamp: new Date().toISOString(),
        path: originalRequest.url ?? '',
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

// ============================================================================
// Export Configured Client
// ============================================================================

export const apiClient = createApiClient();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the user is authenticated (has a valid token)
 */
export const isAuthenticated = (): boolean => {
  return tokenStorage.getAccessToken() !== null;
};

/**
 * Get typed response data from axios response
 */
export const getResponseData = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};

export default apiClient;
