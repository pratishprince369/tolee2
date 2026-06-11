/**
 * Tolee Test Helpers
 * Common utilities used across test suites
 */
import { Page, BrowserContext } from '@playwright/test';

export const TEST_BASE_URL = 'http://localhost:3000';

// Test credentials — use env vars in CI
export const TEST_USER = {
  email: process.env.TEST_EMAIL || 'qatest@tolee.in',
  password: process.env.TEST_PASSWORD || 'QAtest@1234',
  name: 'QA Test User',
};

/**
 * Attempt to login via UI
 */
export async function loginViaUI(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(email);

  // Fill password
  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await passInput.fill(password);

  // Submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  await submitBtn.click();

  // Wait for redirect to feed
  await page.waitForTimeout(4000);
  return page.url().includes('feed') || page.url().includes('/');
}

/**
 * Register a test user
 */
export async function registerTestUser(page: Page) {
  await page.goto('/auth/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill(TEST_USER.name);
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(TEST_USER.email);

  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await passInput.fill(TEST_USER.password);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")').first();
  await submitBtn.click();

  await page.waitForTimeout(4000);
  return !page.url().includes('signup');
}

/**
 * Collect console errors and page errors
 */
export function setupErrorCollector(page: Page) {
  const errors = {
    console: [] as string[],
    page: [] as string[],
    network500: [] as string[],
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('manifest')) {
        errors.console.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    if (!err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      errors.page.push(err.message);
    }
  });

  page.on('response', res => {
    if (res.status() >= 500) {
      errors.network500.push(`${res.status()} ${res.url()}`);
    }
  });

  return errors;
}

/**
 * Take screenshot with descriptive name
 */
export async function captureScreenshot(page: Page, name: string) {
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  await page.screenshot({
    path: `playwright-report/screenshots/${safeName}.png`,
    fullPage: false,
  });
}

/**
 * Check for horizontal scroll (overflow)
 */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/**
 * Get page load time
 */
export async function getPageLoadTime(page: Page, path: string): Promise<number> {
  const start = Date.now();
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  return Date.now() - start;
}
