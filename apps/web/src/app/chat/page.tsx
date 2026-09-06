'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  fetchRealChatData, 
  sendRealChatMessage, 
  markChatNotificationsAsRead, 
  respondToChatRequest, 
  fetchChatMessages, 
  markChatMessagesAsRead,
  updateUserPresence,
  fetchUserActiveStories,
  fetchGroupChatDetails,
  deleteChatMessage,
  getOrCreatePersonalChat
} from '@/actions/chat';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { StoryViewer } from '@/components/StoryViewer';
import { io, Socket } from 'socket.io-client';
import { 
  Search, MoreVertical, Phone, Video, Paperclip, Smile, Send, Check, CheckCheck, 
  EyeOff, Users, ShieldCheck, PlusCircle, MessageCircle, ChevronLeft, X, 
  Image as ImageIcon, AlertCircle, BellOff, LogOut, Clock, Copy, Reply, Trash2, ArrowRight, Layers,
  PhoneOff, VideoOff, Play, Pin, Clapperboard, Newspaper, MapPin, Music, FileText, Download, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";

import { 
  MediaAttachmentMessage, 
  detectMediaInfo, 
  MediaAttachmentInfo 
} from '@/components/chat/MediaAttachmentMessage';
import { MediaViewerModal } from '@/components/chat/MediaViewerModal';
import { AttachmentMenu } from '@/components/chat/AttachmentMenu';
import { AttachmentPreviewModal, PendingAttachmentItem } from '@/components/chat/AttachmentPreviewModal';
import { uploadFile } from '@/lib/upload';

import { 
  getUserPromotionPreferences, 
  incrementShootClick 
} from '@/actions/shoot';
import { getCallLogs, deleteCallLog } from '@/actions/calls';
import { CallInterface } from '@/components/CallInterface';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper to merge polled messages without overwriting loaded scroll history or duplicating optimistic/socket items
function mergePollMessages(oldMsgs: any[] = [], pollMsgs: any[] = []) {
  if (oldMsgs.length === 0) return pollMsgs;
  if (pollMsgs.length === 0) return oldMsgs;

  const merged = [...oldMsgs];

  for (const newMsg of pollMsgs) {
    // 1. Direct ID match
    const existingIndex = merged.findIndex(m => m.id === newMsg.id);
    if (existingIndex > -1) {
      merged[existingIndex] = { ...merged[existingIndex], ...newMsg };
      continue;
    }

    // 2. Temp / ephemeral ID match (for optimistic sender items or socket ephemeral IDs)
    const tempIndex = merged.findIndex(m => {
      const isTemp = m.id.startsWith('temp-') || m.id.startsWith('msg-');
      if (!isTemp) return false;
      const isSameSender = m.isMe || m.senderId === newMsg.senderId;
      if (!isSameSender) return false;
      if (newMsg.mediaUrl || m.mediaUrl) {
        return m.mediaUrl === newMsg.mediaUrl;
      }
      return m.text === newMsg.text;
    });
    if (tempIndex > -1) {
      merged[tempIndex] = { ...merged[tempIndex], ...newMsg };
      continue;
    }

    // 3. Sender + Text/Media + Timestamp match (to deduplicate any socket ephemeral IDs vs database IDs)
    const fuzzyIndex = merged.findIndex(m => {
      if (newMsg.mediaUrl || m.mediaUrl) {
        if (m.mediaUrl !== newMsg.mediaUrl) return false;
      } else {
        if (m.text !== newMsg.text) return false;
      }
      const isSameSender = m.senderId === newMsg.senderId || (m.isMe && newMsg.isMe);
      if (!isSameSender) return false;

      const t1 = new Date(m.createdAt || m.time || 0).getTime();
      const t2 = new Date(newMsg.createdAt || newMsg.time || 0).getTime();
      if (!isNaN(t1) && !isNaN(t2) && t1 > 0 && t2 > 0) {
        return Math.abs(t1 - t2) < 30000;
      }
      return m.time === newMsg.time;
    });

    if (fuzzyIndex > -1) {
      merged[fuzzyIndex] = { ...merged[fuzzyIndex], ...newMsg };
    } else {
      merged.push(newMsg);
    }
  }
  return merged;
}

const formatLastMessage = (msgText: string) => {
  if (!msgText) return 'No messages yet.';
  
  // 1. Check for shared content JSON payload
  const prefixMatch = msgText.match(/^([^:]+):\s*__SHARED_CONTENT__:(.*)$/);
  const isPlainShared = msgText.startsWith('__SHARED_CONTENT___') || msgText.startsWith('__SHARED_CONTENT__:');
  
  if (prefixMatch || isPlainShared) {
    try {
      const jsonStr = prefixMatch ? prefixMatch[2] : msgText.substring(19);
      const sender = prefixMatch ? `${prefixMatch[1]}: ` : '';
      const payload = JSON.parse(jsonStr);
      if (payload.type === 'shared_video' || payload.type === 'video') {
        return `${sender}🎥 Video`;
      }
      if (payload.type === 'shared_post' || payload.type === 'post') {
        return `${sender}📷 Photo`;
      }
      if (payload.type === 'shared_reel' || payload.type === 'reel') {
        return `${sender}🎬 Shared Reel`;
      }
      if (payload.type === 'shared_news' || payload.type === 'news') {
        return `${sender}📰 Shared News`;
      }
      if (payload.type === 'shared_product' || payload.type === 'product') {
        return `${sender}🛍 Shared Product`;
      }
      if (payload.type === 'location' || payload.type === 'shared_location') {
        return `${sender}📍 Location`;
      }
      return `${sender}🔗 Shared Content`;
    } catch (e) {
      // Fallback
    }
  }

  // 2. Extract sender prefix if present (e.g. "Amit:\nHello everyone" or "Amit: Hello")
  const senderMatch = msgText.match(/^([^:]+):\s*([\s\S]*)$/);
  const sender = senderMatch ? `${senderMatch[1]}: ` : '';
  const body = senderMatch ? senderMatch[2].trim() : msgText.trim();

  // 3. Check call logs
  if (body.includes('[CALL_LOG]:')) {
    return `${sender}📞 Call Log`;
  }

  // 4. Check attachment strings [📎 filename]
  if (body.includes('[📎') || body.includes('📎')) {
    const lowerBody = body.toLowerCase();
    if (lowerBody.endsWith('.pdf]') || lowerBody.endsWith('.pdf')) {
      return `${sender}📄 PDF`;
    }
    if (lowerBody.endsWith('.mp3]') || lowerBody.endsWith('.mp3') ||
        lowerBody.endsWith('.wav]') || lowerBody.endsWith('.wav') ||
        lowerBody.endsWith('.ogg]') || lowerBody.endsWith('.ogg') ||
        lowerBody.endsWith('.m4a]') || lowerBody.endsWith('.m4a')) {
      return `${sender}🎵 Audio`;
    }
    if (lowerBody.endsWith('.mp4]') || lowerBody.endsWith('.mp4') ||
        lowerBody.endsWith('.webm]') || lowerBody.endsWith('.webm') ||
        lowerBody.endsWith('.mov]') || lowerBody.endsWith('.mov')) {
      return `${sender}🎥 Video`;
    }
    if (lowerBody.endsWith('.jpg]') || lowerBody.endsWith('.jpg') ||
        lowerBody.endsWith('.png]') || lowerBody.endsWith('.png') ||
        lowerBody.endsWith('.gif]') || lowerBody.endsWith('.gif') ||
        lowerBody.endsWith('.jpeg]') || lowerBody.endsWith('.jpeg')) {
      return `${sender}📷 Photo`;
    }
    return `${sender}📄 Document`;
  }

  // 5. Check stickers or reactions
  if (body.includes('[sticker]') || body.includes('[Sticker]')) {
    return `${sender}😊 Sticker`;
  }
  if (body.includes('[reaction]') || body.includes('[Reaction]')) {
    return `${sender}👍 Reaction`;
  }

  // If it's a single emoji or starts with a reaction emoji, it could be a reaction
  const singleEmojiPattern = /^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]$/;
  if (singleEmojiPattern.test(body)) {
    return `${sender}👍 Reaction`;
  }

  return msgText;
};

