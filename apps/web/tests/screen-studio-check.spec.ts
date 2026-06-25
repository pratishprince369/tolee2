import { test, expect } from '@playwright/test';
import { loginViaUI, TEST_USER, setupErrorCollector } from './helpers';

test.describe('🎥 Tolee Screen & Creator Studio Verification Test', () => {

  test('Check Creator Studio Library & Screen homepage', async ({ page }) => {
    // 1. Setup console/network error collector
    const errors = setupErrorCollector(page);
    
    // Log console messages to console
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });

    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('1. Attempting login via UI...');
    const loggedIn = await loginViaUI(page);
    expect(loggedIn).toBe(true);
    console.log('Login successful.');

    // 2. Go to Creator Studio content tab
    console.log('2. Navigating to Creator Studio (Content tab)...');
    await page.goto('/screen/studio?tab=content', { waitUntil: 'networkidle' });
    // Wait for the "Querying library..." spinner to disappear (meaning loading is complete)
    await page.locator('text=Querying library...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {
      console.log('Timeout waiting for Querying library... spinner to detach.');
    });

    // Capture screenshot of the studio content tab
    await page.screenshot({ path: 'playwright-report/screenshots/studio_content_tab.png' });
    console.log('Captured screenshot: playwright-report/screenshots/studio_content_tab.png');

    // Check if the "You haven't uploaded any videos yet" element is present
    const emptyStateText = page.locator('text=You haven\'t uploaded any videos yet.');
    const isEmptyStateVisible = await emptyStateText.isVisible();
    
    // Check for video rows in the table
    const videoRows = page.locator('tbody tr.video-row');
    const rowCount = await videoRows.count();
    
    console.log(`Studio Library check: is empty state visible? ${isEmptyStateVisible}`);
    console.log(`Studio Library check: video rows found = ${rowCount}`);

    // If rows exist, log titles of the first few videos
    if (rowCount > 0) {
      console.log('Found videos in Studio list:');
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const titleText = await videoRows.nth(i).locator('td').nth(1).innerText();
        console.log(`  - Video ${i + 1}: ${titleText.split('\n')[0]}`);
      }
    }

    // 3. Go to Tolee Screen homepage
    console.log('3. Navigating to Tolee Screen homepage...');
    await page.goto('/screen', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000); // Wait for feed loading

    // Capture screenshot of Screen homepage
    await page.screenshot({ path: 'playwright-report/screenshots/screen_homepage.png' });
    console.log('Captured screenshot: playwright-report/screenshots/screen_homepage.png');

    // Count video cards on screen page
    const videoCards = page.locator('a[href^="/screen/watch/"]');
    const cardCount = await videoCards.count();
    console.log(`Screen homepage check: watch links found = ${cardCount}`);

    // 4. Output collected errors
    console.log('\n=== COLLECTED BROWSER LOGS & ERRORS ===');
    if (errors.console.length > 0) {
      console.log('Console Errors:');
      errors.console.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('No console errors detected.');
    }

    if (errors.page.length > 0) {
      console.log('Page Errors (uncaught exceptions):');
      errors.page.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('No page exceptions detected.');
    }

    if (errors.network500.length > 0) {
      console.log('Network 5xx Errors:');
      errors.network500.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('No network 5xx errors detected.');
    }
    console.log('========================================\n');
  });

});
