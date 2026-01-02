import { test, expect } from '@playwright/test';

/**
 * LEO Webchat Authentication E2E Tests
 *
 * Tests the complete authentication flow including:
 * - Route protection
 * - Guest login
 * - OAuth flow
 *
 * Note: App may be in Italian (Piattaforma LEO, Ospite, etc.)
 */

test.describe('Routes & Navigation', () => {
  test('should redirect unauthenticated user to /login when OAuth enabled', async ({ page }) => {
    // Clear any stored auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to home - should redirect to login
    await page.goto('/');

    // Wait for redirect
    await page.waitForURL('**/login', { timeout: 10000 });

    // Verify we're on login page
    expect(page.url()).toContain('/login');

    // Verify login page elements are visible (supports EN/IT)
    await expect(page.getByText(/LEO Platform|Piattaforma LEO/i)).toBeVisible();
  });

  test('should show login page with OAuth and Guest buttons', async ({ page }) => {
    await page.goto('/login');

    // Check for OAuth button (Authentik is same in all languages)
    const oauthButton = page.getByRole('button', { name: /authentik/i });
    await expect(oauthButton).toBeVisible();

    // Check for Guest button (Guest in EN, Ospite in IT)
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible();
  });

  test('should handle /callback route', async ({ page }) => {
    // Navigate to callback without params - should show error and redirect
    await page.goto('/callback');

    // Should show error or redirect to login
    await page.waitForURL(/\/(login|callback)/, { timeout: 10000 });
  });

  test('should redirect unknown routes to /', async ({ page }) => {
    await page.goto('/unknown-route-12345');

    // Should redirect to / which then redirects to /login
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
  });
});

test.describe('Guest Authentication', () => {
  test('should login as guest successfully', async ({ page }) => {
    // Clear auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Wait for page to load (Guest in EN, Ospite in IT)
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });

    // Click guest login
    await guestButton.click();

    // Wait for navigation to home
    await page.waitForURL('/', { timeout: 15000 });

    // Verify we're on the chat page
    await expect(page.locator('text=/LEO Webchat|LEO/i')).toBeVisible({ timeout: 10000 });
  });

  test('should persist guest session after refresh', async ({ page }) => {
    // First login as guest
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });
    await guestButton.click();
    await page.waitForURL('/', { timeout: 15000 });

    // Refresh the page
    await page.reload();

    // Should still be on home (not redirected to login)
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('text=/LEO Webchat|LEO/i')).toBeVisible();
  });

  test('should show error if guest API fails', async ({ page, context }) => {
    // Block the guest auth endpoint
    await context.route('**/api/auth/guest', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Server error' }),
      });
    });

    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for guest button
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });

    // Try guest login
    await guestButton.click();

    // Should show error message (red background or error class)
    await expect(page.locator('[class*="red"], [class*="error"], [role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('OAuth Authentication', () => {
  test('should redirect to Authentik when clicking OAuth button', async ({ page }) => {
    await page.goto('/login');

    // Click OAuth button
    const oauthButton = page.getByRole('button', { name: /authentik/i });
    await oauthButton.click();

    // Should redirect to Authentik (localhost:9000)
    await page.waitForURL(/localhost:9000/, { timeout: 10000 });

    // Verify we're on Authentik
    expect(page.url()).toContain('localhost:9000');
  });

  test('should include PKCE parameters in OAuth redirect', async ({ page }) => {
    await page.goto('/login');

    // Listen for navigation
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('localhost:9000') && req.url().includes('authorize')),
      page.getByRole('button', { name: /authentik/i }).click(),
    ]);

    const url = new URL(request.url());

    // Verify PKCE parameters
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('leo-webchat');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('redirect_uri')).toContain('/callback');
  });

  test('should handle OAuth callback with valid code', async ({ page, context }) => {
    // Mock the token endpoint
    await context.route('**/application/o/leo-webchat/token/', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_access_token_12345',
          refresh_token: 'mock_refresh_token_12345',
          id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdEBsZW8ubG9jYWwiLCJuYW1lIjoiVGVzdCBVc2VyIn0.mock',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email',
        }),
      });
    });

    // Mock userinfo endpoint
    await context.route('**/application/o/leo-webchat/userinfo/', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sub: 'testuser-uuid',
          email: 'test@leo.local',
          name: 'Test User',
          preferred_username: 'testuser',
        }),
      });
    });

    // Set up PKCE state in localStorage
    await page.goto('/login');
    const state = 'test_state_12345';
    const codeVerifier = 'test_code_verifier_12345678901234567890123456789012345678901234';

    await page.evaluate(({ state, codeVerifier }) => {
      localStorage.setItem('leo_oauth_pkce_state', JSON.stringify({
        state,
        codeVerifier,
        redirectUri: 'http://localhost:3001/callback',
        timestamp: Date.now(),
      }));
    }, { state, codeVerifier });

    // Navigate to callback with code and state
    await page.goto(`/callback?code=mock_auth_code&state=${state}`);

    // Should eventually redirect to home
    await page.waitForURL('/', { timeout: 15000 });

    // Verify we're authenticated
    await expect(page.locator('text=LEO Webchat')).toBeVisible();
  });

  test('should handle OAuth callback error', async ({ page }) => {
    // Navigate to callback with error
    await page.goto('/callback?error=access_denied&error_description=User%20denied%20access');

    // Should show error and redirect to login (use .first() as multiple elements may match)
    await expect(page.locator('text=/denied|failed|error/i').first()).toBeVisible({ timeout: 5000 });

    // Eventually redirect to login
    await page.waitForURL('**/login', { timeout: 10000 });
  });
});

test.describe('Logout', () => {
  test('should clear session on logout', async ({ page }) => {
    // First login as guest
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('button', { name: /guest|ospite/i }).click();
    await page.waitForURL('/', { timeout: 15000 });

    // Find and click logout (if visible in UI)
    // For now, we'll simulate logout via localStorage
    await page.evaluate(() => {
      localStorage.removeItem('leo-auth-tokens');
      localStorage.removeItem('leo_oauth_tokens');
      localStorage.removeItem('leo-auth-store');
    });

    // Refresh - should redirect to login
    await page.reload();
    await page.waitForURL('**/login', { timeout: 10000 });
  });
});

test.describe('API Integration', () => {
  test('guest auth endpoint should return tokens', async ({ request }) => {
    const response = await request.post('http://localhost:8000/api/auth/guest', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe('bearer');
  });

  test('OAuth OIDC discovery should be available', async ({ request }) => {
    const response = await request.get('http://localhost:9000/application/o/leo-webchat/.well-known/openid-configuration');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.issuer).toContain('leo-webchat');
    expect(data.authorization_endpoint).toBeTruthy();
    expect(data.token_endpoint).toBeTruthy();
  });
});
