'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function RoutePrefetcher() {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    // Perform prefetching during browser idle time to avoid interrupting active UI threads
    const runPrefetch = () => {
      if (typeof window === 'undefined') return;

      const prefetchRoutes = (routes: string[]) => {
        routes.forEach(route => {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
              router.prefetch(route);
            });
          } else {
            setTimeout(() => {
              router.prefetch(route);
            }, 100);
          }
        });
      };

      // Intelligent Context-based prefetching
      if (pathname === '/feed') {
        prefetchRoutes(['/discover', '/reels', '/chat']);
      } else if (pathname === '/chat') {
        prefetchRoutes(['/feed', '/notifications']);
      } else if (pathname === '/reels') {
        prefetchRoutes(['/feed', '/discover']);
      } else {
        // Fallback prefetching for main pages from other tabs
        prefetchRoutes(['/feed', '/discover', '/reels', '/chat', '/notifications', '/marketplace', '/ai-manager']);
      }
    };

    // Delay prefetching slightly on route mount to let the current page finish rendering and animations
    const timer = setTimeout(runPrefetch, 600);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
