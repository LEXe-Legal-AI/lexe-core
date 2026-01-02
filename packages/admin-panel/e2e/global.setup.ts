/**
 * LEO Frontend - Playwright Global Setup
 *
 * Runs before all tests to set up the test environment.
 * Creates any necessary test artifacts or configurations.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...');

  // Get the base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Wait for the server to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let retries = 0;
  const maxRetries = 30;

  while (retries < maxRetries) {
    try {
      await page.goto(baseURL, { timeout: 5000 });
      console.log(`Server is ready at ${baseURL}`);
      break;
    } catch {
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`Server not ready after ${maxRetries} retries`);
      }
      console.log(`Waiting for server... (attempt ${retries}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await browser.close();

  console.log('E2E test environment ready');
}

export default globalSetup;
