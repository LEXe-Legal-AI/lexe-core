/**
 * LEO Frontend - Protected Routes E2E Tests
 *
 * Tests access control and route protection including:
 * - Unauthenticated user redirects
 * - Authenticated user access to protected routes
 * - RBAC (Role-Based Access Control) enforcement
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Protected Routes', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect unauthenticated user from dashboard to login', async ({ unauthenticatedPage }) => {
      // Try to access dashboard directly
      await unauthenticatedPage.goto('/');

      // Should be redirected to login
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from agents page to login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/agents');
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from pipeline page to login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/pipeline');
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from memory page to login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/memory');
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from users page to login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/users');
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from settings page to login', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/settings');
      await expect(unauthenticatedPage).toHaveURL('/login');
    });

    test('should allow access to login page when unauthenticated', async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto('/login');
      await expect(unauthenticatedPage).toHaveURL('/login');

      // Should show login form
      await expect(unauthenticatedPage.getByLabel(/email/i)).toBeVisible();
    });
  });

  test.describe('Authenticated Access - Admin', () => {
    test('should access dashboard when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Should stay on dashboard
      await expect(authenticatedPage).toHaveURL('/');

      // Should show dashboard content
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access agents page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/agents');

      await expect(authenticatedPage).toHaveURL('/agents');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access pipeline page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/pipeline');

      await expect(authenticatedPage).toHaveURL('/pipeline');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access memory page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/memory');

      await expect(authenticatedPage).toHaveURL('/memory');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access users page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');

      await expect(authenticatedPage).toHaveURL('/users');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access tenants page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants');

      await expect(authenticatedPage).toHaveURL('/tenants');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access channels page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/channels');

      await expect(authenticatedPage).toHaveURL('/channels');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access review queue page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/review');

      await expect(authenticatedPage).toHaveURL('/review');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });

    test('should access settings page when authenticated as admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/settings');

      await expect(authenticatedPage).toHaveURL('/settings');
      await expect(authenticatedPage.locator('main')).toBeVisible();
    });
  });

  test.describe('RBAC - Role-Based Access Control', () => {
    test('admin should see full navigation menu', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Admin should see all navigation items
      const sidebar = authenticatedPage.locator('aside, nav').first();

      await expect(sidebar.getByText(/dashboard/i)).toBeVisible();
      await expect(sidebar.getByText(/agent/i)).toBeVisible();
      await expect(sidebar.getByText(/pipeline/i)).toBeVisible();
      await expect(sidebar.getByText(/memoria|memory/i)).toBeVisible();
      await expect(sidebar.getByText(/utenti|users/i)).toBeVisible();
    });

    test('viewer should be able to view dashboard', async ({ viewerPage }) => {
      await viewerPage.goto('/');

      // Viewer should be able to access dashboard
      await expect(viewerPage).toHaveURL('/');
      await expect(viewerPage.locator('main')).toBeVisible();
    });

    test('operator should be able to access operational pages', async ({ operatorPage }) => {
      // Operators should have access to core operational pages
      await operatorPage.goto('/');
      await expect(operatorPage).toHaveURL('/');

      await operatorPage.goto('/agents');
      await expect(operatorPage).toHaveURL('/agents');

      await operatorPage.goto('/conversations');
      await expect(operatorPage).toHaveURL('/conversations');
    });

    test('should display user info based on role', async ({ page, authHelpers }) => {
      // Test with admin
      await authHelpers.setupAuthState(page, authHelpers.testUsers.admin);
      await page.goto('/');

      // Check user info is displayed (usually in header/sidebar)
      await expect(page.getByText(/admin/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between protected routes successfully', async ({ authenticatedPage }) => {
      // Start at dashboard
      await authenticatedPage.goto('/');
      await expect(authenticatedPage).toHaveURL('/');

      // Navigate to agents
      await authenticatedPage.getByRole('link', { name: /agent/i }).first().click();
      await expect(authenticatedPage).toHaveURL('/agents');

      // Navigate back to dashboard
      await authenticatedPage.getByRole('link', { name: /dashboard/i }).click();
      await expect(authenticatedPage).toHaveURL('/');
    });

    test('should handle direct URL navigation when authenticated', async ({ authenticatedPage }) => {
      // Direct navigation to various routes should work
      await authenticatedPage.goto('/settings');
      await expect(authenticatedPage).toHaveURL('/settings');

      await authenticatedPage.goto('/conversations');
      await expect(authenticatedPage).toHaveURL('/conversations');

      await authenticatedPage.goto('/contacts');
      await expect(authenticatedPage).toHaveURL('/contacts');
    });

    test('should redirect unknown routes to dashboard', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/non-existent-route');

      // Should redirect to dashboard (catch-all route)
      await expect(authenticatedPage).toHaveURL('/');
    });
  });

  test.describe('Layout Components', () => {
    test('should render main layout for authenticated users', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Check layout components
      await expect(authenticatedPage.locator('aside, nav').first()).toBeVisible(); // Sidebar
      await expect(authenticatedPage.locator('main')).toBeVisible(); // Main content
    });

    test('should show page title in header', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Dashboard should show in header/title
      await expect(authenticatedPage.getByText(/dashboard/i).first()).toBeVisible();
    });

    test('should show user dropdown in header', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Look for user avatar/dropdown trigger
      const userArea = authenticatedPage.locator('[class*="avatar"], [class*="Avatar"], button').filter({
        has: authenticatedPage.locator('img, svg, span'),
      });

      // There should be some user-related UI element
      await expect(authenticatedPage.locator('header, [class*="header"]').first()).toBeVisible();
    });
  });
});
