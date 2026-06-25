'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  HLSVideo,
  setGlobalActiveVideo,
  getGlobalActiveVideo,
  getSoundPreference,
  setSoundPreference
} from '@/components/HLSVideo';
import { getPosterUrl } from '@/lib/media';
import { videoMetadataCache } from '@/lib/videoCache';

interface PostCarouselProps {
  mediaUrls: string;
  mediaTypes?: string | null;
  postId: string;
}

interface CarouselVideoProps {
  src: string;
  isActive: boolean;
  shouldLoad: boolean;
  postId: string;
}

function CarouselVideo({ src, isActive, shouldLoad, postId }: CarouselVideoProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    setIsReady(false);
    setIsError(false);
  }, [src]);

  // Viewport detection: Visible >= 65% -> Auto Play, Hidden < 40% -> Auto Pause
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.65) {
            setIsVisible(true);
          } else if (entry.intersectionRatio < 0.4) {
            setIsVisible(false);
          }
        }
      },
      {
        threshold: [0.4, 0.65]
      }
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Sync isPlaying state with actual DOM video play/pause events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Sync muted state with global sound preference
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nextMuted = customEvent.detail.isMuted;
      video.muted = nextMuted;
      setIsMuted(nextMuted);
    };

    window.addEventListener('tolee_sound_pref_change', handlePrefChange);

    const initialMute = getSoundPreference();
    video.muted = initialMute;
    setIsMuted(initialMute);

    return () => {
      window.removeEventListener('tolee_sound_pref_change', handlePrefChange);
    };
  }, []);

  // Playback control coordinating with global active video singleton
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && isVisible) {
      // Small delay to prevent layout thrashing on fast scrolls
      const t = setTimeout(() => {
        if (isActive && isVisible && !isError) {
          setGlobalActiveVideo(video);
          video.muted = getSoundPreference();
          video.play().catch(() => {});
        }
      }, 50);
      return () => clearTimeout(t);
    } else {
      video.pause();
      if (getGlobalActiveVideo() === video) {
        setGlobalActiveVideo(null);
      }
    }
  }, [isActive, isVisible, isReady, isError, src]);

  // Clean up on unmount
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        if (getGlobalActiveVideo() === video) {
          setGlobalActiveVideo(null);
        }
      }
    };
  }, []);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/reels?videoId=${postId}`);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setSoundPreference(nextMuted);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer" onClick={handleVideoClick}>
      <HLSVideo
        ref={videoRef}
        src={src}
        isActive={isActive && isVisible}
        shouldLoad={isVisible && shouldLoad}
        contentId={postId}
        contentType="post"
        trafficSource="feed"
        isVisible={isVisible}
        className="w-full h-full object-contain"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        poster={getPosterUrl(src) || undefined}
        onCanPlay={() => setIsReady(true)}
        onError={() => setIsError(true)}
        onLoadStart={() => {
          setIsReady(false);
          setIsError(false);
        }}
        onBufferingChange={setIsBuffering}
      />
      
      <div 
        className={`absolute inset-0 flex items-center justify-center bg-black/45 z-10 pointer-events-none transition-opacity duration-500 ${
          isActive && isVisible && !isReady && !isError ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Play className="w-5 h-5 text-white/50 fill-white/10" />
        </div>
      </div>

      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-4 z-10 space-y-3">
          <AlertCircle className="w-10 h-10 text-zinc-500" />
          <p className="text-xs font-bold text-zinc-400">Video Unavailable</p>
        </div>
      )}

      {!isPlaying && isReady && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="p-3 bg-black/55 rounded-full text-white backdrop-blur-sm shadow-md animate-in fade-in duration-200">
            <Play className="w-6 h-6 fill-current text-white ml-0.5" />
          </div>
        </div>
      )}

      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md z-20 active:scale-90 transition-transform shadow-md"
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function PostCarousel({ mediaUrls, mediaTypes, postId }: PostCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cache the thumbnail and video metadata when component mounts/renders
  useEffect(() => {
    if (postId && mediaUrls) {
      videoMetadataCache.set(postId, {
        id: postId,
        video: mediaUrls.split(/,(?=https?:\/\/)/)[0],
        thumbnailUrl: getPosterUrl(mediaUrls.split(/,(?=https?:\/\/)/)[0]),
        mediaUrls,
        mediaTypes,
      });
    }
  }, [postId, mediaUrls, mediaTypes]);

  const urls = mediaUrls ? mediaUrls.split(/,(?=https?:\/\/)/).map(url => url.trim()).filter(Boolean) : [];
  const rawTypes = mediaTypes ? mediaTypes.split(',').map(t => t.trim().toLowerCase()) : [];
  
  const items = urls.map((url, idx) => ({
    url,
    type: rawTypes[idx] || (url.includes('.mp4') || url.includes('video') ? 'video' : 'image')
  }));

  if (items.length === 0) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
  };

  // Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full aspect-[4/5] bg-neutral-900 dark:bg-zinc-950 overflow-hidden group/carousel select-none rounded-xl sm:rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm"
    >
      {/* Slide number pill */}
      {items.length > 1 && (
        <div className="absolute top-4 right-4 z-20 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[11px] font-extrabold tracking-wider pointer-events-none select-none shadow-md">
          {activeIndex + 1}/{items.length}
        </div>
      )}

      {/* Media slides track */}
      <div 
        className="absolute inset-0 flex transition-transform duration-300 ease-out"
        style={{ 
          width: `${items.length * 100}%`,
          transform: `translateX(-${activeIndex * (100 / items.length)}%)`
        }}
      >
        {items.map((item, idx) => (
          <div key={idx} className="h-full relative overflow-hidden flex items-center justify-center" style={{ width: `${100 / items.length}%` }}>
            {item.type === 'video' ? (
              <CarouselVideo 
                src={item.url} 
                isActive={idx === activeIndex} 
                shouldLoad={idx === activeIndex || idx === activeIndex + 1}
                postId={postId} 
              />
            ) : (
              <img 
                src={item.url} 
                alt={`Media ${idx + 1}`} 
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop overlay) */}
      {items.length > 1 && activeIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-zinc-800 dark:bg-black/60 dark:hover:bg-black/80 dark:text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105 z-20"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {items.length > 1 && activeIndex < items.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-zinc-800 dark:bg-black/60 dark:hover:bg-black/80 dark:text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105 z-20"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* Dot Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-25 bg-black/25 px-2 py-1 rounded-full backdrop-blur-[2px]">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? 'w-2 h-2 bg-indigo-500 scale-110 shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90 cursor-pointer'
              }`}
              onClick={() => setActiveIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
