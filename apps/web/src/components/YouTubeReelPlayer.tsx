'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, getYouTubeWatchUrl, decodeHtmlEntities } from '@/lib/youtube';

interface YouTubeReelPlayerProps {
  videoId: string;
  title?: string;
  isActive: boolean;
  isMuted?: boolean;
  desktop?: boolean;
  posterUrl?: string | null;
}

export function YouTubeReelPlayer({
  videoId,
  title = '',
  isActive,
  isMuted = false,
  desktop = false,
  posterUrl,
}: YouTubeReelPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsIframeLoaded(false);
      setHasError(false);
    }
  }, [isActive]);

  const cleanTitle = decodeHtmlEntities(title);
  const watchUrl = getYouTubeWatchUrl(videoId);
  const thumbUrl = posterUrl || getYouTubeThumbnailUrl(videoId, 'hq');

  // If user or embed triggers an error, show the proper fallback with "Watch on YouTube"
  if (hasError || !videoId) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 z-10 select-none">
        <div className="max-w-xs bg-zinc-900/90 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 text-white shadow-2xl flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-zinc-100">Unable to play this YouTube video here</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              This video owner may have disabled external embedding or restricted playback.
            </p>
          </div>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const embedSrc = getYouTubeEmbedUrl(videoId, {
    autoplay: isActive,
    muted: isMuted,
    controls: true,
    loop: true,
    playsinline: true,
    rel: false,
  });

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Background Poster Blur for ambient feel */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-30 scale-125 pointer-events-none"
        style={{ backgroundImage: `url(${thumbUrl})` }}
      />

      {/* YouTube Video Player Iframe (Active) */}
      {isActive ? (
        <div className="relative w-full h-full flex items-center justify-center z-0">
          <iframe
            src={embedSrc}
            title={cleanTitle || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsIframeLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full ${desktop ? 'h-full aspect-9/16 object-contain' : 'h-full object-contain'} border-0 transition-opacity duration-300 ${
              isIframeLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Loading Shimmer before iframe loads */}
          {!isIframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img
                src={thumbUrl}
                alt="Thumbnail"
                className="absolute inset-0 w-full h-full object-cover filter blur-[2px]"
              />
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl animate-pulse z-10">
                <Play className="w-6 h-6 fill-white translate-x-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Preload Thumbnail View (Inactive Slide) */
        <div className="relative w-full h-full">
          <img
            src={thumbUrl}
            alt={cleanTitle || 'YouTube Thumbnail'}
            className="w-full h-full object-cover filter blur-[1px] scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-red-600/90 text-white backdrop-blur-md flex items-center justify-center shadow-2xl">
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Top YouTube Platform Badge */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2">
        <Badge className="bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border-none shadow-md flex items-center gap-1 backdrop-blur-xs">
          <Play className="w-2.5 h-2.5 fill-white" />
          <span>YouTube</span>
        </Badge>
      </div>

      {/* External Watch Link Button (Top Right Fallback) */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-14 sm:right-16 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        title="Open in YouTube"
      >
        <span className="hidden xs:inline">Open</span>
        <ExternalLink className="w-3 h-3 text-white" />
      </a>
    </div>
  );
}
