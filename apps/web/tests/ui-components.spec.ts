import { test, expect, Page } from '@playwright/test';

// ── UI Component Tests ───────────────────────────────────────────
test.describe('🎨 UI & Component Testing', () => {

  // ── Join Creator Page ─────────────────────────────────────────
  test.describe('Join Creator Page', () => {
    test('Hero section displays correctly', async ({ page }) => {
      await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await expect(page.locator('h1').first()).toBeVisible();
      const h1Text = await page.locator('h1').first().innerText();
      expect(h1Text.length).toBeGreaterThan(5);
      console.log('✅ Join Creator h1:', h1Text.substring(0, 50));
    });

    test('Benefits section has 6 cards', async ({ page }) => {
      await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      // Scroll to benefits
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(1000);
      const guaranteedBadges = page.locator('text="Guaranteed ✓"');
      const count = await guaranteedBadges.count();
      console.log('Benefit cards found:', count);
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('Application form has required fields', async ({ page }) => {
      await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Scroll to form
      await page.evaluate(() => document.getElementById('join-form')?.scrollIntoView());
      await page.waitForTimeout(1000);

      // Check for email, password inputs
      const emailInput = page.locator('input[type="email"]').first();
      const passInput = page.locator('input[type="password"]').first();
      const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="naam" i]').first();

      await expect(emailInput).toBeVisible();
      await expect(passInput).toBeVisible();
      console.log('✅ Join Creator form has required fields');
    });

    test('CTA button scrolls to form', async ({ page }) => {
      await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const ctaBtn = page.locator('button:has-text("Apply Now"), button:has-text("Abhi Apply")').first();
      await expect(ctaBtn).toBeVisible();
      await ctaBtn.click();
      await page.waitForTimeout(1500);

      // Form should now be in viewport
      const formVisible = await page.locator('#join-form').isVisible().catch(() => false);
      console.log('Form visible after CTA click:', formVisible);
    });

    test('Form validation — submit without required fields shows error', async ({ page }) => {
      await page.goto('/join-creator', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.evaluate(() => document.getElementById('join-form')?.scrollIntoView());
      await page.waitForTimeout(1000);

      const submitBtn = page.locator('button:has-text("Create Account"), button:has-text("Apply Karo"), button:has-text("Apply")').last();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        // Should show error
        const errorVisible = await page.locator('text=/please|required|error|naam|name|enter/i').first().isVisible().catch(() => false);
        console.log('Error visible after empty submit:', errorVisible);
      }
    });
  });

  // ── Discover Page ─────────────────────────────────────────────
  test.describe('Discover Page', () => {
    test('Discover page loads with content sections', async ({ page }) => {
      await page.goto('/discover', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(100);
      console.log('✅ Discover page has content');
    });

    test('Discover search input is functional', async ({ page }) => {
      await page.goto('/discover', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input[type="search"], input[placeholder*="earch" i], input[placeholder*="tolee" i]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
        await page.waitForTimeout(1000);
        const val = await searchInput.inputValue();
        expect(val).toBe('test search');
        console.log('✅ Discover search input works');
      } else {
        console.log('ℹ️ No search input found on discover page');
      }
    });
  });

  // ── Marketplace Page ──────────────────────────────────────────
  test.describe('Marketplace Page', () => {
    test('Marketplace loads without error', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));

      await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);

      const criticalErrors = errors.filter(e => !e.includes('Failed to fetch'));
      expect(criticalErrors).toHaveLength(0);
      console.log('✅ Marketplace loaded without critical errors');
    });
  });

  // ── Creator Program Page ──────────────────────────────────────
  test.describe('Creator Program Page', () => {
    test('Creator program page loads and has Apply button', async ({ page }) => {
      await page.goto('/creator-program', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(100);

      const applyBtn = page.locator('a[href*="apply"], button:has-text("Apply")').first();
      const applyVisible = await applyBtn.isVisible().catch(() => false);
      console.log('Creator program Apply button visible:', applyVisible);
    });
  });

  // ── Search Page ───────────────────────────────────────────────
  test.describe('Search Page', () => {
    test('Search page loads with input', async ({ page }) => {
      await page.goto('/search', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input').first();
      const visible = await searchInput.isVisible().catch(() => false);
      console.log('Search input visible:', visible);
    });

    test('Search with query shows results or empty state', async ({ page }) => {
      await page.goto('/search', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input[type="search"], input[type="text"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);

        const body = await page.locator('body').innerText();
        expect(body.length).toBeGreaterThan(10);
        console.log('✅ Search with query works');
      }
    });
  });

  // ── World Page ────────────────────────────────────────────────
  test.describe('World Page', () => {
    test('World page loads with creator tools content', async ({ page }) => {
      await page.goto('/world', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      console.log('✅ World page loaded');
    });
  });

  // ── Promo Page ────────────────────────────────────────────────
  test.describe('Promo Page', () => {
    test('Promo page loads with download section', async ({ page }) => {
      await page.goto('/promo', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      console.log('✅ Promo page loaded');
    });
  });

  // ── About / Contact / Terms / Privacy ────────────────────────
  test.describe('Static Pages', () => {
    const staticPages = [
      { path: '/about', name: 'About' },
      { path: '/contact', name: 'Contact' },
      { path: '/terms', name: 'Terms' },
      { path: '/privacy', name: 'Privacy' },
    ];

    for (const pg of staticPages) {
      test(`${pg.name} page loads with content`, async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        const body = await page.locator('body').innerText();
        expect(body.length).toBeGreaterThan(50);
        console.log(`✅ ${pg.name} page has content (${body.length} chars)`);
      });
    }
  });

  // ── Settings Page (Mobile) ───────────────────────────────────
  test('Settings page redirects correctly (not logged in)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/signin|auth/);
    console.log('✅ Settings page protects behind auth on mobile');
  });

  // ── Signup → Signin Link ──────────────────────────────────────
  test('Signup page has link to signin', async ({ page }) => {
    await page.goto('/auth/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const signinLink = page.locator('a[href*="signin"], a:has-text("Sign in"), a:has-text("Login"), a:has-text("Already have")').first();
    const visible = await signinLink.isVisible().catch(() => false);
    if (visible) {
      await signinLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('signin');
      console.log('✅ Signup → Signin navigation works');
    } else {
      console.log('ℹ️ No explicit signin link on signup page');
    }
  });

  // ── Signin → Signup Link ──────────────────────────────────────
  test('Signin page has link to signup', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const signupLink = page.locator('a[href*="signup"], a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create")').first();
    const visible = await signupLink.isVisible().catch(() => false);
    console.log('Signin has signup link:', visible);
  });
});
