import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('📸 Generate 10-Inch Tablet Screenshots (16:9 Aspect Ratio)', () => {

  test('Capture Tablet Screens in 16:9 Aspect Ratio', async ({ page }) => {
    test.setTimeout(180000);
    // Collect console logs
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error('[Browser PageError]', err.message);
    });

    // Set viewport to high-res 16:9 tablet aspect ratio (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('Logging in to generate tablet screenshots...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);

    // SCREENSHOT 1: Feed Page
    console.log('Navigating to Feed...');
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000); // Wait for stories and posts to load
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_1_feed.png',
      fullPage: false
    });
    console.log('Feed screenshot taken.');

    // SCREENSHOT 2: Discover Page
    console.log('Navigating to Discover...');
    await page.goto('/discover', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_2_discover.png',
      fullPage: false
    });
    console.log('Discover screenshot taken.');

    // SCREENSHOT 3: Reels Page
    console.log('Navigating to Reels...');
    await page.goto('/reels', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_3_reels.png',
      fullPage: false
    });
    console.log('Reels screenshot taken.');

    // SCREENSHOT 4: Chats Page
    console.log('Navigating to Chats...');
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_4_chats.png',
      fullPage: false
    });
    console.log('Chats screenshot taken.');

    // SCREENSHOT 5: Profile Page
    console.log('Navigating to Profile...');
    await page.goto('/u/me', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_5_profile.png',
      fullPage: false
    });
    console.log('Profile screenshot taken.');

    // SCREENSHOT 6: Tolee Group Page
    console.log('Navigating to Tolee Group...');
    await page.goto('/t/tech-titans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_6_group.png',
      fullPage: false
    });
    console.log('Group screenshot taken.');

    // SCREENSHOT 7: Marketplace Page
    console.log('Navigating to Marketplace...');
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7_marketplace.png',
      fullPage: false
    });
    console.log('Marketplace screenshot taken.');

    // SCREENSHOT 8: AI Manager Page
    console.log('Navigating to AI Manager...');
    await page.goto('/ai-manager', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_8_aimanager.png',
      fullPage: false
    });
    console.log('AI Manager screenshot taken.');
  });

});
