'use client';

import { useEffect, useRef } from 'react';

interface TrackerConfig {
  videoElement: HTMLVideoElement | null;
  contentId: string;
  contentType: 'post' | 'reel';
  trafficSource?: string;
  isActive: boolean; // Whether the layout/component considers this video active
  isVisible: boolean; // Viewport intersection >= 60%
}

export function usePlaybackTracker({
  videoElement,
  contentId,
  contentType,
  trafficSource = 'feed',
  isActive,
  isVisible,
}: TrackerConfig) {
  const playbackStartRef = useRef<string | null>(null);
  const watchTimeRef = useRef<number>(0);
  const lastTickRef = useRef<number | null>(null);
  const isAutomationRef = useRef<boolean>(false);
  const hasSubmittedRef = useRef<boolean>(false);
  const videoDurationRef = useRef<number>(0);

  // Detect automated environments (Puppeteer, Selenium, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isAutomationRef.current = !!(
        navigator.webdriver ||
        window.document.documentElement.getAttribute('webdriver') ||
        (window as any)._phantom ||
        (window as any).callPhantom
      );
    }
  }, []);

  // Submit session helper
  const submitSession = () => {
    const watchTime = watchTimeRef.current;
    if (watchTime < 0.5 || !playbackStartRef.current) return;

    // Prevent duplicate submissions for the same session instance
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    // Get device fingerprint
    let deviceFingerprint = '';
    if (typeof window !== 'undefined') {
      deviceFingerprint = localStorage.getItem('device_fingerprint') || '';
      if (!deviceFingerprint) {
        deviceFingerprint = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('device_fingerprint', deviceFingerprint);
      }
    }

    const payload = {
      contentId,
      contentType,
      watchTime,
      videoDuration: videoDurationRef.current || (videoElement ? videoElement.duration : 0) || 10, // fallback to 10s if unknown
      playbackStart: playbackStartRef.current,
      playbackEnd: new Date().toISOString(),
      deviceFingerprint,
      trafficSource,
      referrer: typeof document !== 'undefined' ? document.referrer : 'direct',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      isAutomation: isAutomationRef.current,
    };

    const url = '/api/video/playback-session';

    // Use keepalive fetch to ensure payload delivers even if page is closing/navigating away
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.warn('[PlaybackTracker] send failed:', err));
    } catch (e) {
      // fallback
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, JSON.stringify(payload));
        }
      } catch (beaconErr) {
        console.warn('[PlaybackTracker] beacon fallback failed:', beaconErr);
      }
    }
  };

  useEffect(() => {
    if (!contentId) return;
    // Reset submission state when contentId changes
    hasSubmittedRef.current = false;
    watchTimeRef.current = 0;
    playbackStartRef.current = null;
    lastTickRef.current = null;
  }, [contentId]);

  useEffect(() => {
    if (!contentId) return;
    const video = videoElement;
    if (!video) return;

    let intervalId: any = null;

    const handlePlay = () => {
      if (!playbackStartRef.current) {
        playbackStartRef.current = new Date().toISOString();
      }
      lastTickRef.current = Date.now();
    };

    const handlePause = () => {
      lastTickRef.current = null;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Keep duration updated
    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        videoDurationRef.current = video.duration;
      }
    };
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('loadedmetadata', updateDuration);
    updateDuration();

    // Start timer interval to track watch time
    intervalId = setInterval(() => {
      // Conditions for a valid watch second:
      // 1. Tab must be active and visible
      // 2. Video must be playing (not paused/ended)
      // 3. Component must be active and visible in the viewport (intersection >= 60%)
      const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const isVideoPlaying = !video.paused && !video.ended;
      const isCurrentlyWatching = isTabVisible && isVideoPlaying && isActive && isVisible;

      if (isCurrentlyWatching) {
        const now = Date.now();
        if (lastTickRef.current !== null) {
          const delta = (now - lastTickRef.current) / 1000;
          if (delta > 0 && delta < 5) { // filter out massive system sleep pauses
            watchTimeRef.current += delta;
          }
        }
        lastTickRef.current = now;
      } else {
        lastTickRef.current = null;
      }
    }, 250);

    return () => {
      clearInterval(intervalId);
      if (video) {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('durationchange', updateDuration);
        video.removeEventListener('loadedmetadata', updateDuration);
      }
      // Submit the watch session when the video unmounts or changes
      submitSession();
    };
  }, [videoElement, isActive, isVisible, contentId]);

  // Handle unload and visibilitychange
  useEffect(() => {
    if (!contentId) return;
    const handleUnloadOrHide = () => {
      submitSession();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleUnloadOrHide);
      window.addEventListener('pagehide', handleUnloadOrHide);
      document.addEventListener('visibilitychange', handleUnloadOrHide);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleUnloadOrHide);
        window.removeEventListener('pagehide', handleUnloadOrHide);
        document.removeEventListener('visibilitychange', handleUnloadOrHide);
      }
    };
  }, [videoElement, contentId]);

  return {
    getWatchTime: () => watchTimeRef.current,
  };
}
