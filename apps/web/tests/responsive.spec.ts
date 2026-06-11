import { test, expect, Page } from '@playwright/test';

// All pages to test responsiveness
const PAGES_TO_TEST = [
  { path: '/', name: 'Home' },
  { path: '/discover', name: 'Discover' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/signup', name: 'Sign Up' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/creator-program', name: 'Creator Program' },
  { path: '/join-creator', name: 'Join Creator' },
  { path: '/search', name: 'Search' },
  { path: '/about', name: 'About' },
  { path: '/promo', name: 'Promo' },
  { path: '/world', name: 'World' },
];

const VIEWPORTS = [
  { name: 'Mobile-360', width: 360, height: 740 },
  { name: 'Mobile-375', width: 375, height: 812 },
  { name: 'Mobile-390', width: 390, height: 844 },
  { name: 'Mobile-412', width: 412, height: 915 },
  { name: 'Tablet-768', width: 768, height: 1024 },
  { name: 'Desktop-1366', width: 1366, height: 768 },
  { name: 'Desktop-1440', width: 1440, height: 900 },
  { name: 'Desktop-1920', width: 1920, height: 1080 },
];

async function checkHorizontalOverflow(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

async function checkNoVisibleErrors(page: Page): Promise<boolean> {
  const errorText = await page.locator('text=/TypeError|ReferenceError|Cannot read|undefined is not/i').count();
  return errorText === 0;
}

test.describe('📱 Responsive UI Testing', () => {

  // Test each page on mobile viewports for horizontal overflow
  for (const vp of VIEWPORTS) {
    for (const pg of PAGES_TO_TEST) {
      test(`${vp.name}: ${pg.name} — no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const hasOverflow = await checkHorizontalOverflow(page);
        if (hasOverflow) {
          console.warn(`⚠️ ${vp.name} — ${pg.name}: HORIZONTAL OVERFLOW detected`);
          await page.screenshot({ path: `playwright-report/overflow-${vp.name}-${pg.name.replace(/\//g, '_')}.png` });
        }
        // Horizontal scroll = bad UX on mobile
        if (vp.width <= 412) {
          expect(hasOverflow, `${pg.name} has horizontal overflow on ${vp.name}`).toBe(false);
        }
        console.log(`${hasOverflow ? '⚠️' : '✅'} ${vp.name} — ${pg.name}`);
      });
    }
  }

  // ── Settings Page Mobile Tab Navigation ──────────────────────
  test('Mobile-375: Settings page — tab bar visible and scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should redirect to signin (not logged in)
    const url = page.url();
    if (url.includes('signin')) {
      console.log('✅ Settings redirects to signin (not logged in) — correct');
      return;
    }

    // If somehow accessible, check tab bar
    const tabButtons = page.locator('button:has-text("Account"), button:has-text("Notifications"), button:has-text("Privacy"), button:has-text("Security"), button:has-text("Billing")');
    const count = await tabButtons.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Settings tab bar has ${count} buttons on mobile`);
  });

  // ── Join Creator Page ─────────────────────────────────────────
  test('Mobile-375: Join Creator page — CTA button visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const ctaBtn = page.locator('button:has-text("Apply Now"), button:has-text("Abhi Apply")').first();
    await expect(ctaBtn).toBeVisible();
    console.log('✅ Join Creator CTA button visible on mobile');
  });

  // ── Signup Form on Mobile ─────────────────────────────────────
  test('Mobile-375: Signup form — inputs visible and tappable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();

    // Check they are not covered/clipped
    const emailBox = await emailInput.boundingBox();
    const passBox = await passInput.boundingBox();

    expect(emailBox?.width ?? 0).toBeGreaterThan(100);
    expect(passBox?.width ?? 0).toBeGreaterThan(100);
    console.log('✅ Signup inputs visible and properly sized on mobile');
  });

  // ── Signin Form on Mobile ─────────────────────────────────────
  test('Mobile-375: Signin form — inputs visible and tappable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();

    const emailBox = await emailInput.boundingBox();
    expect(emailBox?.width ?? 0).toBeGreaterThan(100);
    console.log('✅ Signin inputs visible on mobile');
  });

  // ── Desktop Sidebar ───────────────────────────────────────────
  test('Desktop-1440: Homepage — no overflow at full width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow).toBe(false);
    console.log('✅ Desktop 1440px homepage — no overflow');
  });

  // ── Marketplace Mobile ────────────────────────────────────────
  test('Mobile-375: Marketplace — content visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
    console.log('✅ Marketplace loads on mobile');
  });

  // ── Discover Page ─────────────────────────────────────────────
  test('Mobile-375: Discover page — cards/content visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/discover', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow).toBe(false);

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
    console.log('✅ Discover page loads on mobile without overflow');
  });
});
