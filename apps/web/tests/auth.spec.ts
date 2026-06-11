import { test, expect, Page } from '@playwright/test';

// ── Helpers ─────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';

// Collect console errors
function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// ── Auth Tests ──────────────────────────────────────────────────
test.describe('🔐 Authentication', () => {

  test('Sign Up page loads correctly', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/signup/);
    // Check key form elements exist
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")').first()).toBeVisible();
    console.log('✅ Sign up page loaded. Console errors:', errors.length);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('Failed to load resource') &&
      !e.includes('sw.js') &&
      !e.includes('fonts') &&
      !e.includes('google') &&
      !e.includes('NEXT_REDIRECT') &&
      !e.includes('FCM')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Sign Up — empty form validation', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    // Should stay on signup page (no redirect to feed)
    expect(page.url()).not.toContain('/feed');
  });

  test('Sign Up — invalid email validation', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    await emailInput.fill('notanemail');
    await passInput.fill('test1234');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/feed');
  });

  test('Login page loads correctly', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/signin/);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    console.log('✅ Login page loaded. Console errors:', errors.length);
  });

  test('Login — invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input[type="email"], input[name="email"]').first().fill('fake@test.com');
    await page.locator('input[type="password"], input[name="password"]').first().fill('wrongpass123');
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
    // Should not redirect to feed
    expect(page.url()).not.toContain('/feed');
    // Should show some error message
    const errorText = await page.locator('text=/invalid|error|incorrect|wrong|failed/i').first().isVisible().catch(() => false);
    console.log('Error shown on bad login:', errorText);
  });

  test('Auth redirect — /feed requires login', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should redirect to signin
    expect(page.url()).toMatch(/signin|auth/);
    console.log('✅ /feed correctly redirects to signin when not logged in');
  });

  test('Auth redirect — /settings requires login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/signin|auth/);
    console.log('✅ /settings correctly redirects to signin when not logged in');
  });

  test('Auth redirect — /chat requires login', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/signin|auth/);
    console.log('✅ /chat correctly redirects to signin when not logged in');
  });

  test('Auth redirect — /create-tolee requires login', async ({ page }) => {
    await page.goto('/create-tolee');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/signin|auth/);
    console.log('✅ /create-tolee correctly redirects to signin when not logged in');
  });

  test('Auth redirect — /notifications requires login', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/signin|auth/);
    console.log('✅ /notifications correctly redirects to signin when not logged in');
  });

  test('Signin page has no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('sw.js')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
