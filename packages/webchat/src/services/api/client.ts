/**
 * API Client for LEO Webchat
 *
 * Handles authentication, request/response processing,
 * and error handling for backend communication.
 * Supports OAuth (Authentik) and magic link authentication.
 */

import { getOAuthService, isOAuthEnabled } from '@/services/auth';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * API Client configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  tenantId?: string;
  onUnauthorized?: () => void;
  onError?: (error: ApiError) => void;
}

/**
 * Storage keys for auth tokens
 */
const STORAGE_KEY = 'leo-auth-tokens';

/**
 * API Client class
 */
export class ApiClient {
  private baseUrl: string;
  private tenantId: string | null;
  private tokens: AuthTokens | null = null;
  private onUnauthorized?: () => void;
  private onError?: (error: ApiError) => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tenantId = config.tenantId || null;
    this.onUnauthorized = config.onUnauthorized;
    this.onError = config.onError;

    // Load tokens from storage
    this.loadTokens();
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokens(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch {
      this.tokens = null;
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  /**
   * Clear tokens
   */
  clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Check if authenticated (OAuth or local tokens)
   */
  isAuthenticated(): boolean {
    // Check OAuth first
    if (isOAuthEnabled()) {
      try {
        const oauthService = getOAuthService();
        if (oauthService.isAuthenticated()) {
          return true;
        }
      } catch {
        // OAuth not configured, fall through to local tokens
      }
    }

    // Check local tokens
    if (!this.tokens) return false;
    return Date.now() < this.tokens.expiresAt;
  }


  /**
   * Get current access token (OAuth or local)
   */
  async getAccessTokenAsync(): Promise<string | null> {
    // Check OAuth first
    if (isOAuthEnabled()) {
      try {
        const oauthService = getOAuthService();
        const token = await oauthService.getAccessToken();
        if (token) {
          return token;
        }
      } catch {
        // OAuth token not available, fall through
      }
    }

    // Fall back to local tokens
    if (!this.tokens || Date.now() >= this.tokens.expiresAt) {
      return null;
    }
    return this.tokens.accessToken;
  }

  /**
   * Get current access token (sync version for backward compatibility)
   */
  getAccessToken(): string | null {
    // Check OAuth first (sync - uses cached token)
    if (isOAuthEnabled()) {
      try {
        const oauthService = getOAuthService();
        const tokens = oauthService.getTokens();
        if (tokens && tokens.expiresAt > Date.now()) {
          return tokens.accessToken;
        }
      } catch {
        // OAuth not configured
      }
    }

    // Fall back to local tokens
    if (!this.tokens || Date.now() >= this.tokens.expiresAt) {
      return null;
    }
    return this.tokens.accessToken;
  }

  /**
   * Get authorization headers
   */
  private async getAuthHeadersAsync(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    const accessToken = await this.getAccessTokenAsync();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return headers;
  }

  /**
   * Get authorization headers (sync version for backward compatibility)
   * Used by external code that may call getAccessToken() directly
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    const accessToken = this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return headers;
  }

  /**
   * Ensure authenticated
   */
  async ensureAuthenticated(): Promise<void> {
    // Already authenticated (OAuth or local tokens)
    if (this.isAuthenticated()) return;

    // Not authenticated - user must login via OAuth or magic link
    throw new Error('Authentication required');
  }

  /**
   * Make authenticated request
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      skipAuth?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    // Ensure authenticated unless skipped
    if (!options.skipAuth) {
      await this.ensureAuthenticated();
    }

    const url = `${this.baseUrl}${path}`;

    // Get auth headers (supports OAuth token refresh)
    const authHeaders = await this.getAuthHeadersAsync();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (response.status === 401) {
        // Token expired, try to re-auth
        this.clearTokens();
        this.onUnauthorized?.();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiError: ApiError = {
          code: errorData.code || `HTTP_${response.status}`,
          message: errorData.detail || errorData.message || response.statusText,
          details: errorData,
        };
        this.onError?.(apiError);
        throw apiError;
      }

      // Handle empty responses
      if (response.status === 204) {
        return { data: null as T, status: response.status };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      if ((error as ApiError).code) {
        throw error;
      }
      throw {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * GET request
   */
  get<T>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, { headers });
  }

  /**
   * POST request
   */
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body, headers });
  }

  /**
   * PUT request
   */
  put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body, headers });
  }

  /**
   * PATCH request
   */
  patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { body, headers });
  }

  /**
   * DELETE request
   */
  delete<T>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, { headers });
  }
}

/**
 * Create singleton API client
 */
let apiClientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
      tenantId: import.meta.env.VITE_TENANT_ID,
      onUnauthorized: () => {
        console.warn('Session expired, re-authenticating...');
      },
      onError: (error) => {
        console.error('API Error:', error);
      },
    });
  }
  return apiClientInstance;
}

export default ApiClient;
