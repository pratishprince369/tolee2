'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Video, FileText, Music, MapPin, User, BarChart2, Calendar, Smile, X } from 'lucide-react';

export type AttachmentOption = 'camera' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll' | 'event' | 'sticker';

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: AttachmentOption) => void;
}

export function AttachmentMenu({ isOpen, onClose, onSelectOption }: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuOptions = [
    {
      id: 'document' as const,
      label: 'Document',
      icon: FileText,
      bgGradient: 'from-blue-500 to-indigo-600 text-white shadow-blue-500/25',
      desc: 'PDF, Word, Excel, PPT, TXT, Zip'
    },
    {
      id: 'image' as const,
      label: 'Photos & Videos',
      icon: ImageIcon,
      bgGradient: 'from-purple-500 to-indigo-600 text-white shadow-purple-500/25',
      desc: 'Gallery photos & videos'
    },
    {
      id: 'camera' as const,
      label: 'Camera',
      icon: Camera,
      bgGradient: 'from-pink-500 to-rose-500 text-white shadow-pink-500/25',
      desc: 'Capture photo / record clip'
    },
    {
      id: 'audio' as const,
      label: 'Audio',
      icon: Music,
      bgGradient: 'from-teal-500 to-emerald-500 text-white shadow-teal-500/25',
      desc: 'Audio files & tracks'
    },
    {
      id: 'contact' as const,
      label: 'Contact',
      icon: User,
      bgGradient: 'from-amber-500 to-orange-500 text-white shadow-amber-500/25',
      desc: 'Share contact card'
    },
    {
      id: 'poll' as const,
      label: 'Poll',
      icon: BarChart2,
      bgGradient: 'from-cyan-500 to-blue-600 text-white shadow-cyan-500/25',
      desc: 'Create group voting poll'
    },
    {
      id: 'event' as const,
      label: 'Event',
      icon: Calendar,
      bgGradient: 'from-violet-500 to-purple-600 text-white shadow-violet-500/25',
      desc: 'Schedule meetup & RSVP'
    },
    {
      id: 'sticker' as const,
      label: 'New Sticker',
      icon: Smile,
      bgGradient: 'from-yellow-400 to-amber-500 text-white shadow-yellow-500/25',
      desc: 'Send fun sticker reaction'
    },
    {
      id: 'location' as const,
      label: 'Location',
      icon: MapPin,
      bgGradient: 'from-emerald-500 to-green-600 text-white shadow-emerald-500/25',
      desc: 'Share current GPS location'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="absolute bottom-[72px] left-3 sm:left-14 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 p-3 sm:p-4 w-[280px] sm:w-[320px] max-w-[calc(100vw-24px)] animate-in fade-in slide-in-from-bottom-3 duration-150 select-none"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/80 px-1">
        <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
          Share Content
        </span>
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {menuOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => {
                onSelectOption(opt.id);
                onClose();
              }}
              className="group flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-zinc-100/90 dark:hover:bg-zinc-800/80 transition-all duration-150 text-left active:scale-[0.98]"
            >
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${opt.bgGradient} flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-primary dark:group-hover:text-teal-400 transition-colors">
                  {opt.label}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
