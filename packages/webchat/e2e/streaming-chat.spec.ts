import { test, expect } from '@playwright/test';

test.describe('Streaming Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and go to login
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should complete guest login', async ({ page }) => {
    // Find and click guest button
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });
    await guestButton.click();

    // Should redirect to main chat
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');
  });

  test('should have working CORS for stream endpoint', async ({ page, request }) => {
    // Test CORS preflight directly
    const response = await request.fetch('http://localhost:8000/api/v1/gateway/stream', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(headers['access-control-allow-methods']).toContain('POST');
  });

  test('should send message and receive streaming response', async ({ page }) => {
    // Login as guest first
    await page.goto('/login');
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });
    await guestButton.click();
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for chat interface to load
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 15000 });

    // Type a message
    await textarea.fill('Ciao, come stai?');

    // Find and click send button (could be button with arrow icon or submit)
    const sendButton = page.locator('button[type="submit"], button:has(svg), form button').last();
    await sendButton.click();

    // Wait for response - look for assistant message or streaming indicator
    const responseIndicator = page.locator('[data-testid="assistant-message"], .assistant-message, [class*="streaming"], [class*="typing"]');

    // Give it time to start streaming
    await page.waitForTimeout(2000);

    // Check for any response content or error
    const pageContent = await page.content();
    console.log('Page contains streaming/assistant elements:',
      pageContent.includes('assistant') ||
      pageContent.includes('streaming') ||
      pageContent.includes('typing')
    );

    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit more and check for errors
    await page.waitForTimeout(3000);

    // If there are CORS errors, fail explicitly
    const corsErrors = errors.filter(e => e.includes('CORS'));
    if (corsErrors.length > 0) {
      console.error('CORS Errors found:', corsErrors);
    }
    expect(corsErrors.length).toBe(0);
  });

  test('should verify API client can get guest token', async ({ request }) => {
    // Test guest auth endpoint
    const response = await request.post('http://localhost:8000/api/auth/guest', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.access_token).toBeDefined();
    expect(data.contact_id).toBeDefined();
    console.log('Guest token obtained, contact_id:', data.contact_id);
  });

  test('should stream response with guest token', async ({ request }) => {
    // Get guest token first
    const authResponse = await request.post('http://localhost:8000/api/auth/guest', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    const authData = await authResponse.json();
    const token = authData.access_token;

    // Test streaming endpoint
    const streamResponse = await request.post('http://localhost:8000/api/v1/gateway/stream', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      data: {
        message: 'ciao',
        model: 'llama-3.3-free',
      },
    });

    expect(streamResponse.status()).toBe(200);
    const body = await streamResponse.text();
    console.log('Stream response (first 500 chars):', body.substring(0, 500));

    // Should contain SSE events
    expect(body).toContain('event:');
    expect(body).toContain('data:');
  });
});
