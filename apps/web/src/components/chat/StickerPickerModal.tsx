'use client';

import React, { useState } from 'react';
import { Smile, Sparkles, Heart, Zap, Flame, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: { url: string; name: string }) => void;
}

export const CURATED_STICKERS = [
  // Reactions
  { id: 'stk-1', category: 'reactions', name: 'Thumbs Up Cool', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces&q=80', emoji: '👍' },
  { id: 'stk-2', category: 'reactions', name: 'Party Popper', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop&q=80', emoji: '🎉' },
  { id: 'stk-3', category: 'reactions', name: 'Fire Energy', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&h=200&fit=crop&q=80', emoji: '🔥' },
  { id: 'stk-4', category: 'reactions', name: 'Mind Blown', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200&h=200&fit=crop&q=80', emoji: '🤯' },
  { id: 'stk-5', category: 'reactions', name: 'Laughing Tears', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80', emoji: '😂' },
  { id: 'stk-6', category: 'reactions', name: 'Clapping Hands', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces&q=80', emoji: '👏' },

  // Love & Friendship
  { id: 'stk-7', category: 'love', name: 'Heart Sparkle', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=200&fit=crop&q=80', emoji: '❤️' },
  { id: 'stk-8', category: 'love', name: 'Hug & Warmth', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=200&h=200&fit=crop&q=80', emoji: '🥰' },
  { id: 'stk-9', category: 'love', name: 'Love You', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&h=200&fit=crop&q=80', emoji: '💖' },
  { id: 'stk-10', category: 'love', name: 'Peace & Love', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=200&fit=crop&q=80', emoji: '✌️' },

  // Celebrations & Greetings
  { id: 'stk-11', category: 'celebration', name: 'Namaste India', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=200&fit=crop&q=80', emoji: '🙏' },
  { id: 'stk-12', category: 'celebration', name: 'Congratulations', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop&q=80', emoji: '🏆' },
  { id: 'stk-13', category: 'celebration', name: 'Good Morning', url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=200&h=200&fit=crop&q=80', emoji: '☀️' },
  { id: 'stk-14', category: 'celebration', name: 'Good Night', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop&q=80', emoji: '🌙' },

  // Energy & Mood
  { id: 'stk-15', category: 'energy', name: '100 Percent', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop&q=80', emoji: '💯' },
  { id: 'stk-16', category: 'energy', name: 'Rock On', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&h=200&fit=crop&q=80', emoji: '🤘' },
  { id: 'stk-17', category: 'energy', name: 'Chai Time', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&h=200&fit=crop&q=80', emoji: '☕' },
  { id: 'stk-18', category: 'energy', name: 'Victory Vibe', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&h=200&fit=crop&q=80', emoji: '✨' },
];

export function StickerPickerModal({ isOpen, onClose, onSelectSticker }: StickerPickerModalProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'reactions' | 'love' | 'celebration' | 'energy'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredStickers = CURATED_STICKERS.filter(s => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.emoji.includes(searchQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <Smile className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">Stickers & Reactions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-4 pt-3 flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          {[
            { id: 'all' as const, label: 'All', icon: Sparkles },
            { id: 'reactions' as const, label: 'Reactions', icon: Flame },
            { id: 'love' as const, label: 'Love', icon: Heart },
            { id: 'celebration' as const, label: 'Celebration', icon: Smile },
            { id: 'energy' as const, label: 'Vibes', icon: Zap },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  activeCategory === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search stickers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
            />
          </div>
        </div>

        {/* Sticker Grid */}
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[360px] flex-1">
          {filteredStickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => {
                onSelectSticker({
                  url: sticker.url,
                  name: sticker.name
                });
                onClose();
              }}
              className="group flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-transform active:scale-95 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform">
                <span role="img" aria-label={sticker.name}>{sticker.emoji}</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-1.5 truncate max-w-full text-center">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
