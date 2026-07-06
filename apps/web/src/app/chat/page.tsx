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
import { 
  Search, MoreVertical, Phone, Video, Paperclip, Smile, Send, Check, CheckCheck, 
  EyeOff, Users, ShieldCheck, PlusCircle, MessageCircle, ChevronLeft, X, 
  Image as ImageIcon, AlertCircle, BellOff, LogOut, Clock, Copy, Reply, Trash2, ArrowRight,
  PhoneOff, VideoOff, Play
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
import { muteGroupNotifications, leaveToleeGroup } from '@/actions/tolee';
import { 
  getUserPromotionPreferences, 
  incrementShootClick 
} from '@/actions/shoot';
import { getCallLogs, deleteCallLog } from '@/actions/calls';
import { CallInterface } from '@/components/CallInterface';
import { checkPostAvailability } from '@/actions/post';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper to merge polled messages without overwriting loaded scroll history or duplicating optimistic items
function mergePollMessages(oldMsgs: any[] = [], pollMsgs: any[] = []) {
  if (oldMsgs.length === 0) return pollMsgs;
  if (pollMsgs.length === 0) return oldMsgs;

  const merged = [...oldMsgs];

  for (const newMsg of pollMsgs) {
    const existingIndex = merged.findIndex(m => m.id === newMsg.id);
    if (existingIndex > -1) {
      merged[existingIndex] = { ...merged[existingIndex], ...newMsg };
    } else {
      const tempIndex = merged.findIndex(m => 
        m.id.startsWith('temp-') && 
        m.text === newMsg.text && 
        newMsg.isMe
      );
      if (tempIndex > -1) {
        merged[tempIndex] = newMsg;
      } else {
        merged.push(newMsg);
      }
    }
  }
  return merged;
}

const formatLastMessage = (msgText: string) => {
  if (!msgText) return 'No messages yet.';
  
  const prefixMatch = msgText.match(/^([^:]+):\s*__SHARED_CONTENT__:(.*)$/);
  const isPlainShared = msgText.startsWith('__SHARED_CONTENT___') || msgText.startsWith('__SHARED_CONTENT__:');
  
  if (prefixMatch || isPlainShared) {
    try {
      const jsonStr = prefixMatch ? prefixMatch[2] : msgText.substring(19);
      const sender = prefixMatch ? `${prefixMatch[1]}: ` : '';
      const payload = JSON.parse(jsonStr);
      if (payload.type === 'shared_video') {
        return `${sender}🎥 Shared a Video`;
      }
      if (payload.type === 'shared_post') {
        return `${sender}🖼️ Shared a Post`;
      }
      return `${sender}🔗 Shared Content`;
    } catch (e) {
      return msgText;
    }
  }
  
  if (msgText.includes('[CALL_LOG]:')) {
    return '📞 Call Log';
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
  };
}

function SharedContentCard({ payload }: SharedContentCardProps) {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (payload.videoId) {
      checkPostAvailability(payload.videoId).then((res) => {
        if (active) {
          setAvailable(res.success ? res.available : false);
        }
      });
    } else {
      setAvailable(false);
    }
    return () => {
      active = false;
    };
  }, [payload.videoId]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (available) {
      router.push(`/reels?videoId=${payload.videoId}`);
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
      <div className="w-64 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 p-4 text-center select-none">
        <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-500 mb-2" />
        <p className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400">This video is no longer available.</p>
      </div>
    );
  }

  return (
    <div 
      onClick={handleCardClick}
      className="w-64 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-850/80 rounded-2xl border border-zinc-250/60 dark:border-zinc-800 shadow-sm cursor-pointer overflow-hidden transition-all duration-200 select-none group"
    >
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {payload.thumbnailUrl ? (
          <img 
            src={payload.thumbnailUrl} 
            alt="Shared Video Preview" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <span className="text-[11px] text-zinc-500">No Preview</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
          <div className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="w-5.5 h-5.5 border border-zinc-200 dark:border-zinc-700">
              <AvatarImage src={payload.creatorAvatar} />
              <AvatarFallback className="text-[8px] bg-zinc-200 text-zinc-700">{payload.creatorName?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
              @{payload.creatorUsername}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 break-all">
            {payload.title}
          </p>
          {payload.caption && payload.caption !== payload.title && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2 break-words">
              {payload.caption}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/60">
          <span className="flex items-center gap-0.5">👁 {payload.viewsCount || '0'}</span>
          <span className="flex items-center gap-0.5">❤️ {payload.likesCount || '0'}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const queryChatId = searchParams?.get('chatId') || searchParams?.get('id') || '';
  const queryToleeId = searchParams?.get('toleeId') || '';

  const [activeChat, setActiveChat] = useState<string>('');
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
  const [messagesByChat, setMessagesByChat] = useState<Record<string, any[]>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

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

  // --- Attachment Modal ---
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  const fetchChats = async () => {
    const res = await fetchRealChatData();
    if (res.success && res.chats && res.messagesByChat) {
      setChats(res.chats);
      
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
      if (queryToleeId && !activeChat) {
        const matchedChat = res.chats.find(c => c.toleeId === queryToleeId);
        if (matchedChat) {
          setActiveChat(matchedChat.id);
          currentActive = matchedChat.id;
        }
      }

      if (!currentActive && queryChatId && !activeChat) {
        setActiveChat(queryChatId);
        currentActive = queryChatId;
      } else if (res.chats.length > 0 && !activeChat) {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          setActiveChat(res.chats[0].id);
          currentActive = res.chats[0].id;
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

  useEffect(() => {
    const activeChatDetails = chats.find(c => c.id === activeChat);
    if (activeChatDetails && activeChatDetails.isPromotion) {
      getUserPromotionPreferences(activeChatDetails.otherUserId).then(res => {
        if (res.success) {
          setPromoPrefs({
            receivePromotions: res.receivePromotions,
            isMuted: res.isMuted
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

  const activeChatRef = useRef(activeChat);
  
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
        const exists = res.stories.some(s => s.id === storyId);
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

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachmentModal(false);
    setNewMessage(prev => prev ? prev + ` [📎 ${file.name}]` : `[📎 ${file.name}]`);
    e.target.value = '';
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
          fm => !existing.some(em => em.id === fm.id)
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
      const res = await muteGroupNotifications(toleeId, duration);
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
        const res = await leaveToleeGroup(toleeId);
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
    if (!newMessage.trim()) return;
    if (!activeChat) return;

    const tempId = 'temp-' + Date.now();
    const newMsg = {
      id: tempId,
      sender: 'Me',
      senderAvatar: session?.user?.image || '/default-user-avatar.svg',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      replyTo: replyingToMessage ? {
        id: replyingToMessage.id,
        text: replyingToMessage.text,
        sender: replyingToMessage.sender
      } : null
    };
    
    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMsg]
    }));
    
    setChats(prev => prev.map(chat => 
      chat.id === activeChat 
        ? { ...chat, lastMessage: `Me: ${newMessage}`, time: newMsg.time }
        : chat
    ));
    
    const contentToSend = newMessage;
    const parentIdToSend = replyingToMessage?.id;
    setNewMessage('');
    setReplyingToMessage(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(activeChat, false);

    const res = await sendRealChatMessage(activeChat, contentToSend, parentIdToSend);
    if (res.success && res.message) {
      setMessagesByChat(prev => {
        const msgs = prev[activeChat] || [];
        return {
          ...prev,
          [activeChat]: msgs.map(m => m.id === tempId ? res.message : m)
        };
      });
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
  const currentUserId = (session?.user as any)?.id;
  const isRequestSender = isPersonalDM && activeChatDetails.requestSenderId === currentUserId;

  const filteredChats = chats.filter(chat => {
    if (activeSidebarTab === 'groups') {
      if (!chat.isGroup) return false;
    } else if (activeSidebarTab === 'personal') {
      if (chat.isGroup) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        chat.name?.toLowerCase().includes(q) || 
        chat.username?.toLowerCase().includes(q) || 
        chat.lastMessage?.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 w-9">
                  <MoreVertical className="w-5 h-5 stroke-[1.5]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-zinc-150/80 dark:border-zinc-900 bg-zinc-950 text-white">
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
        <ScrollArea className="flex-1">
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
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm leading-relaxed">
              {searchQuery 
                ? 'No conversations matched your search.' 
                : activeSidebarTab === 'groups' 
                  ? "You haven't joined any Tolees yet." 
                  : "No personal conversations yet."}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredChats.map((chat) => (
                <div 
                  key={chat.id} 
                  onClick={() => {
                    setActiveChat(chat.id);
                    markChatNotificationsAsRead(chat.id);
                  }}
                  className={`flex items-center gap-3 p-3 mx-2 rounded-2xl cursor-pointer transition-all duration-200 ${
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
                          <AvatarFallback>{chat.name[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {(chat.online === 'Online') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#121212] rounded-full z-10"></div>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`font-semibold text-[15px] truncate flex items-center gap-1.5 ${activeChat === chat.id ? 'text-primary dark:text-zinc-100' : 'text-gray-900 dark:text-white'}`}>
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
                      <span className={`text-xs whitespace-nowrap ml-2 ${chat.unread > 0 ? 'text-primary dark:text-teal-400 font-bold' : 'text-gray-500'}`}>
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-2">
                        {formatLastMessage(chat.lastMessage)}
                      </p>
                      {chat.unread > 0 && (
                        <div className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
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
            <div className="h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-150/80 dark:border-zinc-900 z-20 min-w-0 shadow-sm sticky top-0">
              <div 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 flex-1"
                onClick={() => {
                  if (!activeChatDetails.isGroup && activeChatDetails.username) {
                    router.push(`/u/${activeChatDetails.username}`);
                  } else if (activeChatDetails.isGroup) {
                    handleGroupDetailsOpen();
                    setShowGroupMembersModal(true);
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
                      <AvatarFallback className="bg-teal-50 text-teal-850 dark:bg-zinc-800 dark:text-teal-355 font-bold">
                        {activeChatDetails.name[0]?.toUpperCase()}
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
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-primary dark:hover:text-teal-400 rounded-full hover:bg-zinc-100/60 dark:hover:bg-zinc-900 h-9 w-9 p-0 flex items-center justify-center transition-all duration-200">
                        <MoreVertical className="w-4.5 h-4.5 stroke-[2]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-zinc-150/80 dark:border-zinc-900">
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
                          <DropdownMenuSubContent className="rounded-xl shadow-lg border-zinc-150/80 dark:border-zinc-900">
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
              <div className="px-4 py-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-150/80 dark:border-zinc-900 z-20 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
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

            {/* Messages Area */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-3 lg:p-6 z-10 overflow-y-auto h-full scroll-smooth scrollbar-none"
            >
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
                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 mt-0.5 shadow-sm border border-zinc-200/50 dark:border-zinc-800/85">
                              <AvatarImage src={msg.senderAvatar} />
                              <AvatarFallback className="bg-teal-50 text-teal-850 dark:bg-zinc-850 dark:text-teal-355 font-bold text-xs">
                                {msg.sender[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className="flex flex-col max-w-[82%] sm:max-w-[70%] min-w-0">
                            {!msg.isMe && activeChatDetails.isGroup && (
                              <span className="text-[11px] text-gray-500 font-semibold mb-0.5 ml-1 truncate">{msg.sender}</span>
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
                              onTouchEnd={handleMessagePressEnd}
                            >
                              {/* Quoted Reply rendering inside bubbles */}
                              {msg.replyTo && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToMessageId(msg.replyTo.id);
                                  }}
                                  className="mb-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 border-l-4 border-primary text-left cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                  <p className="text-[10px] font-bold text-primary dark:text-teal-400 truncate">
                                    {msg.replyTo.sender}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate leading-snug">
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
                                    } else if (msg.storyUploaderId === userId) {
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

                              {/* Media Attachments */}
                              {msg.mediaUrl && (
                                <div className="mt-0.5 mb-1.5 rounded-xl overflow-hidden max-w-full border border-zinc-200/40 dark:border-zinc-800/80 shadow-sm bg-zinc-50 dark:bg-black/30">
                                  {msg.mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) || msg.mediaUrl.includes('video') ? (
                                    <video 
                                      src={msg.mediaUrl} 
                                      controls 
                                      preload="metadata" 
                                      className="max-h-60 w-full object-cover rounded-xl"
                                    />
                                  ) : (
                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="block relative group cursor-pointer overflow-hidden rounded-xl">
                                      <img 
                                        src={msg.mediaUrl} 
                                        alt="Shared media" 
                                        loading="lazy"
                                        className="max-h-60 w-full object-cover transition-transform duration-300 group-hover:scale-102"
                                      />
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap items-end justify-between gap-x-4 min-w-0 w-full">
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
                                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-zinc-200/40 dark:border-zinc-700/30'
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
                                ) : msg.text.startsWith('__SHARED_CONTENT__:') ? (
                                  (() => {
                                    try {
                                      const payload = JSON.parse(msg.text.substring(19));
                                      return <SharedContentCard payload={payload} />;
                                    } catch (e) {
                                      return (
                                        <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] flex-1 select-text">
                                          {msg.text}
                                        </p>
                                      );
                                    }
                                  })()
                                ) : (
                                  <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] flex-1 select-text">
                                    {msg.text}
                                  </p>
                                )}
                                
                                <div className={`inline-flex items-center gap-1 text-[9px] select-none ml-auto mt-0.5 shrink-0 ${msg.isMe ? 'text-primary-foreground/75' : 'text-gray-400 dark:text-zinc-500'}`}>
                                  <span>{msg.time}</span>
                                  {msg.isMe && (
                                    msg.id.startsWith('temp-') ? (
                                      <Clock className="w-3.5 h-3.5 text-primary-foreground/75 animate-pulse shrink-0" />
                                    ) : (
                                      <CheckCheck 
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          !activeChatDetails?.isGroup && msg.isRead 
                                            ? 'text-sky-300 dark:text-sky-350' 
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
              <div className="relative p-3 lg:p-4 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-150/80 dark:border-zinc-900 z-10 w-full overflow-visible shrink-0 min-h-[72px] pb-[calc(12px+env(safe-area-inset-bottom))]">
                
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

                {/* Attachment Modal Popup */}
                {showAttachmentModal && (
                  <div
                    id="attachment-modal"
                    className="absolute bottom-[76px] left-14 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/70 dark:border-zinc-800 p-2 w-52 animate-in slide-in-from-bottom-4 duration-200"
                  >
                    <button
                      onClick={() => { imageInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      <span className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Photo
                    </button>
                    <button
                      onClick={() => { videoInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-500 dark:text-red-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Video
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      <span className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-500 dark:text-blue-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      Document
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />
                <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileSelected} />

                {/* Input Row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-grow min-w-0 flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-full px-3 py-1.5 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80 focus-within:ring-2 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all duration-200">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setShowEmojiPicker(prev => !prev); setShowAttachmentModal(false); }}
                      className={`text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full h-8 w-8 flex-shrink-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center ${showEmojiPicker ? 'text-teal-600 dark:text-teal-400 bg-zinc-50 dark:bg-zinc-800' : ''}`}
                    >
                      <Smile className="w-5 h-5 stroke-[1.5]" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setShowAttachmentModal(prev => !prev); setShowEmojiPicker(false); }}
                      className={`text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full h-8 w-8 flex-shrink-0 p-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center ${showAttachmentModal ? 'text-teal-600 dark:text-teal-400 bg-zinc-50 dark:bg-zinc-800' : ''}`}
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
                    size="icon" 
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-tr from-primary to-teal-600 hover:from-primary/95 hover:to-teal-500 active:scale-95 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 flex items-center justify-center"
                  >
                    <Send className="w-[18px] h-[18px] ml-0.5 stroke-[1.5]" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Slide-out Group Details Panel (Responsive Right-Sidebar) ── */}
            {showGroupInfo && activeChatDetails?.isGroup && (
              <div className="fixed inset-0 z-50 flex">
                <div className="flex-1 bg-black/20 dark:bg-black/40 backdrop-blur-xs" onClick={() => setShowGroupInfo(false)} />
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
                          <Avatar className="w-24 h-24 border-4 border-white dark:border-zinc-850 shadow-lg select-none">
                            <AvatarImage src={groupDetails.groupInfo.avatar} />
                            <AvatarFallback className="text-3xl font-bold bg-teal-50 text-teal-800">{groupDetails.groupInfo.name[0]}</AvatarFallback>
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
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
                                  if (member.id !== currentUserId) {
                                    router.push(`/u/${member.username}`);
                                    setShowGroupInfo(false);
                                  }
                                }}
                                className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar className="w-8 h-8 border border-zinc-100 dark:border-zinc-800 select-none">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback className="text-[10px] font-bold bg-teal-50 text-teal-850">{member.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                      {member.name} {member.id === currentUserId && "(You)"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">@{member.username}</p>
                                  </div>
                                </div>
                                {member.isOnline && (
                                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 select-none"></span>
                                )}
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
                className="fixed bg-white dark:bg-zinc-900 border border-zinc-250/50 dark:border-zinc-800/80 rounded-2xl shadow-2xl py-1.5 w-44 z-[9999] animate-in zoom-in-95 duration-100"
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
                            <p className="text-[10px] text-zinc-455 mt-0.5 flex items-center gap-1.5">
                              {log.type === 'video' ? (
                                <Video className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              ) : (
                                <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              )}
                              <span className="truncate">
                                {isOutgoing ? 'Outgoing' : 'Incoming'} •{' '}
                                {isConnected ? (
                                  <span className="text-emerald-455 font-semibold">Connected ({formatCallDur(log.duration)})</span>
                                ) : isMissed ? (
                                  <span className="text-red-455 font-semibold">Missed</span>
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
                      if (member.id !== currentUserId) {
                        router.push(`/u/${member.username}`);
                        setShowGroupMembersModal(false);
                      }
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
                    {member.isOnline && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-zinc-950 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
