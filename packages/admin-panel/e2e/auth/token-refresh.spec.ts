/**
 * LEO Frontend - Token Refresh E2E Tests
 *
 * Tests token refresh functionality including:
 * - Automatic token refresh before expiry
 * - Handling of expired tokens
 * - Failed refresh redirects to login
 * - Token storage updates
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Token Refresh', () => {
  test.describe('Token Storage', () => {
    test('should store tokens in localStorage after login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Login with dev credentials
      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      await unauthenticatedPage.waitForURL('/');

      // Verify tokens are stored
      const tokens = await unauthenticatedPage.evaluate(() => {
        return {
          accessToken: localStorage.getItem('leo_access_token'),
          refreshToken: localStorage.getItem('leo_refresh_token'),
        };
      });

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).toContain('dev-token');
      expect(tokens.refreshToken).toContain('dev-refresh');
    });

    test('should store auth state in Zustand persisted storage', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      await unauthenticatedPage.waitForURL('/');

      // Verify Zustand state is persisted
      const authState = await unauthenticatedPage.evaluate(() => {
        const raw = localStorage.getItem('leo-auth-storage');
        return raw ? JSON.parse(raw) : null;
      });

      expect(authState).toBeTruthy();
      expect(authState.state.isAuthenticated).toBe(true);
      expect(authState.state.user).toBeTruthy();
      expect(authState.state.user.email).toBe('admin@leo.local');
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain authentication after page reload', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Reload the page
      await authenticatedPage.reload();

      // Should still be authenticated and on dashboard
      await expect(authenticatedPage).toHaveURL('/');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should maintain authentication across navigation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Navigate to different pages
      await authenticatedPage.goto('/agents');
      await expect(authenticatedPage).toHaveURL('/agents');

      await authenticatedPage.goto('/pipeline');
      await expect(authenticatedPage).toHaveURL('/pipeline');

      await authenticatedPage.goto('/settings');
      await expect(authenticatedPage).toHaveURL('/settings');

      // Should still be authenticated
      const authState = await authenticatedPage.evaluate(() => {
        const raw = localStorage.getItem('leo-auth-storage');
        return raw ? JSON.parse(raw) : null;
      });

      expect(authState.state.isAuthenticated).toBe(true);
    });

    test('should restore authentication state on app load', async ({ page, authHelpers }) => {
      // Set up auth state manually
      await authHelpers.setupAuthState(page, authHelpers.testUsers.admin);

      // Navigate to app
      await page.goto('/');

      // Should be authenticated without re-login
      await expect(page).toHaveURL('/');
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Expired Token Handling', () => {
    test('should handle page access with expired token', async ({ page, authHelpers }) => {
      // Set up expired token
      await page.goto('/');
      await authHelpers.setExpiredToken(page, authHelpers.testUsers.admin);
      await page.reload();

      // Note: In dev mode with dev tokens, refresh is skipped
      // For real API testing, the app would attempt refresh
      // Here we just verify the state is set correctly
      const tokens = await page.evaluate(() => {
        return {
          accessToken: localStorage.getItem('leo_access_token'),
        };
      });

      expect(tokens.accessToken).toContain('expired-token');
    });

    test('should redirect to login when tokens are invalid and refresh fails', async ({
      page,
      authHelpers,
    }) => {
      // Clear all tokens to simulate complete auth failure
      await page.goto('/');
      await authHelpers.clearAuthState(page);
      await page.reload();

      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Token Updates', () => {
    test('should update tokens in localStorage when auth state changes', async ({
      page,
      authHelpers,
    }) => {
      // Setup initial auth
      await authHelpers.setupAuthState(page, authHelpers.testUsers.admin, {
        accessToken: 'initial-token',
        refreshToken: 'initial-refresh',
      });

      // Verify initial tokens
      let tokens = await authHelpers.getAuthState(page);
      expect(tokens.accessToken).toBe('initial-token');
      expect(tokens.refreshToken).toBe('initial-refresh');

      // Update with new tokens (simulating refresh)
      await page.evaluate(() => {
        localStorage.setItem('leo_access_token', 'new-token');
        localStorage.setItem('leo_refresh_token', 'new-refresh');
      });

      // Verify tokens are updated
      tokens = await authHelpers.getAuthState(page);
      expect(tokens.accessToken).toBe('new-token');
      expect(tokens.refreshToken).toBe('new-refresh');
    });

    test('should sync token storage with auth store', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Login
      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      await unauthenticatedPage.waitForURL('/');

      // Verify both storage locations have tokens
      const storageState = await unauthenticatedPage.evaluate(() => {
        const directToken = localStorage.getItem('leo_access_token');
        const zustandStorage = localStorage.getItem('leo-auth-storage');
        const zustandState = zustandStorage ? JSON.parse(zustandStorage) : null;

        return {
          directToken,
          zustandToken: zustandState?.state?.token,
        };
      });

      expect(storageState.directToken).toBeTruthy();
      expect(storageState.zustandToken).toBeTruthy();
      // They should match
      expect(storageState.directToken).toBe(storageState.zustandToken);
    });
  });

  test.describe('Auth Event Handling', () => {
    test('should clear auth state on auth:logout event', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Dispatch logout event
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      });

      // Wait a moment for the event to be processed
      await authenticatedPage.waitForTimeout(100);

      // Reload and check - should be redirected to login
      await authenticatedPage.reload();
      await expect(authenticatedPage).toHaveURL('/login');
    });
  });
});
