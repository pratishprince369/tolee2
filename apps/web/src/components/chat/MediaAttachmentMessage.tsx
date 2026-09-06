'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, FileText, FileSpreadsheet, 
  Presentation, Archive, File, Music,
  AlertCircle, RefreshCw, Eye, Image as ImageIcon, ExternalLink,
  Clock, CheckCheck, Video as VideoIcon
} from 'lucide-react';
import { UploadProgressOverlay } from './UploadProgressOverlay';

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'document';

export interface MediaAttachmentInfo {
  url: string;
  kind: MediaKind;
  filename: string;
  extension: string;
  mimeType?: string;
  sizeFormatted?: string;
  caption?: string;
  duration?: number;
  width?: number;
  height?: number;
  isHd?: boolean;
  orientation?: 'portrait' | 'landscape' | 'square';
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatPlayerTime(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function extractVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  isHd: boolean;
  orientation: 'portrait' | 'landscape' | 'square';
}> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.removeAttribute('src');
        video.load();
      };

      video.onloadedmetadata = () => {
        const duration = isFinite(video.duration) ? video.duration : 0;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const isHd = width >= 1280 || height >= 720;
        const ratio = width / (height || 1);
        const orientation = ratio < 0.85 ? 'portrait' : ratio > 1.2 ? 'landscape' : 'square';
        cleanup();
        resolve({ duration, width, height, isHd, orientation });
      };

      video.onerror = () => {
        cleanup();
        resolve({ duration: 0, width: 1280, height: 720, isHd: false, orientation: 'landscape' });
      };

      setTimeout(() => {
        cleanup();
        resolve({ duration: 0, width: 1280, height: 720, isHd: false, orientation: 'landscape' });
      }, 4000);
    } catch {
      resolve({ duration: 0, width: 1280, height: 720, isHd: false, orientation: 'landscape' });
    }
  });
}

export function parseUrlMetadata(url: string): { 
  duration?: number; 
  width?: number; 
  height?: number; 
  isHd?: boolean;
  orientation?: 'portrait' | 'landscape' | 'square';
} {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return {};
    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    
    const d = params.get('d') || params.get('duration');
    const w = params.get('w') || params.get('width');
    const h = params.get('h') || params.get('height');
    const hd = params.get('hd');

    const duration = d ? parseFloat(d) : undefined;
    const width = w ? parseInt(w, 10) : undefined;
    const height = h ? parseInt(h, 10) : undefined;
    const isHd = hd !== null ? (hd === '1' || hd === 'true') : (width && height ? (width >= 1280 || height >= 720) : undefined);
    
    let orientation: 'portrait' | 'landscape' | 'square' | undefined;
    if (width && height) {
      const ratio = width / height;
      orientation = ratio < 0.85 ? 'portrait' : ratio > 1.2 ? 'landscape' : 'square';
    }

    return {
      duration: duration && !isNaN(duration) ? duration : undefined,
      width: width && !isNaN(width) ? width : undefined,
      height: height && !isNaN(height) ? height : undefined,
      isHd,
      orientation
    };
  } catch {
    return {};
  }
}

export function getOptimizedMediaUrl(url: string, width = 720): string {
  if (!url) return '';
  return url;
}

export function getVideoPlaybackUrl(url?: string | null): string {
  if (!url) return '';
  // Convert any legacy HLS .m3u8 URLs to universal direct .mp4 playback
  if (url.includes('.m3u8')) {
    return url.replace('/sp_hd/', '/').replace(/\.m3u8(\?.*)?$/i, '.mp4$1');
  }
  return url;
}

export function getVideoThumbnailUrl(url?: string | null): string {
  if (!url) return '';
  if (url.includes('/video/upload/')) {
    const playbackUrl = getVideoPlaybackUrl(url);
    return playbackUrl
      .replace('/video/upload/', '/video/upload/so_0,q_auto,f_jpg/')
      .replace(/\.[a-zA-Z0-9]+(\?.*)?$/, '.jpg$1');
  }
  return '';
}

