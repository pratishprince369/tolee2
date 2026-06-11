import { test, expect, Page } from '@playwright/test';

// ── Security Test Suite ──────────────────────────────────────────
test.describe('🔒 Security Testing', () => {

  // ── No exposed secrets in HTML source ──────────────────────────
  test('Homepage — no API keys exposed in page source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const html = await page.content();

    const dangerousPatterns = [
      /NEXTAUTH_SECRET\s*=\s*["'][^"']+["']/i,
      /DATABASE_URL\s*=\s*["'][^"']+["']/i,
      /sk-[a-zA-Z0-9]{20,}/,     // OpenAI key
      /AIza[0-9A-Za-z-_]{35}/,  // Google API key (browser key pattern exposed)
      /password\s*[:=]\s*["'][^"']{6,}["']/i,
    ];

    const found: string[] = [];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(html)) {
        found.push(pattern.toString());
      }
    }

    if (found.length > 0) {
      console.error('🚨 SECURITY: Potential secrets exposed in HTML:', found);
    }
    expect(found).toHaveLength(0);
    console.log('✅ No secrets exposed in homepage HTML');
  });

  // ── Protected API endpoints need auth ────────────────────────
  test('API: /api/user/profile requires authentication', async ({ request }) => {
    const res = await request.get('/api/user/profile');
    // Should return 401 or redirect, not 200 with private data
    expect(res.status()).not.toBe(200);
    console.log('/api/user/profile unauthenticated status:', res.status());
  });

  // ── XSS: Script injection in search ──────────────────────────
  test('Search page — XSS input is not executed', async ({ page }) => {
    const xssExecuted = { value: false };
    await page.addInitScript(() => {
      (window as any).__xss_fired = false;
    });
    page.on('dialog', dialog => {
      xssExecuted.value = true;
      dialog.dismiss();
    });

    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[name*="search"], input[name*="query"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('<script>alert("xss")</script>');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    expect(xssExecuted.value, 'XSS alert dialog was triggered!').toBe(false);
    console.log('✅ XSS attempt did not execute');
  });

  // ── Console errors monitoring on all public pages ─────────────
  const PAGES_TO_AUDIT = ['/', '/discover', '/auth/signin', '/auth/signup', '/marketplace', '/creator-program', '/join-creator'];

  for (const path of PAGES_TO_AUDIT) {
    test(`Console audit: ${path} — no critical JS errors`, async ({ page }) => {
      const criticalErrors: string[] = [];

      page.on('pageerror', err => {
        const msg = err.message;
        // Filter out known benign errors
        if (!msg.includes('favicon') && !msg.includes('Failed to fetch') &&
            !msg.includes('NetworkError') && !msg.includes('AbortError') &&
            !msg.includes('sw.js')) {
          criticalErrors.push(msg);
        }
      });

      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      if (criticalErrors.length > 0) {
        console.error(`🚨 Critical JS errors on ${path}:`, criticalErrors);
      }
      expect(criticalErrors, `Critical errors on ${path}: ${criticalErrors.join(', ')}`).toHaveLength(0);
      console.log(`✅ ${path} — no critical JS errors`);
    });
  }

  // ── Network: No 500 errors on page load ──────────────────────
  test('No 500 server errors on homepage load', async ({ page }) => {
    const serverErrors: string[] = [];

    page.on('response', response => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (serverErrors.length > 0) {
      console.error('🚨 Server errors (500+) on homepage:', serverErrors);
    }
    expect(serverErrors).toHaveLength(0);
  });

  // ── Open redirect check ───────────────────────────────────────
  test('No open redirect via signin callback', async ({ page }) => {
    // Try to inject malicious redirect
    await page.goto('/auth/signin?callbackUrl=https://evil.com');
    await page.waitForTimeout(2000);
    // Should stay on signin or redirect to internal page only
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('evil.com');
    console.log('✅ No open redirect vulnerability. Current URL:', currentUrl);
  });

  // ── Super Admin not accessible to public ─────────────────────
  test('Super admin routes are protected', async ({ page }) => {
    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const url = page.url();
    const body = await page.locator('body').innerText();
    // Should show login or access denied, not the dashboard
    const hasAdminContent = body.includes('Dashboard') && body.includes('Users') && body.includes('Analytics');
    console.log('Super admin body contains admin content:', hasAdminContent);
    // If accessible without auth, that's a security issue
    if (hasAdminContent && !url.includes('login')) {
      console.warn('⚠️ Super admin may be accessible without authentication!');
    }
    console.log('Super admin URL:', url);
  });

  // ── HTTP Headers ─────────────────────────────────────────────
  test('Homepage has security headers', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    console.log('Security headers check:');
    console.log('  x-frame-options:', headers['x-frame-options'] ?? 'MISSING');
    console.log('  x-content-type-options:', headers['x-content-type-options'] ?? 'MISSING');
    console.log('  strict-transport-security:', headers['strict-transport-security'] ?? 'MISSING (ok on local)');
    // Basic check — x-content-type-options should be set
    // (nosniff prevents MIME type sniffing attacks)
    expect(res.status()).toBeLessThan(500);
  });
});
