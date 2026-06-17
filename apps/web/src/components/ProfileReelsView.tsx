'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Heart, MessageCircle, Send, MoreVertical, Music,
  Volume2, VolumeX, ShieldCheck, Plus, Bookmark, Repeat,
  ChevronUp, ChevronDown, Eye, Rocket
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HLSVideo, getSoundPreference, setSoundPreference } from '@/components/HLSVideo';
import { formatViewCount } from '@/lib/utils';
import { ReShareModal } from '@/components/ReShareModal';
import { ShareModal } from '@/components/ShareModal';
import { QuickBoostModal } from '@/components/QuickBoostModal';
import { getOrCreatePersonalChat } from '@/actions/chat';
import {
  toggleLike, addComment, getComments,
  toggleSavePost, toggleRepost, getReposts, recordView
} from '@/actions/post';
import { getPosterUrl } from '@/lib/media';

interface ReelType {
  id: string;
  authorId: string;
  visibility: string;
  video: string;
  author: string;
  authorAvatar: string | null;
  toleeName: string | null;
  toleeSlug: string | null;
  role: string;
  caption: string;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  reposts: number;
  audio: string;
  isVerified: boolean;
  likedByMe: boolean;
  savedByMe: boolean;
  repostedByMe: boolean;
}

interface UserType {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  coverImage: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  createdAt: any;
  isVerified: boolean;
  level: number;
  trustScore: number;
  isPrivate: boolean;
  _count: {
    followers: number;
    following: number;
    posts: number;
    tolees: number;
    friends: number;
  };
}

interface ProfileReelsViewProps {
  user: UserType;
  reels: ReelType[];
  isMe: boolean;
  currentUserId: string;
  initialIsFollowing: boolean;
  initialFollowStatus: string | null;
  toggleFollowAction: (targetId: string) => Promise<any>;
}

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

