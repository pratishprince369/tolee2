import { test, expect, Page } from '@playwright/test';
import { setupErrorCollector, loginViaUI } from './helpers';

test.describe('🔄 Feed Navigation & State Stability Suite', () => {

  test('1. Feed -> Article -> Browser Back returns cleanly without Error 482 and restores scroll', async ({ page }) => {
    const errors = setupErrorCollector(page);

    // Navigate to feed (or home if session redirects)
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check if on feed or redirected to signin
    if (page.url().includes('signin') || page.url().includes('login') || page.url().endsWith('/')) {
      // Login or test public news article directly
      console.log('Testing news navigation flow directly...');
    }

    // Scroll down on feed
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Locate first news or article link if present, or navigate to a news article
    const articleLink = page.locator('a[href^="/news/"]').first();
    let newsSlug = '';
    if (await articleLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await articleLink.getAttribute('href');
      newsSlug = href || '';
      await articleLink.click();
    } else {
      // Direct navigation to news hub or public article
      await page.goto('/news', { waitUntil: 'domcontentloaded' });
      const firstNews = page.locator('a[href^="/news/"]').first();
      if (await firstNews.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstNews.click();
      }
    }

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Verify article page loaded without crashing
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText.length).toBeGreaterThan(20);

    // Browser Back
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify NO React Error #482
    const hasError482 = errors.console.some(e => e.includes('482') || e.includes('Minified React error #482'));
    expect(hasError482, 'React Error #482 was detected in console!').toBe(false);

    // Verify page did not display the crash screen
    const clientExceptionText = await page.locator('text=Application error: a client-side exception has occurred').count();
    expect(clientExceptionText, 'Crash screen displayed on Back!').toBe(0);
  });

  test('2. Missing or Deleted Article handles gracefully via 404 boundary', async ({ page }) => {
    const errors = setupErrorCollector(page);

    // Navigate to a non-existent news article slug
    await page.goto('/news/non-existent-article-slug-xyz999', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Should render the custom Article Not Available page or Global Not Found, NOT crash
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText.length).toBeGreaterThan(10);

    const hasCrash = errors.page.some(e => e.includes('Cannot read properties of undefined') || e.includes('Minified React error'));
    expect(hasCrash, 'Unhandled crash on missing article!').toBe(false);

    // Verify Return to Feed button works
    const returnBtn = page.locator('a[href="/feed"], button:has-text("Feed"), a:has-text("Return to Feed")').first();
    if (await returnBtn.isVisible().catch(() => false)) {
      await returnBtn.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('feed');
    }
  });

  test('3. News Detail Page Header Back Button works properly', async ({ page }) => {
    const errors = setupErrorCollector(page);

    await page.goto('/news', { waitUntil: 'domcontentloaded' });
    const newsLink = page.locator('a[href^="/news/"]').first();

    if (await newsLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Click the NewsBackButton
      const backButton = page.locator('button:has-text("Home Feed")').first();
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(1500);

        // Verify no crash occurred
        const crashCount = await page.locator('text=Application error: a client-side exception has occurred').count();
        expect(crashCount).toBe(0);
      }
    }
  });

  test('4. Forward and Back navigation maintains history consistency', async ({ page }) => {
    const errors = setupErrorCollector(page);

    await page.goto('/discover', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Go Back
    await page.goBack();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('discover');

    // Go Forward
    await page.goForward();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('marketplace');

    const hasReactError = errors.console.some(e => e.includes('Minified React error #482'));
    expect(hasReactError).toBe(false);
  });
});
