'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, ExternalLink, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVideoPlaybackUrl, getVideoThumbnailUrl } from './MediaAttachmentMessage';

interface MediaViewerModalProps {
  media: {
    type: 'image' | 'video' | 'pdf' | 'document' | 'audio';
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

  const rawUrl = media.url;
  const effectiveUrl = media.type === 'video' ? getVideoPlaybackUrl(rawUrl) : rawUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = effectiveUrl;
    link.download = media.filename || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-[150] h-[100dvh] max-h-[100dvh] w-full bg-black/95 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* Header Bar */}
      <div 
        className="w-full h-16 px-4 sm:px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0">
          <p className="text-white text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md">
            {media.filename || (media.type === 'video' ? 'Video' : media.type === 'pdf' ? 'PDF Document' : 'Media')}
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

      {/* Main Media Container */}
      <div 
        className="flex-1 w-full max-w-5xl px-4 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'image' && (
          <div className="relative max-h-[85vh] max-w-full flex items-center justify-center overflow-auto p-2">
            <img 
              src={media.url} 
              alt={media.filename || 'Full View'} 
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200 cursor-zoom-in"
              onClick={() => setZoom(prev => prev === 1 ? 1.75 : 1)}
            />
          </div>
        )}

        {media.type === 'video' && (
          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
            <video 
              src={effectiveUrl} 
              poster={getVideoThumbnailUrl(media.url) || undefined}
              controls 
              autoPlay 
              playsInline
              preload="auto"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {media.type === 'pdf' && (
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
            <iframe
              src={`${media.url}#toolbar=1`}
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

      {/* Footer Bar */}
      <div className="w-full h-12 flex items-center justify-center text-white/50 text-xs select-none">
        <span>Click outside or press Esc to close</span>
      </div>
    </div>
  );
}
