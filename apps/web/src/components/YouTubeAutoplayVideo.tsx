'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface YouTubeAutoplayVideoProps {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  category?: string;
  className?: string;
}

export function YouTubeAutoplayVideo({
  videoId,
  title,
  thumbnailUrl,
  category = 'News',
  className = ''
}: YouTubeAutoplayVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract YouTube ID safely
  const cleanVideoId = React.useMemo(() => {
    try {
      if (!videoId || typeof videoId !== 'string') return '';
      if (videoId.includes('youtube.com/watch?v=')) {
        return videoId.split('v=')[1]?.split('&')[0] || videoId;
      }
      if (videoId.includes('youtu.be/')) {
        return videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
      }
      if (videoId.includes('youtube.com/embed/')) {
        return videoId.split('embed/')[1]?.split('?')[0] || videoId;
      }
      return videoId.trim();
    } catch {
      return '';
    }
  }, [videoId]);

  // Intersection Observer to trigger autoplay when 40% visible in scroll
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const container = containerRef.current;
    if (!container) return;

    try {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            setIsIntersecting(entry.isIntersecting);
            if (entry.isIntersecting) {
              setIsPlaying(true);
            }
          }
        },
        { threshold: 0.4 }
      );

      observer.observe(container);
      return () => observer.disconnect();
    } catch (e) {
      console.error('IntersectionObserver error:', e);
    }
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    // Send postMessage to YouTube IFrame API to toggle volume
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = newMuteState ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
  };

  const togglePlay = () => {
    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = nextPlayState ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
  };

  // controls=0 & modestbranding=1 COMPLETELY ERASES YouTube logo, title link & bottom bar!
  const embedSrc = cleanVideoId
    ? `https://www.youtube-nocookie.com/embed/${cleanVideoId}?autoplay=${isIntersecting ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`
    : '';

  const fallbackThumbnail = thumbnailUrl || (cleanVideoId ? `https://img.youtube.com/vi/${cleanVideoId}/hqdefault.jpg` : '/tolee-news-default.png');

  if (hasError || !cleanVideoId) {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
        <img src={fallbackThumbnail} alt={title || 'News'} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer group ${className}`}
    >
      {mounted && isIntersecting && cleanVideoId ? (
        <div className="relative w-full h-full overflow-hidden select-none">
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            onError={() => setHasError(true)}
            className="w-full h-full border-none scale-[1.05] origin-center pointer-events-none"
          />

          {/* Tolee Custom Control Overlays (Top-Right Audio Toggle & Bottom-Right TOLEE HD Watermark) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-black/75 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg transition-transform active:scale-95"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Bottom-Right Watermark Mask: Replaces YouTube logo with TOLEE HD badge */}
          <div className="absolute bottom-0 right-0 h-10 w-32 bg-black/95 backdrop-blur-md flex items-center justify-end px-3 rounded-tl-2xl pointer-events-none z-20 shadow-xl border-t border-l border-zinc-800/90">
            <span className="text-[11px] font-black tracking-widest text-teal-400 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              TOLEE HD
            </span>
          </div>

          {/* Play/Pause Overlay Indicator on Tap */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="w-14 h-14 rounded-full bg-teal-500/90 text-white flex items-center justify-center shadow-2xl scale-110">
                <Play className="w-7 h-7 fill-current translate-x-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full cursor-pointer group">
          <img
            src={fallbackThumbnail}
            alt={title || 'YouTube News'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-red-600/90 text-white backdrop-blur-md flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Category Badge */}
      <Badge className="absolute top-3 left-3 bg-red-600/90 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-lg border-none shadow-md flex items-center gap-1.5 backdrop-blur-md z-20">
        <Video className="w-3.5 h-3.5" />
        <span>{category} Video</span>
      </Badge>
    </div>
  );
}
