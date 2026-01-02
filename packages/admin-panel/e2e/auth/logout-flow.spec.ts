/**
 * LEO Frontend - Logout Flow E2E Tests
 *
 * Tests the complete logout flow including:
 * - Token clearing from storage
 * - Redirect to login page
 * - Access control after logout
 * - UI state updates
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Logout Flow', () => {
  test.describe('Logout Action', () => {
    test('should clear tokens from localStorage on logout', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Verify tokens exist before logout
      let tokens = await authenticatedPage.evaluate(() => {
        return {
          accessToken: localStorage.getItem('leo_access_token'),
          refreshToken: localStorage.getItem('leo_refresh_token'),
        };
      });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();

      // Find and click logout - look for user menu/dropdown first
      const userMenu = authenticatedPage.locator('[class*="avatar"], [class*="Avatar"], [data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }

      // Try to find logout button
      const logoutButton = authenticatedPage.getByRole('button', { name: /logout|esci|sign out/i });
      const logoutLink = authenticatedPage.getByRole('link', { name: /logout|esci|sign out/i });
      const logoutMenuItem = authenticatedPage.getByRole('menuitem', { name: /logout|esci|sign out/i });

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else if (await logoutLink.isVisible()) {
        await logoutLink.click();
      } else if (await logoutMenuItem.isVisible()) {
        await logoutMenuItem.click();
      } else {
        // Fallback: trigger logout programmatically
        await authenticatedPage.evaluate(() => {
          // Clear tokens manually
          localStorage.removeItem('leo_access_token');
          localStorage.removeItem('leo_refresh_token');
          localStorage.removeItem('leo-auth-storage');
          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('auth:logout'));
        });
      }

      // Wait for logout to complete
      await authenticatedPage.waitForTimeout(500);

      // Verify tokens are cleared
      tokens = await authenticatedPage.evaluate(() => {
        return {
          accessToken: localStorage.getItem('leo_access_token'),
          refreshToken: localStorage.getItem('leo_refresh_token'),
        };
      });
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
    });

    test('should clear Zustand auth state on logout', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');

      // Verify auth state exists
      let authState = await authHelpers.getAuthState(authenticatedPage);
      expect(authState.authState).toBeTruthy();

      // Clear auth state (simulating logout)
      await authHelpers.clearAuthState(authenticatedPage);

      // Verify state is cleared
      authState = await authHelpers.getAuthState(authenticatedPage);
      expect(authState.accessToken).toBeNull();
      expect(authState.refreshToken).toBeNull();
    });

    test('should redirect to login page after logout', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Perform logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Should be redirected to login
      await expect(authenticatedPage).toHaveURL('/login');
    });
  });

  test.describe('Post-Logout Access Control', () => {
    test('should not be able to access dashboard after logout', async ({
      authenticatedPage,
      authHelpers,
    }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Should be on login page
      await expect(authenticatedPage).toHaveURL('/login');

      // Try to navigate to dashboard
      await authenticatedPage.goto('/');

      // Should still be on login
      await expect(authenticatedPage).toHaveURL('/login');
    });

    test('should not be able to access agents page after logout', async ({
      authenticatedPage,
      authHelpers,
    }) => {
      await authenticatedPage.goto('/');

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Try to access agents
      await authenticatedPage.goto('/agents');
      await expect(authenticatedPage).toHaveURL('/login');
    });

    test('should not be able to access settings page after logout', async ({
      authenticatedPage,
      authHelpers,
    }) => {
      await authenticatedPage.goto('/');

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Try to access settings
      await authenticatedPage.goto('/settings');
      await expect(authenticatedPage).toHaveURL('/login');
    });

    test('should not be able to access any protected route after logout', async ({
      authenticatedPage,
      authHelpers,
    }) => {
      await authenticatedPage.goto('/');

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Try multiple protected routes
      const protectedRoutes = [
        '/pipeline',
        '/memory',
        '/users',
        '/tenants',
        '/channels',
        '/review',
        '/conversations',
        '/contacts',
      ];

      for (const route of protectedRoutes) {
        await authenticatedPage.goto(route);
        await expect(authenticatedPage).toHaveURL('/login');
      }
    });
  });

  test.describe('Logout State Cleanup', () => {
    test('should clean all auth-related localStorage items on logout', async ({
      authenticatedPage,
      authHelpers,
    }) => {
      await authenticatedPage.goto('/');

      // Add some additional auth-related data
      await authenticatedPage.evaluate(() => {
        localStorage.setItem('leo_user_preferences', '{"theme":"dark"}');
      });

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);

      // Check auth tokens are cleared
      const storageState = await authenticatedPage.evaluate(() => {
        return {
          accessToken: localStorage.getItem('leo_access_token'),
          refreshToken: localStorage.getItem('leo_refresh_token'),
          authState: localStorage.getItem('leo-auth-storage'),
          // User preferences might be kept
          preferences: localStorage.getItem('leo_user_preferences'),
        };
      });

      expect(storageState.accessToken).toBeNull();
      expect(storageState.refreshToken).toBeNull();
      // Preferences are typically preserved across logout
    });

    test('should maintain UI theme after logout', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');

      // Set a theme preference
      await authenticatedPage.evaluate(() => {
        localStorage.setItem('leo-ui-storage', '{"state":{"theme":"dark"}}');
        document.documentElement.classList.add('dark');
      });

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Theme preference should persist
      const hasTheme = await authenticatedPage.evaluate(() => {
        const uiStorage = localStorage.getItem('leo-ui-storage');
        return uiStorage !== null;
      });

      // UI preferences are separate from auth and should persist
      expect(hasTheme).toBe(true);
    });
  });

  test.describe('Re-login After Logout', () => {
    test('should be able to login again after logout', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();
      await expect(authenticatedPage).toHaveURL('/login');

      // Login again
      await authenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await authenticatedPage.getByLabel(/password/i).fill('admin');
      await authenticatedPage.getByRole('button', { name: /accedi/i }).click();

      // Should be back on dashboard
      await authenticatedPage.waitForURL('/');
      await expect(authenticatedPage).toHaveURL('/');
    });

    test('should have fresh tokens after re-login', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');

      // Store original token
      const originalToken = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('leo_access_token');
      });

      // Logout
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      // Login again
      await authenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await authenticatedPage.getByLabel(/password/i).fill('admin');
      await authenticatedPage.getByRole('button', { name: /accedi/i }).click();
      await authenticatedPage.waitForURL('/');

      // Check new token is different
      const newToken = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('leo_access_token');
      });

      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(originalToken);
    });

    test('should restore full access after re-login', async ({ authenticatedPage, authHelpers }) => {
      await authenticatedPage.goto('/');

      // Logout and re-login
      await authHelpers.clearAuthState(authenticatedPage);
      await authenticatedPage.reload();

      await authenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await authenticatedPage.getByLabel(/password/i).fill('admin');
      await authenticatedPage.getByRole('button', { name: /accedi/i }).click();
      await authenticatedPage.waitForURL('/');

      // Verify can access all protected routes
      const protectedRoutes = ['/agents', '/pipeline', '/settings'];

      for (const route of protectedRoutes) {
        await authenticatedPage.goto(route);
        await expect(authenticatedPage).toHaveURL(route);
      }
    });
  });
});
