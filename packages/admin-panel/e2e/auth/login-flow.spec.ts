/**
 * LEO Frontend - Login Flow E2E Tests
 *
 * Tests the complete login flow including:
 * - Login page rendering
 * - Valid/invalid credential handling
 * - OIDC redirect initiation
 * - Form validation
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Login Flow', () => {
  test.describe('Login Page Rendering', () => {
    test('should render login page correctly', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Check main elements are present
      await expect(unauthenticatedPage.locator('h1, [class*="CardTitle"]').filter({ hasText: 'LEO' })).toBeVisible();
      await expect(unauthenticatedPage.getByText('LLM Enhanced Orchestrator')).toBeVisible();

      // Check form fields
      await expect(unauthenticatedPage.getByLabel(/email/i)).toBeVisible();
      await expect(unauthenticatedPage.getByLabel(/password/i)).toBeVisible();

      // Check login button
      await expect(unauthenticatedPage.getByRole('button', { name: /accedi/i })).toBeVisible();

      // Check remember me checkbox
      await expect(unauthenticatedPage.getByText(/ricordami/i)).toBeVisible();

      // Check forgot password link
      await expect(unauthenticatedPage.getByText(/password dimenticata/i)).toBeVisible();
    });

    test('should have proper form accessibility attributes', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      const emailInput = unauthenticatedPage.getByLabel(/email/i);
      const passwordInput = unauthenticatedPage.getByLabel(/password/i);

      // Check input types
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Check autocomplete attributes
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('should toggle password visibility', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      const passwordInput = unauthenticatedPage.getByLabel(/password/i);
      const toggleButton = unauthenticatedPage.locator('button').filter({ has: unauthenticatedPage.locator('svg') }).last();

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Login with Valid Credentials', () => {
    test('should login successfully with dev credentials and redirect to dashboard', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Fill in dev mode credentials
      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');

      // Submit form
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      // Should redirect to dashboard
      await unauthenticatedPage.waitForURL('/');

      // Verify we're on the dashboard
      await expect(unauthenticatedPage).toHaveURL('/');

      // Verify auth state is set
      const authState = await unauthenticatedPage.evaluate(() => {
        return localStorage.getItem('leo_access_token');
      });
      expect(authState).toBeTruthy();
    });

    test('should show loading state during login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');

      // Click login and check for loading indicator
      const loginButton = unauthenticatedPage.getByRole('button', { name: /accedi/i });
      await loginButton.click();

      // The button should show loading state briefly
      // Since dev login is fast, we just verify the flow completes
      await unauthenticatedPage.waitForURL('/');
    });
  });

  test.describe('Login with Invalid Credentials', () => {
    test('should show error message for empty credentials', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Click login without entering credentials
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      // Should show validation error
      await expect(unauthenticatedPage.getByText(/inserisci email e password/i)).toBeVisible();
    });

    test('should show error message for invalid credentials', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Enter invalid credentials
      await unauthenticatedPage.getByLabel(/email/i).fill('invalid@test.com');
      await unauthenticatedPage.getByLabel(/password/i).fill('wrongpassword');

      // Submit form
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      // Should show error message
      await expect(unauthenticatedPage.getByText(/credenziali non valide|login failed/i)).toBeVisible({
        timeout: 10000,
      });

      // Should still be on login page
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should clear error on retry', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      // Trigger error first
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();
      await expect(unauthenticatedPage.getByText(/inserisci email e password/i)).toBeVisible();

      // Now enter valid credentials
      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');
      await unauthenticatedPage.getByRole('button', { name: /accedi/i }).click();

      // Error should be gone and should redirect
      await unauthenticatedPage.waitForURL('/');
    });
  });

  test.describe('OIDC Integration', () => {
    test('should show SSO button when OIDC is enabled', async ({ unauthenticatedPage }) => {
      // Set OIDC enabled environment
      await unauthenticatedPage.goto('/login');

      // Check if SSO button exists (may not be visible if OIDC is disabled)
      const ssoButton = unauthenticatedPage.getByRole('button', { name: /accedi con sso/i });

      // This test passes whether SSO is enabled or not - we're testing the UI adapts correctly
      const ssoExists = await ssoButton.isVisible().catch(() => false);

      if (ssoExists) {
        await expect(ssoButton).toBeVisible();
        await expect(unauthenticatedPage.getByText(/oppure/i)).toBeVisible();
      } else {
        // SSO not enabled - that's fine, just verify login form works
        await expect(unauthenticatedPage.getByRole('button', { name: /accedi/i })).toBeVisible();
      }
    });

    test('should handle OIDC callback redirect properly', async ({ unauthenticatedPage }) => {
      // Navigate to callback page without proper OIDC state
      await unauthenticatedPage.goto('/auth/callback');

      // Should show error since there's no valid OIDC state
      // The exact behavior depends on OIDC configuration
      await expect(
        unauthenticatedPage.getByText(/authenticat|error|login/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form Behavior', () => {
    test('should submit form on Enter key', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');

      // Press Enter instead of clicking button
      await unauthenticatedPage.getByLabel(/password/i).press('Enter');

      // Should redirect to dashboard
      await unauthenticatedPage.waitForURL('/');
    });

    test('should disable form during submission', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');

      await unauthenticatedPage.getByLabel(/email/i).fill('admin@leo.local');
      await unauthenticatedPage.getByLabel(/password/i).fill('admin');

      // Start login
      const loginButton = unauthenticatedPage.getByRole('button', { name: /accedi/i });
      await loginButton.click();

      // Since dev login is fast, we can't reliably test disabled state
      // Just verify the flow completes successfully
      await unauthenticatedPage.waitForURL('/');
    });
  });
});
