'use client';

import { useEffect } from 'react';

export function NavigationStabilizer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Intercept shell-level React errors (e.g. Minified React error #482, chunk mismatches)
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.includes('482') ||
        msg.includes('Minified React error #482') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk')
      ) {
        console.warn('[NavigationStabilizer] Intercepted router navigation error, auto-recovering:', msg);
        try {
          event.preventDefault();
        } catch (e) {}

        const path = window.location.pathname;
        if (path.startsWith('/news') || path.startsWith('/post')) {
          window.location.replace('/feed');
        } else {
          window.location.reload();
        }
      }
    };

    // 2. Intercept unhandled promise rejections from router action queue
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMsg = (event?.reason && (event.reason.message || String(event.reason))) || '';
      if (
        reasonMsg.includes('482') ||
        reasonMsg.includes('Minified React error #482') ||
        reasonMsg.includes('ChunkLoadError') ||
        reasonMsg.includes('Loading chunk')
      ) {
        console.warn('[NavigationStabilizer] Intercepted unhandled router rejection, auto-recovering:', reasonMsg);
        try {
          event.preventDefault();
        } catch (e) {}

        const path = window.location.pathname;
        if (path.startsWith('/news') || path.startsWith('/post')) {
          window.location.replace('/feed');
        } else {
          window.location.reload();
        }
      }
    };

    // 3. Mobile BFCache pageshow restoration
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && window.location.pathname === '/feed') {
        const savedY = sessionStorage.getItem('tolee_feed_scroll_y');
        if (savedY) {
          const parsedY = parseInt(savedY, 10);
          if (!isNaN(parsedY) && parsedY > 0) {
            window.scrollTo({ top: parsedY, behavior: 'instant' as ScrollBehavior });
          }
        }
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
