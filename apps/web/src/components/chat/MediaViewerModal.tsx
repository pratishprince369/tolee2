'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Download, ZoomIn, ZoomOut, RotateCcw, ExternalLink, 
  File, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  ArrowLeft, RotateCcw as RewindIcon, FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVideoPlaybackUrl, getVideoThumbnailUrl, formatPlayerTime } from './MediaAttachmentMessage';

export interface ActiveMediaViewerData {
  type: 'image' | 'video' | 'pdf' | 'document' | 'audio';
  url: string;
  filename?: string;
  sender?: string;
  time?: string;
  duration?: number;
}

interface MediaViewerModalProps {
  media: ActiveMediaViewerData | null;
  onClose: () => void;
}

const SPEED_OPTIONS = [1.0, 1.5, 2.0, 0.5];

export function MediaViewerModal({ media, onClose }: MediaViewerModalProps) {
  const [zoom, setZoom] = useState(1);

  // Video Player States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media?.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [centerIconState, setCenterIconState] = useState<'play' | 'pause' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rawUrl = media?.url || '';
  const effectiveUrl = media?.type === 'video' ? getVideoPlaybackUrl(rawUrl) : rawUrl;

  const currentSpeed = SPEED_OPTIONS[speedIndex];

  // Auto-hide controls during video playback
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (media?.type === 'video' && isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [media?.type, isPlaying]);

  useEffect(() => {
    setZoom(1);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(media?.duration || 0);
    setSpeedIndex(0);
    setShowControls(true);
  }, [media?.url, media?.duration]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.code === 'Space' && media?.type === 'video') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft' && media?.type === 'video' && videoRef.current) {
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        resetControlsTimeout();
      } else if (e.key === 'ArrowRight' && media?.type === 'video' && videoRef.current) {
        e.preventDefault();
        videoRef.current.currentTime = Math.min(duration || 9999, videoRef.current.currentTime + 5);
        resetControlsTimeout();
      } else if ((e.key === 'm' || e.key === 'M') && media?.type === 'video') {
        e.preventDefault();
        toggleMute();
      } else if ((e.key === 'f' || e.key === 'F') && media?.type === 'video') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, media?.type, duration, resetControlsTimeout]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!media) return null;

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      triggerCenterAnimation('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerCenterAnimation('pause');
    }
    resetControlsTimeout();
  };

  const triggerCenterAnimation = (type: 'play' | 'pause') => {
    setCenterIconState(type);
    setTimeout(() => {
      setCenterIconState(null);
    }, 450);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetControlsTimeout();
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    if (videoRef.current) {
      videoRef.current.playbackRate = SPEED_OPTIONS[nextIdx];
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    resetControlsTimeout();
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = (media.type === 'pdf' || media.type === 'document')
      ? `/api/chat/document?url=${encodeURIComponent(media.url)}&filename=${encodeURIComponent(media.filename || 'document.pdf')}&download=1`
      : effectiveUrl;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = media.filename || (media.type === 'video' ? 'video.mp4' : 'download');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const openUrl = (media.type === 'pdf' || media.type === 'document')
      ? `/api/chat/document?url=${encodeURIComponent(media.url)}&filename=${encodeURIComponent(media.filename || 'document.pdf')}`
      : effectiveUrl;
    window.open(openUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-[150] h-[100dvh] max-h-[100dvh] w-full bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* ── Top Bar (WhatsApp Style Header) ── */}
      <div 
        className={`shrink-0 w-full h-16 px-4 sm:px-6 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 text-white/90 hover:text-white hover:bg-white/15 rounded-full"
            title="Back / Close (Esc)"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </Button>

          <div className="flex flex-col min-w-0">
            <p className="text-white text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md">
              {media.filename || (media.type === 'video' ? 'Video' : media.type === 'pdf' ? 'PDF Document' : 'Media')}
            </p>
            <p className="text-white/60 text-xs truncate">
              {media.sender ? `Sent by ${media.sender}` : ''} {media.time ? `• ${media.time}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {media.type === 'image' && (
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 backdrop-blur-sm border border-white/10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(1)}
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenExternal}
            className="h-9 w-9 text-white hover:bg-white/20 rounded-full bg-white/10 border border-white/10"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-9 w-9 text-white hover:bg-white/20 rounded-full bg-white/10 border border-white/10"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 text-white hover:bg-red-500/80 rounded-full bg-white/10 border border-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ── Main Media Container ── */}
      <div 
        ref={videoContainerRef}
        className="relative flex-1 w-full max-w-6xl px-2 sm:px-6 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'image' && (
          <div className="relative max-h-[85vh] max-w-full flex items-center justify-center overflow-auto p-2">
            <img 
              src={media.url} 
              alt={media.filename || 'Full View'} 
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
              onClick={() => setZoom(prev => prev === 1 ? 1.75 : 1)}
            />
          </div>
        )}

        {media.type === 'video' && (
          <div 
            className="relative w-full h-full max-h-[80vh] sm:max-h-[84vh] flex items-center justify-center cursor-pointer group"
            onClick={togglePlayPause}
          >
            <video 
              ref={videoRef}
              src={effectiveUrl} 
              poster={getVideoThumbnailUrl(media.url) || undefined}
              autoPlay 
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const dur = isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0;
                setDuration(dur || media.duration || 0);
              }}
              onTimeUpdate={() => {
                if (videoRef.current && !isSeeking) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onEnded={() => setIsPlaying(false)}
              className="max-h-[78vh] sm:max-h-[82vh] max-w-full w-auto h-auto object-contain rounded-2xl shadow-2xl"
            />

            {/* Central Animated Play / Pause Feedback Pulse */}
            {centerIconState && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl animate-out fade-out zoom-out duration-300">
                  {centerIconState === 'play' ? (
                    <Play className="w-9 h-9 fill-white text-white ml-1" />
                  ) : (
                    <Pause className="w-9 h-9 fill-white text-white" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {media.type === 'pdf' && (
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
            <iframe
              src={`/api/chat/document?url=${encodeURIComponent(media.url)}&filename=${encodeURIComponent(media.filename || 'document.pdf')}#toolbar=1`}
              className="w-full flex-1 border-none"
              title={media.filename || 'PDF Document'}
            />
          </div>
        )}

        {media.type === 'document' && (
          <div className="p-8 rounded-3xl bg-zinc-900 border border-white/10 text-center flex flex-col items-center gap-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <File className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white font-bold text-base">{media.filename || 'Document'}</p>
              <p className="text-zinc-400 text-xs mt-1">Preview not available in-app for this format</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Button onClick={handleDownload} className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl gap-2 text-xs font-bold">
                <Download className="w-4 h-4" /> Download File
              </Button>
              <Button onClick={handleOpenExternal} variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-xl gap-2 text-xs font-bold">
                <ExternalLink className="w-4 h-4" /> Open
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Bar / Video Player Controls (WhatsApp Style) ── */}
      {media.type === 'video' ? (
        <div 
          className={`shrink-0 w-full max-w-4xl px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Timeline Seekbar & Timestamps */}
          <div className="flex items-center gap-3 text-white text-xs font-mono font-medium select-none">
            <span className="w-11 text-right tabular-nums text-white/90">
              {formatPlayerTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center group">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.1}
                value={currentTime}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={handleSeek}
                onMouseUp={() => setIsSeeking(false)}
                onTouchEnd={() => setIsSeeking(false)}
                style={{
                  background: `linear-gradient(to right, #10b981 ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.25) ${(currentTime / (duration || 1)) * 100}%)`
                }}
                className="w-full h-1.5 sm:h-2 rounded-full appearance-none cursor-pointer accent-emerald-500 focus:outline-none transition-all hover:h-2.5"
              />
            </div>

            <span className="w-11 tabular-nums text-white/60">
              {formatPlayerTime(duration)}
            </span>
          </div>

          {/* Control Action Buttons */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10 text-white hover:bg-white/20 rounded-full"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    resetControlsTimeout();
                  }
                }}
                className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                title="Rewind 10s"
              >
                <RewindIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Math.min(duration || 9999, videoRef.current.currentTime + 10);
                    resetControlsTimeout();
                  }
                }}
                className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                title="Forward 10s"
              >
                <FastForward className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-9 w-9 text-white hover:bg-white/20 rounded-full ml-1"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Multiplier Toggle Badge */}
              <button
                onClick={cycleSpeed}
                className="h-8 px-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-bold transition-transform active:scale-95 shadow-sm"
                title="Change playback speed"
              >
                {currentSpeed}x
              </button>

              {/* Fullscreen Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-9 w-9 text-white hover:bg-white/20 rounded-full"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 w-full h-12 flex items-center justify-center text-white/50 text-xs select-none">
          <span>Click outside or press Esc to close</span>
        </div>
      )}
    </div>
  );
}
