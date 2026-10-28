'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlaybackTracker } from '@/hooks/usePlaybackTracker';

/* ─────────────────────────────────────────────────────────────────────
   MODULE-LEVEL SINGLETON & PLAYBACK COORDINATOR:
   Guarantees that at any given moment, strictly ONE video plays audio.
   Works synchronously at the DOM level, completely decoupled from React
   render schedules and asynchronous microtasks.
   ───────────────────────────────────────────────────────────────────── */
let globalActiveVideo: HTMLVideoElement | null = null;
let globalActiveAudio: HTMLAudioElement | null = null;
const allMountedVideos = new Set<HTMLVideoElement>();
let playbackGeneration = 0;

export function getGlobalActiveVideo(): HTMLVideoElement | null {
  return globalActiveVideo;
}

export function stopAllVideos() {
  playbackGeneration++;
  for (const v of allMountedVideos) {
    try {
      v.pause();
      v.muted = true;
      v.volume = 0;
    } catch (e) {}
  }
  if (typeof document !== 'undefined') {
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.muted = true;
        v.volume = 0;
      } catch (e) {}
    });
  }
  globalActiveVideo = null;
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
        v.volume = 0;
      } catch (e) {}
    }
  }

  if (typeof document !== 'undefined') {
    document.querySelectorAll('video').forEach((v) => {
      if (v !== video) {
        try {
          v.pause();
          v.muted = true;
          v.volume = 0;
        } catch (e) {}
      }
    });
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
      globalActiveVideo.muted = true;
      globalActiveVideo.volume = 0;
    } catch (e) {}
  }
  globalActiveAudio = audio;
}

