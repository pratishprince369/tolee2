import { test, expect } from '@playwright/test';

test.describe('Tolee Platform Basic E2E Tests', () => {
  test('should load the home page successfully', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Check if the page has a title containing "Tolee"
    await expect(page).toHaveTitle(/Tolee/i);
  });

  test('should redirect to sign-in when accessing protected pages like create-tolee', async ({ page }) => {
    // Attempt to access a protected page
    await page.goto('/create-tolee');

    // It should redirect to sign-in page
    await expect(page).toHaveURL(/auth\/signin/);
  });
});
