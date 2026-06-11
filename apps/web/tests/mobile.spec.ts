import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport E2E Tests', () => {
  // Enforce mobile-sized viewport for this suite
  test.use({ viewport: { width: 375, height: 812 } });

  test('should load landing page successfully on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Title checks
    await expect(page).toHaveTitle(/Tolee/i);
    
    // Check if the logo/branding is visible
    const logoLink = page.locator('header a').first();
    await expect(logoLink).toBeVisible();
  });

  test('should load creator program page and verify english text on mobile', async ({ page }) => {
    await page.goto('/creator-program');

    // Verify main translated English headline
    const headline = page.locator('h1');
    await expect(headline).toContainText(/India's Creator Revolution/i);

    // Verify join button is visible on mobile
    const joinButton = page.locator('button', { hasText: /Join Creator Program/i });
    await expect(joinButton).toBeVisible();
  });

  test('should load public pages and ensure proper redirect on mobile', async ({ page }) => {
    await page.goto('/create-tolee');

    // Verify unauthenticated users redirect to signin
    await expect(page).toHaveURL(/auth\/signin/);
    
    // Verify signin forms or buttons are visible
    const loginTitle = page.locator('h1, h2', { hasText: /Sign In/i });
    if (await loginTitle.count() > 0) {
      await expect(loginTitle.first()).toBeVisible();
    }
  });
});
