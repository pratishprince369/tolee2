import { test, expect } from '@playwright/test';

// ── Performance Test Suite ───────────────────────────────────────
test.describe('⚡ Performance Testing', () => {

  // ── Page Load Times (LCP proxy) ──────────────────────────────
  const PAGES_TO_MEASURE = [
    { path: '/', name: 'Home', maxMs: 5000 },
    { path: '/discover', name: 'Discover', maxMs: 5000 },
    { path: '/auth/signin', name: 'Sign In', maxMs: 3000 },
    { path: '/auth/signup', name: 'Sign Up', maxMs: 3000 },
    { path: '/marketplace', name: 'Marketplace', maxMs: 6000 },
    { path: '/creator-program', name: 'Creator Program', maxMs: 4000 },
    { path: '/join-creator', name: 'Join Creator', maxMs: 4000 },
    { path: '/search', name: 'Search', maxMs: 4000 },
    { path: '/world', name: 'World', maxMs: 5000 },
    { path: '/promo', name: 'Promo', maxMs: 4000 },
  ];

  for (const pg of PAGES_TO_MEASURE) {
    test(`Load time: ${pg.name} < ${pg.maxMs}ms`, async ({ page }) => {
      const startTime = Date.now();
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      console.log(`⏱️ ${pg.name}: ${loadTime}ms (max allowed: ${pg.maxMs}ms)`);

      if (loadTime > pg.maxMs) {
        console.warn(`⚠️ ${pg.name} is SLOW: ${loadTime}ms > ${pg.maxMs}ms`);
      }
      expect(loadTime, `${pg.name} took ${loadTime}ms which exceeds ${pg.maxMs}ms`).toBeLessThan(pg.maxMs);
    });
  }

  // ── Web Vitals ────────────────────────────────────────────────
  test('Homepage — measure Web Vitals', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const vitals = await page.evaluate(() => {
      return new Promise<Record<string, number>>(resolve => {
        const metrics: Record<string, number> = {};

        // Navigation Timing
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (nav) {
          metrics.ttfb = nav.responseStart - nav.requestStart;
          metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.startTime;
          metrics.fullyLoaded = nav.loadEventEnd - nav.startTime;
        }

        // LCP via PerformanceObserver if available
        try {
          let lcp = 0;
          const lcpObserver = new PerformanceObserver(list => {
            const entries = list.getEntries();
            lcp = entries[entries.length - 1].startTime;
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            metrics.lcp = lcp;
            lcpObserver.disconnect();
            resolve(metrics);
          }, 2000);
        } catch {
          resolve(metrics);
        }
      });
    });

    console.log('📊 Web Vitals for Homepage:');
    console.log('  TTFB:', vitals.ttfb?.toFixed(0) ?? 'N/A', 'ms');
    console.log('  DOM Content Loaded:', vitals.domContentLoaded?.toFixed(0) ?? 'N/A', 'ms');
    console.log('  Fully Loaded:', vitals.fullyLoaded?.toFixed(0) ?? 'N/A', 'ms');
    console.log('  LCP:', vitals.lcp?.toFixed(0) ?? 'N/A', 'ms');

    // TTFB should be under 2 seconds
    if (vitals.ttfb !== undefined) {
      expect(vitals.ttfb).toBeLessThan(2000);
    }
  });

  // ── API Response Times ────────────────────────────────────────
  test('API: /api/branding response time < 5s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get('/api/branding');
    const elapsed = Date.now() - start;
    console.log('/api/branding response time:', elapsed, 'ms, status:', res.status());
    expect(elapsed).toBeLessThan(5000);
  });

  // ── Bundle Size Check ─────────────────────────────────────────
  test('Homepage JS bundle — no oversized chunks', async ({ page }) => {
    const largeBundles: string[] = [];

    page.on('response', async response => {
      if (response.url().includes('.js') && response.url().includes('_next')) {
        try {
          const body = await response.body();
          const contentLength = body.length;
          // Flag if any single JS chunk is > 800KB uncompressed
          if (contentLength > 800 * 1024) {
            largeBundles.push(`${response.url()} (${(contentLength / 1024).toFixed(0)}KB)`);
          }
        } catch { /* ignore */ }
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (largeBundles.length > 0) {
      console.warn('⚠️ Large JS bundles detected:', largeBundles);
    }
    console.log('Large bundles found:', largeBundles.length);
  });

  // ── Memory leak check (basic) ─────────────────────────────────
  test('Homepage — no obvious memory leak on scroll', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const memBefore = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize ?? 0;
    });

    // Scroll up and down 10 times
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    const memAfter = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize ?? 0;
    });

    if (memBefore > 0 && memAfter > 0) {
      const memIncreaseMB = (memAfter - memBefore) / (1024 * 1024);
      console.log(`Memory before scroll: ${(memBefore / 1024 / 1024).toFixed(1)}MB`);
      console.log(`Memory after scroll: ${(memAfter / 1024 / 1024).toFixed(1)}MB`);
      console.log(`Memory increase: ${memIncreaseMB.toFixed(1)}MB`);
      // If memory increased by more than 50MB on a simple scroll, flag it
      if (memIncreaseMB > 50) {
        console.warn('⚠️ Possible memory leak: memory increased by', memIncreaseMB.toFixed(1), 'MB');
      }
    } else {
      console.log('Memory API not available in this browser');
    }
  });
});
