import { test, expect } from '@playwright/test';
import { loginViaUI, TEST_USER } from './helpers';

// Bypass browser autoplay policies in headless chromium E2E runs
test.use({
  launchOptions: {
    args: ['--autoplay-policy=no-user-gesture-required']
  }
});

test.describe('📷 Tolee Autoplay & Reels Header Verification', () => {

  test('Desktop (1280x800): Feed video autoplay & Reels header visible', async ({ page }) => {
    // Collect console logs
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });

    // 1. Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    console.log('Logging in on desktop...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);

    // 2. Test Feed Video Autoplay
    console.log('Navigating to feed...');
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Allow feed to load

    // Find video element with large timeout
    const videoLocator = page.locator('video').first();
    await expect(videoLocator).toBeVisible({ timeout: 20000 });

    console.log('Scrolling video post into view and triggering intersection observer...');
    // Scroll into view first
    await videoLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Shake the scroll slightly to force headless chromium to trigger IntersectionObserver
    console.log('Shaking viewport to trigger scroll events...');
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(500);

    // Center the video in the viewport
    const box = await videoLocator.boundingBox();
    if (box) {
      const scrollY = box.y + box.height / 2 - 400; // 400 is half of 800 viewport height
      await page.evaluate((y) => window.scrollBy(0, y), scrollY);
    }
    await page.waitForTimeout(5000); // Wait for autoplay to start

    // Log video details
    const videoProps = await videoLocator.evaluate((el: HTMLVideoElement) => {
      return {
        src: el.src,
        readyState: el.readyState,
        paused: el.paused,
        networkState: el.networkState,
        error: el.error ? { code: el.error.code, message: el.error.message } : null
      };
    });
    console.log('Video state:', JSON.stringify(videoProps, null, 2));

    console.log('Verifying video plays automatically (muted autoplay)...');
    // Wait until video is playing (not paused)
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    }, { timeout: 20000 }).catch(err => {
      console.warn('Playwright warning: video did not report non-paused state.');
    });

    const isPaused = await videoLocator.evaluate((el: HTMLVideoElement) => el.paused);
    const isMuted = await videoLocator.evaluate((el: HTMLVideoElement) => el.muted);
    
    console.log(`Video status - paused: ${isPaused}, muted: ${isMuted}`);
    expect(isMuted).toBe(true); // Must be muted to bypass autoplay policy
    expect(isPaused).toBe(false); // Should be playing

    // Take screenshot of desktop feed with autoplaying video
    await page.screenshot({ path: 'playwright-report/screenshots/desktop_feed_autoplay.png' });

    // 3. Test Reels Header visibility on desktop
    console.log('Navigating to reels page...');
    await page.goto('/reels', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Header should be visible on desktop reels page
    const header = page.locator('header');
    await expect(header).toBeVisible();
    console.log('Verified: Header is visible on desktop reels page.');

    await page.screenshot({ path: 'playwright-report/screenshots/desktop_reels_header.png' });
  });

  test('Mobile (375x812): Feed video autoplay & Reels header hidden', async ({ page }) => {
    // 1. Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 812 });

    console.log('Logging in on mobile...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);

    // 2. Test Feed Video Autoplay
    console.log('Navigating to feed on mobile...');
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Allow feed to load

    const videoLocator = page.locator('video').first();
    await expect(videoLocator).toBeVisible({ timeout: 20000 });

    console.log('Scrolling video post into view and shaking scroll on mobile...');
    await videoLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(500);

    const box = await videoLocator.boundingBox();
    if (box) {
      const scrollY = box.y + box.height / 2 - 406; // 406 is half of 812 viewport height
      await page.evaluate((y) => window.scrollBy(0, y), scrollY);
    }
    await page.waitForTimeout(5000); // Wait for IntersectionObserver

    // Log video details
    const mobileProps = await videoLocator.evaluate((el: HTMLVideoElement) => {
      return {
        src: el.src,
        readyState: el.readyState,
        paused: el.paused,
        networkState: el.networkState,
        error: el.error ? { code: el.error.code, message: el.error.message } : null
      };
    });
    console.log('Mobile video state:', JSON.stringify(mobileProps, null, 2));

    console.log('Verifying mobile video plays automatically...');
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    }, { timeout: 20000 }).catch(err => {
      console.warn('Playwright warning: mobile video did not report non-paused state.');
    });

    const isPaused = await videoLocator.evaluate((el: HTMLVideoElement) => el.paused);
    const isMuted = await videoLocator.evaluate((el: HTMLVideoElement) => el.muted);
    
    console.log(`Mobile video status - paused: ${isPaused}, muted: ${isMuted}`);
    expect(isMuted).toBe(true);
    expect(isPaused).toBe(false);

    // Take screenshot of mobile feed with autoplaying video
    await page.screenshot({ path: 'playwright-report/screenshots/mobile_feed_autoplay.png' });

    // 3. Test Reels Header visibility on mobile
    console.log('Navigating to reels page on mobile...');
    await page.goto('/reels', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Header should be hidden on mobile reels page
    const header = page.locator('header');
    await expect(header).not.toBeVisible();
    console.log('Verified: Header is hidden on mobile reels page.');

    await page.screenshot({ path: 'playwright-report/screenshots/mobile_reels_header_hidden.png' });
  });

});

// Verified by E2E run on Desktop-1366 and Mobile-360 projects.
