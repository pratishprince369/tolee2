'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Video } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe YouTube ID extraction
  const cleanVideoId = React.useMemo(() => {
    try {
      if (!videoId || typeof videoId !== 'string') return '';
      let id = videoId.trim();
      if (id.includes('v=')) {
        id = id.split('v=')[1]?.split('&')[0] || id;
      } else if (id.includes('youtu.be/')) {
        id = id.split('youtu.be/')[1]?.split('?')[0] || id;
      } else if (id.includes('embed/')) {
        id = id.split('embed/')[1]?.split('?')[0] || id;
      } else if (id.includes('/vi/')) {
        id = id.split('/vi/')[1]?.split('/')[0] || id;
      }
      return id.split(',')[0]?.split('/')[0]?.split('?')[0]?.trim() || '';
    } catch {
      return '';
    }
  }, [videoId]);

  // Autoplay when scrolled into view
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const container = containerRef.current;
    if (!container) return;

    try {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            setIsIntersecting(entry.isIntersecting);
          }
        },
        { threshold: 0.25 }
      );

      observer.observe(container);
      return () => observer.disconnect();
    } catch (e) {
      console.error('IntersectionObserver error:', e);
    }
  }, []);

  const fallbackThumbnail = thumbnailUrl || (cleanVideoId ? `https://i.ytimg.com/vi/${cleanVideoId}/hqdefault.jpg` : '/tolee-news-default.png');

  if (hasError || !cleanVideoId) {
    return (
      <div 
        onClick={() => {
          if (cleanVideoId) {
            window.open(`https://www.youtube.com/watch?v=${cleanVideoId}`, '_blank');
          }
        }}
        className={`relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black cursor-pointer group/thumb ${className}`}
      >
        <img src={fallbackThumbnail} alt={title || 'News'} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl scale-100 group-hover/thumb:scale-110 transition-transform">
            <Play className="w-7 h-7 fill-current translate-x-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Clean Native YouTube Embed URL with audio unmuted by default
  const embedSrc = `https://www.youtube.com/embed/${cleanVideoId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-none sm:rounded-2xl overflow-hidden bg-black shadow-lg border-y sm:border border-zinc-200 dark:border-zinc-800/80 cursor-pointer group ${className}`}
    >
      {mounted && isIntersecting ? (
        <iframe
          src={embedSrc}
          title={title || 'YouTube Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
          className="w-full h-full border-none"
        />
      ) : (
        <div className="relative w-full h-full cursor-pointer group">
          <img
            src={fallbackThumbnail}
            alt={title || 'YouTube Video'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-red-600/90 text-white backdrop-blur-md flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Category Badge overlay */}
      {category && (
        <Badge className="absolute top-3 left-3 bg-black/70 text-white font-bold text-[10px] uppercase px-2.5 py-1 rounded-lg border border-white/20 shadow-md flex items-center gap-1.5 backdrop-blur-md z-10 pointer-events-none">
          <Video className="w-3.5 h-3.5 text-red-500" />
          <span>{category}</span>
        </Badge>
      )}
    </div>
  );
}
