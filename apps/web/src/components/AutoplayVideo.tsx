'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────
   GLOBAL/STATIC REGISTRIES for cross-post coordination (No React Overhead)
   ───────────────────────────────────────────────────────────────────── */
// Tracks all active video instances currently mounted on the feed
const activeVideoInstances = new Map<string, {
  element: HTMLVideoElement;
  ratio: number;
  play: () => void;
  pause: () => void;
}>();

// Global mute preference synchronized across all instances in real-time
let globalMuted = true;
const muteListeners = new Set<(muted: boolean) => void>();

const setGlobalMuted = (muted: boolean) => {
  globalMuted = muted;
  muteListeners.forEach((listener) => {
    listener(muted);
  });
};

// Coordinates which single video should play based on visibility in viewport
const coordinateAutoplay = () => {
  let highestRatio = 0;
  let activeId: string | null = null;

  activeVideoInstances.forEach((inst, id) => {
    if (inst.ratio > highestRatio) {
      highestRatio = inst.ratio;
      activeId = id;
    }
  });

  // Play the most visible video if it is at least 50% visible, pause all others
  if (activeId && highestRatio >= 0.5) {
    activeVideoInstances.forEach((inst, id) => {
      if (id === activeId) {
        inst.play();
      } else {
        inst.pause();
      }
    });
  } else {
    // If no video is sufficiently visible, pause everything
    activeVideoInstances.forEach((inst) => {
      inst.pause();
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   PROPS INTERFACE
   ───────────────────────────────────────────────────────────────────── */
interface AutoplayVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  postId: string;
}

export function AutoplayVideo({ src, postId, className, ...props }: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(globalMuted);
  const [progress, setProgress] = useState(0);
  const [showPlayStateIndicator, setShowPlayStateIndicator] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reference variables to prevent async stale closures
  const manuallyPausedRef = useRef(false);
  const isLoadedRef = useRef(false);

  /* ─────────────────────────────────────────────────────────────────────
     EFFECT 1: Sync Mute State Globally in Real-time
     ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const listener = (newMuted: boolean) => {
      setIsMuted(newMuted);
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
    };
    muteListeners.add(listener);

    if (videoRef.current) {
      videoRef.current.muted = globalMuted;
    }

    return () => {
      muteListeners.delete(listener);
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     EFFECT 2: Source Loading & Teardown (HLS / MP4 / WebM)
     ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    isLoadedRef.current = false;
    manuallyPausedRef.current = false;

    const teardown = () => {
      isLoadedRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
      try { video.load(); } catch {}
    };

    const onReady = () => {
      isLoadedRef.current = true;
      // Re-coordinate now that this video is ready to play
      coordinateAutoplay();
    };

    if (src.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 15,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.once(Hls.Events.MANIFEST_PARSED, onReady);
    } else if (src.endsWith('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', onReady, { once: true });
    } else {
      const isMp4 = src.toLowerCase().includes('.mp4') || src.toLowerCase().includes('video') || src.toLowerCase().includes('.mov') || src.toLowerCase().includes('.webm');
      const finalSrc = isMp4 && !src.includes('#t=') ? `${src}#t=0.001` : src;
      video.src = finalSrc;
      video.addEventListener('canplay', onReady, { once: true });
    }

    return teardown;
  }, [src]);

  /* ─────────────────────────────────────────────────────────────────────
     EFFECT 3: Intersection Observer Integration (Autoplay / Autopause on Scroll)
     ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // Define standard play/pause handlers for this instance
    const playInstance = () => {
      if (manuallyPausedRef.current) return; // Do not auto-play if manually paused
      if (isLoadedRef.current || video.readyState >= 1) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          if (e.name !== 'AbortError') {
            console.log('[AutoplayVideo] play blocked:', e.message);
            if (!video.muted) {
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => {
                setIsPlaying(true);
              }).catch((err) => console.log('[AutoplayVideo] play failed after muting:', err.message));
            }
          }
        });
      }
    };

    const pauseInstance = () => {
      video.pause();
      setIsPlaying(false);
    };

    // Register this video instance in global registry
    activeVideoInstances.set(postId, {
      element: video,
      ratio: 0,
      play: playInstance,
      pause: pauseInstance,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const inst = activeVideoInstances.get(postId);
          if (inst) {
            inst.ratio = entry.intersectionRatio;
            
            // Reset manual pause once the video leaves the screen completely
            if (entry.intersectionRatio === 0) {
              manuallyPausedRef.current = false;
            }
          }
        }
        coordinateAutoplay();
      },
      {
        threshold: [0.0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      activeVideoInstances.delete(postId);
      coordinateAutoplay(); // re-evaluate remaining visible videos
    };
  }, [postId]);

  /* ─────────────────────────────────────────────────────────────────────
     EFFECT 4: Browser Tab / App Visibility Event Handling
     ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
        setIsPlaying(false);
      } else {
        // Evaluate who should play when user returns
        coordinateAutoplay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     INTERACTION HANDLERS (Mute toggle, Play/Pause manual override)
     ───────────────────────────────────────────────────────────────────── */
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGlobalMuted(!isMuted);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      manuallyPausedRef.current = true; // Block subsequent autoplay until scrolled or tapped
    } else {
      manuallyPausedRef.current = false;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }

    // Flash premium HUD indicator briefly
    setShowPlayStateIndicator(true);
    setTimeout(() => {
      setShowPlayStateIndicator(false);
    }, 700);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const pct = (video.currentTime / video.duration) * 100 || 0;
    setProgress(pct);
  };

  return (
    <div
      ref={containerRef}
      onClick={togglePlayPause}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full overflow-hidden bg-black cursor-pointer rounded-2xl flex items-center justify-center select-none"
      style={{ aspectRatio: '16/9' }}
    >
      {/* HTML5 Native Video Tag */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        muted={isMuted}
        playsInline
        loop
        className="w-full h-full object-contain max-h-[500px]"
        {...props}
      />

      {/* Glassmorphic Play/Pause HUD State Indicator Overlay */}
      {showPlayStateIndicator && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-all duration-300 animate-in fade-in zoom-in-50">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg shadow-black/20">
            {isPlaying ? (
              <Play className="w-8 h-8 fill-current translate-x-0.5" />
            ) : (
              <Pause className="w-8 h-8 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Persistent Controls Overlay (Visible on Hover/Interaction) */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300 ${
          isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Play/Pause bottom left button & Mute bottom right button */}
        <div className="flex items-center justify-between w-full z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white active:scale-90 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white active:scale-90 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Slim playback progress bar at the very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
        <div
          className="h-full bg-indigo-600 rounded-r-md transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
