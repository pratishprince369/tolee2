'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Video } from 'lucide-react';
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

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Extract YouTube ID from full URL or raw ID
  const cleanVideoId = React.useMemo(() => {
    if (!videoId) return '';
    if (videoId.includes('youtube.com/watch?v=')) {
      return videoId.split('v=')[1]?.split('&')[0] || videoId;
    }
    if (videoId.includes('youtu.be/')) {
      return videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
    }
    if (videoId.includes('youtube.com/embed/')) {
      return videoId.split('embed/')[1]?.split('?')[0] || videoId;
    }
    return videoId;
  }, [videoId]);

  // Intersection Observer to trigger autoplay when 40% visible in scroll
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const embedSrc = cleanVideoId
    ? `https://www.youtube-nocookie.com/embed/${cleanVideoId}?autoplay=${isIntersecting && isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&controls=1`
    : '';

  const fallbackThumbnail = thumbnailUrl || `https://img.youtube.com/vi/${cleanVideoId}/hqdefault.jpg`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-zinc-200 dark:border-zinc-800 ${className}`}
    >
      {mounted && isIntersecting && cleanVideoId ? (
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-none"
        />
      ) : (
        <div className="relative w-full h-full cursor-pointer group">
          <img
            src={fallbackThumbnail}
            alt={title}
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
      <Badge className="absolute top-3 left-3 bg-red-600/90 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-lg border-none shadow-md flex items-center gap-1.5 backdrop-blur-md">
        <Video className="w-3.5 h-3.5" />
        <span>{category} Video</span>
      </Badge>
    </div>
  );
}
