'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function RoutePrefetcher() {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    // Perform prefetching during browser idle time to avoid interrupting active UI threads
    const runPrefetch = () => {
      if (typeof window === 'undefined') return;

      const prefetchRoutes = (routes: string[]) => {
        routes.forEach(route => {
          try {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => {
                routerRef.current?.prefetch(route);
              });
            } else {
              setTimeout(() => {
                routerRef.current?.prefetch(route);
              }, 100);
            }
          } catch (e) {
            // Silently swallow prefetch aborts
          }
        });
      };

      // Intelligent Context-based prefetching
      const coreRoutes = ['/feed', '/discover', '/reels', '/chat', '/u/me', '/radar', '/search', '/notifications', '/marketplace', '/ai-manager'];
      
      if (pathname === '/feed') {
        prefetchRoutes(['/discover', '/reels', '/chat', '/u/me', '/radar']);
      } else if (pathname === '/chat') {
        prefetchRoutes(['/feed', '/notifications', '/u/me']);
      } else if (pathname === '/reels') {
        prefetchRoutes(['/feed', '/discover', '/u/me']);
      } else {
        prefetchRoutes(coreRoutes);
      }
    };

    // Prefetch during idle browser time
    const timer = setTimeout(runPrefetch, 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
