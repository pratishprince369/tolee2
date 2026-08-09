'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Video, Maximize, Minimize } from 'lucide-react';
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

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract YouTube ID safely
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

  // Listen to YouTube Iframe postMessage for progress & duration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.data || typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
        }
      } catch {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Timer ticker to increment currentTime smoothly while playing
  useEffect(() => {
    if (!isPlaying || !isIntersecting) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (duration > 0 && prev >= duration) return duration;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isIntersecting, duration]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = newMuteState ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [newTime, true] }),
        '*'
      );
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const embedSrc = cleanVideoId
    ? `https://www.youtube-nocookie.com/embed/${cleanVideoId}?autoplay=${isIntersecting ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=1&enablejsapi=1&playsinline=1&rel=0`
    : '';

  const fallbackThumbnail = thumbnailUrl || (cleanVideoId ? `https://i.ytimg.com/vi/${cleanVideoId}/hqdefault.jpg` : '/tolee-news-default.png');

  if (hasError || !cleanVideoId) {
    return (
      <div 
        onClick={() => {
          if (cleanVideoId) {
            window.open(`https://www.youtube.com/watch?v=${cleanVideoId}`, '_blank');
          }
        }}
        className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black cursor-pointer group/thumb ${className}`}
      >
        <img src={fallbackThumbnail} alt={title || 'News'} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-teal-500/90 text-white flex items-center justify-center shadow-2xl scale-100 group-hover/thumb:scale-110 transition-transform">
            <Play className="w-7 h-7 fill-current translate-x-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Watch on YouTube
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHoveringControls(true)}
      onMouseLeave={() => setIsHoveringControls(false)}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl border border-zinc-800 cursor-pointer group ${className}`}
    >
      {mounted && isIntersecting && cleanVideoId ? (
        <div className="relative w-full h-full overflow-hidden select-none bg-black">
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            onError={() => setHasError(true)}
            className="w-full h-full border-none pointer-events-auto"
          />

          {/* Transparent Mouse Click Area (Click Anywhere to Play/Pause) */}
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => togglePlay()} />

          {/* Top Edge Clean Mask (Hides Channel Title Bar) */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none z-15" />

          {/* Center Screen Play/Pause Overlay Indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-25 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-teal-500/90 text-white flex items-center justify-center shadow-2xl scale-110 border border-white/20">
                <Play className="w-8 h-8 fill-current translate-x-0.5" />
              </div>
            </div>
          )}

          {/* TOLEE FULL CUSTOM HD PLAYER CONTROL BAR (Z-30) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-2 px-3.5 z-30 transition-opacity duration-300 pointer-events-auto ${
              !isPlaying || isHoveringControls ? 'opacity-100' : 'opacity-90 hover:opacity-100'
            }`}
          >
            {/* Interactive Progress Line & Point Handle (Seek Bar) */}
            <div className="relative w-full h-3 flex items-center cursor-pointer group/seek mb-1.5">
              {/* Background Track */}
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative">
                {/* Red Active Progress Fill */}
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Point Handle Dot */}
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md transform -translate-x-1/2 transition-transform scale-100 group-hover/seek:scale-125"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Range Input Slider for Dragging/Clicking Seek */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-40"
              />
            </div>

            {/* Custom Control Action Buttons & Status Row */}
            <div className="flex items-center justify-between text-white text-xs select-none">
              <div className="flex items-center gap-3">
                {/* Play / Pause Toggle */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-95"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Mute / Unmute Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-95"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Realtime Playback Counter (01:24 / 08:56) */}
                <span className="text-[11px] font-medium text-zinc-300 font-mono tracking-tight">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Side Options: Fullscreen & TOLEE HD Watermark */}
              <div className="flex items-center gap-3">
                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-95"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>

                {/* TOLEE HD Badge */}
                <span className="text-[11px] font-black tracking-widest text-teal-400 uppercase flex items-center gap-1.5 drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full border border-teal-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  TOLEE HD
                </span>
              </div>
            </div>
          </div>
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