/**
 * Comprehensive parser that detects attachment metadata from direct URL, MIME type,
 * file extensions, text-embedded URLs, or legacy bracket syntax `[📎 filename.ext]`.
 */
export function detectMediaInfo(
  mediaUrl?: string | null, 
  text?: string | null, 
  resourceType?: string | null
): MediaAttachmentInfo | null {
  const trimmedText = (text || '').trim();

  // Helper to extract clean caption removing bracket strings like [📎 filename]
  const cleanCaption = (rawText?: string | null): string | undefined => {
    if (!rawText) return undefined;
    const stripped = rawText
      .replace(/\[\s*(?:📎|attachment:?)\s*[^\]]+\]/gi, '')
      .trim();
    return stripped.length > 0 ? stripped : undefined;
  };

  // 1. Direct mediaUrl inspection
  if (mediaUrl) {
    const parsedMeta = parseUrlMetadata(mediaUrl);
    const cleanUrl = mediaUrl.split('?')[0].split('#')[0];
    const rawFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'Attachment';
    const extension = (rawFilename.split('.').pop() || '').toLowerCase();

    // Check by resourceType or extension
    if (resourceType === 'video' || extension.match(/^(mp4|webm|mov|mkv|m4v|3gp)$/i)) {
      return {
        url: mediaUrl,
        kind: 'video',
        filename: rawFilename,
        extension: extension || 'mp4',
        caption: cleanCaption(trimmedText),
        duration: parsedMeta.duration,
        width: parsedMeta.width,
        height: parsedMeta.height,
        isHd: parsedMeta.isHd,
        orientation: parsedMeta.orientation
      };
    }

    if (resourceType === 'audio' || extension.match(/^(mp3|wav|ogg|m4a|aac|flac|wma)$/i)) {
      return {
        url: mediaUrl,
        kind: 'audio',
        filename: rawFilename,
        extension: extension || 'mp3',
        caption: cleanCaption(trimmedText),
        duration: parsedMeta.duration
      };
    }

    if (extension === 'pdf') {
      return {
        url: mediaUrl,
        kind: 'pdf',
        filename: rawFilename,
        extension: 'pdf',
        caption: cleanCaption(trimmedText)
      };
    }

    if (extension.match(/^(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|7z|tar|gz)$/i)) {
      return {
        url: mediaUrl,
        kind: 'document',
        filename: rawFilename,
        extension,
        caption: cleanCaption(trimmedText)
      };
    }

    // Default to image if image resourceType, image extension, or standard upload URL
    if (
      resourceType === 'image' || 
      extension.match(/^(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i) || 
      !extension || 
      mediaUrl.includes('/image/upload/') ||
      mediaUrl.startsWith('blob:') ||
      mediaUrl.startsWith('data:image')
    ) {
      return {
        url: mediaUrl,
        kind: 'image',
        filename: rawFilename,
        extension: extension || 'jpg',
        caption: cleanCaption(trimmedText),
        width: parsedMeta.width,
        height: parsedMeta.height,
        orientation: parsedMeta.orientation
      };
    }

    return {
      url: mediaUrl,
      kind: 'document',
      filename: rawFilename,
      extension: extension || 'bin',
      caption: cleanCaption(trimmedText)
    };
  }

  // 2. Fallback check for URL patterns inside text
  if (trimmedText) {
    const urlMatch = trimmedText.match(/https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mov|pdf|docx?|xlsx?|pptx?|mp3|wav|ogg|m4a|zip)/i);
    if (urlMatch) {
      const detectedUrl = urlMatch[0];
      const remainingText = trimmedText.replace(detectedUrl, '').trim();
      return detectMediaInfo(detectedUrl, remainingText, resourceType);
    }
  }

  // 3. Fallback check for legacy bracket strings: [📎 filename.ext]
  if (trimmedText) {
    const bracketMatch = trimmedText.match(/\[\s*(?:📎|attachment:?)\s*([^\]]+)\]/i);
    if (bracketMatch) {
      const filename = bracketMatch[1].trim();
      const extension = (filename.split('.').pop() || '').toLowerCase();
      const extractedCaption = cleanCaption(trimmedText);

      if (extension.match(/^(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i)) {
        return {
          url: '',
          kind: 'image',
          filename,
          extension: extension || 'jpg',
          caption: extractedCaption
        };
      }

      if (extension.match(/^(mp4|webm|mov|mkv|m4v|3gp)$/i)) {
        return {
          url: '',
          kind: 'video',
          filename,
          extension: extension || 'mp4',
          caption: extractedCaption
        };
      }

      if (extension.match(/^(mp3|wav|ogg|m4a|aac|flac|wma)$/i)) {
        return {
          url: '',
          kind: 'audio',
          filename,
          extension: extension || 'mp3',
          caption: extractedCaption
        };
      }

      if (extension === 'pdf') {
        return {
          url: '',
          kind: 'pdf',
          filename,
          extension: 'pdf',
          caption: extractedCaption
        };
      }

      return {
        url: '',
        kind: 'document',
        filename,
        extension: extension || 'bin',
        caption: extractedCaption
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. IMAGE MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface ImageMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
  onOpenViewer?: (media: { type: 'image'; url: string; filename: string }) => void;
  uploadStatus?: 'preparing' | 'uploading' | 'completed' | 'failed';
  uploadProgress?: number;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
}

export function ImageMessage({
  mediaInfo,
  isMe,
  onOpenViewer,
  uploadStatus,
  uploadProgress = 0,
  onCancelUpload,
  onRetryUpload
}: ImageMessageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [mediaInfo.url]);

  if (hasError) {
    return (
      <div className="w-full max-w-[270px] sm:max-w-[320px] p-3 my-1 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2.5 text-xs font-medium select-none">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 truncate">Image preview unavailable</span>
        <button onClick={() => { setHasError(false); setIsLoaded(false); }} className="p-1 hover:bg-red-500/20 rounded-md">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[360px] my-0 select-none">
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (uploadStatus === 'uploading' || uploadStatus === 'preparing') return;
          if (onOpenViewer && mediaInfo.url) {
            onOpenViewer({
              type: 'image',
              url: mediaInfo.url,
              filename: mediaInfo.filename
            });
          } else if (mediaInfo.url) {
            window.open(mediaInfo.url, '_blank');
          }
        }}
        className="relative group cursor-pointer overflow-hidden rounded-2xl bg-black/5 dark:bg-black/40 flex items-center justify-center min-h-[140px] max-h-[360px] sm:max-h-[400px] transition-transform active:scale-[0.99]"
      >
        {!isLoaded && !uploadStatus && (
          <div className="absolute inset-0 bg-zinc-200/50 dark:bg-zinc-800/60 animate-pulse flex flex-col items-center justify-center gap-2 pointer-events-none z-0">
            <ImageIcon className="w-7 h-7 text-zinc-400/80 animate-pulse" />
          </div>
        )}

        {mediaInfo.url ? (
          <img
            src={mediaInfo.url}
            alt={mediaInfo.filename || 'Photo'}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
            className={`w-full max-h-[340px] sm:max-h-[380px] object-cover rounded-2xl transition-opacity duration-300 relative z-10 ${
              isLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />
        ) : (
          <div className="w-full h-40 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploadStatus && uploadStatus !== 'completed' && (
          <UploadProgressOverlay
            progress={uploadProgress}
            status={uploadStatus}
            onCancel={onCancelUpload}
            onRetry={onRetryUpload}
          />
        )}

        {/* Hover inspect eye */}
        {(!uploadStatus || uploadStatus === 'completed') && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-20">
            <div className="bg-black/60 text-white rounded-full p-2 backdrop-blur-md shadow-md transform group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {mediaInfo.caption && (
        <p className="mt-1.5 px-1 pb-0.5 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
          {mediaInfo.caption}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VIDEO MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface VideoMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
  time?: string;
  isRead?: boolean;
  isTemp?: boolean;
  senderName?: string;
  onOpenViewer?: (media: { 
    type: 'video'; 
    url: string; 
    filename?: string; 
    sender?: string; 
    time?: string; 
    duration?: number;
  }) => void;
  uploadStatus?: 'preparing' | 'uploading' | 'completed' | 'failed';
  uploadProgress?: number;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
}

export function VideoMessage({
  mediaInfo,
  isMe,
  time,
  isRead,
  isTemp,
  senderName,
  onOpenViewer,
  uploadStatus,
  uploadProgress = 0,
  onCancelUpload,
  onRetryUpload
}: VideoMessageProps) {
  const [hasError, setHasError] = useState(false);
  const [videoMeta, setVideoMeta] = useState({
    duration: mediaInfo.duration,
    width: mediaInfo.width,
    height: mediaInfo.height,
    isHd: mediaInfo.isHd,
    orientation: mediaInfo.orientation
  });

  const videoSrc = getVideoPlaybackUrl(mediaInfo.url);
  const posterSrc = getVideoThumbnailUrl(mediaInfo.url);

  // Sync state if mediaInfo changes
  useEffect(() => {
    setVideoMeta({
      duration: mediaInfo.duration,
      width: mediaInfo.width,
      height: mediaInfo.height,
      isHd: mediaInfo.isHd,
      orientation: mediaInfo.orientation
    });
  }, [mediaInfo.duration, mediaInfo.width, mediaInfo.height, mediaInfo.isHd, mediaInfo.orientation]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const dur = isFinite(video.duration) ? video.duration : 0;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const isHd = w >= 1280 || h >= 720;
    const ratio = w / (h || 1);
    const orientation: 'portrait' | 'landscape' | 'square' = ratio < 0.85 ? 'portrait' : ratio > 1.2 ? 'landscape' : 'square';

    setVideoMeta(prev => ({
      duration: prev.duration || dur,
      width: prev.width || w,
      height: prev.height || h,
      isHd: prev.isHd !== undefined ? prev.isHd : isHd,
      orientation: prev.orientation || orientation
    }));
  };

  const orientation = videoMeta.orientation || (videoMeta.width && videoMeta.height ? (videoMeta.width / videoMeta.height < 0.85 ? 'portrait' : videoMeta.width / videoMeta.height > 1.2 ? 'landscape' : 'square') : 'landscape');

  const aspectStyle = orientation === 'portrait'
    ? 'aspect-[9/16] max-w-[240px] sm:max-w-[280px] max-h-[380px]'
    : orientation === 'square'
    ? 'aspect-square max-w-[260px] sm:max-w-[300px]'
    : 'aspect-video max-w-[280px] sm:max-w-[340px]';

  return (
    <div className="w-full my-0.5 select-none">
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (uploadStatus === 'uploading' || uploadStatus === 'preparing') return;
          if (videoSrc && onOpenViewer) {
            onOpenViewer({
              type: 'video',
              url: videoSrc,
              filename: mediaInfo.filename,
              sender: senderName,
              time: time,
              duration: videoMeta.duration
            });
          } else if (videoSrc) {
            window.open(videoSrc, '_blank');
          }
        }}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-zinc-950 border border-black/10 dark:border-white/10 ${aspectStyle} flex items-center justify-center`}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={posterSrc || undefined}
            preload="metadata"
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-cover rounded-2xl pointer-events-none"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Play className="w-8 h-8 text-zinc-500" />
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploadStatus && uploadStatus !== 'completed' ? (
          <UploadProgressOverlay
            progress={uploadProgress}
            status={uploadStatus}
            onCancel={onCancelUpload}
            onRetry={onRetryUpload}
          />
        ) : (
          <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center shadow-xl transition-transform active:scale-95 group-hover:scale-105 border border-white/25">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Bottom gradient shadow for readable text over any video frame */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none rounded-b-2xl z-10" />

        {/* Bottom-left: HD badge + Duration */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-md select-none">
          {videoMeta.isHd && (
            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 bg-amber-400/25 text-amber-300 rounded border border-amber-400/35 leading-none">
              HD
            </span>
          )}
          <Play className="w-2.5 h-2.5 fill-white text-white" />
          <span className="text-[11px] font-semibold tracking-wider font-mono">
            {formatDuration(videoMeta.duration)}
          </span>
        </div>

        {/* Bottom-right: Timestamp inside bubble if no caption */}
        {!mediaInfo.caption && time && (
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-medium shadow-md select-none">
            <span>{time}</span>
            {isMe && (
              isTemp ? (
                <Clock className="w-3 h-3 text-white/70 animate-pulse" />
              ) : (
                <CheckCheck className={`w-3.5 h-3.5 ${isRead ? 'text-sky-300' : 'text-white/80'}`} />
              )
            )}
          </div>
        )}
      </div>

      {mediaInfo.caption && (
        <p className="mt-1.5 px-0.5 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words">
          {mediaInfo.caption}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUDIO MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface AudioMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
}

export function AudioMessage({ mediaInfo, isMe }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mediaInfo.url) {
      const audio = new Audio(mediaInfo.url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [mediaInfo.url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-[270px] sm:max-w-[320px] md:max-w-[340px] my-1 rounded-2xl p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!mediaInfo.url}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0 transition-transform active:scale-95 ${
            isMe 
              ? 'bg-white text-primary hover:bg-white/90 dark:bg-white dark:text-zinc-900' 
              : 'bg-primary text-white hover:bg-primary/95'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeek}
            disabled={!mediaInfo.url}
            className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-teal-400 focus:outline-none"
          />
          <div className={`flex items-center justify-between text-[11px] font-semibold ${
            isMe ? 'text-primary-foreground/90' : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Music className={`w-5 h-5 flex-shrink-0 opacity-60 ${isMe ? 'text-primary-foreground' : 'text-zinc-500'}`} />
      </div>

      {mediaInfo.caption && (
        <p className="mt-2 text-[13px] sm:text-[14px] leading-relaxed select-text whitespace-pre-wrap break-words pt-2 border-t border-black/5 dark:border-white/10">
          {mediaInfo.caption}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DOCUMENT / PDF MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface DocumentMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
  onOpenViewer?: (media: { type: 'pdf' | 'document'; url: string; filename: string }) => void;
}

export function DocumentMessage({ mediaInfo, isMe, onOpenViewer }: DocumentMessageProps) {
  const getDocIcon = (ext: string) => {
    switch (ext) {
      case 'pdf':
        return {
          icon: <FileText className="w-6 h-6 text-red-500" />,
          bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40',
          badge: 'PDF',
          badgeColor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40'
        };
      case 'doc':
      case 'docx':
        return {
          icon: <FileText className="w-6 h-6 text-blue-500" />,
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40',
          badge: 'WORD',
          badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40'
        };
      case 'xls':
      case 'xlsx':
      case 'csv':
        return {
          icon: <FileSpreadsheet className="w-6 h-6 text-emerald-500" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40',
          badge: 'EXCEL',
          badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40'
        };
      case 'ppt':
      case 'pptx':
        return {
          icon: <Presentation className="w-6 h-6 text-amber-500" />,
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40',
          badge: 'PPT',
          badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40'
        };
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return {
          icon: <Archive className="w-6 h-6 text-orange-500" />,
          bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40',
          badge: 'ZIP',
          badgeColor: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40'
        };
      default:
        return {
          icon: <File className="w-6 h-6 text-teal-600 dark:text-teal-400" />,
          bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/40',
          badge: ext.toUpperCase() || 'FILE',
          badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40'
        };
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaInfo.url) return;
    const link = document.createElement('a');
    link.href = mediaInfo.url;
    link.download = mediaInfo.filename || 'document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaInfo.url) return;
    if (mediaInfo.kind === 'pdf' && onOpenViewer) {
      onOpenViewer({
        type: 'pdf',
        url: mediaInfo.url,
        filename: mediaInfo.filename
      });
    } else {
      handleDownload(e);
    }
  };

  const docStyle = getDocIcon(mediaInfo.extension);

  return (
    <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[360px] my-1 rounded-2xl overflow-hidden select-none">
      <div 
        onClick={handleCardClick}
        className={`p-3 rounded-2xl flex items-center justify-between gap-3 border shadow-xs transition-all hover:shadow-md ${mediaInfo.url ? 'cursor-pointer' : 'opacity-90'} ${
          isMe 
            ? 'bg-black/10 dark:bg-white/10 border-white/15 hover:bg-black/15 dark:hover:bg-white/15' 
            : 'bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 hover:border-teal-500/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${docStyle.bg} shadow-xs`}>
            {docStyle.icon}
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-bold truncate leading-tight ${
              isMe ? 'text-primary-foreground' : 'text-gray-900 dark:text-white'
            }`}>
              {mediaInfo.filename}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[4px] ${docStyle.badgeColor}`}>
                {docStyle.badge}
              </span>
              <span className={`text-[10px] font-medium ${
                isMe ? 'text-primary-foreground/75' : 'text-gray-500 dark:text-zinc-400'
              }`}>
                {mediaInfo.sizeFormatted || 'Document'}
              </span>
            </div>
          </div>
        </div>

        {mediaInfo.url && (
          <div className="flex items-center gap-1">
            {mediaInfo.kind === 'pdf' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenViewer) {
                    onOpenViewer({
                      type: 'pdf',
                      url: mediaInfo.url,
                      filename: mediaInfo.filename
                    });
                  } else {
                    window.open(mediaInfo.url, '_blank');
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-teal-50 hover:text-teal-600'
                }`}
                title="Preview PDF"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleDownload}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isMe 
                  ? 'bg-white/20 text-white hover:bg-white/30' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 dark:hover:text-teal-400'
              }`}
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {mediaInfo.caption && (
        <p className="mt-2 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words px-1">
          {mediaInfo.caption}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MEDIA ATTACHMENT MESSAGE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
export interface MediaAttachmentMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
  time?: string;
  isRead?: boolean;
  isTemp?: boolean;
  senderName?: string;
  onOpenMediaViewer?: (media: { 
    type: 'image' | 'video' | 'pdf' | 'document' | 'audio'; 
    url: string; 
    filename?: string;
    sender?: string;
    time?: string;
    duration?: number;
  }) => void;
  uploadStatus?: 'preparing' | 'uploading' | 'completed' | 'failed';
  uploadProgress?: number;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
}

export function MediaAttachmentMessage({
  mediaInfo,
  isMe,
  time,
  isRead,
  isTemp,
  senderName,
  onOpenMediaViewer,
  uploadStatus,
  uploadProgress,
  onCancelUpload,
  onRetryUpload
}: MediaAttachmentMessageProps) {
  if (mediaInfo.kind === 'image') {
    return (
      <ImageMessage
        mediaInfo={mediaInfo}
        isMe={isMe}
        onOpenViewer={onOpenMediaViewer as any}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        onCancelUpload={onCancelUpload}
        onRetryUpload={onRetryUpload}
      />
    );
  }

  if (mediaInfo.kind === 'video') {
    return (
      <VideoMessage
        mediaInfo={mediaInfo}
        isMe={isMe}
        time={time}
        isRead={isRead}
        isTemp={isTemp}
        senderName={senderName}
        onOpenViewer={onOpenMediaViewer as any}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        onCancelUpload={onCancelUpload}
        onRetryUpload={onRetryUpload}
      />
    );
  }

  if (mediaInfo.kind === 'audio') {
    return <AudioMessage mediaInfo={mediaInfo} isMe={isMe} />;
  }

  return (
    <DocumentMessage
      mediaInfo={mediaInfo}
      isMe={isMe}
      onOpenViewer={onOpenMediaViewer as any}
    />
  );
}
