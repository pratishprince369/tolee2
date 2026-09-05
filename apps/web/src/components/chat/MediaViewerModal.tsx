'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Play, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaViewerModalProps {
  media: {
    type: 'image' | 'video';
    url: string;
    filename?: string;
    sender?: string;
  } | null;
  onClose: () => void;
}

export function MediaViewerModal({ media, onClose }: MediaViewerModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setZoom(1);
  }, [media?.url]);

  if (!media) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.filename || 'media';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Header Bar */}
      <div 
        className="w-full h-16 px-4 sm:px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0">
          <p className="text-white text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md">
            {media.filename || (media.type === 'video' ? 'Video' : 'Photo')}
          </p>
          {media.sender && (
            <p className="text-white/60 text-xs truncate">
              Sent by {media.sender}
            </p>
          )}
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
            onClick={handleDownload}
            className="h-9 w-9 text-white hover:bg-white/20 rounded-full bg-white/10 border border-white/10"
            title="Download"
          >
            <Download className="w-4.5 h-4.5" />
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

      {/* Main Media Container */}
      <div 
        className="flex-1 w-full max-w-5xl px-4 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'image' ? (
          <div className="relative max-h-[85vh] max-w-full flex items-center justify-center overflow-auto p-2">
            <img 
              src={media.url} 
              alt={media.filename || 'Full View'} 
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200 cursor-zoom-in"
              onClick={() => setZoom(prev => prev === 1 ? 1.75 : 1)}
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
            <video 
              src={media.url} 
              controls 
              autoPlay 
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="w-full h-12 flex items-center justify-center text-white/50 text-xs select-none">
        <span>Click outside or press Esc to close</span>
      </div>
    </div>
  );
}
