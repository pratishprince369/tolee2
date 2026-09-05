'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, FileText, FileSpreadsheet, 
  Presentation, Archive, File, Music,
  AlertCircle, RefreshCw, Eye, Image as ImageIcon
} from 'lucide-react';

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'document';

export interface MediaAttachmentInfo {
  url: string;
  kind: MediaKind;
  filename: string;
  extension: string;
  mimeType?: string;
  sizeFormatted?: string;
  caption?: string;
}

/**
 * Returns a clean, direct media URL ensuring validity and cross-browser loading.
 */
export function getOptimizedMediaUrl(url: string, width = 720): string {
  if (!url) return '';
  return url;
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
        caption: cleanCaption(trimmedText)
      };
    }

    if (resourceType === 'audio' || extension.match(/^(mp3|wav|ogg|m4a|aac|flac|wma)$/i)) {
      return {
        url: mediaUrl,
        kind: 'audio',
        filename: rawFilename,
        extension: extension || 'mp3',
        caption: cleanCaption(trimmedText)
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
        caption: cleanCaption(trimmedText)
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

  // 3. Fallback check for legacy bracket strings: [📎 filename.ext] or [ 📎 filename.ext ] or [attachment: filename.ext]
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

interface MediaAttachmentMessageProps {
  mediaInfo: MediaAttachmentInfo;
  isMe: boolean;
  onOpenMediaViewer?: (media: { type: 'image' | 'video'; url: string; filename: string }) => void;
}

export function MediaAttachmentMessage({
  mediaInfo,
  isMe,
  onOpenMediaViewer
}: MediaAttachmentMessageProps) {
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset states when media URL changes
  useEffect(() => {
    setIsImgLoaded(false);
    setHasError(false);
  }, [mediaInfo.url]);

  // --- Audio Player State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mediaInfo.kind === 'audio' && mediaInfo.url) {
      const audio = new Audio(mediaInfo.url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setHasError(true);
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [mediaInfo.url, mediaInfo.kind]);

  const togglePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  const handleSeekAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaInfo.url) return;
    const link = document.createElement('a');
    link.href = mediaInfo.url;
    link.download = mediaInfo.filename || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (hasError) {
    return (
      <div className="w-full max-w-[270px] sm:max-w-[320px] p-3 my-1 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2.5 text-xs font-medium select-none">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 truncate">Unable to load media preview</span>
        {mediaInfo.url && (
          <button 
            onClick={() => { setHasError(false); setIsImgLoaded(false); }} 
            className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // 1. IMAGE MESSAGE (Responsive, Controlled Dimensions, Aspect-Ratio Safe)
  // =========================================================================
  if (mediaInfo.kind === 'image') {
    // If URL is missing (e.g. legacy message with only filename), render a graceful card
    if (!mediaInfo.url) {
      return (
        <div className="w-full max-w-[270px] sm:max-w-[320px] my-1 rounded-2xl p-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-bold truncate leading-tight ${isMe ? 'text-primary-foreground' : 'text-gray-900 dark:text-white'}`}>
                {mediaInfo.filename}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-[4px] bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  PHOTO
                </span>
                <span className={`text-[10px] ${isMe ? 'text-primary-foreground/75' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {mediaInfo.sizeFormatted || 'Photo attachment'}
                </span>
              </div>
            </div>
          </div>
          {mediaInfo.caption && (
            <p className="mt-2 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words">
              {mediaInfo.caption}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[360px] my-0 select-none">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenMediaViewer) {
              onOpenMediaViewer({
                type: 'image',
                url: mediaInfo.url, // Open high-resolution original in viewer modal
                filename: mediaInfo.filename
              });
            } else {
              window.open(mediaInfo.url, '_blank');
            }
          }}
          className="relative group cursor-pointer overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 flex items-center justify-center min-h-[140px] max-h-[360px] sm:max-h-[400px] transition-transform active:scale-[0.99]"
        >
          {/* Skeleton placeholder shown behind image while loading */}
          {!isImgLoaded && (
            <div className="absolute inset-0 bg-zinc-200/50 dark:bg-zinc-800/60 animate-pulse flex flex-col items-center justify-center gap-2 pointer-events-none z-0">
              <ImageIcon className="w-7 h-7 text-zinc-400/80 animate-pulse" />
            </div>
          )}

          <img 
            src={mediaInfo.url} 
            alt={mediaInfo.filename || 'Image'} 
            onLoad={() => setIsImgLoaded(true)}
            onError={() => {
              // If image fails, mark error
              setHasError(true);
            }}
            loading="lazy"
            className={`w-full max-h-[340px] sm:max-h-[380px] object-cover rounded-xl transition-opacity duration-300 relative z-10 ${
              isImgLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-20">
            <div className="bg-black/60 text-white rounded-full p-2 backdrop-blur-md shadow-md transform group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>
        {mediaInfo.caption && (
          <p className="mt-1.5 px-1 pb-0.5 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
            {mediaInfo.caption}
          </p>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. VIDEO MESSAGE
  // =========================================================================
  if (mediaInfo.kind === 'video') {
    return (
      <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[360px] my-0.5 select-none">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (mediaInfo.url && onOpenMediaViewer) {
              onOpenMediaViewer({
                type: 'video',
                url: mediaInfo.url,
                filename: mediaInfo.filename
              });
            } else if (mediaInfo.url) {
              window.open(mediaInfo.url, '_blank');
            }
          }}
          className="relative group cursor-pointer overflow-hidden rounded-xl bg-zinc-950 border border-black/10 dark:border-white/10 aspect-video flex items-center justify-center"
        >
          {mediaInfo.url ? (
            <video 
              src={mediaInfo.url} 
              preload="metadata"
              className="w-full h-full object-cover rounded-xl pointer-events-none"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Play className="w-8 h-8 text-zinc-500" />
            </div>
          )}
          {/* Frosted Glass Play Button Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/30 hover:bg-white/45 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform active:scale-95 border border-white/30">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide uppercase">
            Video
          </div>
        </div>
        {mediaInfo.caption && (
          <p className="mt-1.5 px-0.5 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words">
            {mediaInfo.caption}
          </p>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. AUDIO MESSAGE
  // =========================================================================
  if (mediaInfo.kind === 'audio') {
    return (
      <div className="w-full max-w-[270px] sm:max-w-[320px] md:max-w-[340px] my-1 rounded-2xl p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayAudio}
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
              max={audioDuration || 100} 
              value={currentTime} 
              onChange={handleSeekAudio}
              disabled={!mediaInfo.url}
              className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-teal-400 focus:outline-none"
            />
            <div className={`flex items-center justify-between text-[11px] font-semibold ${
              isMe ? 'text-primary-foreground/90' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(audioDuration)}</span>
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

  // =========================================================================
  // 4. DOCUMENT / PDF MESSAGE CARD
  // =========================================================================
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

  const docStyle = getDocIcon(mediaInfo.extension);

  return (
    <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[360px] my-1 rounded-2xl overflow-hidden select-none">
      <div 
        onClick={handleDownload}
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
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            isMe 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 dark:hover:text-teal-400'
          }`}>
            <Download className="w-4 h-4" />
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