// Hook to track active reel slide index
function useActiveReelIndex(
  containerRef: React.RefObject<HTMLDivElement | null>,
  reelCount: number,
): number {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reelCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        }
        if (best) {
          const idx = Number((best.target as HTMLElement).getAttribute('data-index'));
          if (!isNaN(idx)) setActiveIndex(idx);
        }
      },
      { root: container, threshold: [0.5, 0.75, 1.0] }
    );

    const slides = container.querySelectorAll('.reel-container');
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [reelCount]);

  return activeIndex;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export function ProfileReelsView({
  user,
  reels: initialReels,
  isMe,
  currentUserId,
  initialIsFollowing,
  initialFollowStatus,
  toggleFollowAction,
}: ProfileReelsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetReelId = searchParams.get('reelId');

  const { data: session } = useSession();
  const [reels, setReels] = useState<ReelType[]>(initialReels);
  const [isMuted, setIsMuted] = useState(() => getSoundPreference());

  const handleSetIsMuted = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      setIsMuted((prev) => {
        const next = val(prev);
        setSoundPreference(next);
        return next;
      });
    } else {
      setIsMuted(val);
      setSoundPreference(val);
    }
  }, []);

  useEffect(() => {
    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsMuted(customEvent.detail.isMuted);
    };
    window.addEventListener('tolee_sound_pref_change', handlePrefChange);
    return () => {
      window.removeEventListener('tolee_sound_pref_change', handlePrefChange);
    };
  }, []);

  const [hiddenReelIds, setHiddenReelIds] = useState<string[]>([]);
  const isDesktop = useIsDesktop();

  // Scroll containers
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);

  const visibleReels = reels.filter((r) => !hiddenReelIds.includes(r.id));

  // Active indices
  const mobileActiveIndex = useActiveReelIndex(mobileScrollRef, visibleReels.length);
  const desktopActiveIndex = useActiveReelIndex(desktopScrollRef, visibleReels.length);

  // Modals state
  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null);
  const [activeRepostReel, setActiveRepostReel] = useState<string | null>(null);
  const [activeOptionsReel, setActiveOptionsReel] = useState<any | null>(null);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalReposts, setModalReposts] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isRepostModalLoading, setIsRepostModalLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Share and Re-share
  const [reshareModalOpen, setReshareModalOpen] = useState(false);
  const [selectedPostIdForReshare, setSelectedPostIdForReshare] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedReelForShare, setSelectedReelForShare] = useState<any | null>(null);

  // Quick Boost
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);
  const [quickBoostType, setQuickBoostType] = useState<'post' | 'reel' | 'listing'>('reel');
  const [quickBoostTargetId, setQuickBoostTargetId] = useState('');

  // Follow states
  const [followStatus, setFollowStatus] = useState<string | null>(initialFollowStatus);

  // Auto-scroll target reel into view on mount
  useEffect(() => {
    if (targetReelId && visibleReels.length > 0) {
      const idx = visibleReels.findIndex((r) => r.id === targetReelId);
      if (idx !== -1) {
        setTimeout(() => {
          scrollToReel(isDesktop ? desktopScrollRef : mobileScrollRef, idx);
        }, 300);
      }
    }
  }, [targetReelId, isDesktop, visibleReels.length]);

  const handleBack = () => {
    router.back();
  };

  const handleFollowClick = async () => {
    const currentStatus = followStatus;
    const nextStatus = currentStatus ? null : (user.isPrivate ? 'pending' : 'approved');
    setFollowStatus(nextStatus);

    const result = await toggleFollowAction(user.id);
    if (!result.success) {
      setFollowStatus(currentStatus);
      alert(result.error || "Failed to toggle follow");
    } else {
      setFollowStatus(result.status !== undefined ? result.status : (result.isFollowing ? 'approved' : null));
    }
  };

  /* ── View tracking ── */
  const trackedReels = useRef<Set<string>>(new Set());
  const trackView = useCallback((index: number) => {
    const reel = visibleReels[index];
    if (reel && !trackedReels.current.has(reel.id)) {
      trackedReels.current.add(reel.id);
      let fp = localStorage.getItem('device_fingerprint');
      if (!fp) {
        fp = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('device_fingerprint', fp);
      }
      recordView(reel.id, 'reel', fp).catch(() => {});
    }
  }, [visibleReels]);

  useEffect(() => { trackView(mobileActiveIndex); }, [mobileActiveIndex, trackView]);
  useEffect(() => { trackView(desktopActiveIndex); }, [desktopActiveIndex, trackView]);

  /* ── Desktop scroll control ── */
  const scrollToReel = useCallback((containerRef: React.RefObject<HTMLDivElement | null>, idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const slides = container.querySelectorAll('.reel-container');
    if (slides[idx]) {
      (slides[idx] as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const handleLike = async (id: string, index: number) => {
    setReels((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      const wasLiked = r.likedByMe;
      r.likedByMe = !wasLiked;
      r.likes = wasLiked ? Math.max(0, r.likes - 1) : r.likes + 1;
      next[index] = r;
      return next;
    });
    const result = await toggleLike(id);
    if (!result.success) {
      // Revert on failure
      setReels((prev) => {
        const next = [...prev];
        const r = { ...next[index] };
        r.likedByMe = !r.likedByMe;
        next[index] = r;
        return next;
      });
    }
  };

  const openCommentsModal = async (id: string) => {
    setActiveCommentReel(id);
    setIsModalLoading(true);
    const res = await getComments(id);
    if (res.success) setModalComments(res.comments ?? []);
    setIsModalLoading(false);
  };

  const openRepostsModal = async (postId: string) => {
    setActiveRepostReel(postId);
    setIsRepostModalLoading(true);
    const res = await getReposts(postId);
    if (res.success) setModalReposts(res.reposts ?? []);
    setIsRepostModalLoading(false);
  };

  const handleCommentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !activeCommentReel) return;
    const text = commentText;
    setCommentText('');
    const index = reels.findIndex((r) => r.id === activeCommentReel);
    if (index !== -1) {
      setReels((prev) => {
        const next = [...prev];
        const r = { ...next[index] };
        r.comments = r.comments + 1;
        next[index] = r;
        return next;
      });
    }
    const tempId = 'temp-' + Date.now();
    setModalComments((prev) => [{
      id: tempId, content: text,
      author: { name: session?.user?.name || 'You', username: (session?.user as any)?.username || 'me', avatar: session?.user?.image },
      createdAt: new Date().toISOString(),
    }, ...prev]);
    const result = await addComment(activeCommentReel, text);
    if (!result.success) {
      if (index !== -1) {
        setReels((prev) => {
          const next = [...prev];
          const r = { ...next[index] };
          r.comments = Math.max(0, r.comments - 1);
          next[index] = r;
          return next;
        });
      }
      setModalComments((prev) => prev.filter((c) => c.id !== tempId));
    } else {
      setModalComments((prev) => prev.map((c) => (c.id === tempId ? result.comment : c)));
    }
  };

  const handleSave = async (id: string, index: number) => {
    setReels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], savedByMe: !next[index].savedByMe };
      return next;
    });
    const result = await toggleSavePost(id);
    if (!result.success) {
      setReels((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], savedByMe: !next[index].savedByMe };
        return next;
      });
    }
  };

  const handleRepost = async (id: string, index: number) => {
    setReels((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      const wasReposted = r.repostedByMe;
      r.repostedByMe = !wasReposted;
      r.reposts = wasReposted ? Math.max(0, r.reposts - 1) : r.reposts + 1;
      next[index] = r;
      return next;
    });
    const result = await toggleRepost(id);
    if (!result.success) {
      setReels((prev) => {
        const next = [...prev];
        const r = { ...next[index] };
        r.repostedByMe = !r.repostedByMe;
        next[index] = r;
        return next;
      });
    }
  };

  const handleShare = (reel: any) => {
    setSelectedReelForShare(reel);
    setShareModalOpen(true);
  };

  const handleBoost = (reelId: string) => {
    setQuickBoostType('reel');
    setQuickBoostTargetId(reelId);
    setIsQuickBoostOpen(true);
  };

  const makeActions = (reel: any, index: number) => ({
    onLike: () => handleLike(reel.id, index),
    onComment: () => openCommentsModal(reel.id),
    onReshare: () => { setSelectedPostIdForReshare(reel.id); setReshareModalOpen(true); },
    onRepostsModal: () => { if ((reel.reposts || 0) > 0) openRepostsModal(reel.id); },
    onShare: () => handleShare(reel),
    onSave: () => handleSave(reel.id, index),
    onOptions: () => setActiveOptionsReel(reel),
    onBoost: () => handleBoost(reel.id),
  });

  return (
    <div className="flex-grow flex flex-col h-screen bg-black text-white select-none relative overflow-hidden">
      {/* ────────────────────────────────────────────────────────────────
          MOBILE: snap scrolling list view
         ──────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed inset-0 z-40 bg-black text-white overflow-hidden flex justify-center">
        {/* Mobile top overlay header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 text-white backdrop-blur-sm transition-colors active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[13px] font-extrabold text-white leading-none">@{user.username}</span>
              {visibleReels.length > 0 && (
                <span className="text-[10px] text-gray-300/80 font-bold leading-none mt-1">
                  Reel {mobileActiveIndex + 1} of {visibleReels.length}
                </span>
              )}
            </div>
          </div>

          {!isMe && (
            <Button 
              onClick={handleFollowClick}
              size="sm" 
              className={`h-7 px-3 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                followStatus === 'approved' 
                  ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
            </Button>
          )}
        </div>

        {visibleReels.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 h-full w-full">
            <div className="w-16 h-16 rounded-full border-2 border-gray-800 flex items-center justify-center mb-4 bg-zinc-950">
              <VolumeX className="w-7 h-7 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Reels Found</h3>
            <p className="text-sm text-gray-400 max-w-[240px]">This user has not uploaded any video reels.</p>
          </div>
        ) : (
          <div
            ref={mobileScrollRef}
            className="w-full sm:max-w-[450px] h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
          >
            {visibleReels.map((reel, index) => {
              const originalIndex = reels.findIndex(r => r.id === reel.id);
              return (
                <ReelSlide
                  key={reel.id}
                  reel={reel}
                  index={index}
                  isActive={!isDesktop && index === mobileActiveIndex}
                  isMuted={isMuted}
                  session={session}
                  desktop={false}
                  onMuteToggle={() => handleSetIsMuted((m) => !m)}
                  {...makeActions(reel, originalIndex)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          DESKTOP: split view with snap container
         ──────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-4rem)] bg-black overflow-hidden relative">
        {/* Desktop top bar overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/85 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button 
              onClick={handleBack}
              className="p-2 bg-black/50 hover:bg-black/70 border border-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 shadow-md hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white">@{user.username}</span>
                {user.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400 fill-white" />}
              </div>
              {visibleReels.length > 0 && (
                <span className="text-xs text-gray-400 font-semibold mt-0.5">
                  Reel {desktopActiveIndex + 1} of {visibleReels.length}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3.5 pointer-events-auto">
            {!isMe && (
              <Button 
                onClick={handleFollowClick}
                className={`px-4 py-1.5 font-extrabold text-xs rounded-full transition-all hover:scale-105 active:scale-95 ${
                  followStatus === 'approved' 
                    ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'
                }`}
              >
                {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
              </Button>
            )}
            <button
              onClick={() => handleSetIsMuted((m) => !m)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white transition-all shadow-md hover:scale-105"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {visibleReels.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center flex-col gap-4">
            <VolumeX className="w-16 h-16 text-zinc-700" />
            <h3 className="text-xl font-bold text-zinc-300">No Reels Found</h3>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full gap-6 px-4">
            {/* Navigation buttons */}
            <div className="flex flex-col gap-3 shrink-0">
              <button
                onClick={() => scrollToReel(desktopScrollRef, desktopActiveIndex - 1)}
                disabled={desktopActiveIndex === 0}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollToReel(desktopScrollRef, desktopActiveIndex + 1)}
                disabled={desktopActiveIndex >= visibleReels.length - 1}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Main Player Display Box */}
            <div
              ref={desktopScrollRef}
              className="relative flex-shrink-0 overflow-y-scroll snap-y snap-mandatory hide-scrollbar rounded-2xl shadow-2xl shadow-black/60"
              style={{ width: 'min(380px, 40vw)', height: 'min(676px, calc(100vh - 80px))' }}
            >
              {visibleReels.map((reel, index) => {
                const originalIndex = reels.findIndex(r => r.id === reel.id);
                return (
                  <ReelSlide
                    key={reel.id}
                    reel={reel}
                    index={index}
                    isActive={isDesktop && index === desktopActiveIndex}
                    isMuted={isMuted}
                    session={session}
                    desktop={true}
                    onMuteToggle={() => handleSetIsMuted((m) => !m)}
                    {...makeActions(reel, originalIndex)}
                  />
                );
              })}
            </div>

            {/* Desktop right sidebar actions bar */}
            {visibleReels[desktopActiveIndex] && (
              <DesktopActionBar
                reel={visibleReels[desktopActiveIndex]}
                {...makeActions(
                  visibleReels[desktopActiveIndex],
                  reels.findIndex(r => r.id === visibleReels[desktopActiveIndex].id)
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* ===== SHARED MODALS ===== */}
      <CommentsModal
        open={!!activeCommentReel}
        onClose={() => { setActiveCommentReel(null); setModalComments([]); }}
        comments={modalComments}
        isLoading={isModalLoading}
        commentText={commentText}
        setCommentText={setCommentText}
        onSubmit={handleCommentSubmit}
        session={session}
      />

      <OptionsModal
        open={!!activeOptionsReel}
        onClose={() => setActiveOptionsReel(null)}
        reel={activeOptionsReel}
        session={session}
        setReels={setReels}
        hiddenReelIds={hiddenReelIds}
        setHiddenReelIds={setHiddenReelIds}
        isMuted={isMuted}
        setIsMuted={handleSetIsMuted}
        handleShare={handleShare}
      />

      {/* Reposts Modal */}
      <Dialog open={!!activeRepostReel} onOpenChange={(o) => { if (!o) { setActiveRepostReel(null); setModalReposts([]); } }}>
        <DialogContent className="sm:max-w-[420px] bg-[#262626] border-gray-800 text-white p-0 gap-0 overflow-hidden shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-800/50 bg-[#1e1e1e]/50">
            <DialogTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
              <Repeat className="w-5 h-5 text-green-400" /> People who re-shared
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
            {isRepostModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-full bg-zinc-800" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28 rounded bg-zinc-800" />
                        <Skeleton className="h-3 w-16 rounded bg-zinc-800" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : modalReposts.length > 0 ? (
              modalReposts.map((u: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 border border-gray-700">
                      <AvatarImage src={getValidAvatarUrl(u.avatar)} />
                      <AvatarFallback>{u.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] text-white">{u.name || u.username}</span>
                      {u.username && <span className="text-xs text-gray-400">@{u.username}</span>}
                    </div>
                  </div>
                  {u.username && (
                    <Link href={`/u/${u.username}`} onClick={() => setActiveRepostReel(null)}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white font-bold text-xs px-4 bg-transparent text-gray-300">View Profile</Button>
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-400 font-semibold">No reshares yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modals */}
      {selectedReelForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setSelectedReelForShare(null); }}
          postId={selectedReelForShare.id}
          shareUrl={selectedReelForShare.toleeSlug ? `${window.location.origin}/t/${selectedReelForShare.toleeSlug}` : `${window.location.origin}/u/${selectedReelForShare.author}`}
          previewText={selectedReelForShare.caption || 'Check out this reel on Tolee!'}
          onShareSuccess={(count: number) => {
            setReels((curr) => curr.map((r) => r.id === selectedReelForShare.id ? { ...r, shares: count } : r));
          }}
        />
      )}

      <ReShareModal
        isOpen={reshareModalOpen}
        onClose={() => setReshareModalOpen(false)}
        postId={selectedPostIdForReshare || ''}
        onSuccess={(id: string) => {
          setReels((curr) => curr.map((r) => r.id === id ? { ...r, reposts: r.reposts + 1, repostedByMe: true } : r));
        }}
      />

      {isQuickBoostOpen && (
        <QuickBoostModal
          isOpen={isQuickBoostOpen}
          onClose={() => setIsQuickBoostOpen(false)}
          type="reel"
          targetId={quickBoostTargetId}
        />
      )}
    </div>
  );
}

// Single Reel Container memoized
const ReelSlide = memo(function ReelSlide({
  reel, index, isActive, isMuted, session, desktop,
  onMuteToggle, onLike, onComment, onReshare,
  onRepostsModal, onShare, onSave, onOptions, onBoost,
}: {
  reel: any; index: number; isActive: boolean; isMuted: boolean;
  session: any; desktop: boolean;
  onMuteToggle: () => void; onLike: () => void; onComment: () => void;
  onReshare: () => void; onRepostsModal: () => void; onShare: () => void;
  onSave: () => void; onOptions: () => void; onBoost: () => void;
}) {
  return (
    <div
      data-index={index}
      className="reel-container w-full h-full snap-start snap-always relative flex items-center justify-center overflow-hidden bg-black"
      style={{ scrollSnapStop: 'always' }}
    >
      <HLSVideo
        src={reel.video}
        className="w-full h-full object-cover animate-in fade-in duration-300"
        poster={getPosterUrl(reel.video)}
        isActive={isActive}
        shouldLoad={true}
        loop
        muted={isMuted}
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Mute controller (Mobile overlay) */}
      {!desktop && (
        <div className="absolute top-16 right-4 z-10">
          <button onClick={onMuteToggle} className="text-white bg-black/45 hover:bg-black/65 p-2.5 rounded-full backdrop-blur-md transition-colors">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Sidebar overlays on mobile */}
      {!desktop && (
        <div className="absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3.5 z-10 pointer-events-auto">
          <MobileActionBar reel={reel} session={session} onLike={onLike} onComment={onComment} onReshare={onReshare} onRepostsModal={onRepostsModal} onShare={onShare} onSave={onSave} onOptions={onOptions} onBoost={onBoost} />
        </div>
      )}

      {/* Details text information block */}
      <div className={`absolute z-10 pointer-events-auto flex flex-col gap-2 ${desktop ? 'bottom-4 left-3 right-3' : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-16'}`}>
        <div className="flex items-center gap-2">
          <Link href={`/u/${reel.author}`}>
            <div className={`relative rounded-full ${reel.hasActiveStory ? 'p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600' : ''}`}>
              <Avatar className="w-8 h-8 border-2 border-black cursor-pointer shadow-sm">
                <AvatarImage src={getValidAvatarUrl(reel.authorAvatar)} />
                <AvatarFallback>{reel.author?.[0]}</AvatarFallback>
              </Avatar>
            </div>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 flex-wrap">
              <Link href={`/u/${reel.author}`}>
                <span className="font-bold text-[13.5px] text-white hover:underline cursor-pointer drop-shadow-xs">{reel.author}</span>
              </Link>
              {reel.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-400 fill-white" />}
            </div>
            {reel.toleeName && reel.toleeSlug && (
              <Link href={`/t/${reel.toleeSlug}`} className="text-[11px] text-gray-300 hover:text-white hover:underline mt-0.5 w-fit">
                from <span className="font-bold text-white">{reel.toleeName}</span>
              </Link>
            )}
          </div>
        </div>
        <p className="text-[13px] text-white line-clamp-2 drop-shadow-xs leading-snug">{reel.caption}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-white/80 drop-shadow-xs">
          <Music className="w-3 h-3" />
          <span>{reel.audio}</span>
        </div>
      </div>
    </div>
  );
});

// Mobile right sidebar buttons
function MobileActionBar({
  reel, session, onLike, onComment, onReshare, onRepostsModal, onShare, onSave, onOptions, onBoost
}: any) {
  const isOwner = session?.user && ((session.user as any).id === reel.authorId || session.user.name === reel.author);
  return (
    <div className="flex flex-col items-center gap-4 text-white">
      {/* Boost Option */}
      {isOwner && (
        <button onClick={onBoost} className="flex flex-col items-center group transition-transform active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-2.5 shadow-md shadow-indigo-600/30">
          <Rocket className="w-5 h-5 text-white animate-pulse" />
        </button>
      )}

      {/* Like */}
      <button onClick={onLike} className="flex flex-col items-center group transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs group-hover:scale-105">
          <Heart strokeWidth={1.8} className={`w-[22px] h-[22px] ${reel.likedByMe ? 'fill-red-500 text-red-500 stroke-red-500' : 'text-white'}`} />
        </div>
        <span className="text-[10px] font-extrabold mt-1 text-white drop-shadow-md select-none">{reel.likes}</span>
      </button>

      {/* Comment */}
      <button onClick={onComment} className="flex flex-col items-center group transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs group-hover:scale-105">
          <MessageCircle strokeWidth={1.8} className="w-[22px] h-[22px] text-white" />
        </div>
        <span className="text-[10px] font-extrabold mt-1 text-white drop-shadow-md select-none">{reel.comments}</span>
      </button>

      {/* Re-Share / Repost */}
      <button onClick={onReshare} className="flex flex-col items-center group transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs group-hover:scale-105">
          <Repeat strokeWidth={1.8} className={`w-[22px] h-[22px] ${reel.repostedByMe ? 'text-green-400' : 'text-white'}`} />
        </div>
        <span onClick={(e) => { e.stopPropagation(); onRepostsModal(); }} className="text-[10px] font-extrabold mt-1 text-white drop-shadow-md select-none hover:underline">{reel.reposts}</span>
      </button>

      {/* Save Bookmark */}
      <button onClick={onSave} className="flex flex-col items-center group transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs group-hover:scale-105">
          <Bookmark strokeWidth={1.8} className={`w-[22px] h-[22px] ${reel.savedByMe ? 'fill-yellow-500 text-yellow-500 stroke-yellow-500' : 'text-white'}`} />
        </div>
      </button>

      {/* Share */}
      <button onClick={onShare} className="flex flex-col items-center group transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs group-hover:scale-105">
          <Send strokeWidth={1.8} className="w-[20px] h-[20px] text-white" />
        </div>
      </button>

      {/* Options */}
      <button onClick={onOptions} className="flex flex-col items-center transition-transform active:scale-95">
        <div className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-xs">
          <MoreVertical className="w-5 h-5 text-white" />
        </div>
      </button>
    </div>
  );
}

// Desktop right sidebar action details
function DesktopActionBar({ reel, onLike, onComment, onReshare, onRepostsModal, onShare, onSave, onOptions }: any) {
  return (
    <div className="flex flex-col gap-5 text-white shrink-0 pr-8 bg-zinc-950/20 py-6 px-4 rounded-3xl border border-zinc-800/40 shadow-xl select-none">
      <div className="flex items-center gap-3.5 border-b border-zinc-900 pb-4">
        <Avatar className="w-11 h-11 border border-zinc-850"><AvatarImage src={getValidAvatarUrl(reel.authorAvatar)} /><AvatarFallback>{reel.author?.[0]}</AvatarFallback></Avatar>
        <div className="flex flex-col">
          <span className="font-bold text-[15px]">{reel.author}</span>
          <span className="text-[11px] text-zinc-400">Audio • {reel.audio}</span>
        </div>
      </div>

      <div className="space-y-4">
        <button onClick={onLike} className="flex items-center gap-3.5 w-full hover:bg-white/5 p-2 rounded-xl transition-all">
          <Heart strokeWidth={1.5} className={`w-[22px] h-[22px] ${reel.likedByMe ? 'fill-red-500 text-red-500 stroke-red-500' : 'text-zinc-300'}`} />
          <span className="text-sm font-bold">{reel.likes} Likes</span>
        </button>

        <button onClick={onComment} className="flex items-center gap-3.5 w-full hover:bg-white/5 p-2 rounded-xl transition-all">
          <MessageCircle strokeWidth={1.5} className="w-[22px] h-[22px] text-zinc-300" />
          <span className="text-sm font-bold">{reel.comments} Comments</span>
        </button>

        <button onClick={onReshare} className="flex items-center gap-3.5 w-full hover:bg-white/5 p-2 rounded-xl transition-all">
          <Repeat strokeWidth={1.5} className={`w-[22px] h-[22px] ${reel.repostedByMe ? 'text-green-400' : 'text-zinc-300'}`} />
          <span onClick={(e) => { e.stopPropagation(); onRepostsModal(); }} className="text-sm font-bold hover:underline cursor-pointer">{reel.reposts} Reshares</span>
        </button>

        <button onClick={onSave} className="flex items-center gap-3.5 w-full hover:bg-white/5 p-2 rounded-xl transition-all">
          <Bookmark strokeWidth={1.5} className={`w-[22px] h-[22px] ${reel.savedByMe ? 'fill-yellow-500 text-yellow-500 stroke-yellow-500' : 'text-zinc-300'}`} />
          <span className="text-sm font-bold">{reel.savedByMe ? 'Saved' : 'Save'}</span>
        </button>

        <button onClick={onShare} className="flex items-center gap-3.5 w-full hover:bg-white/5 p-2 rounded-xl transition-all">
          <Send strokeWidth={1.5} className="w-[21px] h-[21px] text-zinc-300" />
          <span className="text-sm font-bold">Share Link</span>
        </button>
      </div>

      <button onClick={onOptions} className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 py-2.5 rounded-2xl font-bold text-xs tracking-wide transition-all mt-4">
        More Options
      </button>
    </div>
  );
}

// Helper modals
function CommentsModal({ open, onClose, comments, isLoading, commentText, setCommentText, onSubmit }: any) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] bg-zinc-900 border-zinc-800 text-white p-0 gap-0 overflow-hidden shadow-2xl rounded-3xl flex flex-col h-[70vh]">
        <DialogHeader className="p-4 border-b border-zinc-800/60 shrink-0">
          <DialogTitle className="text-center font-bold text-lg">Reel Comments</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-zinc-800 rounded w-1/4" />
                    <div className="h-3 bg-zinc-800 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3">
                <Avatar className="w-9 h-9 border border-zinc-800 shadow-xs"><AvatarImage src={getValidAvatarUrl(c.author?.avatar)} /><AvatarFallback>U</AvatarFallback></Avatar>
                <div className="flex flex-col bg-zinc-800/40 px-3.5 py-2 rounded-2xl max-w-[80%] border border-zinc-800/35">
                  <span className="font-bold text-xs text-zinc-100">{c.author?.name || c.author?.username}</span>
                  <p className="text-[13px] text-zinc-200 mt-0.5 leading-normal">{c.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 flex flex-col items-center gap-3">
              <MessageCircle className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-500 font-semibold">No comments yet</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 shrink-0">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add comments..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full py-2 px-4 text-[13px] placeholder-zinc-500 text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 rounded-full px-4 shrink-0 shadow-xs font-bold text-xs">Post</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionsModal({ open, onClose, reel, session, setReels, hiddenReelIds, setHiddenReelIds, isMuted, setIsMuted, handleShare }: any) {
  const router = useRouter();
  const isOwner = session?.user && (reel?.authorId === (session.user as any).id || reel?.author === session?.user?.name);
  
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center text-center">
          {/* Boost option (if own reel) */}
          {isOwner && (
            <button 
              onClick={() => {
                onClose();
                handleShare(reel);
              }} 
              className="py-4 font-bold text-[15px] hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 text-indigo-400"
            >
              Share Reel
            </button>
          )}

          <button 
            onClick={() => {
              if (reel) {
                navigator.clipboard.writeText(`${window.location.origin}/post/${reel.id}`);
                alert("Link copied to clipboard!");
              }
              onClose();
            }}
            className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
          >
            Copy Link
          </button>

          <button 
            onClick={onClose}
            className="py-4 text-white/50 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-hidden text-[15px]"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
