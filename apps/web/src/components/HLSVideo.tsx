'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlaybackTracker } from '@/hooks/usePlaybackTracker';

/* ─────────────────────────────────────────────────────────────────────
   MODULE-LEVEL SINGLETON: The one HTMLVideoElement that is currently
   playing. When a new video becomes active, we pause this one first.
   This is a bulletproof fallback that works at the DOM level,
   completely independent of React state/effect timing.
   ───────────────────────────────────────────────────────────────────── */
let globalActiveVideo: HTMLVideoElement | null = null;
let globalActiveAudio: HTMLAudioElement | null = null;
const allMountedVideos = new Set<HTMLVideoElement>();
let playbackGeneration = 0;

export function getGlobalActiveVideo(): HTMLVideoElement | null {
  return globalActiveVideo;
}

export function setGlobalActiveVideo(video: HTMLVideoElement | null) {
  playbackGeneration++;

  if (video && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tolee_pause_music_player'));
  }

  if (video && globalActiveAudio) {
    try {
      globalActiveAudio.pause();
    } catch (e) {}
  }

  // Instantly pause and mute every other video element mounted in the DOM
  for (const v of allMountedVideos) {
    if (v !== video) {
      try {
        v.pause();
        v.muted = true;
      } catch (e) {}
    }
  }

  globalActiveVideo = video;
}

export function getGlobalActiveAudio(): HTMLAudioElement | null {
  return globalActiveAudio;
}

export function setGlobalActiveAudio(audio: HTMLAudioElement | null) {
  if (audio && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tolee_pause_music_player'));
  }

  if (globalActiveAudio && globalActiveAudio !== audio) {
    try {
      globalActiveAudio.pause();
    } catch (e) {}
  }
  if (audio && globalActiveVideo) {
    try {
      globalActiveVideo.pause();
    } catch (e) {}
  }
  globalActiveAudio = audio;
}

if (typeof window !== 'undefined') {
  window.addEventListener('tolee_pause_all_videos', () => {
    if (globalActiveVideo) {
      try {
        globalActiveVideo.pause();
      } catch (e) {}
      globalActiveVideo = null;
    }
    for (const v of allMountedVideos) {
      try {
        v.pause();
        v.muted = true;
      } catch (e) {}
    }
  });
}

const SOUND_PREF_KEY = 'tolee_sound_pref';

export function getSoundPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem(SOUND_PREF_KEY);
  if (pref === null) return false; // Default unmuted so post music plays automatically
  return pref === 'muted';
}

export function setSoundPreference(isMuted: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_PREF_KEY, isMuted ? 'muted' : 'unmuted');
  window.dispatchEvent(new CustomEvent('tolee_sound_pref_change', { detail: { isMuted } }));
}

export interface DeviceStats {
  preloadCount: number;
  maxBuffer: number;
  lowRAM: boolean;
}

export function getDeviceNetworkStats(): DeviceStats {
  if (typeof window === 'undefined') {
    return { preloadCount: 5, maxBuffer: 10, lowRAM: false };
  }

  const conn = (navigator as any).connection;
  const memory = (navigator as any).deviceMemory || 8;
  const lowRAM = memory <= 4;
  
  let preloadCount = 5;
  let maxBuffer = 10;

  if (conn) {
    const type = conn.effectiveType;
    const saveData = conn.saveData;
    if (saveData) {
      preloadCount = 2;
      maxBuffer = 5;
    } else if (type === '4g' || conn.downlink > 10) {
      preloadCount = lowRAM ? 5 : 10;
      maxBuffer = 15;
    } else if (type === '3g' || conn.downlink > 2) {
      preloadCount = 5;
      maxBuffer = 8;
    } else {
      preloadCount = 2;
      maxBuffer = 4;
    }
  }

  return { preloadCount, maxBuffer, lowRAM };
}

interface HLSVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  isActive?: boolean;
  shouldLoad?: boolean;
  ignoreGlobalActive?: boolean;
  contentId?: string;
  contentType?: 'post' | 'reel';
  trafficSource?: string;
  isVisible?: boolean;
  onBufferingChange?: (isBuffering: boolean) => void;
}

