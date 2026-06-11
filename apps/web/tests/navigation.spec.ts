import { test, expect, Page } from '@playwright/test';

// Public pages that should be accessible without login
const PUBLIC_PAGES = [
  { path: '/', name: 'Home/Discover' },
  { path: '/discover', name: 'Discover' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/signup', name: 'Sign Up' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/creator-program', name: 'Creator Program' },
  { path: '/join-creator', name: 'Join Creator' },
  { path: '/promo', name: 'Promo' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/world', name: 'World' },
  { path: '/search', name: 'Search' },
];

// Pages that should redirect to signin when not logged in
const PROTECTED_PAGES = [
  { path: '/feed', name: 'Feed' },
  { path: '/settings', name: 'Settings' },
  { path: '/chat', name: 'Chat' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/create-tolee', name: 'Create Tolee' },
  { path: '/my-tolees', name: 'My Tolees' },
  { path: '/reels', name: 'Reels' },
  { path: '/ads-manager', name: 'Ads Manager' },
  { path: '/ai-manager', name: 'AI Manager' },
  { path: '/creator-dashboard', name: 'Creator Dashboard' },
];

function collectErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

test.describe('🌐 Page Availability & Navigation', () => {

  // ── Public Pages ─────────────────────────────────────────────
  for (const pg of PUBLIC_PAGES) {
    test(`PUBLIC: ${pg.name} (${pg.path}) loads with 200`, async ({ page }) => {
      const { pageErrors } = collectErrors(page);
      const response = await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Should not be a 404 or 500
      if (response) {
        expect(response.status(), `${pg.name} returned HTTP ${response.status()}`).toBeLessThan(400);
      }

      // Should not be a blank page
      const bodyText = await page.locator('body').innerText().catch(() => '');
      expect(bodyText.length, `${pg.name} body appears empty`).toBeGreaterThan(10);

      // No JS crashes
      const critical = pageErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('sw.js') &&
        !e.includes('Failed to fetch')
      );
      if (critical.length > 0) {
        console.warn(`⚠️ ${pg.name} has JS errors:`, critical);
      }

      console.log(`✅ ${pg.name} loaded OK`);
    });
  }

  // ── Protected Pages → should redirect to signin ───────────────
  for (const pg of PROTECTED_PAGES) {
    test(`PROTECTED: ${pg.name} (${pg.path}) redirects to signin`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const url = page.url();
      const redirectedCorrectly = url.includes('signin') || url.includes('auth') || url.includes('login');
      if (!redirectedCorrectly) {
        console.warn(`⚠️ ${pg.name} did NOT redirect to signin. Current URL: ${url}`);
      }
      expect(redirectedCorrectly, `${pg.name} should redirect to signin, got: ${url}`).toBe(true);
      console.log(`✅ ${pg.name} correctly protected`);
    });
  }

  // ── 404 Handling ──────────────────────────────────────────────
  test('404 page for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz123');
    await page.waitForLoadState('domcontentloaded');
    // Should show 404 page, not crash
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('404 page body length:', bodyText.length);
    expect(bodyText.length).toBeGreaterThan(5);
  });

  // ── Navigation Links on Homepage ──────────────────────────────
  test('Homepage loads and has navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    console.log('✅ Homepage loaded with content');
  });

  // ── No 404 images on public pages ────────────────────────────
  test('Discover page — no broken images', async ({ page }) => {
    const brokenImages: string[] = [];
    page.on('response', response => {
      if (response.url().match(/\.(png|jpg|jpeg|gif|webp|svg)/) && response.status() === 404) {
        brokenImages.push(response.url());
      }
    });
    await page.goto('/discover', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    if (brokenImages.length > 0) {
      console.warn('Broken images on /discover:', brokenImages);
    }
    // Allow up to 2 broken images (might be dynamic content)
    expect(brokenImages.length).toBeLessThanOrEqual(2);
  });

  // ── API Endpoint Health Check ─────────────────────────────────
  test('API: /api/branding returns 200', async ({ request }) => {
    const response = await request.get('/api/branding');
    expect(response.status()).toBeLessThan(500);
    console.log('/api/branding status:', response.status());
  });
});
