/**
 * LEO Frontend - Authentication Test Fixtures
 *
 * Provides test fixtures for authenticated and unauthenticated testing scenarios.
 * Uses localStorage-based dev mode authentication bypass for testing.
 */

import { test as base, expect, type Page } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

/**
 * User roles for RBAC testing
 */
export type UserRole = 'admin' | 'operator' | 'viewer';

/**
 * Mock user data structure matching authStore.User
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

/**
 * Token configuration for testing
 */
export interface TokenConfig {
  accessToken: string;
  refreshToken: string;
  /** Token expiry in milliseconds from now. Default: 1 hour */
  expiresIn?: number;
}

// ============================================================================
// Test Users
// ============================================================================

/**
 * Pre-configured test users for different roles
 */
export const TEST_USERS: Record<UserRole, MockUser> = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@leo.local',
    name: 'Admin LEO',
    role: 'admin',
  },
  operator: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'operator@leo.local',
    name: 'Operator LEO',
    role: 'operator',
  },
  viewer: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'viewer@leo.local',
    name: 'Viewer LEO',
    role: 'viewer',
  },
};

/**
 * Storage keys used by the application
 */
const STORAGE_KEYS = {
  accessToken: 'leo_access_token',
  refreshToken: 'leo_refresh_token',
  authState: 'leo-auth-storage',
};

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Set up authentication state in localStorage
 * This mimics the dev mode authentication bypass
 */
async function setupAuthState(
  page: Page,
  user: MockUser,
  tokens?: Partial<TokenConfig>
): Promise<void> {
  const timestamp = Date.now();
  const accessToken = tokens?.accessToken || `dev-token-${timestamp}`;
  const refreshToken = tokens?.refreshToken || `dev-refresh-${timestamp}`;

  // Navigate to app first to set localStorage on the correct origin
  await page.goto('/');

  // Set up localStorage with auth state
  await page.evaluate(
    ({ user, accessToken, refreshToken, keys }) => {
      // Set tokens directly
      localStorage.setItem(keys.accessToken, accessToken);
      localStorage.setItem(keys.refreshToken, refreshToken);

      // Set Zustand persisted auth state
      const authState = {
        state: {
          user: user,
          token: accessToken,
          refreshToken: refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        version: 0,
      };

      localStorage.setItem(keys.authState, JSON.stringify(authState));
    },
    {
      user,
      accessToken,
      refreshToken,
      keys: STORAGE_KEYS,
    }
  );

  // Reload to apply the auth state
  await page.reload();
}

/**
 * Clear all authentication state from localStorage
 */
async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate((keys) => {
    localStorage.removeItem(keys.accessToken);
    localStorage.removeItem(keys.refreshToken);
    localStorage.removeItem(keys.authState);
  }, STORAGE_KEYS);
}

/**
 * Get current authentication state from localStorage
 */
async function getAuthState(page: Page): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  authState: unknown | null;
}> {
  return await page.evaluate((keys) => {
    const authStateRaw = localStorage.getItem(keys.authState);
    return {
      accessToken: localStorage.getItem(keys.accessToken),
      refreshToken: localStorage.getItem(keys.refreshToken),
      authState: authStateRaw ? JSON.parse(authStateRaw) : null,
    };
  }, STORAGE_KEYS);
}

/**
 * Set expired tokens to test refresh flow
 */
async function setExpiredToken(page: Page, user: MockUser): Promise<void> {
  const expiredToken = 'expired-token-' + Date.now();
  const refreshToken = 'refresh-token-' + Date.now();

  await page.evaluate(
    ({ user, expiredToken, refreshToken, keys }) => {
      localStorage.setItem(keys.accessToken, expiredToken);
      localStorage.setItem(keys.refreshToken, refreshToken);

      const authState = {
        state: {
          user: user,
          token: expiredToken,
          refreshToken: refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        version: 0,
      };

      localStorage.setItem(keys.authState, JSON.stringify(authState));
    },
    {
      user,
      expiredToken,
      refreshToken,
      keys: STORAGE_KEYS,
    }
  );
}

// ============================================================================
// Extended Test Fixtures
// ============================================================================

/**
 * Custom test fixtures for authentication testing
 */
interface AuthFixtures {
  /**
   * Page with admin user authenticated
   */
  authenticatedPage: Page;

  /**
   * Page with operator user authenticated
   */
  operatorPage: Page;

  /**
   * Page with viewer user authenticated
   */
  viewerPage: Page;

  /**
   * Page without authentication (clean state)
   */
  unauthenticatedPage: Page;

  /**
   * Helper functions for auth manipulation
   */
  authHelpers: {
    setupAuthState: typeof setupAuthState;
    clearAuthState: typeof clearAuthState;
    getAuthState: typeof getAuthState;
    setExpiredToken: typeof setExpiredToken;
    testUsers: typeof TEST_USERS;
  };
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated page with admin user
   */
  authenticatedPage: async ({ page }, use) => {
    await setupAuthState(page, TEST_USERS.admin);
    await use(page);
  },

  /**
   * Authenticated page with operator user
   */
  operatorPage: async ({ page }, use) => {
    await setupAuthState(page, TEST_USERS.operator);
    await use(page);
  },

  /**
   * Authenticated page with viewer user
   */
  viewerPage: async ({ page }, use) => {
    await setupAuthState(page, TEST_USERS.viewer);
    await use(page);
  },

  /**
   * Clean unauthenticated page
   */
  unauthenticatedPage: async ({ page }, use) => {
    await page.goto('/');
    await clearAuthState(page);
    await page.reload();
    await use(page);
  },

  /**
   * Auth helper functions
   */
  authHelpers: async ({}, use) => {
    await use({
      setupAuthState,
      clearAuthState,
      getAuthState,
      setExpiredToken,
      testUsers: TEST_USERS,
    });
  },
});

// ============================================================================
// Re-exports
// ============================================================================

export { expect };
export type { Page };
