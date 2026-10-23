'use client';

/**
 * RoutePrefetcher
 * 
 * Disabled aggressive background prefetching to eliminate Next.js 14 router
 * action-queue race conditions (discarded in-flight actions causing unfulfilled
 * deferredPromises and React Error #482 shell suspension on back navigation).
 * Next.js Link components handle viewport and hover prefetching safely and natively.
 */
export function RoutePrefetcher() {
  return null;
}
