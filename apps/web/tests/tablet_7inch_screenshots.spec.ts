import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('📸 Generate 7-Inch Tablet Screenshots (16:9 Aspect Ratio)', () => {

  test('Capture 7-Inch Tablet Screens in 16:9 Aspect Ratio', async ({ page }) => {
    test.setTimeout(180000);
    // Collect console logs
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error('[Browser PageError]', err.message);
    });

    // Set viewport to high-res 16:9 tablet aspect ratio
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('Logging in to generate 7-inch tablet screenshots...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);

    // SCREENSHOT 1: Feed Page
    console.log('Navigating to Feed...');
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000); // Wait for stories and posts to load
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_1_feed.png',
      fullPage: false
    });
    console.log('Feed screenshot taken.');

    // SCREENSHOT 2: Discover Page
    console.log('Navigating to Discover...');
    await page.goto('/discover', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_2_discover.png',
      fullPage: false
    });
    console.log('Discover screenshot taken.');

    // SCREENSHOT 3: Reels Page
    console.log('Navigating to Reels...');
    await page.goto('/reels', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_3_reels.png',
      fullPage: false
    });
    console.log('Reels screenshot taken.');

    // SCREENSHOT 4: Chats Page (Default Groups List)
    console.log('Navigating to Chats...');
    await page.goto('/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_4_chats.png',
      fullPage: false
    });
    console.log('Chats page screenshot taken.');

    // SCREENSHOT 5: Group Chat Detail Page
    console.log('Opening group chat detail...');
    const firstChatItem = page.locator('div[class*="cursor-pointer"]').first();
    if (await firstChatItem.isVisible()) {
      await firstChatItem.click();
      await page.waitForTimeout(3000); // Wait for messages to load
    } else {
      console.log('No chat items found to click, taking screenshot of default view.');
    }
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_5_groupchat.png',
      fullPage: false
    });
    console.log('Group Chat detail screenshot taken.');

    // SCREENSHOT 6: User Profile Page
    console.log('Navigating to Profile...');
    await page.goto('/u/me', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_6_profile.png',
      fullPage: false
    });
    console.log('Profile screenshot taken.');

    // SCREENSHOT 7: Search Page with Results
    console.log('Navigating to Search page with query...');
    await page.goto('/search?q=AI', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/tablet_7inch_7_search.png',
      fullPage: false
    });
    console.log('Search page screenshot taken.');
  });

});
