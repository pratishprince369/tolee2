'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, X, Loader2, Check, Link as LinkIcon, Copy, Send, Sparkles, 
  Users, UserPlus, Download, MessageSquare, Plus, Share2, ExternalLink
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { 
  getRecentShareRecipients, 
  RecentShareRecipient, 
  incrementShareCount, 
  sharePostToFriends 
} from '@/actions/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryEditor } from '@/components/StoryEditor';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  shareUrl: string;
  previewText: string;
  onShareSuccess?: (newShareCount: number) => void;
  postMediaUrl?: string | null;
  postMediaType?: string | null;
  postAuthor?: string | null;
  postAuthorAvatar?: string | null;
  postCaption?: string | null;
}

// Brand SVG Icons for WhatsApp, Facebook, Messenger & Threads
const WhatsAppIcon = ({ className = "w-5 h-5 text-white" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5 text-white" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const MessengerIcon = ({ className = "w-5 h-5 text-white" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.745 6.616 4.472 8.652V24l4.088-2.244c1.077.299 2.222.465 3.44.465 6.627 0 12-4.975 12-11.11C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.89-3.259-6.56 6.963z"/>
  </svg>
);

const ThreadsIcon = ({ className = "w-5 h-5 text-white" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24C5.506 24 0 18.528 0 12.001 0 5.474 5.506 0 12.186 0c6.68 0 12.186 5.474 12.186 12.001 0 6.527-5.506 11.999-12.186 11.999zm0-22.154c-5.688 0-10.316 4.555-10.316 10.155s4.628 10.154 10.316 10.154c5.688 0 10.316-4.554 10.316-10.154S17.874 1.846 12.186 1.846zm3.328 11.666c-.161-.264-.403-.456-.704-.564.07-.487.054-.972-.05-1.428-.158-.69-.536-1.284-1.096-1.722-.654-.51-1.503-.787-2.457-.798-1.077.012-2.02.357-2.727 1.001-.767.697-1.18 1.675-1.163 2.753.018 1.137.498 2.14 1.353 2.825.828.665 1.905.999 3.116.967 1.13-.03 2.14-.383 2.92-1.02.327-.267.487-.645.437-1.034-.05-.389-.304-.707-.678-.85-.373-.141-.8-.093-1.134.133-.509.344-1.157.533-1.874.548-.828.016-1.558-.203-2.112-.633-.518-.403-.822-.988-.856-1.648h6.41c.264.004.519-.102.707-.29.189-.188.291-.444.283-.71-.005-.182-.041-.355-.102-.519z"/>
  </svg>
);

export function ShareModal({
  isOpen,
  onClose,
  postId,
  shareUrl,
  previewText,
  onShareSuccess,
  postMediaUrl,
  postMediaType,
  postAuthor,
  postAuthorAvatar,
  postCaption
}: ShareModalProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recipients, setRecipients] = useState<RecentShareRecipient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Swipe / Drag to dismiss support
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef<boolean>(false);

  // Story Editor
  const [isStoryEditorOpen, setIsStoryEditorOpen] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');

  // Compute clean, permanent share URL
  const finalShareUrl = shareUrl && shareUrl.trim() !== ''
    ? shareUrl
    : typeof window !== 'undefined' && window.location.origin
    ? `${window.location.origin}/post/${postId}`
    : `https://tolee.in/post/${postId}`;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Fetch recent chat contacts
  const loadRecipients = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const res = await getRecentShareRecipients(query);
      if (res.success && res.recipients) {
        setRecipients(res.recipients);
      } else {
        setRecipients([]);
      }
    } catch (err) {
      console.error('Error fetching share recipients in ShareModal:', err);
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery('');
      setDragOffset(0);
      loadRecipients();
    }
  }, [isOpen, loadRecipients]);

  // Debounced live search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadRecipients(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, loadRecipients]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Toggle recipient selection
  const handleToggleRecipient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Internal Send to selected recipients (Personal Chat & Group Chat)
  const handleSendToSelected = async () => {
    if (selectedIds.length === 0) return;
    setSharing(true);
    try {
      const res = await sharePostToFriends(postId, selectedIds, finalShareUrl, previewText);
      if (res.success) {
        if (onShareSuccess && res.shareCount !== undefined) {
          onShareSuccess(res.shareCount);
        }
        showToast(`Sent to ${selectedIds.length} conversation${selectedIds.length > 1 ? 's' : ''}!`);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        showToast(res.error || 'Failed to send');
      }
    } catch (err) {
      console.error('Error sharing post to friends:', err);
      showToast('Something went wrong while sending.');
    } finally {
      setSharing(false);
    }
  };

  // Copy Link action
  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(finalShareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = finalShareUrl;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      showToast('Link copied successfully');
      const res = await incrementShareCount(postId);
      if (res.success && res.shareCount !== undefined && onShareSuccess) {
        onShareSuccess(res.shareCount);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      showToast('Failed to copy link');
    }
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    const shareTitle = 'Tolee Content';
    const shareText = previewText || 'Check out this post on Tolee!';

    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: shareTitle,
          text: shareText,
          url: finalShareUrl,
        });

        const res = await incrementShareCount(postId);
        if (res.success && res.shareCount !== undefined && onShareSuccess) {
          onShareSuccess(res.shareCount);
        }
        onClose();
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: copy link
    await handleCopyLink();
  };

  // WhatsApp Share
  const handleWhatsAppShare = async () => {
    const text = `${previewText || 'Check out this post on Tolee!'}\n${finalShareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // WhatsApp Status Share
  const handleWhatsAppStatusShare = async () => {
    const text = `${previewText || 'Check out this post on Tolee!'}\n${finalShareUrl}`;
    // Mobile protocol for WhatsApp sharing
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const fallbackUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    
    try {
      window.location.href = url;
    } catch (_) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // Facebook Share
  const handleFacebookShare = async () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalShareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // Messenger Share
  const handleMessengerShare = async () => {
    const mobileUrl = `fb-messenger://share/?link=${encodeURIComponent(finalShareUrl)}`;
    const webUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(finalShareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(finalShareUrl)}`;
    
    try {
      window.open(webUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    } catch (_) {
      window.location.href = mobileUrl;
    }

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // Threads Share
  const handleThreadsShare = async () => {
    const text = `${previewText || 'Check out this on Tolee!'}\n${finalShareUrl}`;
    const url = `https://threads.net/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // SMS Share
  const handleSMSShare = async () => {
    const body = `${previewText || 'Check out this on Tolee!'} ${finalShareUrl}`;
    window.location.href = `sms:?body=${encodeURIComponent(body)}`;

    const res = await incrementShareCount(postId);
    if (res.success && res.shareCount !== undefined && onShareSuccess) {
      onShareSuccess(res.shareCount);
    }
  };

  // Download Media
  const handleDownloadMedia = async () => {
    if (!postMediaUrl || postMediaUrl.trim() === '') {
      showToast('No downloadable media for this post.');
      return;
    }

    try {
      showToast('Starting download...');
      const firstMedia = postMediaUrl.split(',')[0].trim();
      const isVideo = postMediaType?.includes('video') || firstMedia.match(/\.(mp4|webm|mov)($|\?)/i);
      const ext = isVideo ? 'mp4' : 'jpg';

      const a = document.createElement('a');
      a.href = firstMedia;
      a.download = `tolee_${postId}.${ext}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Could not download media.');
    }
  };

  // Add to Story (Tolee Story Editor)
  const handleAddToStory = () => {
    let mediaUrl = postMediaUrl || '';
    let mediaType: 'image' | 'video' = 'image';

    if (mediaUrl.includes(',')) {
      mediaUrl = mediaUrl.split(',')[0];
    }
    
    if (postMediaType) {
      const type = postMediaType.includes(',') ? postMediaType.split(',')[0] : postMediaType;
      if (type.includes('video')) {
        mediaType = 'video';
      }
    }

    if (!mediaUrl || mediaUrl.trim() === '') {
      mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&h=1920&fit=crop';
      mediaType = 'image';
    }

    setStoryMediaUrl(mediaUrl);
    setStoryMediaType(mediaType);
    setIsStoryEditorOpen(true);
  };

  // Touch drag handlers for smooth mobile swipe-down-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 120) {
      onClose();
    } else {
      setDragOffset(0);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[140] bg-zinc-900/95 text-white dark:bg-white/95 dark:text-zinc-900 text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 border border-white/10">
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Instagram-Style Share Bottom Sheet */}
      <div
        ref={sheetRef}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging.current ? 'none' : 'transform 0.25s ease-out'
        }}
        className="w-full max-w-[480px] bg-white dark:bg-[#1a1a1c] text-zinc-900 dark:text-zinc-100 rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden select-none animate-slide-up border-t border-zinc-200/60 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile gesture) */}
        <div 
          className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Search Bar + Add Group / People Button */}
        <div className="px-4 py-2.5 flex items-center gap-2.5">
          <div className="flex-1 relative flex items-center bg-[#f0f2f5] dark:bg-[#28282b] rounded-2xl px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/40 transition-all">
            <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            type="button"
            onClick={() => {
              if (recipients.length > 0) {
                // Select first 3 contacts as a quick group
                const toSelect = recipients.slice(0, 3).map(r => r.id);
                setSelectedIds(toSelect);
              }
            }}
            className="w-10 h-10 rounded-full bg-[#f0f2f5] dark:bg-[#28282b] flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all shrink-0"
            title="Create group / Multi-select"
          >
            <UserPlus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Recent Chat Contacts (Instagram 3-Column Grid) */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[200px] max-h-[340px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Loading recent chats...</span>
            </div>
          ) : recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2.5 text-zinc-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No contacts found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {searchQuery ? `No matches for "${searchQuery}"` : "You don't have recent chats yet. Start chatting or share via link!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-y-4 gap-x-2 py-1">
              {recipients.map((recipient) => {
                const isSelected = selectedIds.includes(recipient.id);
                return (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => handleToggleRecipient(recipient.id)}
                    className="flex flex-col items-center group focus:outline-none transition-transform active:scale-95"
                  >
                    {/* DP Container */}
                    <div className="relative">
                      {/* Story Ring Border if has active story */}
                      <div className={`rounded-full p-0.5 transition-all ${
                        recipient.hasStory 
                          ? 'ring-2 ring-emerald-500 dark:ring-emerald-400' 
                          : ''
                      }`}>
                        <Avatar className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs">
                          <AvatarImage src={recipient.avatar} alt={recipient.name} className="object-cover" />
                          <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 font-bold text-base text-zinc-700 dark:text-zinc-300">
                            {(recipient.name || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Group Badge Indicator */}
                      {recipient.isGroup && (
                        <div className="absolute -bottom-1 -left-1 bg-zinc-800 text-white p-1 rounded-full border-2 border-white dark:border-[#1a1a1c]">
                          <Users className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Instagram Selection Indicator Ring */}
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white dark:border-[#1a1a1c] shadow-sm animate-scale-in">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Contact Name & Username */}
                    <span className="mt-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[90px] text-center leading-tight">
                      {recipient.name}
                    </span>
                    {recipient.username && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[90px] text-center">
                        @{recipient.username}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Send Button (When one or more contacts are selected) */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-[#202024] border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between animate-slide-up">
            <span className="text-xs text-zinc-500 font-medium">
              Selected <span className="font-bold text-zinc-900 dark:text-white">{selectedIds.length}</span> recipient{selectedIds.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={sharing}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg font-semibold"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSendToSelected}
                disabled={sharing}
                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 rotate-45" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* External Sharing Options (Horizontal Scrollable Row as in Instagram) */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#151517]/50 py-3 px-3">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            
            {/* 1. Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#f0f2f5] dark:bg-[#28282b] flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <LinkIcon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Copy link
              </span>
            </button>

            {/* 2. Tolee AI */}
            <button
              type="button"
              onClick={() => {
                showToast('Sharing with Tolee AI...');
                window.location.href = `/tolee-ai?content=${encodeURIComponent(finalShareUrl)}`;
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Tolee AI
              </span>
            </button>

            {/* 3. Add to Story */}
            <button
              type="button"
              onClick={handleAddToStory}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#f0f2f5] dark:bg-[#28282b] flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Add to story
              </span>
            </button>

            {/* 4. WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#25D366] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <WhatsAppIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                WhatsApp
              </span>
            </button>

            {/* 5. WhatsApp Status */}
            <button
              type="button"
              onClick={handleWhatsAppStatusShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#25D366] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                WhatsApp Status
              </span>
            </button>

            {/* 6. Native Share */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#f0f2f5] dark:bg-[#28282b] flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Share
              </span>
            </button>

            {/* 7. Facebook */}
            <button
              type="button"
              onClick={handleFacebookShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#1877F2] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <FacebookIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Facebook
              </span>
            </button>

            {/* 8. Download */}
            <button
              type="button"
              onClick={handleDownloadMedia}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#f0f2f5] dark:bg-[#28282b] flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Download
              </span>
            </button>

            {/* 9. SMS */}
            <button
              type="button"
              onClick={handleSMSShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-[#007AFF] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                SMS
              </span>
            </button>

            {/* 10. Messenger */}
            <button
              type="button"
              onClick={handleMessengerShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#00B2FF] via-[#006AFF] to-[#8000FF] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <MessengerIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Messenger
              </span>
            </button>

            {/* 11. Threads */}
            <button
              type="button"
              onClick={handleThreadsShare}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black group-hover:scale-105 active:scale-95 transition-all shadow-2xs">
                <ThreadsIcon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Threads
              </span>
            </button>

          </div>
        </div>
      </div>

      {/* Story Editor Submodal */}
      {isStoryEditorOpen && (
        <StoryEditor
          isOpen={isStoryEditorOpen}
          onClose={() => {
            setIsStoryEditorOpen(false);
            onClose();
          }}
          mediaUrl={storyMediaUrl}
          mediaType={storyMediaType}
          userAvatar={session?.user?.image || undefined}
          userName={session?.user?.name || undefined}
          sharedPost={{
            id: postId,
            author: postAuthor || '',
            authorAvatar: postAuthorAvatar || null,
            caption: postCaption || null,
            mediaUrl: postMediaUrl || null,
            mediaType: postMediaType || null
          }}
        />
      )}
    </div>
  );
}

export default ShareModal;
