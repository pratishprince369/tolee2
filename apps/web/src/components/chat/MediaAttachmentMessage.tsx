'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, FileText, FileSpreadsheet, 
  Presentation, Archive, File, Music, ExternalLink,
  AlertCircle, RefreshCw, Eye
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

export function detectMediaInfo(mediaUrl?: string | null, text?: string | null, resourceType?: string | null): MediaAttachmentInfo | null {
  if (!mediaUrl && !text) return null;

  // 1. Direct mediaUrl inspection
  if (mediaUrl) {
    const cleanUrl = mediaUrl.split('?')[0].split('#')[0];
    const rawFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'Attachment';
    const extension = (rawFilename.split('.').pop() || '').toLowerCase();

    // Check by resourceType first if known
    if (resourceType === 'video' || extension.match(/^(mp4|webm|mov|mkv|m4v|3gp)$/)) {
      return {
        url: mediaUrl,
        kind: 'video',
        filename: rawFilename,
        extension,
        caption: text && !text.startsWith('[📎') ? text : undefined
      };
    }

    if (resourceType === 'audio' || extension.match(/^(mp3|wav|ogg|m4a|aac|flac|wma)$/)) {
      return {
        url: mediaUrl,
        kind: 'audio',
        filename: rawFilename,
        extension,
        caption: text && !text.startsWith('[📎') ? text : undefined
      };
    }

    if (extension === 'pdf') {
      return {
        url: mediaUrl,
        kind: 'pdf',
        filename: rawFilename,
        extension: 'pdf',
        caption: text && !text.startsWith('[📎') ? text : undefined
      };
    }

    if (extension.match(/^(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|7z|tar|gz)$/)) {
      return {
        url: mediaUrl,
        kind: 'document',
        filename: rawFilename,
        extension,
        caption: text && !text.startsWith('[📎') ? text : undefined
      };
    }

    // Default to image if image extension or image resourceType or standard URL
    if (resourceType === 'image' || extension.match(/^(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/) || !extension) {
      return {
        url: mediaUrl,
        kind: 'image',
        filename: rawFilename,
        extension: extension || 'jpg',
        caption: text && !text.startsWith('[📎') ? text : undefined
      };
    }

    return {
      url: mediaUrl,
      kind: 'document',
      filename: rawFilename,
      extension,
      caption: text && !text.startsWith('[📎') ? text : undefined
    };
  }

  // 2. Fallback check for URL patterns inside text
  if (text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|pdf|docx?|xlsx?|pptx?|mp3|wav|ogg|m4a|zip)/i);
    if (urlMatch) {
      const detectedUrl = urlMatch[0];
      return detectMediaInfo(detectedUrl, text.replace(detectedUrl, '').trim(), resourceType);
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

  // --- Audio Player State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mediaInfo.kind === 'audio') {
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
      <div className="p-3 my-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2.5 text-xs font-medium select-none">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 truncate">Unable to load media attachment</span>
        <button 
          onClick={() => { setHasError(false); }} 
          className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 1. IMAGE MESSAGE
  if (mediaInfo.kind === 'image') {
    return (
      <div className="w-full my-0.5 overflow-hidden rounded-xl">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenMediaViewer) {
              onOpenMediaViewer({
                type: 'image',
                url: mediaInfo.url,
                filename: mediaInfo.filename
              });
            } else {
              window.open(mediaInfo.url, '_blank');
            }
          }}
          className="relative group cursor-pointer overflow-hidden rounded-xl bg-zinc-950/20 dark:bg-black/40 border border-black/5 dark:border-white/10"
        >
          {!isImgLoaded && (
            <div className="h-48 sm:h-64 w-full bg-zinc-200/50 dark:bg-zinc-800/60 animate-pulse flex items-center justify-center">
              <span className="text-xs text-zinc-400 font-medium">Loading image...</span>
            </div>
          )}
          <img 
            src={mediaInfo.url} 
            alt={mediaInfo.filename} 
            onLoad={() => setIsImgLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
            className={`w-full max-h-[360px] sm:max-h-[420px] object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.01] ${!isImgLoaded ? 'hidden' : 'block'}`}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <div className="bg-black/60 text-white rounded-full p-2 backdrop-blur-md shadow-md">
              <Eye className="w-5 h-5" />
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

  // 2. VIDEO MESSAGE
  if (mediaInfo.kind === 'video') {
    return (
      <div className="w-full my-0.5 overflow-hidden rounded-xl">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenMediaViewer) {
              onOpenMediaViewer({
                type: 'video',
                url: mediaInfo.url,
                filename: mediaInfo.filename
              });
            }
          }}
          className="relative group cursor-pointer overflow-hidden rounded-xl bg-zinc-950 border border-black/10 dark:border-white/10 aspect-video flex items-center justify-center"
        >
          <video 
            src={mediaInfo.url} 
            preload="metadata"
            className="w-full h-full object-cover rounded-xl pointer-events-none"
            onError={() => setHasError(true)}
          />
          {/* Frosted Glass Play Button Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-13 h-13 rounded-full bg-white/30 hover:bg-white/45 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform active:scale-95 border border-white/30">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide uppercase">
            Video
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

  // 3. AUDIO MESSAGE
  if (mediaInfo.kind === 'audio') {
    return (
      <div className="w-full my-1 rounded-2xl p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayAudio}
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

  // 4. DOCUMENT / PDF MESSAGE CARD
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
    <div className="w-full my-1 rounded-2xl overflow-hidden select-none">
      <div 
        onClick={handleDownload}
        className={`p-3 rounded-2xl flex items-center justify-between gap-3 border shadow-xs transition-all hover:shadow-md cursor-pointer ${
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

        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isMe 
            ? 'bg-white/20 text-white hover:bg-white/30' 
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 dark:hover:text-teal-400'
        }`}>
          <Download className="w-4 h-4" />
        </div>
      </div>

      {mediaInfo.caption && (
        <p className="mt-2 text-[14px] sm:text-[15px] leading-relaxed select-text whitespace-pre-wrap break-words px-1">
          {mediaInfo.caption}
        </p>
      )}
    </div>
  );
}
