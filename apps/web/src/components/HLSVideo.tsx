'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

/* ─────────────────────────────────────────────────────────────────────
   MODULE-LEVEL SINGLETON: The one HTMLVideoElement that is currently
   playing. When a new video becomes active, we pause this one first.
   This is a bulletproof fallback that works at the DOM level,
   completely independent of React state/effect timing.
   ───────────────────────────────────────────────────────────────────── */
let globalActiveVideo: HTMLVideoElement | null = null;

export function getGlobalActiveVideo(): HTMLVideoElement | null {
  return globalActiveVideo;
}

export function setGlobalActiveVideo(video: HTMLVideoElement | null) {
  if (globalActiveVideo && globalActiveVideo !== video) {
    try {
      globalActiveVideo.pause();
    } catch (e) {
      console.warn('[HLSVideo] pause failed:', e);
    }
  }
  globalActiveVideo = video;
}

const SOUND_PREF_KEY = 'tolee_sound_pref';

export function getSoundPreference(): boolean {
  if (typeof window === 'undefined') return false; // Default to muted (true) on SSR
  const pref = localStorage.getItem(SOUND_PREF_KEY);
  // Default to unmuted (sound on, i.e., muted = false) if not set or if set to 'unmuted'
  return pref === 'muted';
}

export function setSoundPreference(isMuted: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_PREF_KEY, isMuted ? 'muted' : 'unmuted');
  window.dispatchEvent(new CustomEvent('tolee_sound_pref_change', { detail: { isMuted } }));
}

interface HLSVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  isActive?: boolean;
  shouldLoad?: boolean;
  ignoreGlobalActive?: boolean;
}

export function HLSVideo({
  src,
  isActive = true,
  shouldLoad = true,
  ignoreGlobalActive = false,
  ...props
}: HLSVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // Track whether video is currently "loaded" (src attached & ready)
  const loadedRef = useRef(false);
  // Keep a ref to the latest isActive so async callbacks never stale-close over it
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const ignoreGlobalActiveRef = useRef(ignoreGlobalActive);
  ignoreGlobalActiveRef.current = ignoreGlobalActive;

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 1: Manage HLS / src loading
      Re-runs only when `src` or `shouldLoad` changes.
      This effect NEVER calls play() — that is handled by Effect 2.
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tear down anything that was already loaded
    const teardown = () => {
      loadedRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Fully unload video to free memory & kill audio
      video.pause();
      video.removeAttribute('src');
      try { video.load(); } catch {}
    };

    if (!shouldLoad || !src) {
      teardown();
      return teardown; // cleanup = same teardown
    }

    teardown(); // clear any previous source first

    const onReady = () => {
      loadedRef.current = true;
      video.muted = !!props.muted;
      if (!props.muted) {
        video.volume = 1.0;
      }
      // Only play if this reel is still the active one when media is ready
      if (isActiveRef.current) {
        if (!ignoreGlobalActiveRef.current) {
          setGlobalActiveVideo(video);
        }
        video.play().catch((e) => {
          if (e.name !== 'AbortError') console.log('[HLSVideo] play blocked:', e.message);
        });
      }
    };

    if (src.endsWith('.m3u8') && Hls.isSupported()) {
      // HLS.js path
      const hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.once(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          console.warn('[HLSVideo] Fatal HLS error:', data.type, data.details);
        }
      });
    } else if (src.endsWith('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = src;
      video.addEventListener('loadedmetadata', onReady, { once: true });
    } else {
      // Standard mp4 / webm
      video.src = src;
      // canplay is fired earlier than loadeddata and is sufficient for play
      video.addEventListener('canplay', onReady, { once: true });
    }

    return teardown;
  }, [src, shouldLoad]); // intentionally excludes isActive

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 2: Respond to active state changes (play / pause)
      This is the SINGLE place where play/pause decisions are made.
      Uses globalActiveVideo to guarantee only ONE video plays at a time.
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // STEP 1: Pause whatever is globally playing (even if it's from a
      // different React tree, a different layout, or a stale async callback)
      if (!ignoreGlobalActive) {
        setGlobalActiveVideo(video);
      }

      // STEP 2: Play this video if it has loaded
      if (loadedRef.current || video.readyState >= 2) {
        video.muted = !!props.muted;
        if (!props.muted) {
          video.volume = 1.0;
        }
        video.play().catch((e) => {
          if (e.name !== 'AbortError') console.log('[HLSVideo] play blocked:', e.message);
        });
      }
      // If not loaded yet, Effect 1's onReady will handle it via isActiveRef
    } else {
      // Pause immediately
      video.pause();
      // Clear global ref if this was the active one
      if (!ignoreGlobalActive && getGlobalActiveVideo() === video) {
        setGlobalActiveVideo(null);
      }
    }
  }, [isActive, ignoreGlobalActive]);

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 3: Page visibility — pause all when tab is hidden
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (isActiveRef.current) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []); // only on mount/unmount

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 4: Ensure cleanup on unmount — force stop audio
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        try { video.load(); } catch {}
        if (!ignoreGlobalActiveRef.current && getGlobalActiveVideo() === video) {
          setGlobalActiveVideo(null);
        }
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 5: Sync muted prop directly to DOM element
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !!props.muted;
      if (!props.muted) {
        video.volume = 1.0;
      }
    }
  }, [props.muted]);

  return <video ref={videoRef} {...props} />;
}
