/**
 * Auth Store Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';
import { tokenStorage } from '@/api/client';

// Mock the apiClient module
vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  tokenStorage: {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
    setTokens: vi.fn(),
  },
}));

// Import the mocked module
import { apiClient } from '@/api/client';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('has null token initially', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });

    it('is not authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('is not loading initially', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets loading state during login', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      vi.mocked(apiClient.post).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      const loginPromise = useAuthStore.getState().login('test@example.com', 'password');

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      await loginPromise;
    });

    it('sets user and token on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          user: mockUser,
          accessToken: 'test-token',
          refreshToken: 'test-refresh-token',
        },
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token');
      expect(state.refreshToken).toBe('test-refresh-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('stores tokens via tokenStorage on successful login', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      expect(tokenStorage.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    });

    it('throws error and sets error state on failed login', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          data: { message: 'Invalid credentials' },
          status: 401,
        },
      });

      await expect(
        useAuthStore.getState().login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('calls correct API endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      });
    });
  });

  describe('logout', () => {
    it('clears user, tokens, and auth state', async () => {
      // Set up authenticated state with non-dev token
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Mock API call for logout
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('clears tokens via tokenStorage', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Mock API call for logout
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await useAuthStore.getState().logout();

      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('clears loading state', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
        isLoading: true,
        error: null,
      });

      // Mock API call for logout
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('does not call API for dev tokens', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'dev-token-123',
        refreshToken: 'dev-refresh-123',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      await useAuthStore.getState().logout();

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('checkAuth', () => {
    it('clears auth state when no token exists', async () => {
      useAuthStore.setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('validates token and sets user on success', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      };

      useAuthStore.setState({
        user: null,
        token: 'existing-token',
        refreshToken: 'refresh-token',
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears auth state on token validation failure', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'expired-token',
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 401 },
      });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('calls correct API endpoint for auth check', async () => {
      useAuthStore.setState({
        user: null,
        token: 'test-token',
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      });

      await useAuthStore.getState().checkAuth();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('refreshAccessToken', () => {
    it('returns false when no refresh token exists', async () => {
      useAuthStore.setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(false);
    });

    it('updates tokens on successful refresh', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
        token: 'old-token',
        refreshToken: 'old-refresh-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(true);
      expect(useAuthStore.getState().token).toBe('new-token');
      expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token');
      expect(tokenStorage.setTokens).toHaveBeenCalledWith('new-token', 'new-refresh-token');
    });

    it('returns false on refresh failure', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
        token: 'old-token',
        refreshToken: 'invalid-refresh-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(apiClient.post).mockRejectedValue({
        response: { status: 401 },
      });

      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(false);
    });
  });

  describe('setUser', () => {
    it('sets user and authenticates', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears authentication when user is null', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setToken', () => {
    it('sets token', () => {
      useAuthStore.getState().setToken('new-token');

      expect(useAuthStore.getState().token).toBe('new-token');
    });

    it('updates tokenStorage when setting token', () => {
      useAuthStore.getState().setToken('new-token');

      expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('new-token');
    });

    it('can clear token', () => {
      useAuthStore.setState({ ...useAuthStore.getState(), token: 'existing-token' });

      useAuthStore.getState().setToken(null);

      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading state to true', () => {
      useAuthStore.getState().setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('sets loading state to false', () => {
      useAuthStore.setState({ ...useAuthStore.getState(), isLoading: true });

      useAuthStore.getState().setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ ...useAuthStore.getState(), error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
