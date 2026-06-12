import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('📸 Generate Store Listing Screenshots', () => {

  test('Capture Mobile Screens in 9:16 Aspect Ratio', async ({ page }) => {
    test.setTimeout(180000);
    // 1. Set viewport to high-res 9:16 mobile aspect ratio (1080x1920)
    await page.setViewportSize({ width: 1080, height: 1920 });

    console.log('Logging in to generate screenshots...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);

    // SCREENSHOT 1: Feed page
    console.log('Navigating to Feed...');
    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000); // Wait for images/posts to load
    
    // Scroll a little bit to show posts nicely
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/screenshot_1_feed.png',
      fullPage: false
    });
    console.log('Feed screenshot taken.');

    // SCREENSHOT 2: Reels page
    console.log('Navigating to Reels...');
    await page.goto('/reels', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/screenshot_2_reels.png',
      fullPage: false
    });
    console.log('Reels screenshot taken.');

    // SCREENSHOT 3: User Profile page
    console.log('Navigating to User Profile...');
    await page.goto('/u/me', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Scroll profile slightly to show grid posts
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(1000);

    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/screenshot_3_profile.png',
      fullPage: false
    });
    console.log('Profile screenshot taken.');

    // SCREENSHOT 4: Tolee/Group page
    console.log('Navigating to Tolee Group Page...');
    await page.goto('/t/tech-titans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'C:/Users/ASUS/Desktop/miracle/tolee/screenshot_4_group.png',
      fullPage: false
    });
    console.log('Tolee Group page screenshot taken.');
  });

});
