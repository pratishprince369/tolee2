'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Eye, 
  Users, 
  Heart, 
  Flame, 
  Sparkles, 
  Share2, 
  Tv, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Maximize2 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveStreamPostCardProps {
  post: any;
  currentUserId?: string;
}

export function LiveStreamPostCard({ post, currentUserId }: LiveStreamPostCardProps) {
  const [likesCount, setLikesCount] = useState(post._count?.likes || 12);
  const [hasLiked, setHasLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  const roomCode = post.mediaUrls || `live-${post.id}`;
  const isHost = currentUserId && post.authorId === currentUserId;
  const viewerCount = post.liveViewerCount || 28;

  const handleQuickLike = () => {
    if (!hasLiked) {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1200);
    }
  };

  return (
    <div className="bg-[#0b1220] border border-red-900/30 hover:border-red-600/50 rounded-3xl overflow-hidden shadow-xl transition-all mb-4 relative">
      
      {/* Top Live Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#120a1c] to-[#0b1220] p-3.5 sm:p-4 border-b border-red-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-red-500/80">
            <AvatarImage src={post.author?.image || ''} />
            <AvatarFallback className="bg-red-950 text-red-300 font-bold">
              {post.author?.name?.[0] || 'L'}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">
                {post.author?.name || 'Live Broadcaster'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {post.location || 'Tolee Live Studio'} • Streaming now
            </span>
          </div>
        </div>

        {/* Live Viewer Counter */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-red-800/50 text-red-300 font-bold text-xs">
          <Eye className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>{viewerCount} watching</span>
        </div>
      </div>

      {/* Post Caption */}
      {post.caption && (
        <div className="px-4 py-2.5 text-xs text-gray-200 font-medium leading-relaxed">
          {post.caption}
        </div>
      )}

      {/* Live Stream View Canvas Preview */}
      <div className="relative aspect-video w-full bg-[#050912] overflow-hidden flex items-center justify-center group cursor-pointer">
        
        {/* Subtle Animated Live Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />

        {/* Live Center Action */}
        <div className="relative z-10 flex flex-col items-center gap-3 text-center p-4">
          <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform ring-4 ring-red-500/30 animate-pulse">
            <Radio className="w-8 h-8" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base block">
              Join Live Broadcast &amp; Webinar
            </span>
            <span className="text-xs text-gray-400">
              Multi-Host News Media Split-Screen with Live Q&amp;A
            </span>
          </div>
        </div>

        {/* Quick Floating Heart on Tap */}
        {showHeartAnim && (
          <div className="absolute z-20 text-5xl animate-ping text-rose-500">
            ❤️
          </div>
        )}

        {/* Direct Link to Live Room */}
        <Link
          href={`/live/broadcast/${roomCode}`}
          className="absolute inset-0 z-10"
        />

      </div>

      {/* Bottom Engagement Bar */}
      <div className="p-3.5 bg-[#080e1a] border-t border-[#142036] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-125 ${
              hasLiked
                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                : 'bg-[#0f172a] border-[#1e293b] text-gray-400 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <Link
            href={`/live/broadcast/${roomCode}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-gray-400 hover:text-white text-xs font-bold"
          >
            <span>💬 Live Chat</span>
          </Link>
        </div>

        <Link
          href={`/live/broadcast/${roomCode}`}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-red-950/60 active:scale-95 transition-all"
        >
          <span>{isHost ? 'Studio Controls' : 'Watch Live'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
