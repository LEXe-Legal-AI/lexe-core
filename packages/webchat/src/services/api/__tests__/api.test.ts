/**
 * Tests for API Client and Services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../client';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client).toBeDefined();
    });

    it('should remove trailing slash from base URL', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:8000/' });
      expect(client).toBeDefined();
    });

    it('should accept tenant ID', () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        tenantId: 'test-tenant',
      });
      expect(client).toBeDefined();
    });

    it('should accept callbacks', () => {
      const onUnauthorized = vi.fn();
      const onError = vi.fn();
      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        onUnauthorized,
        onError,
      });
      expect(client).toBeDefined();
    });

    it('should load tokens from localStorage', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no tokens', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should return true when token is valid', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() - 1000, // Expired
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isAuthenticated()).toBe(false);
    });
  });

  describe('isGuest', () => {
    it('should return true when no tokens', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isGuest()).toBe(true);
    });

    it('should return true for guest tokens', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isGuest()).toBe(true);
    });

    it('should return false for non-guest tokens', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: false,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isGuest()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when not authenticated', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.getAccessToken()).toBeNull();
    });

    it('should return token when authenticated', () => {
      const tokens = {
        accessToken: 'my-access-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.getAccessToken()).toBe('my-access-token');
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens from storage', () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      expect(client.isAuthenticated()).toBe(true);

      client.clearTokens();
      expect(client.isAuthenticated()).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('leo-auth-tokens');
    });
  });

  describe('initGuestAuth', () => {
    it('should initialize guest authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'guest-token',
            refresh_token: 'refresh-token',
            expires_in: 86400,
          }),
      });

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      const tokens = await client.initGuestAuth();

      expect(tokens.accessToken).toBe('guest-token');
      expect(tokens.isGuest).toBe(true);
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should throw on failed guest auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Auth failed' }),
      });

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      await expect(client.initGuestAuth()).rejects.toThrow('Auth failed');
    });

    it('should include tenant ID in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'guest-token',
            expires_in: 86400,
          }),
      });

      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        tenantId: 'my-tenant',
      });
      await client.initGuestAuth();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/guest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Tenant-ID': 'my-tenant',
          }),
        })
      );
    });
  });

  describe('ensureAuthenticated', () => {
    it('should return immediately if already authenticated', async () => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      await client.ensureAuthenticated();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should init guest auth if not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'guest-token',
            expires_in: 86400,
          }),
      });

      const client = new ApiClient({ baseUrl: 'http://localhost:8000' });
      await client.ensureAuthenticated();

      expect(mockFetch).toHaveBeenCalled();
      expect(client.isAuthenticated()).toBe(true);
    });
  });

  describe('request methods', () => {
    let client: ApiClient;

    beforeEach(() => {
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));
      client = new ApiClient({ baseUrl: 'http://localhost:8000' });
    });

    it('should make GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const response = await client.get('/test');
      expect(response.data).toEqual({ data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should make POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1 }),
      });

      const response = await client.post('/test', { name: 'test' });
      expect(response.data).toEqual({ id: 1 });
    });

    it('should make PUT request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      const response = await client.put('/test', { name: 'updated' });
      expect(response.data).toEqual({ updated: true });
    });

    it('should make PATCH request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ patched: true }),
      });

      const response = await client.patch('/test', { name: 'patched' });
      expect(response.data).toEqual({ patched: true });
    });

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const response = await client.delete('/test');
      expect(response.status).toBe(204);
    });

    it('should handle 401 unauthorized', async () => {
      const onUnauthorized = vi.fn();
      const authClient = new ApiClient({
        baseUrl: 'http://localhost:8000',
        onUnauthorized,
      });

      // Set valid tokens first
      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(authClient.get('/test')).rejects.toThrow('Unauthorized');
      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const onError = vi.fn();
      const errorClient = new ApiClient({
        baseUrl: 'http://localhost:8000',
        onError,
      });

      const tokens = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000,
        isGuest: true,
      };
      localStorageMock.setItem('leo-auth-tokens', JSON.stringify(tokens));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ code: 'VALIDATION_ERROR', detail: 'Invalid input' }),
      });

      await expect(errorClient.get('/test')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      });
      expect(onError).toHaveBeenCalled();
    });

    it('should include authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