if (typeof window !== 'undefined') {
  window.addEventListener('tolee_pause_all_videos', () => {
    stopAllVideos();
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
    const loadedRef = useRef(false);
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const ignoreGlobalActiveRef = useRef(ignoreGlobalActive);
    ignoreGlobalActiveRef.current = ignoreGlobalActive;
    const mutedRef = useRef(props.muted);
    mutedRef.current = props.muted;

    // Desynchronization & freeze watchdog tracking refs
    const lastPresentedFrameTimeRef = useRef<number>(0);
    const desyncRecoveriesRef = useRef<number>(0);
    const rfcHandleRef = useRef<number | null>(null);

    // Hard-mute whenever video is not active, regardless of caller props
    const effectiveMuted = !isActive ? true : (props.muted ?? false);

    /* ─────────────────────────────────────────────────────────────────────
       PLAY SAFE:
       Starts muted to avoid audio leaks during async buffer/decode negotiations,
       checks token & active status on resolution, and only unmutes once confirmed.
    ───────────────────────────────────────────────────────────────────── */
    const playSafe = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;
      if (!isActiveRef.current) {
        video.pause();
        video.muted = true;
        video.volume = 0;
        return;
      }

      const token = ++playbackGeneration;

      // Start hard-muted to guarantee clean autoplay & zero audio leak during pipeline init
      video.muted = true;
      video.volume = 0;

      try {
        await video.play();
      } catch (e: any) {
        if (!isActiveRef.current || token !== playbackGeneration) {
          video.pause();
          video.muted = true;
          video.volume = 0;
          return;
        }
        // Retry once muted if browser policy blocked unmuted attempt
        try {
          await video.play();
        } catch (err: any) {
          return;
        }
      }

      // Check if user scrolled or another video activated while awaiting play()
      if (
        token !== playbackGeneration ||
        !isActiveRef.current ||
        (!ignoreGlobalActiveRef.current && globalActiveVideo !== video)
      ) {
        video.pause();
        video.muted = true;
        video.volume = 0;
        return;
      }

      // Playback active & confirmed — apply sound preference
      const shouldMute = !!mutedRef.current;
      video.muted = shouldMute;
      video.volume = shouldMute ? 0 : 1.0;
    }, []);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 1: Manage HLS / src loading
       Re-runs only when `src` or `shouldLoad` changes.
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Resolve Google Drive URLs to internal proxy stream to guarantee CORS, range requests & bypass virus scan warning
      let resolvedSrc = src;
      if (src.includes('drive.usercontent.google.com') || src.includes('drive.google.com')) {
        const fileId = src.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ||
                       src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
                       src.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
        if (fileId) {
          resolvedSrc = `/api/video/drive-stream?id=${fileId}`;
        }
      }

      const teardown = () => {
        loadedRef.current = false;
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        video.pause();
        video.muted = true;
        video.volume = 0;
        video.removeAttribute('src');
        try { video.load(); } catch {}
      };

      if (!shouldLoad || !resolvedSrc) {
        teardown();
        return teardown;
      }

      teardown();

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
          video.volume = 0;
        }
      };

      if (resolvedSrc.endsWith('.m3u8') && Hls.isSupported()) {
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
        video.src = resolvedSrc;
        video.addEventListener('loadedmetadata', onReady, { once: true });
      } else {
        const isStreamProxy = resolvedSrc.includes('/api/video/drive-stream');
        const isMp4 = resolvedSrc.toLowerCase().includes('.mp4') || resolvedSrc.toLowerCase().includes('video') || resolvedSrc.toLowerCase().includes('.mov') || resolvedSrc.toLowerCase().includes('.webm');
        const finalSrc = isMp4 && !isStreamProxy && !props.poster && !resolvedSrc.includes('#t=') ? `${resolvedSrc}#t=0.001` : resolvedSrc;
        if (props.preload) {
          video.preload = props.preload as "" | "auto" | "none" | "metadata";
        }
        video.src = finalSrc;

        const handleReady = () => {
          video.removeEventListener('canplay', handleReady);
          video.removeEventListener('loadeddata', handleReady);
          onReady();
        };

        if (video.readyState >= 2) {
          onReady();
        } else {
          video.addEventListener('canplay', handleReady, { once: true });
          video.addEventListener('loadeddata', handleReady, { once: true });
        }
      }

      return teardown;
    }, [src, shouldLoad, playSafe, ignoreGlobalActive]);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 2: Respond to active state changes (play / pause)
       Strict single active player enforcement.
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
        } else {
          hlsRef.current.stopLoad();
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
        video.volume = 0;
        if (!ignoreGlobalActive && getGlobalActiveVideo() === video) {
          setGlobalActiveVideo(null);
        }
      }
    }, [isActive, ignoreGlobalActive, playSafe]);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 3: Freeze & Desynchronization Watchdog
       Monitors frame rendering vs audio clock. Halts runaway audio instantly
       if video frames stall.
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isActive) return;

      const hasRfc = typeof (video as any).requestVideoFrameCallback === 'function';
      let cancelled = false;

      const frameCallback = (now: DOMHighResTimeStamp) => {
        lastPresentedFrameTimeRef.current = now;
        if (!cancelled && !video.paused && isActiveRef.current && hasRfc) {
          rfcHandleRef.current = (video as any).requestVideoFrameCallback(frameCallback);
        }
      };

      if (hasRfc && !video.paused) {
        lastPresentedFrameTimeRef.current = performance.now();
        rfcHandleRef.current = (video as any).requestVideoFrameCallback(frameCallback);
      }

      return () => {
        cancelled = true;
        if (hasRfc && rfcHandleRef.current !== null) {
          try {
            (video as any).cancelVideoFrameCallback(rfcHandleRef.current);
          } catch {}
          rfcHandleRef.current = null;
        }
      };
    }, [isActive]);

    useEffect(() => {
      if (!isActive) return;
      const video = videoRef.current;
      if (!video) return;

      let lastCheckedMediaTime = video.currentTime;
      let lastCheckedWallTime = performance.now();
      desyncRecoveriesRef.current = 0;

      const interval = setInterval(() => {
        if (!isActiveRef.current || video.paused || video.ended) {
          return;
        }

        const now = performance.now();
        const currentMediaTime = video.currentTime;
        const mediaAdvanced = currentMediaTime > lastCheckedMediaTime + 0.3;

        const hasRfc = typeof (video as any).requestVideoFrameCallback === 'function';

        let isFrozen = false;
        if (hasRfc) {
          const frameAge = now - lastPresentedFrameTimeRef.current;
          if (mediaAdvanced && frameAge > 1200 && currentMediaTime > 0.5) {
            isFrozen = true;
          }
        } else {
          if (mediaAdvanced && video.readyState < 3 && currentMediaTime > 0.5) {
            isFrozen = true;
          }
        }

        if (isFrozen) {
          console.warn(`[HLSVideo Watchdog] Detected frozen video while audio playing at t=${currentMediaTime.toFixed(2)}s. Resyncing...`);
          // 1. Immediately pause to halt runaway audio
          video.pause();
          video.muted = true;
          video.volume = 0;

          desyncRecoveriesRef.current++;

          if (desyncRecoveriesRef.current <= 2) {
            try {
              video.currentTime = currentMediaTime;
            } catch {}
            if (hlsRef.current) {
              try { hlsRef.current.recoverMediaError(); } catch {}
            }
            setTimeout(() => {
              if (isActiveRef.current && (ignoreGlobalActiveRef.current || globalActiveVideo === video)) {
                lastPresentedFrameTimeRef.current = performance.now();
                playSafe();
              }
            }, 200);
          } else {
            if (onBufferingChange) onBufferingChange(true);
          }
        }

        lastCheckedMediaTime = currentMediaTime;
        lastCheckedWallTime = now;
      }, 800);

      return () => {
        clearInterval(interval);
      };
    }, [isActive, playSafe, onBufferingChange]);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 4: Page visibility — pause all when tab is hidden
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onVisibility = () => {
        if (document.hidden) {
          video.pause();
          video.muted = true;
          video.volume = 0;
        } else if (isActiveRef.current) {
          playSafe();
        }
      };

      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [playSafe]);

    /* ─────────────────────────────────────────────────────────────────────
       EFFECT 5: Lifecycle registry & cleanup on unmount
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
          video.volume = 0;
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
       EFFECT 6: Sync muted prop directly to DOM element
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
      const video = videoRef.current;
      if (video) {
        video.muted = effectiveMuted;
        video.volume = effectiveMuted ? 0 : 1.0;
      }
    }, [effectiveMuted]);

    return (
      <video
        ref={videoRef}
        {...props}
        muted={effectiveMuted}
      />
    );
  }
);

HLSVideo.displayName = 'HLSVideo';
