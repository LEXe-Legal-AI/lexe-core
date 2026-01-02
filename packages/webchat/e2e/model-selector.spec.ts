import { test, expect } from '@playwright/test';

/**
 * Model Selector E2E Tests
 *
 * Tests the model selection dropdown in the webchat header.
 * Uses real guest auth (backend containers must be running).
 */

test.describe('Model Selector', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Login as guest (uses real backend)
    const guestButton = page.getByRole('button', { name: /guest|ospite/i });
    await expect(guestButton).toBeVisible({ timeout: 10000 });
    await guestButton.click();

    // Wait for navigation to main app
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should display model selector in header', async ({ page }) => {
    // Look for model selector button by title attribute
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
  });

  test('should open dropdown when clicked', async ({ page }) => {
    // Click model selector
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
    await modelSelector.click();

    // Verify dropdown opens
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();

    // Verify sections exist (use first() for duplicate text)
    await expect(page.locator('div.bg-muted\\/30').filter({ hasText: 'FREE' }).first()).toBeVisible();
    await expect(page.getByText('PREMIUM').first()).toBeVisible();
  });

  test('should show Auto and model categories', async ({ page }) => {
    // Open dropdown
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
    await modelSelector.click();

    // Check Auto option
    await expect(page.getByRole('option', { name: /Auto/ })).toBeVisible();

    // Check at least one FREE model exists
    const freeSection = page.locator('text=FREE').first();
    await expect(freeSection).toBeVisible();

    // Check at least one PREMIUM model exists
    const premiumSection = page.locator('text=PREMIUM').first();
    await expect(premiumSection).toBeVisible();
  });

  test('should select a model when clicked', async ({ page }) => {
    // Open dropdown
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
    await modelSelector.click();

    // Click on a PREMIUM model (Claude Sonnet)
    const claudeOption = page.getByRole('option', { name: /Claude Sonnet/ });
    await expect(claudeOption).toBeVisible();
    await claudeOption.click();

    // Dropdown should close
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).not.toBeVisible();

    // Model selector should show selected model name
    await expect(modelSelector).toContainText('Claude Sonnet');
  });

  test('should close dropdown on escape key', async ({ page }) => {
    // Open dropdown
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
    await modelSelector.click();

    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('should persist model selection after page refresh', async ({ page }) => {
    // Open dropdown and select Claude Sonnet
    const modelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
    await modelSelector.click();
    await page.getByRole('option', { name: /Claude Sonnet/ }).click();

    // Verify selection
    await expect(modelSelector).toContainText('Claude Sonnet');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Model selector should still show Claude Sonnet (persisted in localStorage)
    const newModelSelector = page.locator('button[title="Seleziona modello"]');
    await expect(newModelSelector).toBeVisible({ timeout: 10000 });
    await expect(newModelSelector).toContainText('Claude Sonnet');
  });
});