export const HLSVideo = forwardRef<HTMLVideoElement, HLSVideoProps>(
  (
    {
      src,
      isActive = true,
      shouldLoad = true,
      ignoreGlobalActive = false,
      contentId,
      contentType,
      trafficSource,
      isVisible = true,
      onBufferingChange,
      ...props
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    // Track active video playback session
    usePlaybackTracker({
      videoElement: videoRef.current,
      contentId: contentId || '',
      contentType: contentType || 'post',
      trafficSource,
      isActive: !!isActive,
      isVisible: !!isVisible,
    });

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleWaiting = () => {
        if (onBufferingChange) onBufferingChange(true);
      };
      const handlePlaying = () => {
        if (onBufferingChange) onBufferingChange(false);
      };

      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('seeking', handleWaiting);
      video.addEventListener('seeked', handlePlaying);

      return () => {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('seeking', handleWaiting);
        video.removeEventListener('seeked', handlePlaying);
      };
    }, [onBufferingChange]);
    const hlsRef = useRef<Hls | null>(null);
    // Track whether video is currently "loaded" (src attached & ready)
    const loadedRef = useRef(false);
    // Keep a ref to the latest isActive so async callbacks never stale-close over it
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const ignoreGlobalActiveRef = useRef(ignoreGlobalActive);
    ignoreGlobalActiveRef.current = ignoreGlobalActive;
    const mutedRef = useRef(props.muted);
    mutedRef.current = props.muted;

    const playSafe = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;

      const token = ++playbackGeneration;
      video.muted = !!mutedRef.current;
      if (!mutedRef.current) {
        video.volume = 1.0;
      }
      try {
        await video.play();
        if (token !== playbackGeneration || !isActiveRef.current || (!ignoreGlobalActiveRef.current && globalActiveVideo !== video)) {
          video.pause();
          video.muted = true;
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && isActiveRef.current) {
          video.muted = true;
          try {
            await video.play();
            if (token !== playbackGeneration || !isActiveRef.current || (!ignoreGlobalActiveRef.current && globalActiveVideo !== video)) {
              video.pause();
              video.muted = true;
            }
          } catch (err: any) {
            // Aborted or blocked
          }
        }
      }
    }, []);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 1: Manage HLS / src loading
       Re-runs only when `src` or `shouldLoad` changes.
       This effect NEVER calls play() without playSafe guards.
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Resolve Google Drive URLs to internal high-performance byte-range stream proxy
      const resolvedSrc = (src.includes('drive.usercontent.google.com') || src.includes('drive.google.com'))
        ? (src.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || src.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
            ? `/api/video/drive-stream?id=${(src.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || src.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1])}`
            : src)
        : src;

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

      if (!shouldLoad || !resolvedSrc) {
        teardown();
        return teardown; // cleanup = same teardown
      }

      teardown(); // clear any previous source first

      const onReady = () => {
        loadedRef.current = true;
        if (isActiveRef.current) {
          if (!ignoreGlobalActiveRef.current) {
            setGlobalActiveVideo(video);
          }
          playSafe();
        } else {
          video.pause();
          video.muted = true;
        }
      };

      if (resolvedSrc.endsWith('.m3u8') && Hls.isSupported()) {
        // HLS.js path
        const stats = getDeviceNetworkStats();
        const autoStartLoad = props.preload !== 'metadata' || isActiveRef.current;
        const hls = new Hls({
          enableWorker: true,
          capLevelToPlayerSize: true,
          maxBufferLength: isActiveRef.current ? (stats.lowRAM ? 6 : 12) : 2.5,
          maxMaxBufferLength: isActiveRef.current ? (stats.lowRAM ? 10 : 20) : 5,
          backBufferLength: 4,
          lowLatencyMode: true,
          startLevel: -1,
          startFragPrefetch: true,
          testBandwidth: isActiveRef.current,
          abrEwmaDefaultEstimate: 600000,
          autoStartLoad,
        });
        hlsRef.current = hls;
        hls.loadSource(resolvedSrc);
        hls.attachMedia(video);
        video.addEventListener('canplay', onReady, { once: true });
        hls.on(Hls.Events.ERROR, (_ev, data) => {
          if (data.fatal) {
            console.warn('[HLSVideo] Fatal HLS error:', data.type, data.details);
          }
        });
      } else if (resolvedSrc.endsWith('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari / iOS)
        video.src = resolvedSrc;
        video.addEventListener('loadedmetadata', onReady, { once: true });
      } else {
        // Standard mp4 / webm / stream proxy
        const isStreamProxy = resolvedSrc.includes('/api/video/drive-stream');
        const isMp4 = resolvedSrc.toLowerCase().includes('.mp4') || resolvedSrc.toLowerCase().includes('video') || resolvedSrc.toLowerCase().includes('.mov') || resolvedSrc.toLowerCase().includes('.webm');
        const finalSrc = isMp4 && !isStreamProxy && !props.poster && !resolvedSrc.includes('#t=') ? `${resolvedSrc}#t=0.001` : resolvedSrc;
        video.src = finalSrc;

        const handleReady = () => {
          video.removeEventListener('canplay', handleReady);
          video.removeEventListener('loadeddata', handleReady);
          video.removeEventListener('playing', handleReady);
          onReady();
        };

        if (video.readyState >= 2) {
          onReady();
        } else {
          video.addEventListener('canplay', handleReady, { once: true });
          video.addEventListener('loadeddata', handleReady, { once: true });
          video.addEventListener('playing', handleReady, { once: true });
        }
      }

      return teardown;
    }, [src, shouldLoad, playSafe]); // intentionally excludes isActive

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 2: Respond to active state changes (play / pause)
       This is the SINGLE place where play/pause decisions are made.
       Uses globalActiveVideo to guarantee only ONE video plays at a time.
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const stats = getDeviceNetworkStats();
      if (hlsRef.current) {
        hlsRef.current.config.maxBufferLength = isActive ? (stats.lowRAM ? 6 : 12) : 2.5;
        hlsRef.current.config.maxMaxBufferLength = isActive ? (stats.lowRAM ? 10 : 20) : 5;
        hlsRef.current.config.testBandwidth = isActive;
        if (isActive) {
          hlsRef.current.startLoad();
        }
      }

      if (isActive) {
        if (!ignoreGlobalActive) {
          setGlobalActiveVideo(video);
        }

        if (loadedRef.current || video.readyState >= 1) {
          playSafe();
        }
      } else {
        video.pause();
        video.muted = true;
        if (!ignoreGlobalActive && getGlobalActiveVideo() === video) {
          setGlobalActiveVideo(null);
        }
      }
    }, [isActive, ignoreGlobalActive, playSafe]);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 3: Page visibility — pause all when tab is hidden
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onVisibility = () => {
        if (document.hidden) {
          video.pause();
          video.muted = true;
        } else if (isActiveRef.current) {
          playSafe();
        }
      };

      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [playSafe]);

  /* ─────────────────────────────────────────────────────────────────────
      EFFECT 4: Lifecycle registry & cleanup on unmount
   ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      allMountedVideos.add(video);
    }
    return () => {
      if (video) {
        allMountedVideos.delete(video);
        video.pause();
        video.muted = true;
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
);

HLSVideo.displayName = 'HLSVideo';
