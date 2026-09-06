'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackVisitorEvent } from '@/actions/analytics';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

function getSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');
  return isLocal ? `http://${h}:4000` : 'https://api.tolee.in';
}

// Helper to generate a unique random session ID (UUID-like)
function generateUUID() {
  return 'ts_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Cookie helpers
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // Track previous referrer strictly in client session storage
  const referrerRef = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Save referrer on first mount
    if (typeof document !== 'undefined') {
      referrerRef.current = document.referrer || 'Direct Visit';
    }
  }, []);

  // Cleanup socket connection on completely unmounting
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[Analytics Presence] Disconnecting presence tracking socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ─── SOCKET PRESENCE (independent of analytics tracking) ───────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SOCKET_URL = getSocketUrl();

    const getDeviceType = () => {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet Web';
      if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return 'Mobile Web';
      return 'Desktop Web';
    };

    if (!socketRef.current) {
      console.log('[Presence] Connecting socket to:', SOCKET_URL);
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Presence] Socket connected:', socket.id);
        const uId = (session?.user as any)?.id || null;
        if (uId) {
          socket.emit('register-user', { userId: uId });
        }
        socket.emit('register-session', {
          userId: uId,
          name: session?.user?.name || 'Guest',
          device: getDeviceType(),
          location: 'India',
          currentPage: pathname || '/'
        });
      });

      socket.on('connect_error', (err) => {
        console.warn('[Presence] Socket connect error:', err.message);
      });
    } else if (socketRef.current.connected) {
      // Already connected — re-register with latest info (user may have logged in)
      const uId = (session?.user as any)?.id || null;
      if (uId) {
        socketRef.current.emit('register-user', { userId: uId });
      }
      socketRef.current.emit('register-session', {
        userId: uId,
        name: session?.user?.name || 'Guest',
        device: getDeviceType(),
        location: 'India',
        currentPage: pathname || '/'
      });
    }
  }, [session]);

  // Periodic presence heartbeat & visibility tracking
  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;

    const pingHeartbeat = () => {
      if (socketRef.current?.connected && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        socketRef.current.emit('user-presence-heartbeat', { userId });
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (socketRef.current?.connected) {
          socketRef.current.emit('register-user', { userId });
          socketRef.current.emit('user-presence-heartbeat', { userId });
        }
      }
    };

    const interval = setInterval(pingHeartbeat, 20000);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      }
    };
  }, [session]);

  // ─── PAGE VIEW TRACKING (separate — does not block presence) ─────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let sessionId = getCookie('tolee_session_id');
    if (!sessionId) {
      sessionId = generateUUID();
      setCookie('tolee_session_id', sessionId, 365);
    }

    const currentPath = pathname || '/';
    const utmSource = searchParams?.get('utm_source') || undefined;
    const utmMedium = searchParams?.get('utm_medium') || undefined;
    const utmCampaign = searchParams?.get('utm_campaign') || undefined;

    // Update active page on socket (non-blocking)
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-session-page', { currentPage: currentPath });
    }

    const payload = {
      sessionId,
      path: currentPath,
      referrer: referrerRef.current,
      utmSource,
      utmMedium,
      utmCampaign,
      eventType: 'page_view',
      details: JSON.stringify({
        title: document.title,
        screen: `${window.innerWidth}x${window.innerHeight}`,
      })
    };

    const runTracking = async () => {
      try {
        await trackVisitorEvent(payload);
      } catch (err) {
        console.error('[Analytics] Tracking failed (non-critical):', err);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => runTracking());
    } else {
      setTimeout(() => runTracking(), 100);
    }

    referrerRef.current = window.location.origin + currentPath;
  }, [pathname, searchParams]);

  // Hook globally to capture main clicks on specific feature areas as "engagement" events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFeatureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check if user clicked a reel, feed post, chat button, or marketplace item
      let actionName = '';
      let featurePath = '';

      const href = target.closest('a')?.getAttribute('href') || '';
      
      if (href.startsWith('/reels') || target.closest('[data-analytics="reel"]')) {
        actionName = 'reel_view';
        featurePath = '/reels';
      } else if (href.startsWith('/marketplace') || target.closest('[data-analytics="marketplace"]')) {
        actionName = 'marketplace_view';
        featurePath = '/marketplace';
      } else if (href.startsWith('/chat') || target.closest('[data-analytics="chat"]')) {
        actionName = 'chat_opened';
        featurePath = '/chat';
      } else if (href.startsWith('/feed') || target.closest('[data-analytics="feed"]')) {
        actionName = 'feed_scroll';
        featurePath = '/feed';
      }

      if (actionName && featurePath) {
        const sessionId = getCookie('tolee_session_id');
        if (sessionId) {
          trackVisitorEvent({
            sessionId,
            path: featurePath,
            referrer: window.location.href,
            eventType: 'engagement',
            details: JSON.stringify({ action: actionName })
          }).catch(err => console.error('Tracking engagement failed:', err));
        }
      }
    };

    window.addEventListener('click', handleFeatureClick);
    return () => {
      window.removeEventListener('click', handleFeatureClick);
    };
  }, []);

  return null; // Silent tracker utility
}