// WhatsApp-style date formatter for group separators
function formatMessageDateSeparator(dateVal: string | Date) {
  const date = new Date(dateVal);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

interface SharedContentCardProps {
  payload: {
    type: string;
    videoId: string;
    creatorId: string;
    creatorName: string;
    creatorUsername: string;
    creatorAvatar: string;
    thumbnailUrl: string;
    title: string;
    caption: string;
    likesCount: number;
    viewsCount: number;
    shareUrl: string;
    contentType?: string;
    deepLink?: string;
    newsCategory?: string;
    newsReadingTime?: number;
    newsPublisher?: string;
    listingPrice?: number;
    listingLocation?: string;
    mediaCount?: number;
  };
}

function SharedContentCard({ payload }: SharedContentCardProps) {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);

  const contentType = payload.contentType || (() => {
    if (payload.shareUrl) {
      if (payload.shareUrl.includes('/screen/watch/')) return 'screen';
      if (payload.shareUrl.includes('/news/')) return 'news';
      if (payload.shareUrl.includes('/reels')) return 'reel';
      if (payload.shareUrl.includes('/marketplace/listing/')) return 'marketplace';
    }
    return 'feed';
  })();

  useEffect(() => {
    let active = true;
    if (payload.videoId) {
      fetch(`/api/post/check-availability?videoId=${payload.videoId}`)
        .then(r => r.json())
        .then((res) => {
          if (active) {
            setAvailable(res.success ? res.available : true);
          }
        })
        .catch(() => {
          if (active) {
            setAvailable(true);
          }
        });
    } else {
      setAvailable(true);
    }
    return () => {
      active = false;
    };
  }, [payload.videoId]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (available === false) return;

    if (payload.deepLink) {
      router.push(payload.deepLink);
      return;
    }

    if (contentType === 'reel') {
      // Deep-link directly to the exact reel — no generic timeline
      router.push(`/reel/${payload.videoId}`);
    } else if (contentType === 'screen') {
      router.push(`/screen/watch/${payload.videoId}`);
    } else if (contentType === 'news') {
      router.push(`/news/${payload.videoId}`);
    } else if (contentType === 'marketplace') {
      router.push(`/marketplace/listing/${payload.videoId}`);
    } else {
      // Deep-link directly to the exact post — no feed scrolling
      router.push(`/post/${payload.videoId}`);
    }
  };

  if (available === null) {
    return (
      <div className="w-64 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 p-3.5 space-y-3 animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="aspect-video w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="w-3/4 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  if (available === false) {
    return (
      <div className="w-64 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/85 p-5 text-center select-none shadow-sm">
        <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-500 mb-2.5" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">This content is no longer available.</p>
      </div>
    );
  }

  const isVideo = payload.type === 'shared_video' || contentType === 'reel' || contentType === 'screen';

  const renderMedia = () => {
    if (contentType === 'reel') {
      return (
        <div className="relative aspect-[3/4] w-full bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
          {payload.thumbnailUrl ? (
            <img 
              src={payload.thumbnailUrl} 
              alt="Shared Reel" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Clapperboard className="w-8 h-8 text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/25 hover:bg-white/35 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md border border-white/20">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
          {payload.thumbnailUrl ? (
            <img 
              src={payload.thumbnailUrl} 
              alt="Shared Video" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Play className="w-8 h-8 text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md border border-white/10">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative aspect-[4/3] w-full bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
        {payload.thumbnailUrl ? (
          <img 
            src={payload.thumbnailUrl} 
            alt="Shared Post" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-700" />
          </div>
        )}
        {payload.mediaCount && payload.mediaCount > 1 ? (
          <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1 shadow-md border border-white/10">
            <Layers className="w-3 h-3 text-white" />
            <span>+{payload.mediaCount - 1} Photos</span>
          </div>
        ) : null}
      </div>
    );
  };

  const renderFooter = () => {
    if (contentType === 'news') {
      return (
        <div className="p-3 space-y-1.5 bg-white dark:bg-zinc-950">
          {payload.newsCategory && (
            <span className="inline-block text-[9px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-[4px] select-none">
              {payload.newsCategory}
            </span>
          )}
          <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 select-text">
            {payload.title}
          </p>
          {payload.caption && payload.caption !== payload.title && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-1 truncate select-text">
              {payload.caption}
            </p>
          )}
          <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-500 font-bold pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <span>{payload.newsPublisher || 'Tolee News'}</span>
            <span>⏱️ {payload.newsReadingTime || 1} min read</span>
          </div>
        </div>
      );
    }

    if (contentType === 'marketplace') {
      return (
        <div className="p-3 space-y-1.5 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-1 truncate select-text">
              {payload.title}
            </p>
            <span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400 shrink-0">
              {payload.listingPrice ? `₹${payload.listingPrice.toLocaleString('en-IN')}` : 'Free'}
            </span>
          </div>
          {payload.caption && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2 select-text">
              {payload.caption}
            </p>
          )}
          {payload.listingLocation && (
            <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-bold pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <MapPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">{payload.listingLocation}</span>
            </div>
          )}
        </div>
      );
    }

    if (contentType === 'requirement') {
      return (
        <div className="p-3 space-y-2 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wide select-none">
            <Pin className="w-3.5 h-3.5 rotate-45 shrink-0" />
            <span>Local Requirement</span>
          </div>
          <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-3 select-text">
            {payload.caption || payload.title}
          </p>
          <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-500 font-bold pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <span>Active Need</span>
            <span>📍 Tolee Feed</span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 space-y-2 bg-white dark:bg-zinc-950">
        <div className="space-y-1">
          <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 select-text">
            {payload.title}
          </p>
          {payload.caption && payload.caption !== payload.title && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2 select-text">
              {payload.caption}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <span className="flex items-center gap-0.5">❤️ {payload.likesCount || '0'}</span>
          <span className="flex items-center gap-0.5">👁️ {payload.viewsCount || '0'}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      onClick={handleCardClick}
      className="w-64 bg-white dark:bg-zinc-950 hover:shadow-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-xs cursor-pointer overflow-hidden transition-all duration-200 select-none group"
    >
      {/* Header */}
      <div className="p-2.5 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30">
        <Avatar className="w-6 h-6 border border-zinc-200/50 dark:border-zinc-800">
          <AvatarImage src={payload.creatorAvatar} />
          <AvatarFallback className="text-[9px] bg-zinc-200 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 font-black">
            {payload.creatorName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">
            {payload.creatorName}
          </p>
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
            @{payload.creatorUsername}
          </p>
        </div>
        {contentType === 'reel' && (
          <span className="text-[9px] font-black tracking-wider uppercase bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none shrink-0">
            <Clapperboard className="w-2.5 h-2.5" /> Reel
          </span>
        )}
        {contentType === 'news' && (
          <span className="text-[9px] font-black tracking-wider uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none shrink-0">
            <Newspaper className="w-2.5 h-2.5" /> News
          </span>
        )}
        {contentType === 'requirement' && (
          <span className="text-[9px] font-black tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none shrink-0">
            <Pin className="w-2.5 h-2.5 rotate-45" /> Need
          </span>
        )}
        {contentType === 'marketplace' && (
          <span className="text-[9px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-500 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none shrink-0">
            Shop
          </span>
        )}
      </div>

      {/* Media Preview Component */}
      {renderMedia()}

      {/* Footer Content */}
      {renderFooter()}
    </div>
  );
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- State & Ref Declarations ---
  const currentUserId = (session?.user as any)?.id;
  const activeChatRef = useRef('');
  
  const [activeChat, setActiveChat] = useState<string>('');
  
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const [nonMemberGroup, setNonMemberGroup] = useState<any | null>(null);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const queryTab = searchParams?.get('tab') || 'groups';
  const [activeSidebarTab, setActiveSidebarTab] = useState<'groups' | 'personal'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [promoPrefs, setPromoPrefs] = useState<{ receivePromotions: boolean; isMuted: boolean }>({
    receivePromotions: true,
    isMuted: false
  });

  const [chats, setChats] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [mutedChatIds, setMutedChatIds] = useState<string[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, any[]>>({});
  const isSendingRef = useRef<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  // --- Left Panel Independent Scroll Viewports & Pagination Limit ---
  const groupsScrollRef = useRef<HTMLDivElement>(null);
  const personalScrollRef = useRef<HTMLDivElement>(null);
  const [visibleChatsLimit, setVisibleChatsLimit] = useState(30);

  // Reset pagination limit on search or tab change
  useEffect(() => {
    setVisibleChatsLimit(30);
  }, [searchQuery, activeSidebarTab]);

  // --- Scrolling, Infinite Scroll & New Message Badge States & Refs ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState<Record<string, boolean>>({});

  const prevMessagesLength = useRef(0);
  const prevActiveChat = useRef('');

  // --- In-Chat Message Search States ---
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0);

  // --- WhatsApp-Style Attachment & Media States ---
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const replacingItemIdRef = useRef<string | null>(null);
  const uploadAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // --- Fullscreen Media Viewer Modal State ---
  const [activeMediaViewer, setActiveMediaViewer] = useState<{
    type: 'image' | 'video' | 'pdf' | 'document' | 'audio';
    url: string;
    filename?: string;
    sender?: string;
  } | null>(null);

  // --- Emoji Picker ---
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // --- Group Info Panel ---
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any | null>(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);

  // --- Calling & Call History Dialog States ───
  const [showCallLogsModal, setShowCallLogsModal] = useState(false);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

  // --- Story/Status Viewer States ---
  const [activeStoryUser, setActiveStoryUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [selectedStorySlideId, setSelectedStorySlideId] = useState<string | null>(null);

  // --- Custom Context Menu ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: any } | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Sync Redirection & Query Parameters ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const queryChatId = searchParams?.get('chatId') || searchParams?.get('id') || '';
  const queryToleeId = searchParams?.get('toleeId') || '';

  // Synchronize activeChat with query parameters
  useEffect(() => {
    if (chats.length === 0) return;

    if (queryToleeId) {
      const matchedChat = chats.find(c => c.toleeId === queryToleeId);
      if (matchedChat) {
        if (activeChat !== matchedChat.id) {
          setActiveChat(matchedChat.id);
        }
        if (activeSidebarTab !== 'groups') {
          setActiveSidebarTab('groups');
        }
      }
    } else if (queryChatId) {
      const matchedChat = chats.find(c => c.id === queryChatId);
      if (matchedChat) {
        if (activeChat !== queryChatId) {
          setActiveChat(queryChatId);
        }
        if (activeSidebarTab !== 'personal') {
          setActiveSidebarTab('personal');
        }
      }
    }
  }, [queryToleeId, queryChatId, chats]);

  // Handle active chat scrolling in sidebar
  useEffect(() => {
    if (activeChat) {
      setTimeout(() => {
        const el = document.getElementById(`chat-item-${activeChat}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 300);
    }
  }, [activeChat]);

  // Non-member group lookup validation
  useEffect(() => {
    if (!queryToleeId) {
      setNonMemberGroup(null);
      return;
    }

    fetch(`/api/tolee/details?toleeId=${queryToleeId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.tolee) {
          if (!res.isMember) {
            setNonMemberGroup({
              ...res.tolee,
              membershipStatus: res.membershipStatus
            });
          } else {
            setNonMemberGroup(null);
          }
        } else {
          setNonMemberGroup(null);
        }
      })
      .catch(() => {
        setNonMemberGroup(null);
      });
  }, [queryToleeId, chats]);

  const COMMON_EMOJIS = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
    '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
    '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
    '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
    '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️',
    '🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨',
    '😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
    '🥴','😠','😡','🤬','😷','🤒','🤕','🤢','🤮','🤧',
    '🥳','🥺','🤠','😎','🤓','🧐','😈','👿','👹','💀',
    '👋','🤚','🖐️','✋','🖖','👌','🤌','✌️','🤞','🤟',
    '🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎',
    '✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','💪',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '❣️','💕','💞','💓','💗','💖','💘','💝','💟','💬',
    '🔥','⭐','✨','💫','🌟','💥','🎉','🎊','🎈','🎁',
    '🌈','☀️','🌙','⚡','❄️','🌊','🍕','🎵','🎶','🏆'
  ];

  // 1. User Active Heartbeat Loop
  useEffect(() => {
    updateUserPresence();
    const presenceId = setInterval(updateUserPresence, 15000);
    return () => clearInterval(presenceId);
  }, []);

  // Load Pin/Mute states from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const pinned = localStorage.getItem('tolee_pinned_chats');
        if (pinned) setPinnedChatIds(JSON.parse(pinned));
        const muted = localStorage.getItem('tolee_muted_chats');
        if (muted) setMutedChatIds(JSON.parse(muted));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Socket client connection and event listeners
  useEffect(() => {
    if (!currentUserId) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.startsWith('192.168.') || 
       window.location.hostname.startsWith('10.') || 
       window.location.hostname.startsWith('172.')
        ? `http://${window.location.hostname}:4000` 
        : `https://api.tolee.in`);

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('[Chat Client] Connected to signaling server:', s.id);
      s.emit('register-user', { userId: currentUserId });
      
      // Re-emit group rooms on connect
      if (chats.length > 0) {
        const groupChatIds = chats.filter(c => c.isGroup).map(c => c.id);
        s.emit('join-chat-rooms', { chatIds: groupChatIds });
      }
    });

    s.on('chat-message-received', ({ chatId, message }) => {
      console.log('[Chat Client] Real-time message received:', message);

      const isMe = message.senderId === currentUserId;
      const processedMessage = {
        ...message,
        isMe: isMe || message.isMe
      };

      // Append to messagesByChat with deduplication
      setMessagesByChat(prev => {
        const msgs = prev[chatId] || [];

        // Check if message already exists by ID or content/timestamp
        const duplicateIndex = msgs.findIndex(m => {
          if (m.id === processedMessage.id) return true;
          const isSameSender = m.isMe === processedMessage.isMe || m.senderId === processedMessage.senderId;
          if (!isSameSender) return false;

          const isTemp = m.id.startsWith('temp-') || m.id.startsWith('msg-');
          if (isTemp) {
            if (processedMessage.mediaUrl || m.mediaUrl) {
              return m.mediaUrl === processedMessage.mediaUrl;
            }
            return m.text === processedMessage.text;
          }

          if (processedMessage.mediaUrl || m.mediaUrl) {
            if (m.mediaUrl !== processedMessage.mediaUrl) return false;
          } else {
            if (m.text !== processedMessage.text) return false;
          }

          const t1 = new Date(m.createdAt || m.time || 0).getTime();
          const t2 = new Date(processedMessage.createdAt || processedMessage.time || 0).getTime();
          if (!isNaN(t1) && !isNaN(t2) && t1 > 0 && t2 > 0) {
            return Math.abs(t1 - t2) < 30000;
          }
          return m.time === processedMessage.time;
        });

        if (duplicateIndex > -1) {
          const updated = [...msgs];
          updated[duplicateIndex] = { ...updated[duplicateIndex], ...processedMessage };
          return {
            ...prev,
            [chatId]: updated
          };
        }

        return {
          ...prev,
          [chatId]: [...msgs, processedMessage]
        };
      });

      // Update chats list details
      setChats(prev => {
        const chatIndex = prev.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return prev;

        const updatedChats = [...prev];
        const chat = updatedChats[chatIndex];
        const isCurrentActive = activeChatRef.current === chatId;
        const unreadCount = isCurrentActive ? 0 : (chat.unread || 0) + 1;

        // Play sound if not muted
        const isMuted = mutedChatIds.includes(chatId) || chat.isMuted;
        if (!isCurrentActive && !isMuted) {
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (_) {}
        }

        const lastMediaDisplay = message.text 
          ? `${message.sender}: ${message.text}`
          : `${message.sender}: ${
              message.mediaResourceType === 'image' || message.mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? '📷 Photo' :
              message.mediaResourceType === 'video' || message.mediaUrl?.match(/\.(mp4|webm|mov)$/i) ? '🎥 Video' :
              message.mediaResourceType === 'audio' || message.mediaUrl?.match(/\.(mp3|wav|ogg|m4a)$/i) ? '🎵 Audio' : '📄 Attachment'
            }`;

        updatedChats[chatIndex] = {
          ...chat,
          lastMessage: lastMediaDisplay,
          time: message.time,
          lastMessageCreatedAt: message.createdAt,
          unread: unreadCount
        };

        return updatedChats;
      });

      // Auto-mark as read if active
      if (activeChatRef.current === chatId) {
        markChatNotificationsAsRead(chatId);
        markChatMessagesAsRead(chatId);
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [currentUserId, mutedChatIds]);

  // Join group rooms when chats are loaded or socket changes
  useEffect(() => {
    if (socket && chats.length > 0) {
      const groupChatIds = chats.filter(c => c.isGroup).map(c => c.id);
      socket.emit('join-chat-rooms', { chatIds: groupChatIds });
    }
  }, [socket, chats]);

  const handleGroupsScroll = () => {
    const container = groupsScrollRef.current;
    if (!container) return;
    const { scrollTop, clientHeight, scrollHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      const groupsCount = chats.filter(c => c.isGroup).length;
      if (visibleChatsLimit < groupsCount) {
        setVisibleChatsLimit(prev => prev + 30);
      }
    }
  };

  const handlePersonalScroll = () => {
    const container = personalScrollRef.current;
    if (!container) return;
    const { scrollTop, clientHeight, scrollHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      const personalCount = chats.filter(c => !c.isGroup).length;
      if (visibleChatsLimit < personalCount) {
        setVisibleChatsLimit(prev => prev + 30);
      }
    }
  };

  const fetchChats = async () => {
    const res = await fetchRealChatData();
    if (res.success && res.chats && res.messagesByChat) {
      const updatedChats = res.chats.map(chat => ({
        ...chat,
        isMuted: chat.isMuted || mutedChatIds.includes(chat.id),
        unread: chat.id === activeChat ? 0 : chat.unread
      }));
      setChats(updatedChats);
      
      setMessagesByChat(prev => {
        const mergedObj: Record<string, any[]> = {};
        Object.keys(res.messagesByChat).forEach(chatId => {
          mergedObj[chatId] = mergePollMessages(prev[chatId] || [], res.messagesByChat[chatId] || []);
        });
        Object.keys(prev).forEach(chatId => {
          if (!mergedObj[chatId]) {
            mergedObj[chatId] = prev[chatId];
          }
        });
        return mergedObj;
      });

      setHasMoreHistory(prev => {
        const newHasMore = { ...prev };
        res.chats.forEach(chat => {
          const msgs = res.messagesByChat[chat.id] || [];
          if (newHasMore[chat.id] === undefined) {
            newHasMore[chat.id] = msgs.length === 50;
          }
        });
        return newHasMore;
      });
      
      let currentActive = activeChat;
      if (!currentActive) {
        if (queryToleeId) {
          const matchedChat = res.chats.find(c => c.toleeId === queryToleeId);
          if (matchedChat) {
            setActiveChat(matchedChat.id);
            currentActive = matchedChat.id;
          }
        } else if (queryChatId) {
          const matchedChat = res.chats.find(c => c.id === queryChatId);
          if (matchedChat) {
            setActiveChat(queryChatId);
            currentActive = queryChatId;
          }
        } else if (res.chats.length > 0) {
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setActiveChat(res.chats[0].id);
            currentActive = res.chats[0].id;
          }
        }
      }
      
      if (currentActive) {
        markChatNotificationsAsRead(currentActive);
        markChatMessagesAsRead(currentActive);
      }

      if (currentActive) {
        const matchingChat = res.chats.find(c => c.id === currentActive);
        if (matchingChat) {
          setActiveSidebarTab(matchingChat.isGroup ? 'groups' : 'personal');
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (queryTab === 'personal' || queryTab === 'groups') {
      setActiveSidebarTab(queryTab as 'groups' | 'personal');
    }
  }, [queryTab]);

  useEffect(() => {
    if (activeChat && chats.length > 0) {
      const selected = chats.find(c => c.id === activeChat);
      if (selected) {
        setActiveSidebarTab(selected.isGroup ? 'groups' : 'personal');
      }
    }
  }, [activeChat, chats]);

  // Auto scroll to active chat item inside the list
  useEffect(() => {
    if (activeChat) {
      requestAnimationFrame(() => {
        const element = document.getElementById(`chat-item-${activeChat}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }, [activeChat]);

  useEffect(() => {
    const activeChatDetails = chats.find(c => c.id === activeChat);
    if (activeChatDetails && activeChatDetails.isPromotion) {
      getUserPromotionPreferences(activeChatDetails.otherUserId).then(res => {
        if (res.success) {
          setPromoPrefs({
            receivePromotions: !!res.receivePromotions,
            isMuted: !!res.isMuted
          });
        }
      });
    }
  }, [activeChat, chats]);

  useEffect(() => {
    fetchChats();
    const intervalId = setInterval(fetchChats, 5000);
    return () => clearInterval(intervalId);
  }, [activeChat, queryChatId]);

  // Typing indicator
  useEffect(() => {
    if (!activeChat) {
      setTypingUsers([]);
      return;
    }
    const pollTyping = async () => {
      try {
        const res = await fetch(`/api/chat/typing?chatId=${activeChat}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTypingUsers(data.typingUsers || []);
        }
      } catch (_) {}
    };
    pollTyping();
    const id = setInterval(pollTyping, 1500);
    return () => clearInterval(id);
  }, [activeChat]);

  useEffect(() => {
    const prevChat = activeChatRef.current;
    activeChatRef.current = activeChat;
    if (prevChat && prevChat !== activeChat) {
      emitTyping(prevChat, false);
    }
  }, [activeChat]);

  useEffect(() => {
    return () => {
      if (activeChatRef.current) {
        fetch('/api/chat/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ chatId: activeChatRef.current, isTyping: false }),
          keepalive: true
        }).catch(() => {});
      }
    };
  }, []);

  const emitTyping = (chatId: string, isTyping: boolean) => {
    if (!chatId) return;
    const now = Date.now();
    if (isTyping && now - lastTypingEmitRef.current < 2500) return;
    if (isTyping) {
      lastTypingEmitRef.current = now;
    }
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId, isTyping }),
    }).catch(() => {});
  };

  // Close Pickers and Menus outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showAttachmentModal) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('attachment-modal');
      if (el && !el.contains(e.target as Node)) {
        setShowAttachmentModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAttachmentModal]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // Helper to check if story is expired
  const isStoryExpired = (createdAtStr: string | null | undefined) => {
    if (!createdAtStr) return true;
    try {
      const diff = Date.now() - new Date(createdAtStr).getTime();
      return diff > 24 * 60 * 60 * 1000;
    } catch {
      return true;
    }
  };

  const openStoryViewer = async (userId: string, name: string, avatar: string, storyId?: string) => {
    const res = await fetchUserActiveStories(userId);
    if (res.success && res.stories.length > 0) {
      if (storyId) {
        const exists = res.stories.some((s: any) => s.id === storyId);
        if (!exists) {
          alert("This story is no longer available.");
          return;
        }
        setSelectedStorySlideId(storyId);
      } else {
        setSelectedStorySlideId(null);
      }
      setActiveStoryUser({ id: userId, name, avatar });
      setActiveStories(res.stories);
    } else {
      alert("This story is no longer available.");
    }
  };

  const closeStoryViewer = () => {
    setActiveStoryUser(null);
    setActiveStories([]);
    setSelectedStorySlideId(null);
  };

  const handleStoryDeleted = (storyId: string) => {
    setActiveStories(prev => prev.filter(s => s.id !== storyId));
  };

  const fetchCallLogs = useCallback(async () => {
    setLoadingCallLogs(true);
    const res = await getCallLogs();
    if (res.success) {
      setCallLogs(res.logs || []);
    }
    setLoadingCallLogs(false);
  }, []);

  useEffect(() => {
    if (showCallLogsModal) {
      fetchCallLogs();
    }
  }, [showCallLogsModal, fetchCallLogs]);

  const handleDeleteCallLog = async (logId: string) => {
    const res = await deleteCallLog(logId);
    if (res.success) {
      setCallLogs(prev => prev.filter(log => log.id !== logId));
    } else {
      alert("Failed to delete call log: " + res.error);
    }
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!activeChatDetails) return;
    if (activeChatDetails.isGroup) {
      alert("Group calling is coming soon! The platform architecture is prepared for scalable multi-peer conferencing.");
      return;
    }
    if (typeof window !== 'undefined' && (window as any).startOutgoingCall) {
      (window as any).startOutgoingCall(type);
    } else {
      alert("Calling system is initializing. Please try again in a moment.");
    }
  };

  const handleGroupDetailsOpen = async () => {
    setShowGroupInfo(true);
    setLoadingGroupDetails(true);
    const res = await fetchGroupChatDetails(activeChat);
    if (res.success) {
      setGroupDetails(res);
    }
    setLoadingGroupDetails(false);
  };

  // Long-press and Context Menu Trigger Logic
  const handleMessagePressStart = (e: React.MouseEvent | React.TouchEvent, msg: any) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        x: clientX,
        y: clientY,
        message: msg
      });
    }, 550);
  };

  const handleMessagePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const addFilesToPending = (files: FileList | File[], explicitKind?: 'image' | 'video' | 'audio' | 'document') => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: PendingAttachmentItem[] = [];
    fileArray.forEach(file => {
      const isVideo = file.type.startsWith('video/') || explicitKind === 'video';
      const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;

      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds limit (${isVideo ? '100MB' : '25MB'}).`);
        return;
      }

      let kind: 'image' | 'video' | 'audio' | 'pdf' | 'document' = 'document';
      if (explicitKind) {
        if (explicitKind === 'document' && (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf')) {
          kind = 'pdf';
        } else {
          kind = explicitKind;
        }
      } else if (file.type.startsWith('image/')) {
        kind = 'image';
      } else if (file.type.startsWith('video/')) {
        kind = 'video';
      } else if (file.type.startsWith('audio/')) {
        kind = 'audio';
      } else if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        kind = 'pdf';
      } else {
        kind = 'document';
      }

      const previewUrl = URL.createObjectURL(file);
      const item: PendingAttachmentItem = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        kind,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        caption: ''
      };

      if (replacingItemIdRef.current) {
        setPendingAttachments(prev => prev.map(p => p.id === replacingItemIdRef.current ? item : p));
        replacingItemIdRef.current = null;
      } else {
        newItems.push(item);
      }
    });

    if (newItems.length > 0) {
      setPendingAttachments(prev => [...prev, ...newItems]);
    }
    setShowPreviewModal(true);
    setShowAttachmentModal(false);
  };

  // Clipboard Paste Support (e.g. Ctrl+V screenshots or copied files)
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (!activeChat) return;
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFilesToPending(files);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [activeChat]);

  const handleSelectAttachmentOption = (opt: 'camera' | 'image' | 'video' | 'document' | 'audio') => {
    setShowAttachmentModal(false);
    if (opt === 'camera') {
      cameraInputRef.current?.click();
    } else if (opt === 'image') {
      imageInputRef.current?.click();
    } else if (opt === 'video') {
      videoInputRef.current?.click();
    } else if (opt === 'document') {
      documentInputRef.current?.click();
    } else if (opt === 'audio') {
      audioInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, explicitKind?: 'image' | 'video' | 'audio' | 'document') => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToPending(e.target.files, explicitKind);
      e.target.value = '';
    }
  };

  const handleRemovePendingItem = (id: string) => {
    setPendingAttachments(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      const filtered = prev.filter(p => p.id !== id);
      if (filtered.length === 0) {
        setShowPreviewModal(false);
      }
      return filtered;
    });
  };

  const handleReplacePendingItem = (id: string) => {
    replacingItemIdRef.current = id;
    const item = pendingAttachments.find(p => p.id === id);
    if (item?.kind === 'image') imageInputRef.current?.click();
    else if (item?.kind === 'video') videoInputRef.current?.click();
    else if (item?.kind === 'audio') audioInputRef.current?.click();
    else documentInputRef.current?.click();
  };

  const handleAddMorePending = () => {
    replacingItemIdRef.current = null;
    fileInputRef.current?.click();
  };

  const handleCancelUpload = (tempId: string) => {
    const controller = uploadAbortControllersRef.current.get(tempId);
    if (controller) {
      controller.abort();
      uploadAbortControllersRef.current.delete(tempId);
    }
    if (activeChat) {
      setMessagesByChat(prev => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).filter(m => m.id !== tempId)
      }));
    }
  };

  const sendSingleAttachmentMessage = async (item: PendingAttachmentItem) => {
    if (!activeChat) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const currentUserId = (session?.user as any)?.id;
    const activeChatDetails = chats.find(c => c.id === activeChat);

    const optimisticMsg = {
      id: tempId,
      sender: session?.user?.name || 'You',
      senderId: currentUserId,
      senderUsername: (session?.user as any)?.username || null,
      senderAvatar: session?.user?.image || '/default-user-avatar.svg',
      text: item.caption || '',
      mediaUrl: item.previewUrl,
      mediaResourceType: item.kind,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      isMe: true,
      uploadStatus: 'uploading' as const,
      uploadProgress: 15,
      replyTo: replyingToMessage ? {
        id: replyingToMessage.id,
        text: replyingToMessage.text,
        sender: replyingToMessage.sender,
        senderId: replyingToMessage.senderId,
        senderUsername: replyingToMessage.senderUsername || null
      } : null,
      _rawFile: item.file
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), optimisticMsg]
    }));

    const lastMsgDisplay = `Me: ${item.kind === 'image' ? '📷 Photo' : item.kind === 'video' ? '🎥 Video' : item.kind === 'audio' ? '🎵 Audio' : '📄 Document'} ${item.caption ? `"${item.caption}"` : ''}`;
    setChats(prev => prev.map(chat => 
      chat.id === activeChat 
        ? { ...chat, lastMessage: lastMsgDisplay, time: optimisticMsg.time, lastMessageCreatedAt: new Date().toISOString() }
        : chat
    ));

    const abortController = new AbortController();
    uploadAbortControllersRef.current.set(tempId, abortController);

    try {
      let uploadedMediaUrl: string | null = null;
      let uploadedPublicId: string | null = null;
      let uploadedResourceType: string | null = null;

      try {
        const uploadRes = await uploadFile(
          item.file,
          (percent) => {
            setMessagesByChat(prev => {
              const msgs = prev[activeChat] || [];
              return {
                ...prev,
                [activeChat]: msgs.map(m => m.id === tempId ? { ...m, uploadProgress: Math.max(percent, 15) } : m)
              };
            });
          },
          0,
          abortController.signal
        );
        uploadedMediaUrl = uploadRes.secure_url;
        uploadedPublicId = uploadRes.public_id;
        uploadedResourceType = uploadRes.resource_type;
      } catch (directErr: any) {
        if (abortController.signal.aborted) {
          return;
        }
        console.warn("[Upload] Direct upload failed, falling back to server route...", directErr);
        const formData = new FormData();
        formData.append('file', item.file);
        const apiRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: abortController.signal
        }).then(r => r.json());

        if (apiRes.success && apiRes.url) {
          uploadedMediaUrl = apiRes.url;
          uploadedPublicId = apiRes.publicId;
          uploadedResourceType = apiRes.resourceType;
        } else {
          throw new Error(apiRes.error || "Upload failed");
        }
      }

      if (abortController.signal.aborted) return;

      const mediaPayload = {
        mediaUrl: uploadedMediaUrl!,
        mediaPublicId: uploadedPublicId || undefined,
        mediaResourceType: uploadedResourceType || item.kind
      };

      const res = await sendRealChatMessage(
        activeChat,
        item.caption || '',
        replyingToMessage?.id,
        undefined,
        mediaPayload
      );

      if (res.success && res.message) {
        setMessagesByChat(prev => {
          const msgs = prev[activeChat] || [];
          return {
            ...prev,
            [activeChat]: msgs.map(m => m.id === tempId ? { 
              ...res.message, 
              isMe: true, 
              uploadStatus: 'completed',
              uploadProgress: 100 
            } : m)
          };
        });

        if (socket) {
          socket.emit('send-chat-message', {
            id: res.message.id,
            messageId: res.message.id,
            chatId: activeChat,
            senderId: currentUserId,
            senderName: session?.user?.name || 'User',
            senderAvatar: session?.user?.image || '/default-user-avatar.svg',
            text: item.caption || '',
            mediaUrl: (res.message as any).mediaUrl || uploadedMediaUrl,
            mediaResourceType: (res.message as any).mediaResourceType || uploadedResourceType || item.kind,
            isGroup: activeChatDetails?.isGroup || false,
            receiverId: activeChatDetails?.otherUserId || null,
            createdAt: (res.message as any).createdAt || new Date().toISOString(),
            time: res.message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyTo: res.message.replyTo || null
          });
        }

        fetchChats();
      } else {
        throw new Error(res.error || "Failed to persist chat message");
      }
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      console.error("[sendSingleAttachmentMessage] Error:", err);
      setMessagesByChat(prev => {
        const msgs = prev[activeChat] || [];
        return {
          ...prev,
          [activeChat]: msgs.map(m => m.id === tempId ? { ...m, uploadStatus: 'failed' } : m)
        };
      });
    } finally {
      uploadAbortControllersRef.current.delete(tempId);
    }
  };

  const handleRetryUpload = (msg: any) => {
    if (!msg._rawFile || !activeChat) return;
    const item: PendingAttachmentItem = {
      id: `retry-${Date.now()}`,
      file: msg._rawFile,
      previewUrl: msg.mediaUrl || URL.createObjectURL(msg._rawFile),
      kind: msg.mediaResourceType || 'document',
      name: msg._rawFile.name,
      sizeFormatted: formatFileSize(msg._rawFile.size),
      caption: msg.text || ''
    };
    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: (prev[activeChat] || []).filter(m => m.id !== msg.id)
    }));
    sendSingleAttachmentMessage(item);
  };

  const handleSendAttachments = async (items: PendingAttachmentItem[]) => {
    setShowPreviewModal(false);
    setPendingAttachments([]);
    for (const item of items) {
      await sendSingleAttachmentMessage(item);
    }
  };

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsNearBottom(nearBottom);

    if (nearBottom) {
      setShowNewMessagesBadge(false);
    }

    if (scrollTop <= 10 && hasMoreHistory[activeChat] && !loadingHistory) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = async () => {
    if (!activeChat || loadingHistory || hasMoreHistory[activeChat] === false) return;

    const currentMessages = messagesByChat[activeChat] || [];
    const oldestMessage = currentMessages.find(m => !m.id.startsWith('temp-'));
    if (!oldestMessage) return;

    setLoadingHistory(true);

    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    const res = await fetchChatMessages(activeChat, oldestMessage.id, 30);

    if (res.success && res.messages) {
      const fetchedMsgs = res.messages;

      setMessagesByChat(prev => {
        const existing = prev[activeChat] || [];
        const uniqueFetched = fetchedMsgs.filter(
          (fm: any) => !existing.some((em: any) => em.id === fm.id)
        );

        return {
          ...prev,
          [activeChat]: [...uniqueFetched, ...existing]
        };
      });

      setHasMoreHistory(prev => ({
        ...prev,
        [activeChat]: res.hasMore ?? false
      }));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeight;
            scrollContainerRef.current.scrollTop = prevScrollTop + heightDifference;
          }
        });
      });
    }

    setLoadingHistory(false);
  };

  const messages = messagesByChat[activeChat] || [];

  // Lock scroll transitions
  useEffect(() => {
    if (!activeChat) {
      prevMessagesLength.current = 0;
      prevActiveChat.current = '';
      return;
    }

    const currentMessages = messagesByChat[activeChat] || [];

    if (activeChat !== prevActiveChat.current) {
      prevActiveChat.current = activeChat;
      prevMessagesLength.current = currentMessages.length;
      setIsNearBottom(true);
      setShowNewMessagesBadge(false);
      
      markChatMessagesAsRead(activeChat);

      setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
      return;
    }

    if (currentMessages.length > prevMessagesLength.current) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (lastMsg) {
        if (lastMsg.isMe) {
          setTimeout(() => {
            scrollToBottom('smooth');
          }, 50);
        } else {
          if (isNearBottom) {
            setTimeout(() => {
              scrollToBottom('smooth');
            }, 50);
          } else {
            setShowNewMessagesBadge(true);
          }
        }
      }
    }

    prevMessagesLength.current = currentMessages.length;
  }, [messagesByChat, activeChat]);

  useEffect(() => {
    if (activeChat && messages.length > 0) {
      markChatMessagesAsRead(activeChat);
    }
  }, [messages, activeChat]);

  // Search Logic
  useEffect(() => {
    if (!chatSearchQuery.trim() || !activeChat) {
      setSearchMatches([]);
      setCurrentSearchMatchIndex(0);
      return;
    }

    const query = chatSearchQuery.toLowerCase();
    const matches = messages
      .filter(m => m.text?.toLowerCase().includes(query))
      .map(m => m.id);

    setSearchMatches(matches);
    setCurrentSearchMatchIndex(0);

    if (matches.length > 0) {
      scrollToMessageId(matches[0]);
    }
  }, [chatSearchQuery, activeChat]);

  const scrollToMessageId = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-highlight-flash');
      setTimeout(() => {
        element.classList.remove('animate-highlight-flash');
      }, 1800);
    }
  };

  const handleSearchNavigate = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    let nextIndex = currentSearchMatchIndex;
    if (direction === 'next') {
      nextIndex = (currentSearchMatchIndex + 1) % searchMatches.length;
    } else {
      nextIndex = (currentSearchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }
    setCurrentSearchMatchIndex(nextIndex);
    scrollToMessageId(searchMatches[nextIndex]);
  };

  // Group Settings
  const handleMuteGroup = async (toleeId: string, duration?: '1h' | '8h' | '24h' | 'until_turned_on') => {
    try {
      const res = await fetch('/api/tolee/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toleeId, duration })
      }).then(r => r.json());

      if (res.success) {
        setChats(prev => prev.map(chat => {
          if (chat.toleeId === toleeId) {
            return { ...chat, isMuted: res.isMuted, mutedUntil: res.mutedUntil };
          }
          return chat;
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveGroup = async (toleeId: string) => {
    try {
      if (confirm('Are you sure you want to leave this group?')) {
        const res = await fetch('/api/tolee/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toleeId })
        }).then(r => r.json());

        if (res.success) {
          setChats(prev => prev.filter(c => c.toleeId !== toleeId));
          if (activeChat && chats.find(c => c.id === activeChat)?.toleeId === toleeId) {
            setActiveChat('');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (isSendingRef.current) return;
    if (!newMessage.trim() && !pendingAttachment) return;
    if (!activeChat) return;

    isSendingRef.current = true;
    const contentToSend = newMessage.trim();
    const parentIdToSend = replyingToMessage?.id;
    const attachmentToSend = pendingAttachment;
    const tempId = 'temp-' + Date.now();

    const newMsg = {
      id: tempId,
      sender: 'Me',
      senderAvatar: session?.user?.image || '/default-user-avatar.svg',
      senderId: currentUserId,
      text: contentToSend,
      mediaUrl: attachmentToSend?.previewUrl || null,
      mediaResourceType: attachmentToSend?.kind || null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      isMe: true,
      replyTo: replyingToMessage ? {
        id: replyingToMessage.id,
        text: replyingToMessage.text,
        sender: replyingToMessage.sender,
        senderId: replyingToMessage.senderId,
        senderUsername: replyingToMessage.senderUsername || null
      } : null
    };
    
    // Clear input state immediately to prevent duplicate mobile taps/submissions
    setNewMessage('');
    setReplyingToMessage(null);
    setPendingAttachment(null);

    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMsg]
    }));
    
    const lastMsgDisplay = attachmentToSend 
      ? `Me: ${attachmentToSend.kind === 'image' ? '📷 Photo' : attachmentToSend.kind === 'video' ? '🎥 Video' : attachmentToSend.kind === 'audio' ? '🎵 Audio' : '📄 Document'} ${contentToSend ? `"${contentToSend}"` : ''}`
      : `Me: ${contentToSend}`;

    setChats(prev => prev.map(chat => 
      chat.id === activeChat 
        ? { ...chat, lastMessage: lastMsgDisplay, time: newMsg.time, lastMessageCreatedAt: new Date().toISOString() }
        : chat
    ));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(activeChat, false);

    try {
      let uploadedMediaUrl: string | null = null;
      let uploadedPublicId: string | null = null;
      let uploadedResourceType: string | null = null;

      if (attachmentToSend) {
        setIsUploadingAttachment(true);
        setUploadProgress(15);
        try {
          // 1. Direct failover upload to Cloudinary
          const uploadRes = await uploadFile(attachmentToSend.file, (p) => setUploadProgress(p));
          uploadedMediaUrl = uploadRes.secure_url;
          uploadedPublicId = uploadRes.public_id;
          uploadedResourceType = uploadRes.resource_type;
        } catch (clientUploadErr) {
          console.warn("[Upload] Direct upload failed, falling back to server route...", clientUploadErr);
          // 2. Server route fallback
          const formData = new FormData();
          formData.append('file', attachmentToSend.file);
          const apiRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          }).then(r => r.json());

          if (apiRes.success && apiRes.url) {
            uploadedMediaUrl = apiRes.url;
            uploadedPublicId = apiRes.publicId;
            uploadedResourceType = apiRes.resourceType;
          } else {
            alert(apiRes.error || "Failed to upload media attachment. Please check file size and try again.");
            setIsUploadingAttachment(false);
            isSendingRef.current = false;
            if (attachmentToSend?.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(attachmentToSend.previewUrl);
            }
            setMessagesByChat(prev => ({
              ...prev,
              [activeChat]: (prev[activeChat] || []).filter(m => m.id !== tempId)
            }));
            fetchChats();
            return;
          }
        } finally {
          setIsUploadingAttachment(false);
          setUploadProgress(0);
        }
      }

      if (attachmentToSend?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachmentToSend.previewUrl);
      }

      const mediaPayload = uploadedMediaUrl ? {
        mediaUrl: uploadedMediaUrl,
        mediaPublicId: uploadedPublicId || undefined,
        mediaResourceType: uploadedResourceType || attachmentToSend?.kind || undefined
      } : undefined;

      const res = await sendRealChatMessage(activeChat, contentToSend, parentIdToSend, undefined, mediaPayload);
      if (res.success && res.message) {
        setMessagesByChat(prev => {
          const msgs = prev[activeChat] || [];
          return {
            ...prev,
            [activeChat]: msgs.map(m => m.id === tempId ? { ...res.message, isMe: true } : m)
          };
        });

        // Emit socket event for real-time relay with canonical database message ID
        if (socket) {
          const currentUserId = (session?.user as any)?.id;
          const activeChatDetails = chats.find(c => c.id === activeChat);
          socket.emit('send-chat-message', {
            id: res.message.id,
            messageId: res.message.id,
            chatId: activeChat,
            senderId: currentUserId,
            senderName: session?.user?.name || 'User',
            senderAvatar: session?.user?.image || '/default-user-avatar.svg',
            text: contentToSend,
            mediaUrl: (res.message as any).mediaUrl || uploadedMediaUrl || null,
            mediaResourceType: (res.message as any).mediaResourceType || uploadedResourceType || null,
            isGroup: activeChatDetails?.isGroup || false,
            receiverId: activeChatDetails?.otherUserId || null,
            createdAt: (res.message as any).createdAt || new Date().toISOString(),
            time: res.message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyTo: res.message.replyTo || null
          });
        }

        fetchChats();
      } else {
        console.error("Failed to send message:", res?.error);
        alert(res?.error || "Failed to send message. Please try again.");
        setMessagesByChat(prev => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter(m => m.id !== tempId)
        }));
        fetchChats();
      }
    } catch (err) {
      console.error("Error in handleSendMessage:", err);
      setMessagesByChat(prev => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).filter(m => m.id !== tempId)
      }));
    } finally {
      isSendingRef.current = false;
      setIsUploadingAttachment(false);
    }
  };

  // Reply Privately Flow
  const handlePrivateReply = async (msg: any) => {
    if (!msg.senderId) {
      alert("Cannot verify sender metadata for private reply.");
      return;
    }
    const res = await getOrCreatePersonalChat(msg.senderId);
    if (res.success && res.chatId) {
      setActiveChat(res.chatId);
      setReplyingToMessage(msg);
      setNewMessage(`Replying privately to group message: `);
      setActiveSidebarTab('personal');
    } else {
      alert(res.error || "Failed to start private chat.");
    }
  };

  const handleMessageDelete = async (msgId: string) => {
    if (confirm("Are you sure you want to delete this message for everyone?")) {
      const res = await deleteChatMessage(msgId);
      if (res.success) {
        setMessagesByChat(prev => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter(m => m.id !== msgId)
        }));
        fetchChats();
      } else {
        alert(res.error || "Failed to delete message.");
      }
    }
  };

  const handleRespondToRequest = async (action: 'accept' | 'decline') => {
    if (!activeChat) return;
    const res = await respondToChatRequest(activeChat, action);
    if (res.success) {
      fetchChats();
    } else {
      alert("Failed to respond to chat request: " + res.error);
    }
  };

  const activeChatDetails = chats.find(c => c.id === activeChat);

  const isPersonalDM = activeChatDetails && !activeChatDetails.isGroup;
  const isPending = isPersonalDM && activeChatDetails.status === 'pending';
  const isDeclined = isPersonalDM && activeChatDetails.status === 'declined';
  const navigateToProfile = (username?: string | null, userId?: string) => {
    if (userId === currentUserId) {
      router.push('/u/me');
    } else if (username && username.trim() !== '') {
      router.push(`/u/${username}`);
    } else if (userId) {
      router.push(`/u/${userId}`);
    }
  };
  const isRequestSender = isPersonalDM && activeChatDetails.requestSenderId === currentUserId;

  const togglePinChat = (chatId: string) => {
    let nextPinned = [...pinnedChatIds];
    if (nextPinned.includes(chatId)) {
      nextPinned = nextPinned.filter(id => id !== chatId);
    } else {
      nextPinned.push(chatId);
    }
    setPinnedChatIds(nextPinned);
    localStorage.setItem('tolee_pinned_chats', JSON.stringify(nextPinned));
  };

  const toggleMuteChat = (chatId: string, isGroup: boolean) => {
    let nextMuted = [...mutedChatIds];
    if (nextMuted.includes(chatId)) {
      nextMuted = nextMuted.filter(id => id !== chatId);
    } else {
      nextMuted.push(chatId);
    }
    setMutedChatIds(nextMuted);
    localStorage.setItem('tolee_muted_chats', JSON.stringify(nextMuted));

    // Also update chats state
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isMuted: !c.isMuted } : c));
  };

  const allFilteredChats = chats
    .filter(chat => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          chat.name?.toLowerCase().includes(q) || 
          chat.username?.toLowerCase().includes(q) || 
          chat.lastMessage?.toLowerCase().includes(q) ||
          (chat.phone && chat.phone.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a.id);
      const bPinned = pinnedChatIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt).getTime() : 0;
      const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt).getTime() : 0;
      return bTime - aTime;
    });

  const groupChatsList = allFilteredChats.filter(chat => chat.isGroup);
  const personalChatsList = allFilteredChats.filter(chat => !chat.isGroup);

  const paginatedGroupChats = groupChatsList.slice(0, visibleChatsLimit);
  const paginatedPersonalChats = personalChatsList.slice(0, visibleChatsLimit);

  return (
    <div className="w-full flex h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] bg-white dark:bg-[#0a0a0a] overflow-hidden border-b border-zinc-100 dark:border-gray-800 lg:border-none relative">
      
      {/* Left Chat List (WhatsApp Left Panel) */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-white dark:bg-[#121212] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900"><PlusCircle className="w-5 h-5 stroke-[1.5]" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="text-gray-500 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 w-9 flex items-center justify-center focus:outline-none">
                <MoreVertical className="w-5 h-5 stroke-[1.5]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-zinc-200/80 dark:border-zinc-900 bg-zinc-950 text-white">
                <DropdownMenuItem onClick={() => setShowCallLogsModal(true)} className="cursor-pointer">
                  <Phone className="mr-2 h-4 w-4 stroke-[2]" />
                  <span>Call Logs</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search or start new chat" 
              className="w-full pl-10 bg-zinc-100/70 focus-visible:bg-white dark:bg-gray-900 border-none rounded-full h-10 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="px-4 pb-3 pt-1 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
          <div className="flex p-1 bg-zinc-100/80 dark:bg-zinc-900 rounded-full">
            <button
              onClick={() => setActiveSidebarTab('groups')}
              className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-full transition-all ${
                activeSidebarTab === 'groups'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-[#5c6e80] hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveSidebarTab('personal')}
              className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-full transition-all relative ${
                activeSidebarTab === 'personal'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-[#5c6e80] hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Personal
              {chats.filter(c => !c.isGroup && c.unread > 0).length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold bg-primary text-primary-foreground`}>
                  {chats.filter(c => !c.isGroup && c.unread > 0).reduce((sum, c) => sum + c.unread, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Chat List */}
        {/* Chat List - Groups */}
        <div 
          ref={groupsScrollRef}
          onScroll={handleGroupsScroll}
          className={`flex-grow overflow-y-auto overflow-x-hidden ${activeSidebarTab === 'groups' ? 'flex flex-col' : 'hidden'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="flex flex-col gap-1 p-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-grow space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-10 rounded" />
                    </div>
                    <Skeleton className="h-3.5 w-11/12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupChatsList.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm leading-relaxed">
              {searchQuery 
                ? 'No conversations matched your search.' 
                : "You haven't joined any Tolees yet."}
            </div>
          ) : (
            <div className="flex flex-col">
              {paginatedGroupChats.map((chat) => (
                <div 
                  key={chat.id} 
                  id={`chat-item-${chat.id}`}
                  onClick={() => {
                    setActiveChat(chat.id);
                    markChatNotificationsAsRead(chat.id);
                    markChatMessagesAsRead(chat.id);
                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                  }}
                  className={`group flex items-center gap-3 p-3 mx-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    activeChat === chat.id 
                      ? 'bg-zinc-100/80 dark:bg-zinc-800/60 shadow-sm' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="relative">
                    {/* Golden Story Ring Wrapper */}
                    <div 
                      onClick={(e) => {
                        if (chat.hasActiveStories && chat.otherUserId) {
                          e.stopPropagation();
                          openStoryViewer(chat.otherUserId, chat.name, chat.avatar);
                        }
                      }}
                      className={chat.hasActiveStories ? 'p-[2px] story-ring transition-transform hover:scale-105 active:scale-95' : ''}
                    >
                      <div className={chat.hasActiveStories ? 'p-[2px] bg-white dark:bg-zinc-950 rounded-full' : ''}>
                        <Avatar className="w-12 h-12 border border-zinc-100 dark:border-zinc-800">
                          <AvatarImage src={chat.avatar || (chat.isGroup ? '/default-tolee-avatar.svg' : '/default-user-avatar.svg')} />
                          <AvatarFallback>{chat.name ? chat.name[0] : 'C'}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {(chat.online === 'Online') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#121212] rounded-full z-10"></div>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className={`font-semibold text-[15px] truncate flex items-center gap-1.5 ${chat.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : activeChat === chat.id ? 'text-primary dark:text-zinc-100' : 'text-gray-900 dark:text-white'}`}>
                        {chat.name}
                        {!chat.isGroup && chat.status === 'pending' && (
                          <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/40">
                            Request
                          </span>
                        )}
                        {chat.isPromotion && !chat.isGroup && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40 flex-shrink-0">
                            Promoted
                          </span>
                        )}
                      </h3>
                      <p className={`text-sm truncate pr-2 mt-0.5 ${chat.unread > 0 ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatLastMessage(chat.lastMessage)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                      <span className={`text-xs whitespace-nowrap ${chat.unread > 0 ? 'text-emerald-500 dark:text-teal-400 font-bold' : 'text-gray-500'}`}>
                        {chat.time}
                      </span>
                      <div className="flex items-center gap-1.5 min-h-[20px]">
                        {pinnedChatIds.includes(chat.id) && (
                          <Pin className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400 rotate-[45deg]" />
                        )}
                        {(mutedChatIds.includes(chat.id) || chat.isMuted) && (
                          <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        {chat.unread > 0 ? (
                          <div className="bg-emerald-500 dark:bg-teal-500 text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full">
                            {chat.unread}
                          </div>
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center focus:outline-none">
                                <MoreVertical className="w-3.5 h-3.5 text-zinc-500" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => togglePinChat(chat.id)}>
                                  <Pin className="w-4 h-4 mr-2" />
                                  {pinnedChatIds.includes(chat.id) ? 'Unpin chat' : 'Pin chat'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleMuteChat(chat.id, chat.isGroup)}>
                                  <BellOff className="w-4 h-4 mr-2" />
                                  {(mutedChatIds.includes(chat.id) || chat.isMuted) ? 'Unmute chat' : 'Mute chat'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat List - Personal */}
        <div 
          ref={personalScrollRef}
          onScroll={handlePersonalScroll}
          className={`flex-grow overflow-y-auto overflow-x-hidden ${activeSidebarTab === 'personal' ? 'flex flex-col' : 'hidden'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="flex flex-col gap-1 p-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-grow space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-10 rounded" />
                    </div>
                    <Skeleton className="h-3.5 w-11/12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : personalChatsList.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm leading-relaxed">
              {searchQuery 
                ? 'No conversations matched your search.' 
                : "No personal conversations yet."}
            </div>
          ) : (
            <div className="flex flex-col">
              {paginatedPersonalChats.map((chat) => (
                <div 
                  key={chat.id} 
                  id={`chat-item-${chat.id}`}
                  onClick={() => {
                    setActiveChat(chat.id);
                    markChatNotificationsAsRead(chat.id);
                    markChatMessagesAsRead(chat.id);
                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                  }}
                  className={`group flex items-center gap-3 p-3 mx-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    activeChat === chat.id 
                      ? 'bg-zinc-100/80 dark:bg-zinc-800/60 shadow-sm' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="relative">
                    {/* Golden Story Ring Wrapper */}
                    <div 
                      onClick={(e) => {
                        if (chat.hasActiveStories) {
                          e.stopPropagation();
                          openStoryViewer(chat.otherUserId, chat.name, chat.avatar);
                        }
                      }}
                      className={chat.hasActiveStories ? 'p-[2px] story-ring transition-transform hover:scale-105 active:scale-95' : ''}
                    >
                      <div className={chat.hasActiveStories ? 'p-[2px] bg-white dark:bg-zinc-950 rounded-full' : ''}>
                        <Avatar className="w-12 h-12 border border-zinc-100 dark:border-zinc-800">
                          <AvatarImage src={chat.avatar || (chat.isGroup ? '/default-tolee-avatar.svg' : '/default-user-avatar.svg')} />
                          <AvatarFallback>{chat.name ? chat.name[0] : 'C'}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {(chat.online === 'Online') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#121212] rounded-full z-10"></div>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className={`font-semibold text-[15px] truncate flex items-center gap-1.5 ${chat.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : activeChat === chat.id ? 'text-primary dark:text-zinc-100' : 'text-gray-900 dark:text-white'}`}>
                        {chat.name}
                        {!chat.isGroup && chat.status === 'pending' && (
                          <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/40">
                            Request
                          </span>
                        )}
                        {chat.isPromotion && !chat.isGroup && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40 flex-shrink-0">
                            Promoted
                          </span>
                        )}
                      </h3>
                      <p className={`text-sm truncate pr-2 mt-0.5 ${chat.unread > 0 ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatLastMessage(chat.lastMessage)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                      <span className={`text-xs whitespace-nowrap ${chat.unread > 0 ? 'text-emerald-500 dark:text-teal-400 font-bold' : 'text-gray-500'}`}>
                        {chat.time}
                      </span>
                      <div className="flex items-center gap-1.5 min-h-[20px]">
                        {pinnedChatIds.includes(chat.id) && (
                          <Pin className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400 rotate-[45deg]" />
                        )}
                        {(mutedChatIds.includes(chat.id) || chat.isMuted) && (
                          <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        {chat.unread > 0 ? (
                          <div className="bg-emerald-500 dark:bg-teal-500 text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full">
                            {chat.unread}
                          </div>
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center focus:outline-none">
                                <MoreVertical className="w-3.5 h-3.5 text-zinc-500" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => togglePinChat(chat.id)}>
                                  <Pin className="w-4 h-4 mr-2" />
                                  {pinnedChatIds.includes(chat.id) ? 'Unpin chat' : 'Pin chat'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleMuteChat(chat.id, chat.isGroup)}>
                                  <BellOff className="w-4 h-4 mr-2" />
                                  {(mutedChatIds.includes(chat.id) || chat.isMuted) ? 'Unmute chat' : 'Mute chat'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Window */}
      <div className={`flex-1 min-w-0 max-w-full overflow-hidden flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] relative ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {/* Chat Pattern Background (Like WhatsApp) */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" 
             style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}>
        </div>

        {activeChatDetails ? (
          <>
            {/* Chat Header */}
            <div className="h-16 shrink-0 flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-900 z-20 min-w-0 shadow-sm sticky top-0">
              <div 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 flex-1"
                onClick={() => {
                  if (!activeChatDetails.isGroup) {
                    navigateToProfile(activeChatDetails.username, activeChatDetails.otherUserId);
                  } else if (activeChatDetails.isGroup) {
                    handleGroupDetailsOpen();
                  }
                }}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveChat('');
                    router.push('/chat');
                  }} 
                  className="md:hidden mr-0.5 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex-shrink-0 h-9 w-9"
                >
                  <ChevronLeft className="w-5.5 h-5.5 stroke-[2.5]" />
                </Button>
                
                {/* Active story ring logic on active header avatar */}
                <div className={activeChatDetails.hasActiveStories ? 'p-[1.5px] story-ring' : ''}>
                  <div className={activeChatDetails.hasActiveStories ? 'p-[1.5px] bg-white dark:bg-zinc-950 rounded-full' : ''}>
                    <Avatar className="w-10 h-10 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex-shrink-0 bg-teal-50 text-teal-800 font-bold dark:bg-zinc-900 dark:text-white">
                      <AvatarImage src={activeChatDetails.avatar} />
                      <AvatarFallback className="bg-teal-50 text-teal-800 dark:bg-zinc-800 dark:text-teal-400 font-bold">
                        {activeChatDetails.name ? activeChatDetails.name[0]?.toUpperCase() : 'C'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h2 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-[15px] truncate flex items-center gap-1.5 min-w-0 hover:underline">
                    <span className="truncate">{activeChatDetails.name}</span>
                  </h2>
                  <div className="text-[11px] sm:text-xs text-zinc-500 flex items-center gap-1 sm:gap-1.5 min-w-0 select-none">
                    {activeChatDetails.isGroup ? (
                      <>
                        <span className="truncate">{activeChatDetails.membersCount} members</span>
                      </>
                    ) : typingUsers.length > 0 ? (
                      <span className="text-primary dark:text-teal-400 font-medium flex items-center gap-1">
                        <span className="relative flex h-2 w-2 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary dark:bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary dark:bg-teal-400"></span>
                        </span>
                        typing...
                      </span>
                    ) : activeChatDetails.online === 'Online' ? (
                      <span className="text-primary dark:text-teal-400 font-semibold text-[11px] flex items-center gap-1 select-none">
                        <span className="relative flex h-2 w-2 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary dark:bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary dark:bg-teal-400"></span>
                        </span>
                        Online
                      </span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] select-none">
                        {activeChatDetails.online}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                <Button onClick={() => handleStartCall('video')} variant="ghost" size="icon" className="text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200"><Video className="w-[18px] h-[18px] stroke-[2]" /></Button>
                <Button onClick={() => handleStartCall('audio')} variant="ghost" size="icon" className="text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200"><Phone className="w-4.5 h-4.5 stroke-[2]" /></Button>
                <Button 
                  onClick={() => setIsSearchingInChat(prev => !prev)}
                  variant="ghost" 
                  size="icon" 
                  className={`text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200 ${isSearchingInChat ? 'bg-zinc-100 dark:bg-zinc-900 text-primary dark:text-teal-400 font-bold' : ''}`}
                >
                  <Search className="w-4.5 h-4.5 stroke-[2]" />
                </Button>
                {activeChatDetails.isGroup ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200 focus:outline-none">
                      <MoreVertical className="w-4.5 h-4.5 stroke-[2]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-zinc-200/80 dark:border-zinc-900">
                      <DropdownMenuItem onClick={handleGroupDetailsOpen} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4 stroke-[2]" />
                        <span>Group Info</span>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <BellOff className="mr-2 h-4 w-4 stroke-[2]" />
                          <span>Mute Notifications</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="rounded-xl shadow-lg border-zinc-200/80 dark:border-zinc-900">
                            {activeChatDetails.isMuted ? (
                              <DropdownMenuItem onClick={() => handleMuteGroup(activeChatDetails.toleeId, undefined)} className="cursor-pointer">
                                <span>Unmute</span>
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleMuteGroup(activeChatDetails.toleeId, '1h')} className="cursor-pointer">
                                  <span>Mute for 1 hour</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMuteGroup(activeChatDetails.toleeId, '8h')} className="cursor-pointer">
                                  <span>Mute for 8 hours</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMuteGroup(activeChatDetails.toleeId, '24h')} className="cursor-pointer">
                                  <span>Mute for 24 hours</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMuteGroup(activeChatDetails.toleeId, 'until_turned_on')} className="cursor-pointer">
                                  <span>Mute until turned on</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleLeaveGroup(activeChatDetails.toleeId)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4 stroke-[2]" />
                        <span>Leave Group</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200"><MoreVertical className="w-4.5 h-4.5 stroke-[2]" /></Button>
                )}
              </div>
            </div>

            {/* In-Chat Sliding Search Panel */}
            {isSearchingInChat && (
              <div className="px-4 py-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-900 z-20 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    className="w-full pl-9 h-9 text-xs bg-zinc-100/80 focus-visible:bg-white dark:bg-zinc-900 rounded-full border-none focus-visible:ring-1 focus-visible:ring-primary text-gray-900 dark:text-white"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchNavigate('next');
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-gray-500 select-none">
                  {searchMatches.length > 0 ? (
                    <span>
                      {currentSearchMatchIndex + 1} of {searchMatches.length}
                    </span>
                  ) : chatSearchQuery ? (
                    <span>No matches</span>
                  ) : null}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={searchMatches.length === 0}
                    onClick={() => handleSearchNavigate('prev')}
                    className="h-7 w-7 rounded-full text-zinc-500 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={searchMatches.length === 0}
                    onClick={() => handleSearchNavigate('next')}
                    className="h-7 w-7 rounded-full text-zinc-500 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 -rotate-90" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setIsSearchingInChat(false);
                      setChatSearchQuery('');
                      setSearchMatches([]);
                    }}
                    className="h-7 w-7 rounded-full text-zinc-500 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages Area with Drag & Drop Zone */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  addFilesToPending(e.dataTransfer.files);
                }
              }}
              className="relative flex-1 min-h-0 p-3 lg:p-6 z-10 overflow-y-auto scroll-smooth scrollbar-none"
            >
              {/* Drag & Drop Visual Overlay */}
              {isDraggingOver && (
                <div className="absolute inset-2 z-40 bg-teal-500/10 dark:bg-teal-500/15 border-2 border-dashed border-teal-500 rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center p-6 text-teal-600 dark:text-teal-400 pointer-events-none animate-in fade-in duration-150">
                  <div className="w-16 h-16 rounded-3xl bg-teal-500/20 flex items-center justify-center mb-3 shadow-lg">
                    <Paperclip className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <p className="text-base font-bold">Drop files here to send</p>
                  <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">Photos, videos, PDFs & documents</p>
                </div>
              )}

              <div className="flex flex-col gap-1 min-h-full justify-end">
                {/* Lazy history load loader */}
                {loadingHistory && (
                  <div className="flex justify-center my-2 select-none">
                    <span className="flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 text-xs font-semibold px-3 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm text-primary dark:text-teal-400 animate-fade-in">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      Loading older messages...
                    </span>
                  </div>
                )}

                {/* Render Messages with Date Separators */}
                {(() => {
                  let lastDateStr = '';
                  return messages.map((msg) => {
                    const msgDate = new Date(msg.createdAt || Date.now());
                    const dateStr = msgDate.toDateString();
                    let showSeparator = false;
                    if (dateStr !== lastDateStr) {
                      showSeparator = true;
                      lastDateStr = dateStr;
                    }
                    const separatorText = showSeparator ? formatMessageDateSeparator(msg.createdAt || new Date()) : '';

                    return (
                      <div 
                        key={msg.id} 
                        id={`msg-${msg.id}`} 
                        className="transition-all duration-300 w-full"
                      >
                        {showSeparator && (
                          <div className="flex justify-center my-4 select-none">
                            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/60 text-gray-500 dark:text-zinc-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                              {separatorText}
                            </div>
                          </div>
                        )}

                        <div className={`flex w-full gap-2 sm:gap-3 my-0.5 ${msg.isMe ? 'justify-end' : 'justify-start'} min-w-0`}>
                          {!msg.isMe && (
                            <Avatar 
                              className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 mt-0.5 shadow-sm border border-zinc-200/50 dark:border-zinc-800/85 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => navigateToProfile(msg.senderUsername, msg.senderId)}
                            >
                              <AvatarImage src={msg.senderAvatar} />
                              <AvatarFallback className="bg-teal-50 text-teal-800 dark:bg-zinc-800 dark:text-teal-400 font-bold text-xs">
                                {msg.sender[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className="flex flex-col max-w-[82%] sm:max-w-[70%] min-w-0">
                            {!msg.isMe && activeChatDetails.isGroup && (
                              <span 
                                className="text-[11px] text-gray-500 font-semibold mb-0.5 ml-1 truncate cursor-pointer hover:underline"
                                onClick={() => navigateToProfile(msg.senderUsername, msg.senderId)}
                              >
                                {msg.sender}
                              </span>
                            )}
                            
                            <div 
                              className={`relative px-3 py-1.5 rounded-2xl shadow-sm border transition-all min-w-0 select-text cursor-pointer ${
                                msg.isMe 
                                  ? 'bg-primary border-primary text-primary-foreground rounded-tr-sm rounded-br-2xl rounded-l-2xl' 
                                  : 'bg-white border-zinc-200/50 dark:border-zinc-800/60 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded-tl-sm rounded-bl-2xl rounded-r-2xl'
                              }`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                              }}
                              onMouseDown={(e) => handleMessagePressStart(e, msg)}
                              onMouseUp={handleMessagePressEnd}
                              onMouseLeave={handleMessagePressEnd}
                              onTouchStart={(e) => handleMessagePressStart(e, msg)}
                              onTouchMove={handleMessagePressEnd}
                              onTouchEnd={handleMessagePressEnd}
                            >
                              {/* Quoted Reply rendering inside bubbles */}
                              {msg.replyTo && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToMessageId(msg.replyTo.id);
                                  }}
                                  className={`mb-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 border-l-4 text-left cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                                    msg.isMe ? 'border-white/60' : 'border-primary'
                                  }`}
                                >
                                  <p 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToProfile(msg.replyTo.senderUsername, msg.replyTo.senderId);
                                    }}
                                    className={`text-[10px] font-bold truncate hover:underline cursor-pointer ${
                                      msg.isMe ? 'text-white dark:text-white' : 'text-primary dark:text-teal-400'
                                    }`}
                                  >
                                    {msg.replyTo.sender}
                                  </p>
                                  <p className={`text-xs truncate leading-snug ${
                                    msg.isMe ? 'text-white/80 dark:text-zinc-300' : 'text-gray-500 dark:text-zinc-400'
                                  }`}>
                                    {msg.replyTo.text}
                                  </p>
                                </div>
                              )}

                              {/* Quoted Story Reply rendering */}
                              {msg.storyId && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isExpired = isStoryExpired(msg.storyCreatedAt);
                                    if (isExpired) {
                                      alert("This story is no longer available.");
                                      return;
                                    }
                                    let uploaderName = '';
                                    let uploaderAvatar = '';
                                    if (msg.storyUploaderId === msg.senderId) {
                                      uploaderName = msg.sender;
                                      uploaderAvatar = msg.senderAvatar || '/default-user-avatar.svg';
                                    } else if (msg.storyUploaderId === currentUserId) {
                                      uploaderName = session?.user?.name || 'You';
                                      uploaderAvatar = session?.user?.image || '/default-user-avatar.svg';
                                    } else {
                                      uploaderName = activeChatDetails?.name || 'User';
                                      uploaderAvatar = activeChatDetails?.avatar || '/default-user-avatar.svg';
                                    }
                                    openStoryViewer(msg.storyUploaderId, uploaderName, uploaderAvatar, msg.storyId);
                                  }}
                                  className="mb-2 p-2 rounded-xl bg-black/10 dark:bg-white/10 border-l-4 border-primary/70 text-left cursor-pointer hover:bg-black/15 dark:hover:bg-white/15 transition-colors flex items-center justify-between gap-3 overflow-hidden select-none"
                                >
                                  <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-primary dark:text-teal-400">
                                      {msg.isMe ? 'You replied to their story' : `${msg.sender} replied to your story`}
                                    </span>
                                    {isStoryExpired(msg.storyCreatedAt) ? (
                                      <span className="text-xs text-red-400 dark:text-red-400 italic flex items-center gap-1 font-semibold">
                                        🚫 This story is no longer available
                                      </span>
                                    ) : (
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">
                                        Replied to your story {msg.storyType || 'media'}
                                      </span>
                                    )}
                                  </div>
                                  {!isStoryExpired(msg.storyCreatedAt) && msg.storyThumbnail && (
                                    <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-zinc-950 flex items-center justify-center">
                                      {msg.storyType === 'video' ? (
                                        <div className="relative w-full h-full">
                                          <video 
                                            src={msg.storyThumbnail} 
                                            className="w-full h-full object-cover pointer-events-none" 
                                            preload="metadata"
                                            muted
                                            playsInline
                                          />
                                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                            <Play className="w-3 h-3 text-white fill-white" />
                                          </div>
                                        </div>
                                      ) : (
                                        <img 
                                          src={msg.storyThumbnail} 
                                          alt="" 
                                          className="w-full h-full object-cover pointer-events-none" 
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Message Content / Attachment / Shared Card */}
                              {msg.text.startsWith('[CALL_LOG]:') ? (
                                (() => {
                                  const parts = msg.text.split(':');
                                  const cType = parts[1]; // 'audio' | 'video'
                                  const cStatus = parts[2]; // 'connected' | 'missed' | 'declined' | 'busy'
                                  const cDuration = parseInt(parts[3] || '0', 10);
                                  
                                  const formattedDur = cDuration < 60 
                                    ? `${cDuration}s` 
                                    : `${Math.floor(cDuration / 60)}m ${cDuration % 60}s`;

                                  return (
                                    <div className="flex items-center gap-3 py-1 px-1.5 w-full select-none">
                                      <div className={`p-2 rounded-full flex-shrink-0 ${
                                        msg.isMe 
                                          ? 'bg-black/15 text-primary-foreground border border-white/10' 
                                          : cStatus === 'missed' 
                                            ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 dark:border-red-900/30' 
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-700/30'
                                      }`}>
                                        {cType === 'video' ? (
                                          cStatus === 'missed' ? <VideoOff className="w-5 h-5 shrink-0" /> : <Video className="w-5 h-5 shrink-0" />
                                        ) : (
                                          cStatus === 'missed' ? <PhoneOff className="w-5 h-5 shrink-0" /> : <Phone className="w-5 h-5 shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-grow text-left">
                                        <span className="text-[13px] font-bold tracking-tight block text-current">
                                          {cType === 'audio' ? 'Voice Call' : 'Video Call'}
                                        </span>
                                        <span className={`text-[11px] block mt-0.5 ${msg.isMe ? 'text-primary-foreground/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                          {msg.isMe ? 'Outgoing' : 'Incoming'} • {
                                            cStatus === 'connected' 
                                              ? `Answered (${formattedDur})` 
                                              : cStatus === 'missed' 
                                                ? 'Missed' 
                                                : cStatus === 'declined' 
                                                  ? 'Declined' 
                                                  : 'Busy'
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : msg.text.includes('__SHARED_CONTENT__:') ? (
                                (() => {
                                  try {
                                    const jsonIdx = msg.text.indexOf('__SHARED_CONTENT__:');
                                    const payload = JSON.parse(msg.text.substring(jsonIdx + 19));
                                    return <SharedContentCard payload={payload} />;
                                  } catch (e) {
                                    return (
                                      <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] flex-1 select-text">
                                        {msg.text}
                                      </p>
                                    );
                                  }
                                })()
                              ) : (() => {
                                const mediaInfo = detectMediaInfo(msg.mediaUrl, msg.text, msg.mediaResourceType);
                                if (mediaInfo) {
                                  return (
                                    <MediaAttachmentMessage
                                      mediaInfo={mediaInfo}
                                      isMe={msg.isMe}
                                      onOpenMediaViewer={(m) => setActiveMediaViewer({ ...m, sender: msg.sender })}
                                      uploadStatus={msg.uploadStatus}
                                      uploadProgress={msg.uploadProgress}
                                      onCancelUpload={() => handleCancelUpload(msg.id)}
                                      onRetryUpload={() => handleRetryUpload(msg)}
                                    />
                                  );
                                }
                                return (
                                  <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] flex-1 select-text">
                                    {msg.text}
                                  </p>
                                );
                              })()}

                              <div className="flex flex-wrap items-end justify-between gap-x-4 min-w-0 w-full">
                                
                                <div className={`inline-flex items-center gap-1 text-[9px] select-none ml-auto mt-0.5 shrink-0 ${msg.isMe ? 'text-primary-foreground/75' : 'text-gray-400 dark:text-zinc-500'}`}>
                                  <span>{msg.time}</span>
                                  {msg.isMe && (
                                    msg.id.startsWith('temp-') ? (
                                      <Clock className="w-3.5 h-3.5 text-primary-foreground/75 animate-pulse shrink-0" />
                                    ) : (
                                      <CheckCheck 
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          !activeChatDetails?.isGroup && msg.isRead 
                                            ? 'text-sky-300 dark:text-sky-400' 
                                            : 'text-primary-foreground/60'
                                        }`} 
                                        strokeWidth={2.5} 
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {typingUsers.length > 0 && (
                  <TypingIndicator
                    typingUsers={typingUsers}
                    isGroup={activeChatDetails?.isGroup || false}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Floating New Messages Pill */}
            {showNewMessagesBadge && (
              <button
                onClick={() => {
                  setShowNewMessagesBadge(false);
                  setIsNearBottom(true);
                  scrollToBottom('smooth');
                }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-extrabold px-4.5 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce z-30 transition-all border border-primary/20"
              >
                <MessageCircle className="w-3.5 h-3.5 animate-pulse" />
                New Messages
              </button>
            )}

            {/* Replying Box Preview */}
            {replyingToMessage && (
              <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-l-4 border-teal-500 z-20 flex items-center justify-between animate-in slide-in-from-bottom-2 shrink-0">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-teal-600 block">
                    Replying to {replyingToMessage.sender}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                    {replyingToMessage.text}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setReplyingToMessage(null)}
                  className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Input Row */}
            {isPending && activeChatDetails.requestSenderId && isRequestSender ? (
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-200 dark:border-gray-800 z-10 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/30 rounded-full flex items-center justify-center border border-yellow-200/50 dark:border-yellow-900/30">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 max-w-md leading-relaxed">
                  Your message request has been sent. You can continue chatting after the recipient accepts your request.
                </p>
              </div>
            ) : isPending && activeChatDetails.requestSenderId && !isRequestSender ? (
              <div className="p-5 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-zinc-950/20 border-t border-gray-200 dark:border-gray-800 z-10 flex flex-col items-center justify-center text-center gap-4">
                <div className="max-w-md">
                  <h3 className="font-extrabold text-[15px] text-gray-900 dark:text-white mb-1">
                    Message Request from {activeChatDetails.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-normal">
                    Do you want to let {activeChatDetails.name} message you? If you accept, they will be able to message you and see when you've read their messages.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full max-w-xs justify-center">
                  <Button 
                    onClick={() => handleRespondToRequest('decline')} 
                    variant="outline" 
                    className="flex-1 rounded-xl h-10 font-bold text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30 transition-all"
                  >
                    Decline
                  </Button>
                  <Button 
                    onClick={() => handleRespondToRequest('accept')} 
                    className="flex-1 rounded-xl h-10 font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-md transition-all"
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ) : isDeclined ? (
              <div className="p-5 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-200 dark:border-gray-800 z-10 flex flex-col items-center justify-center text-center gap-3">
                <p className="text-xs font-semibold text-gray-500 max-w-md">
                  {isRequestSender 
                    ? "This message request was declined by the recipient." 
                    : "You declined this conversation. If you want to chat, you can accept the request."}
                </p>
                {!isRequestSender && (
                  <Button 
                    onClick={() => handleRespondToRequest('accept')} 
                    className="rounded-xl h-9 px-6 font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-md transition-all"
                  >
                    Accept Request
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative p-3 lg:p-4 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-900 z-10 w-full overflow-visible shrink-0 min-h-[72px] pb-[calc(12px+env(safe-area-inset-bottom))]">
                
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-[76px] left-3 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/70 dark:border-zinc-800 p-3 w-[320px] max-w-[calc(100vw-24px)] animate-in slide-in-from-bottom-4 duration-200"
                  >
                    <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto scrollbar-none">
                      {COMMON_EMOJIS.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-xl p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center leading-none"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modern WhatsApp-Style Attachment Menu */}
                <AttachmentMenu
                  isOpen={showAttachmentModal}
                  onClose={() => setShowAttachmentModal(false)}
                  onSelectOption={handleSelectAttachmentOption}
                />

                {/* Hidden File Inputs */}
                <input 
                  ref={cameraInputRef} 
                  type="file" 
                  accept="image/*,video/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e)} 
                />
                <input 
                  ref={imageInputRef} 
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e, 'image')} 
                />
                <input 
                  ref={videoInputRef} 
                  type="file" 
                  accept="video/*" 
                  multiple
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e, 'video')} 
                />
                <input 
                  ref={audioInputRef} 
                  type="file" 
                  accept="audio/*" 
                  multiple
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e, 'audio')} 
                />
                <input 
                  ref={documentInputRef} 
                  type="file" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.zip,.rar,.7z,.tar,.gz,application/*,text/*" 
                  multiple
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e, 'document')} 
                />
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => handleFileInputChange(e)} 
                />

                {/* Input Row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-grow min-w-0 flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-full px-3 py-1.5 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80 focus-within:ring-2 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all duration-200">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setShowEmojiPicker(prev => !prev); setShowAttachmentModal(false); }}
                      className={`text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full h-8 w-8 flex-shrink-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center ${showEmojiPicker ? 'text-teal-600 dark:text-teal-400 bg-zinc-50 dark:bg-zinc-800' : ''}`}
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5 stroke-[1.5]" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setShowAttachmentModal(prev => !prev); setShowEmojiPicker(false); }}
                      className={`text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full h-8 w-8 flex-shrink-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center ${showAttachmentModal ? 'text-teal-600 dark:text-teal-400 bg-zinc-50 dark:bg-zinc-800' : ''}`}
                      title="Attach media or documents"
                    >
                      <Paperclip className="w-5 h-5 stroke-[1.5]" />
                    </Button>
                    
                    <textarea 
                      placeholder="Type a message..."
                      className="w-full min-w-0 max-h-32 min-h-[36px] bg-transparent border-none focus:ring-0 focus-visible:ring-0 resize-none py-1.5 text-sm sm:text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none leading-relaxed select-text"
                      rows={1}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (activeChat && e.target.value.trim()) {
                          emitTyping(activeChat, true);
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          typingTimeoutRef.current = setTimeout(() => {
                            emitTyping(activeChat, false);
                          }, 2000);
                        } else if (!e.target.value.trim()) {
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          emitTyping(activeChat, false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    ></textarea>
                  </div>
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isUploadingAttachment}
                    size="icon" 
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-tr from-primary to-teal-600 hover:from-primary/95 hover:to-teal-500 active:scale-95 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 flex items-center justify-center disabled:opacity-50"
                    title="Send message"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-[18px] h-[18px] ml-0.5 stroke-[1.5]" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ── WhatsApp-Style Pre-Send Attachment Preview Modal ── */}
            <AttachmentPreviewModal
              isOpen={showPreviewModal}
              items={pendingAttachments}
              onClose={() => {
                pendingAttachments.forEach(p => {
                  if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl);
                });
                setPendingAttachments([]);
                setShowPreviewModal(false);
              }}
              onSend={handleSendAttachments}
              onRemoveItem={handleRemovePendingItem}
              onAddMore={handleAddMorePending}
              onReplaceItem={handleReplacePendingItem}
            />

            {/* ── Slide-out Group Details Panel (Responsive Right-Sidebar) ── */}
            {showGroupInfo && activeChatDetails?.isGroup && (
              <div className="fixed inset-0 z-50 flex">
                <div className="flex-1 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setShowGroupInfo(false)} />
                <div className="w-full max-w-sm bg-white dark:bg-zinc-950 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-zinc-100 dark:border-zinc-900">
                  {/* Panel Header */}
                  <div className="h-14 flex items-center gap-3 px-4 bg-primary text-primary-foreground flex-shrink-0 shadow-md">
                    <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(false)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full h-9 w-9">
                      <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                    </Button>
                    <h2 className="font-bold text-base">Group Info</h2>
                  </div>

                  {/* Body Content */}
                  <ScrollArea className="flex-1">
                    {loadingGroupDetails ? (
                      <div className="p-6 space-y-6">
                        <div className="flex flex-col items-center gap-3">
                          <Skeleton className="w-24 h-24 rounded-full" />
                          <Skeleton className="h-5 w-32 rounded" />
                          <Skeleton className="h-4 w-24 rounded" />
                        </div>
                        <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                          <Skeleton className="h-4 w-20 rounded" />
                          <div className="flex gap-3 items-center"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="h-4 w-28 rounded" /></div>
                          <div className="flex gap-3 items-center"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="h-4 w-28 rounded" /></div>
                        </div>
                      </div>
                    ) : groupDetails ? (
                      <div className="flex flex-col">
                        <div className="flex flex-col items-center py-8 bg-zinc-50 dark:bg-zinc-900/40 gap-3 border-b border-zinc-100 dark:border-zinc-900">
                          <Avatar className="w-24 h-24 border-4 border-white dark:border-zinc-800 shadow-lg select-none">
                            <AvatarImage src={groupDetails.groupInfo.avatar} />
                            <AvatarFallback className="text-3xl font-bold bg-teal-50 text-teal-800">{groupDetails.groupInfo.name ? groupDetails.groupInfo.name[0] : 'G'}</AvatarFallback>
                          </Avatar>
                          <div className="text-center px-4">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{groupDetails.groupInfo.name}</h3>
                            <p className="text-xs text-gray-500 mt-1.5 font-semibold">Group · {groupDetails.members.length} members</p>
                          </div>
                          <p className="text-xs text-center text-gray-500 dark:text-zinc-400 px-6 mt-1 leading-relaxed whitespace-pre-wrap select-text">
                            {groupDetails.groupInfo.description}
                          </p>
                        </div>

                        {/* Members List */}
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900">
                          <div 
                            onClick={() => setShowGroupMembersModal(true)}
                            className="flex justify-between items-center mb-3 cursor-pointer hover:opacity-80 group"
                          >
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:underline">
                              Members ({groupDetails.members.length})
                            </h4>
                            <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 font-extrabold px-2 py-0.5 rounded-full select-none">
                              {groupDetails.members.filter((m: any) => m.isOnline).length} Online
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                            {groupDetails.members.map((member: any) => (
                              <div 
                                key={member.id} 
                                onClick={() => {
                                  navigateToProfile(member.username, member.id);
                                  setShowGroupInfo(false);
                                }}
                                className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar className="w-8 h-8 border border-zinc-100 dark:border-zinc-800 select-none">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback className="text-[10px] font-bold bg-teal-50 text-teal-800">{member.name ? member.name[0] : 'M'}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                      {member.name} {member.id === currentUserId && "(You)"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">@{member.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 select-none">
                                  {member.role === 'admin' && (
                                    <span className="text-[10px] font-bold bg-primary text-white dark:bg-teal-600 dark:text-white px-2 py-0.5 rounded-full">
                                      Admin
                                    </span>
                                  )}
                                  {member.isOnline && (
                                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shared Media Assets */}
                        {groupDetails.media.length > 0 && (
                          <div className="p-4 border-b border-zinc-100 dark:border-zinc-900">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                              Shared Media
                            </h4>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                              {groupDetails.media.map((med: any) => (
                                <a 
                                  key={med.id} 
                                  href={med.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="aspect-square rounded-lg overflow-hidden border border-zinc-200/50 dark:border-zinc-800 bg-zinc-50 dark:bg-black/30 group hover:opacity-90 transition-opacity"
                                >
                                  {med.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                                    <video src={med.mediaUrl} className="w-full h-full object-cover" preload="metadata" />
                                  ) : (
                                    <img src={med.mediaUrl} alt="Shared item" className="w-full h-full object-cover" />
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Leave/Mute Actions */}
                        <div className="p-4 space-y-1">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Actions</h4>
                          <button
                            onClick={() => { setShowGroupInfo(false); handleMuteGroup(activeChatDetails.toleeId, activeChatDetails.isMuted ? undefined : '8h'); }}
                            className="flex items-center gap-3 w-full py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-teal-600 transition-colors"
                          >
                            <BellOff className="w-4 h-4 flex-shrink-0" />
                            {activeChatDetails.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                          </button>
                          <button
                            onClick={() => { setShowGroupInfo(false); handleLeaveGroup(activeChatDetails.toleeId); }}
                            className="flex items-center gap-3 w-full py-2.5 text-left text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                          >
                            <LogOut className="w-4 h-4 flex-shrink-0" />
                            Leave Group
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-gray-400">Failed to load group details.</div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Immersive WhatsApp-style Context Menu */}
            {contextMenu && (
              <div 
                className="fixed bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl shadow-2xl py-1.5 w-44 z-[9999] animate-in zoom-in-95 duration-100"
                style={{
                  top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : 500),
                  left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : 300)
                }}
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(contextMenu.message.text);
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Copy className="w-4 h-4 text-zinc-400" />
                  Copy Message
                </button>
                <button 
                  onClick={() => {
                    setReplyingToMessage(contextMenu.message);
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Reply className="w-4 h-4 text-zinc-400" />
                  Reply in Chat
                </button>
                {activeChatDetails.isGroup && !contextMenu.message.isMe && (
                  <button 
                    onClick={() => {
                      handlePrivateReply(contextMenu.message);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <ArrowRight className="w-4 h-4 text-teal-500" />
                    Reply Privately
                  </button>
                )}
                {contextMenu.message.isMe && (
                  <>
                    <DropdownMenuSeparator className="my-1 border-zinc-100 dark:border-zinc-800" />
                    <button 
                      onClick={() => {
                        handleMessageDelete(contextMenu.message.id);
                        setContextMenu(null);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      Delete Message
                    </button>
                  </>
                )}
              </div>
            )}

          </>
        ) : nonMemberGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 select-none max-w-lg mx-auto space-y-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-[#0a7c85]/20 shadow-md">
                <AvatarImage src={nonMemberGroup.avatar || '/default-tolee-avatar.svg'} />
                <AvatarFallback className="text-2xl bg-zinc-200 text-zinc-700">{nonMemberGroup.name ? nonMemberGroup.name[0]?.toUpperCase() : 'G'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{nonMemberGroup.name}</h2>
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">
                {nonMemberGroup._count?.members || 0} Members
              </p>
              {nonMemberGroup.description && (
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto italic">
                  "{nonMemberGroup.description}"
                </p>
              )}
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 p-5 rounded-2xl space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-[13px] font-bold text-zinc-600 dark:text-zinc-400">
                Join this Tolee to participate in the group chat.
              </p>
            </div>
            <Button
              onClick={async () => {
                setIsJoiningGroup(true);
                try {
                  const res = await fetch('/api/tolee/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toleeId: nonMemberGroup.id })
                  }).then(r => r.json());

                  if (res.success) {
                    await fetchChats();
                    setNonMemberGroup(null);
                  } else {
                    alert(res.error || 'Failed to join group.');
                  }
                } catch (err: any) {
                  alert(err.message || 'Error joining group.');
                } finally {
                  setIsJoiningGroup(false);
                }
              }}
              disabled={isJoiningGroup}
              className="px-8 py-3 rounded-full font-bold bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white shadow-md transition-all active:scale-95"
            >
              {isJoiningGroup ? 'Joining...' : nonMemberGroup.isPrivate ? 'Request to Join Group' : 'Join Group'}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 select-none">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tolee Web</h2>
            <p className="text-gray-500 max-w-md text-sm leading-relaxed">
              Send and receive messages without keeping your phone online. 
              <br />Use Tolee on up to 4 linked devices and 1 phone at the same time.
            </p>
          </div>
        )}
      </div>

      {/* ── Immersive WhatsApp/Instagram style Fullscreen Story/Status Viewer ── */}
      {activeStoryUser && activeStories.length > 0 && (
        <StoryViewer
          isOpen={!!activeStoryUser}
          onClose={closeStoryViewer}
          storyGroups={[{
            user: {
              id: activeStoryUser.id,
              username: activeStoryUser.name,
              name: activeStoryUser.name,
              avatar: activeStoryUser.avatar
            },
            stories: activeStories,
            hasUnviewed: activeStories.some(s => !s.viewed)
          }]}
          initialGroupIndex={0}
          initialSlideId={selectedStorySlideId || undefined}
          currentUserId={currentUserId}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* ── Call Interface System ── */}
      <CallInterface 
        activeRecipientId={activeChatDetails?.isGroup ? null : activeChatDetails?.otherUserId}
        activeRecipientName={activeChatDetails?.name}
        activeRecipientAvatar={activeChatDetails?.avatar}
      />

      {/* ── Call History Logs Modal ── */}
      {showCallLogsModal && (
        <Dialog open={showCallLogsModal} onOpenChange={setShowCallLogsModal}>
          <DialogContent className="sm:max-w-md bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-400 animate-pulse" />
                Call History
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                View your recent voice and video call logs.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-72 mt-4 pr-1">
              {loadingCallLogs ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-12 w-full rounded-xl bg-zinc-900" />
                  <Skeleton className="h-12 w-full rounded-xl bg-zinc-900" />
                  <Skeleton className="h-12 w-full rounded-xl bg-zinc-900" />
                </div>
              ) : callLogs.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm font-semibold">
                  No call logs recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {callLogs.map((log: any) => {
                    const isOutgoing = log.callerId === currentUserId;
                    const partnerUser = isOutgoing ? log.receiver : log.caller;
                    const isMissed = log.status === 'missed';
                    const isDeclined = log.status === 'declined';
                    const isBusy = log.status === 'busy';
                    const isConnected = log.status === 'connected';
                    
                    const formatCallDur = (secs: number) => {
                      if (secs < 60) return `${secs}s`;
                      return `${Math.floor(secs / 60)}m ${secs % 60}s`;
                    };
                    
                    return (
                      <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-9 h-9 border border-zinc-800 shrink-0">
                            <AvatarImage src={partnerUser?.avatar || partnerUser?.image || '/default-user-avatar.svg'} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">
                              {partnerUser?.name ? partnerUser.name[0].toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {partnerUser?.name || partnerUser?.username || 'Tolee User'}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                              {log.type === 'video' ? (
                                <Video className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              ) : (
                                <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              )}
                              <span className="truncate">
                                {isOutgoing ? 'Outgoing' : 'Incoming'} •{' '}
                                {isConnected ? (
                                  <span className="text-emerald-400 font-semibold">Connected ({formatCallDur(log.duration)})</span>
                                ) : isMissed ? (
                                  <span className="text-red-400 font-semibold">Missed</span>
                                ) : isDeclined ? (
                                  <span className="text-amber-500 font-semibold">Declined</span>
                                ) : (
                                  <span className="text-zinc-500 font-semibold">Busy</span>
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteCallLog(log.id);
                            }}
                            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-full"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Group Members List Popup Modal ── */}
      {showGroupMembersModal && groupDetails && (
        <Dialog open={showGroupMembersModal} onOpenChange={setShowGroupMembersModal}>
          <DialogContent className="sm:max-w-md bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                {groupDetails.groupInfo.name} Members
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {groupDetails.members.length} members ({groupDetails.members.filter((m: any) => m.isOnline).length} online)
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-80 mt-4 pr-1">
              <div className="space-y-3">
                {groupDetails.members.map((member: any) => (
                  <div 
                    key={member.id} 
                    onClick={() => {
                      navigateToProfile(member.username, member.id);
                      setShowGroupMembersModal(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-9 h-9 border border-zinc-800 shrink-0">
                        <AvatarImage src={member.avatar || '/default-user-avatar.svg'} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">
                          {member.name ? member.name[0].toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {member.name} {member.id === currentUserId && "(You)"}
                        </p>
                        <p className="text-[10px] text-zinc-400">@{member.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 select-none">
                      {member.role === 'admin' && (
                        <span className="text-[10px] font-bold bg-primary text-white dark:bg-teal-600 dark:text-white px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                      {member.isOnline && (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-zinc-950 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Full-Screen WhatsApp-Style Media Viewer Modal (Images & Videos) ── */}
      {activeMediaViewer && (
        <MediaViewerModal
          media={activeMediaViewer}
          onClose={() => setActiveMediaViewer(null)}
        />
      )}

    </div>
  );
}
