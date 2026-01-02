/**
 * LEO Frontend - Authentication Store
 * Zustand store for authentication state management
 *
 * Features:
 * - Real API integration with leo-core Identity service
 * - Token storage via localStorage (synced with apiClient)
 * - Dev mode bypass for local development
 * - Token refresh support
 * - Proper error handling
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient, tokenStorage } from '@/api/client';
import type { AxiosError } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ============================================================================
// Dev Mode Configuration
// ============================================================================

/**
 * Check if dev mode login should be allowed
 * Only enabled in DEV mode and with specific test credentials
 */
const isDevModeEnabled = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH !== 'false';
};

const DEV_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@leo.local',
  name: 'Admin LEO',
  role: 'admin',
};

const DEV_CREDENTIALS = {
  email: 'admin@leo.local',
  password: 'admin',
};

// ============================================================================
// API Response Types
// ============================================================================

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ------------------------------------------------------------------------
      // Login
      // ------------------------------------------------------------------------
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // DEV MODE: Accept test credentials for local development
          if (isDevModeEnabled() && email === DEV_CREDENTIALS.email && password === DEV_CREDENTIALS.password) {
            const devToken = `dev-token-${Date.now()}`;
            const devRefreshToken = `dev-refresh-${Date.now()}`;

            // Store tokens in localStorage via tokenStorage
            tokenStorage.setTokens(devToken, devRefreshToken);

            set({
              user: DEV_USER,
              token: devToken,
              refreshToken: devRefreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }

          // Production: API call to leo-core Identity service
          const response = await apiClient.post<LoginResponse>('/auth/login', {
            email,
            password,
          });

          const { user, accessToken, refreshToken } = response.data;

          // Store tokens in localStorage via tokenStorage
          tokenStorage.setTokens(accessToken, refreshToken);

          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError<{ message?: string }>;
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'Login failed. Please check your credentials.';

          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      // ------------------------------------------------------------------------
      // Logout
      // ------------------------------------------------------------------------
      logout: async () => {
        const { refreshToken } = get();

        try {
          // Notify server to invalidate refresh token (if we have one)
          if (refreshToken && !refreshToken.startsWith('dev-')) {
            await apiClient.post('/auth/logout', { refreshToken }).catch(() => {
              // Ignore errors during logout - we'll clear tokens anyway
              console.warn('Logout request failed, clearing tokens locally');
            });
          }
        } finally {
          // Always clear local tokens
          tokenStorage.clearTokens();

          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          // Dispatch logout event for app-wide handling
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      },

      // ------------------------------------------------------------------------
      // Check Auth (validate current token)
      // ------------------------------------------------------------------------
      checkAuth: async () => {
        const { token, refreshToken } = get();

        // No token means not authenticated
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        // DEV MODE: Skip validation for dev tokens
        if (isDevModeEnabled() && token.startsWith('dev-')) {
          set({ isAuthenticated: true, user: DEV_USER });
          return;
        }

        set({ isLoading: true });

        try {
          // Validate token by fetching current user
          const response = await apiClient.get<User>('/auth/me');

          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError;

          // Try to refresh token if we got a 401
          if (axiosError.response?.status === 401 && refreshToken) {
            const refreshSuccess = await get().refreshAccessToken();
            if (refreshSuccess) {
              // Retry checkAuth after successful refresh
              await get().checkAuth();
              return;
            }
          }

          // Clear auth state on failure
          tokenStorage.clearTokens();
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // ------------------------------------------------------------------------
      // Refresh Access Token
      // ------------------------------------------------------------------------
      refreshAccessToken: async (): Promise<boolean> => {
        const { refreshToken } = get();

        if (!refreshToken || refreshToken.startsWith('dev-')) {
          return false;
        }

        try {
          const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update tokens in storage
          tokenStorage.setTokens(accessToken, newRefreshToken);

          set({
            token: accessToken,
            refreshToken: newRefreshToken,
          });

          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      },

      // ------------------------------------------------------------------------
      // Utility Actions
      // ------------------------------------------------------------------------
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token: string | null) => {
        set({ token });
        if (token) {
          tokenStorage.setAccessToken(token);
        }
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'leo-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Sync tokens with tokenStorage on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.refreshToken) {
          tokenStorage.setTokens(state.token, state.refreshToken);
        }
      },
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select just the user from auth state
 */
export const useAuthUser = () => useAuthStore((state) => state.user);

/**
 * Select authentication status
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Select loading state
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

/**
 * Select error state
 */
export const useAuthError = () => useAuthStore((state) => state.error);

export default useAuthStore;
