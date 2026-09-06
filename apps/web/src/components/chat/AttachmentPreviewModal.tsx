'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Plus, Trash2, Play, Pause, FileText, 
  FileSpreadsheet, Presentation, Archive, File, Music, 
  RefreshCw, Image as ImageIcon, Video as VideoIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDuration } from './MediaAttachmentMessage';

export interface PendingAttachmentItem {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'document';
  name: string;
  sizeFormatted: string;
  caption?: string;
  duration?: number;
  width?: number;
  height?: number;
  isHd?: boolean;
  orientation?: 'portrait' | 'landscape' | 'square';
}

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  items: PendingAttachmentItem[];
  onClose: () => void;
  onSend: (itemsWithCaptions: PendingAttachmentItem[]) => void;
  onRemoveItem: (id: string) => void;
  onAddMore: () => void;
  onReplaceItem: (id: string) => void;
}

export function AttachmentPreviewModal({
  isOpen,
  items,
  onClose,
  onSend,
  onRemoveItem,
  onAddMore,
  onReplaceItem
}: AttachmentPreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const activeItem = items[activeIndex] || items[0];
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize index when items change
  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, activeIndex]);

  // Focus caption input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeIndex]);

  // Keybindings (Esc closes, Enter on single line sends)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || items.length === 0 || !activeItem) return null;

  const handleCaptionChange = (val: string) => {
    setCaptions(prev => ({
      ...prev,
      [activeItem.id]: val
    }));
  };

  const handleSendAll = () => {
    const finalized = items.map(item => ({
      ...item,
      caption: captions[item.id] !== undefined ? captions[item.id] : item.caption || ''
    }));
    onSend(finalized);
  };

  const getDocIcon = (filename: string, kind: string) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf' || kind === 'pdf') {
      return { icon: <FileText className="w-10 h-10 text-red-500" />, badge: 'PDF', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { icon: <FileText className="w-10 h-10 text-blue-500" />, badge: 'WORD', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { icon: <FileSpreadsheet className="w-10 h-10 text-emerald-500" />, badge: 'EXCEL', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return { icon: <Presentation className="w-10 h-10 text-amber-500" />, badge: 'PPT', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { icon: <Archive className="w-10 h-10 text-orange-500" />, badge: 'ZIP', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
    }
    return { icon: <File className="w-10 h-10 text-teal-400" />, badge: ext.toUpperCase() || 'FILE', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
  };

  return (
    <div 
      className="fixed inset-0 z-[150] h-[100dvh] max-h-[100dvh] w-full bg-black/95 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ── Header ── */}
      <div 
        className="shrink-0 w-full h-14 sm:h-16 px-4 sm:px-6 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-bold truncate max-w-[180px] sm:max-w-md">
              {activeItem.name}
            </span>
            <span className="text-white/60 text-xs">
              {activeItem.kind.toUpperCase()} • {activeItem.sizeFormatted}
              {activeItem.kind === 'video' && activeItem.duration ? ` • ${formatDuration(activeItem.duration)}` : ''}
              {items.length > 1 ? ` (${activeIndex + 1}/${items.length})` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReplaceItem(activeItem.id)}
            className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            title="Replace file"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveItem(activeItem.id)}
            className="h-9 w-9 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Main Preview Area (Flex constrained for all mobile screen heights) ── */}
      <div 
        className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-3 sm:px-6 flex items-center justify-center overflow-hidden py-1 sm:py-2"
        onClick={e => e.stopPropagation()}
      >
        {activeItem.kind === 'image' && (
          <div className="relative max-h-[42dvh] sm:max-h-[60vh] max-w-full flex items-center justify-center">
            <img 
              src={activeItem.previewUrl} 
              alt={activeItem.name}
              className="max-h-[40dvh] sm:max-h-[58vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        )}

        {activeItem.kind === 'video' && (
          <div className="w-full max-w-2xl max-h-[42dvh] sm:max-h-[55dvh] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
            <video 
              src={activeItem.previewUrl} 
              controls 
              playsInline
              preload="auto"
              className="w-full h-full max-h-[42dvh] sm:max-h-[55dvh] object-contain"
            />
          </div>
        )}

        {activeItem.kind === 'audio' && (
          <div className="w-full max-w-md p-4 sm:p-6 bg-zinc-900/90 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-3 sm:gap-4 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
              <Music className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <p className="text-white font-bold text-sm truncate max-w-xs">{activeItem.name}</p>
              <p className="text-zinc-400 text-xs mt-0.5">{activeItem.sizeFormatted}</p>
            </div>
            <audio 
              src={activeItem.previewUrl} 
              controls 
              className="w-full mt-1 sm:mt-2" 
            />
          </div>
        )}

        {(activeItem.kind === 'document' || activeItem.kind === 'pdf') && (
          <div className="w-full max-w-md p-4 sm:p-6 bg-zinc-900/90 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-3 sm:gap-4 text-center">
            {(() => {
              const docStyle = getDocIcon(activeItem.name, activeItem.kind);
              return (
                <>
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border ${docStyle.color} shadow-md`}>
                    {docStyle.icon}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-white font-bold text-sm sm:text-base truncate px-4">{activeItem.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${docStyle.color}`}>
                        {docStyle.badge}
                      </span>
                      <span className="text-zinc-400 text-xs font-medium">
                        {activeItem.sizeFormatted}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Bottom Strip: Multi-file carousel + Caption Input + Send Button ── */}
      <div 
        className="shrink-0 w-full max-w-4xl mx-auto px-3 sm:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-1 flex flex-col gap-2.5 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Multi-Item Thumbnails Carousel Strip (shown when multiple items or add mode) */}
        {items.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {items.map((item, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative group h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${
                    isCurrent 
                      ? 'border-emerald-400 ring-2 ring-emerald-400/40 scale-105' 
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  {item.kind === 'image' ? (
                    <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : item.kind === 'video' ? (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white">
                      <VideoIcon className="w-5 h-5 text-red-400" />
                    </div>
                  ) : item.kind === 'audio' ? (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-teal-400">
                      <Music className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center truncate px-0.5">
                    {item.kind.toUpperCase()}
                  </span>
                </button>
              );
            })}

            {/* Add more button */}
            <button
              onClick={onAddMore}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 border-dashed border-white/30 hover:border-emerald-400/80 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-white/70 hover:text-emerald-400 transition-all flex-shrink-0"
              title="Add another attachment"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5">Add</span>
            </button>
          </div>
        )}

        {/* Caption Input & Send Action */}
        <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-full p-1.5 shadow-2xl ring-1 ring-white/10">
          <input
            ref={inputRef}
            type="text"
            value={captions[activeItem.id] !== undefined ? captions[activeItem.id] : activeItem.caption || ''}
            onChange={e => handleCaptionChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendAll();
              }
            }}
            placeholder="Add a caption..."
            className="flex-1 bg-transparent border-none text-white text-sm sm:text-base px-4 py-2 placeholder:text-zinc-500 focus:outline-none"
          />

          <Button
            onClick={handleSendAll}
            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg active:scale-95 flex items-center justify-center flex-shrink-0 p-0 transition-transform"
            title="Send attachment"
          >
            <Send className="w-5 h-5 ml-0.5 stroke-[2.2]" />
          </Button>
        </div>
      </div>
    </div>
  );
}
