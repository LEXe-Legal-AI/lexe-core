/**
 * Authentication Store
 *
 * Manages authentication state for OAuth and magic link sessions.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { getApiClient } from '@/services/api';
import { getOAuthService, isOAuthEnabled } from '@/services/auth';

/**
 * Auth state interface
 */
interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    sub?: string;
    email?: string;
    name?: string;
  } | null;

  // Actions
  initAuth: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Auth store
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null,

        /**
         * Initialize authentication - checks for existing valid tokens
         */
        initAuth: async () => {
          set({ isLoading: true, error: null });

          try {
            // Check if OAuth is enabled and user has valid OAuth tokens
            if (isOAuthEnabled()) {
              const oauthService = getOAuthService();

              if (oauthService.isAuthenticated()) {
                // User has valid OAuth tokens
                try {
                  const userInfo = await oauthService.getUserInfo();
                  set({
                    isAuthenticated: true,
                    isLoading: false,
                    userInfo: {
                      sub: userInfo.sub,
                      email: userInfo.email,
                      name: userInfo.name || userInfo.preferredUsername,
                    },
                  });
                  return;
                } catch (userInfoError) {
                  // Token might be invalid, continue to check other options
                  console.warn('Failed to get user info:', userInfoError);
                }
              }
            }

            // Check ApiClient for existing tokens (email/magic link login)
            const client = getApiClient();
            if (client.isAuthenticated()) {
              set({
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }

            // No valid auth found
            set({
              isAuthenticated: false,
              isLoading: false,
            });
          } catch (error) {
            set({
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authentication failed',
            });
          }
        },

        /**
         * Logout and clear session
         */
        logout: async () => {
          // Clear API client tokens
          const client = getApiClient();
          client.clearTokens();

          // Clear OAuth tokens if OAuth is enabled
          if (isOAuthEnabled()) {
            try {
              const oauthService = getOAuthService();
              await oauthService.logout({ redirect: false });
            } catch (e) {
              console.warn('OAuth logout error:', e);
            }
          }

          set({
            isAuthenticated: false,
            userInfo: null,
            error: null,
          });
        },

        /**
         * Clear error message
         */
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'leo-auth-store',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          userInfo: state.userInfo,
        }),
      }
    ),
    { name: 'AuthStore', enabled: import.meta.env.DEV }
  )
);

// Selectors
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectAuthError = (state: AuthState) => state.error;
export const selectUserInfo = (state: AuthState) => state.userInfo;

export default useAuthStore;
