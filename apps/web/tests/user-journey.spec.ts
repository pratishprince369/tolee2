import { test, expect } from '@playwright/test';

// Set a larger timeout for the entire journey since we use pauses to make it viewable
test.setTimeout(90000);

test.describe('Mobile Interactive User Journey Simulator', () => {
  // Simulate a standard mobile screen (iPhone 12 / Pixel 5 viewport size)
  test.use({ viewport: { width: 375, height: 812 } });

  test('Simulate complete user journey on Tolee', async ({ page }) => {
    // Helper function to pause so the user can visually watch the flow
    const userPause = async (ms = 2000) => {
      await page.waitForTimeout(ms);
    };

    console.log('1. Navigating to Home Page...');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Scroll down to simulate reading the feed
    console.log('Scrolling feed...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await userPause(1500);
    await page.evaluate(() => window.scrollBy(0, 400));
    await userPause(2000);

    // Go back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await userPause(1000);

    console.log('2. Navigating to Creator Program page...');
    await page.goto('/creator-program');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Scroll through the creator program details
    await page.evaluate(() => window.scrollBy(0, 500));
    await userPause(2000);
    await page.evaluate(() => window.scrollBy(0, 500));
    await userPause(2000);

    // Try tapping Join Creator Program button
    const joinBtn = page.locator('button:has-text("Join Creator Program"), a:has-text("Join Creator Program")').first();
    if (await joinBtn.count() > 0 && await joinBtn.isVisible()) {
      console.log('Tapping Join Creator Program button...');
      await joinBtn.click();
      await userPause(2500);
    }

    console.log('3. Navigating to Marketplace page...');
    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Scroll marketplace items
    await page.evaluate(() => window.scrollBy(0, 400));
    await userPause(1500);
    await page.evaluate(() => window.scrollBy(0, 400));
    await userPause(2000);

    console.log('4. Navigating to Tolee World page...');
    await page.goto('/world');
    await page.waitForLoadState('domcontentloaded');
    await userPause(3000);

    console.log('5. Navigating to APK download page...');
    await page.goto('/promo');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Scroll through promo details
    await page.evaluate(() => window.scrollBy(0, 300));
    await userPause(2000);

    console.log('6. Navigating to AI Manager page...');
    await page.goto('/ai-manager');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Verify AI Manager is loaded (e.g. check Header)
    const headerTitle = page.locator('h2', { hasText: /AI Tolee Manager/i }).first();
    await expect(headerTitle).toBeVisible();
    console.log('AI Manager page loaded successfully!');
    await userPause(2000);

    console.log('7. Navigating to Create Tolee group page to verify Auth Redirect...');
    await page.goto('/create-tolee');
    await page.waitForLoadState('domcontentloaded');
    await userPause(2500);

    // Verify it redirects to signin
    await expect(page).toHaveURL(/auth\/signin/);
    console.log('Create Tolee authentication redirect verified successfully!');

    // Let the user look at the sign-in page options
    await page.evaluate(() => window.scrollBy(0, 300));
    await userPause(2500);

    console.log('User journey simulator finished successfully!');
  });
});
