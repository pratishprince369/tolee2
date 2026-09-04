'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { getContentPermanentUrl, copyContentUrl } from '@/lib/shareService';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Heart, MessageCircle, Send, MoreVertical, Music,
  Volume2, VolumeX, ShieldCheck, Plus, Bookmark, Repeat,
  ChevronUp, ChevronDown, Eye, Rocket, MapPin, Smile, X,
  Loader2, AlertCircle, ChevronLeft
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrCreatePersonalChat } from '@/actions/chat';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreatePostModal } from '@/components/CreatePostModal';
import {
  createPost, toggleLike, addComment, getComments,
  toggleSavePost, toggleRepost, getReposts, recordView,
  updatePostVisibility, deletePostPermanently, editPostCaption, getReels,
  getFreshPexelsVideoUrl
} from '@/actions/post';
import { toggleFollow } from '@/actions/user';
import { HLSVideo, getSoundPreference, setSoundPreference, getDeviceNetworkStats } from '@/components/HLSVideo';
import { useNetworkConfig } from '@/hooks/useNetworkConfig';
import { videoMetadataCache } from '@/lib/videoCache';
import { formatViewCount } from '@/lib/utils';
import { ReShareModal } from '@/components/ReShareModal';
import { ShareModal } from '@/components/ShareModal';
import { QuickBoostModal } from '@/components/QuickBoostModal';
import { AdTracker } from '@/components/AdTracker';
import { fetchEligibleAds } from '@/actions/ads';
import { isVideoUrl, getMediaThumbnail, getPosterUrl } from '@/lib/media';
import { YouTubeReelPlayer } from '@/components/YouTubeReelPlayer';
import { extractYouTubeVideoId, decodeHtmlEntities } from '@/lib/youtube';

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

/* ═══════════════════════════════════════════════════════════════════════
   Custom hook: tracks which .reel-container is ≥ 50% visible inside
   a given scroll container. Returns the `data-index` of that element.
   ═══════════════════════════════════════════════════════════════════════ */
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
        // Find the entry with the highest intersection ratio that is ≥ 0.5
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelCount]); // re-attach when reels are added/removed

  return activeIndex;
}

/* ═══════════════════════════════════════════════════════════════════════
   useIsDesktop — detects lg breakpoint (1024px) via matchMedia.
   Returns false on SSR (safe default: mobile-first).
   This is CRITICAL: both layouts are always in the DOM (just CSS-hidden).
   We must force isActive=false in the hidden layout so its videos never play.
   ═══════════════════════════════════════════════════════════════════════ */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false); // start false (mobile-first SSR safe)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches); // set immediately on mount
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

/* ═══════════════════════════════════════════════════════════════════════
   Main ReelsStream Component
   ═══════════════════════════════════════════════════════════════════════ */
export function ReelsStream({ initialReels }: { initialReels: any[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdClick = async (e: React.MouseEvent, ad: any) => {
    e.preventDefault();
    e.stopPropagation();
    const advertiserId = ad.adSet?.campaign?.user?.id;
    if (!advertiserId) {
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (session?.user && (session.user as any).id === advertiserId) {
      router.push('/ads-manager');
      return;
    }

    try {
      const res = await getOrCreatePersonalChat(advertiserId);
      if (res.success && res.chatId) {
        router.push(`/chat?id=${res.chatId}&tab=personal`);
      } else {
        if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Chat redirection error:', err);
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const [reels, setReels] = useState(initialReels);
  const [followStates, setFollowStates] = useState<Record<string, 'approved' | 'pending' | null>>(() => {
    const initialStates: Record<string, 'approved' | 'pending' | null> = {};
    initialReels.forEach((reel) => {
      if (reel.authorId) {
        initialStates[reel.authorId] = reel.followStatus || (reel.isFollowing ? 'approved' : null);
      }
    });
    return initialStates;
  });

  const isLoadingMore = useRef(false);
  const isExhausted = useRef(false);
  const skipRef = useRef(initialReels.length);
  const loopCountRef = useRef(0);
  const originalReelsRef = useRef<any[]>(initialReels);

  // Sync originalReelsRef with newly added reels
  useEffect(() => {
    const seen = new Set(originalReelsRef.current.map(r => r.id));
    initialReels.forEach(r => {
      videoMetadataCache.set(r.id, r);
      if (!seen.has(r.id)) {
        originalReelsRef.current.push(r);
        seen.add(r.id);
      }
    });
  }, [initialReels]);

  const loadMoreReels = useCallback(async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;

    try {
      if (isExhausted.current) {
        // Existed database reels are exhausted. Repeat from the beginning.
        loopCountRef.current += 1;
        const loopedReels = originalReelsRef.current.map((reel) => ({
          ...reel,
          id: `${reel.id}-loop-${loopCountRef.current}-${Math.random()}`
        }));
        setReels((prev) => [...prev, ...loopedReels]);
        isLoadingMore.current = false;
        return;
      }

      const res = await getReels(skipRef.current, 20);
      if (res.success && res.reels && res.reels.length > 0) {
        const newReels = res.reels;

        // Add to original pool of reels
        const seenIds = new Set(originalReelsRef.current.map((r: any) => r.id));
        newReels.forEach((r: any) => {
          videoMetadataCache.set(r.id, r);
          if (!seenIds.has(r.id)) {
            originalReelsRef.current.push(r);
          }
        });

        // Append to state
        setReels((prev) => {
          const existingIds = new Set(prev.map((r: any) => r.id));
          const filteredNewReels = newReels.filter((r: any) => !existingIds.has(r.id));
          return [...prev, ...filteredNewReels];
        });

        skipRef.current += newReels.length;

        // If we got fewer than 20 reels, database is exhausted
        if (res.reels.length < 20) {
          isExhausted.current = true;
        }
      } else {
        isExhausted.current = true;
        if (originalReelsRef.current.length > 0) {
          loopCountRef.current += 1;
          const loopedReels = originalReelsRef.current.map((reel) => ({
            ...reel,
            id: `${reel.id}-loop-${loopCountRef.current}-${Math.random()}`
          }));
          setReels((prev) => [...prev, ...loopedReels]);
        }
      }
    } catch (err) {
      console.error('Failed to load more reels:', err);
    } finally {
      isLoadingMore.current = false;
    }
  }, []);

  const handleFollowAuthor = async (authorId: string, authorName: string, reelId?: string) => {
    const currentStatus = followStates[authorId] || null;
    
    const targetReel = reels.find(r => r.authorId === authorId);
    const isPrivate = targetReel?.authorIsPrivate || false;

    const nextStatus = currentStatus ? null : (isPrivate ? 'pending' : 'approved');

    // Optimistic state update
    setFollowStates(prev => ({ ...prev, [authorId]: nextStatus }));

    const result = await toggleFollow(authorId, reelId);
    if (!result.success) {
      // Revert state
      setFollowStates(prev => ({ ...prev, [authorId]: currentStatus }));
      alert(result.error || "Failed to follow user");
    } else {
      const finalStatus = (result.status !== undefined ? result.status : (result.isFollowing ? 'approved' : null)) as 'approved' | 'pending' | null;
      setFollowStates(prev => ({ ...prev, [authorId]: finalStatus }));
    }
  };

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
  // Detect screen size — used to disable isActive in the hidden layout
  const isDesktop = useIsDesktop();

  // Separate scroll containers for mobile & desktop
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);

  const visibleReels = reels.filter((r: any) => !hiddenReelIds.includes(r.id));

  // Ads and Boost State
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);
  const [quickBoostType, setQuickBoostType] = useState<'post' | 'reel' | 'listing'>('reel');
  const [quickBoostTargetId, setQuickBoostTargetId] = useState('');

  // Fetch sponsored ads on mount
  useEffect(() => {
    fetchEligibleAds({ limit: 10 }).then((res) => {
      if (Array.isArray(res)) {
        setSponsoredAds(res);
      }
    }).catch((err) => console.error('Failed to load sponsored ads:', err));
  }, []);

  // Compute itemsToRender to interleave sponsored ads
  const itemsToRender: any[] = [];
  let adIndex = 0;
  visibleReels.forEach((reel, index) => {
    itemsToRender.push({ type: 'reel', data: reel });
    if ((index + 1) % 4 === 0 && sponsoredAds.length > 0) {
      itemsToRender.push({ type: 'ad', data: sponsoredAds[adIndex % sponsoredAds.length] });
      adIndex++;
    }
  });

  // Independent active-index tracking for each layout
  const mobileActiveIndex = useActiveReelIndex(mobileScrollRef, itemsToRender.length);
  const desktopActiveIndex = useActiveReelIndex(desktopScrollRef, itemsToRender.length);

  // Sync active reel to browser URL so sharing/refreshing keeps the current reel position
  useEffect(() => {
    const activeIdx = isDesktop ? desktopActiveIndex : mobileActiveIndex;
    const activeItem = itemsToRender[activeIdx];
    if (activeItem && activeItem.id && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/reel/') || currentPath.startsWith('/reels')) {
        const targetUrl = `/reel/${activeItem.id}`;
        if (currentPath !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
        }
      }
    }
  }, [mobileActiveIndex, desktopActiveIndex, isDesktop, itemsToRender]);

  const network = useNetworkConfig();
  const lastIndexRef = useRef(0);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [deviceStats, setDeviceStats] = useState({ preloadCount: 5, maxBuffer: 10, lowRAM: false });
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const conn = (navigator as any).connection;
    const updateStats = () => {
      setDeviceStats(getDeviceNetworkStats());
    };
    updateStats();
    if (conn) {
      conn.addEventListener('change', updateStats);
      return () => conn.removeEventListener('change', updateStats);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('getBattery' in navigator)) return;
    let batteryObj: any = null;
    
    const handleBatteryChange = () => {
      if (batteryObj) {
        setIsLowBattery(!batteryObj.charging && batteryObj.level <= 0.2);
      }
    };

    (navigator as any).getBattery().then((battery: any) => {
      batteryObj = battery;
      handleBatteryChange();
      battery.addEventListener('chargingchange', handleBatteryChange);
      battery.addEventListener('levelchange', handleBatteryChange);
    });

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('chargingchange', handleBatteryChange);
        batteryObj.removeEventListener('levelchange', handleBatteryChange);
      }
    };
  }, []);

  useEffect(() => {
    const activeIndex = isDesktop ? desktopActiveIndex : mobileActiveIndex;
    if (activeIndex > lastIndexRef.current) {
      setDirection('down');
    } else if (activeIndex < lastIndexRef.current) {
      setDirection('up');
    }
    lastIndexRef.current = activeIndex;
  }, [mobileActiveIndex, desktopActiveIndex, isDesktop]);

  const activeIndex = isDesktop ? desktopActiveIndex : mobileActiveIndex;

  const getPreloadParams = (idx: number) => {
    if (idx === activeIndex) {
      return { shouldLoad: true, preload: 'auto' as const };
    }

    const distance = idx - activeIndex;

    // Past slides
    if (distance < 0) {
      const lookBehind = direction === 'up' ? 3 : 2;
      const shouldLoad = idx >= activeIndex - lookBehind;
      return {
        shouldLoad,
        preload: shouldLoad ? ('auto' as const) : ('none' as const),
      };
    }

    // Future slides - adaptive preloading counts
    let maxPreloadCount = 10;
    let autoBufferCount = 4;

    const conn = typeof window !== 'undefined' ? (navigator as any).connection : null;
    const type = conn ? conn.effectiveType : '4g';
    const isSlow = type === '2g' || type === '3g' || (conn && conn.downlink < 2);

    if (isSlow) {
      maxPreloadCount = 3;
      autoBufferCount = 1;
    } else if (type === '4g' && conn && conn.downlink < 10) {
      maxPreloadCount = 7;
      autoBufferCount = 2;
    }

    // Battery saver mode
    if (isLowBattery) {
      maxPreloadCount = 3;
      autoBufferCount = 1;
    }

    if (distance <= maxPreloadCount) {
      if (distance <= autoBufferCount) {
        return { shouldLoad: true, preload: 'auto' as const };
      } else {
        return { shouldLoad: true, preload: 'metadata' as const };
      }
    }

    return { shouldLoad: false, preload: 'none' as const };
  };
  
  const shouldLoadSlide = (idx: number) => {
    return getPreloadParams(idx).shouldLoad;
  };

  /* ── Modal state ── */
  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null);
  const [activeRepostReel, setActiveRepostReel] = useState<string | null>(null);
  const [activeOptionsReel, setActiveOptionsReel] = useState<any | null>(null);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalReposts, setModalReposts] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isRepostModalLoading, setIsRepostModalLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [reshareModalOpen, setReshareModalOpen] = useState(false);
  const [selectedPostIdForReshare, setSelectedPostIdForReshare] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedReelForShare, setSelectedReelForShare] = useState<any | null>(null);



  useEffect(() => {
    // When the user approaches the end of the loaded reels (e.g. index is reels.length - 6, i.e. 5 remaining reels)
    if (reels.length > 0 && activeIndex >= reels.length - 6) {
      loadMoreReels();
    }
  }, [activeIndex, reels.length, loadMoreReels]);

  /* ── Desktop arrow navigation ── */
  const scrollToReel = useCallback((containerRef: React.RefObject<HTMLDivElement | null>, idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const slides = container.querySelectorAll('.reel-container');
    if (slides[idx]) {
      (slides[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (!mounted || itemsToRender.length === 0) return;
    const targetVideoId = searchParams?.get('videoId');
    if (targetVideoId) {
      const idx = itemsToRender.findIndex(item => item.type === 'reel' && item.data.id === targetVideoId);
      if (idx !== -1) {
        setTimeout(() => {
          if (isDesktop) {
            scrollToReel(desktopScrollRef, idx);
          } else {
            scrollToReel(mobileScrollRef, idx);
          }
          // NOTE: Do NOT call openCommentsModal here.
          // Comments should only open when the user explicitly taps the comment button.
        }, 800);
      }
    }
  }, [mounted, searchParams, itemsToRender, isDesktop, scrollToReel]);

  const [retriedUrls, setRetriedUrls] = useState<Record<string, number>>({});

  const handlePlaybackFailed = useCallback(async (index: number, errDetail: string) => {
    const item = itemsToRender[index];
    if (!item) return;

    const currentActiveIndex = isDesktop ? desktopActiveIndex : mobileActiveIndex;
    if (index !== currentActiveIndex) return; // Only act if it is the currently visible reel

    console.error(`[ReelsStream] Playback error on index ${index}: ${errDetail}`);

    // If it's a simulated reel and we haven't reached max retries, try to fetch a fresh URL from Pexels API
    if (item.type === 'reel' && item.data.isSimulation) {
      const reelId = item.data.id;
      const retryCount = retriedUrls[reelId] || 0;

      if (retryCount < 2) {
        setRetriedUrls(prev => ({ ...prev, [reelId]: retryCount + 1 }));
        console.log(`[ReelsStream] Attempting to recover simulated reel ${reelId} (retry ${retryCount + 1}/2)...`);
        
        // Extract category or use general
        const category = item.data.category || 'nature';
        const freshUrl = await getFreshPexelsVideoUrl(category);

        if (freshUrl) {
          console.log(`[ReelsStream] Successfully retrieved fresh Pexels URL: ${freshUrl}`);
          setReels(prev => prev.map(r => r.id === reelId ? { ...r, video: freshUrl } : r));
          return; // Stop here, since state update will trigger reload
        }
      }
    }

    // Do NOT auto-scroll to the next reel anymore. Let the user scroll manually.
    console.log(`[ReelsStream] Playback failed. Waiting for user interaction.`);
  }, [isDesktop, desktopActiveIndex, mobileActiveIndex, itemsToRender, retriedUrls]);

  const handleNewPost = (post: any, postData?: any) => {
    const isVideo = post && post.mediaTypes && (post.mediaTypes === 'video' || post.mediaTypes.split(',')[0] === 'video');
    if (isVideo) {
      const firstTolee = post.tolees?.[0]?.tolee;
      const authorId = post.author?.id || post.authorId || (session?.user as any)?.id;
      const authorUsername = post.author?.username || (session?.user as any)?.username || session?.user?.name || 'User';
      const authorAvatar = getValidAvatarUrl(post.author?.avatar || session?.user?.image);

      setReels((prev) => [{
        id: post.id,
        authorId: authorId,
        authorIsPrivate: post.author?.isPrivate || false,
        visibility: post.visibility || 'public',
        video: post.mediaUrls,
        author: authorUsername,
        authorAvatar: authorAvatar,
        toleeName: firstTolee?.name || postData?.toleeName || null,
        toleeSlug: firstTolee?.slug || postData?.toleeSlug || null,
        toleeId: firstTolee?.id || null,
        role: firstTolee?.ownerId === authorId ? 'Admin' : 'Member',
        caption: post.caption || '',
        likes: 0,
        comments: 0,
        views: 0,
        shares: '0',
        reposts: 0,
        audio: 'Original Audio',
        isVerified: post.author?.isVerified || false,
        likedByMe: false,
        savedByMe: false,
        repostedByMe: false,
        resharedByUser: null,
        isFollowing: false,
        followStatus: null
      }, ...prev]);

      if (authorId) {
        setFollowStates((prev) => ({
          ...prev,
          [authorId]: 'approved'
        }));
      }
    }
  };

  const handleLike = async (id: string, index: number) => {
    setReels((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      const wasLiked = r.likedByMe;
      let count = parseInt(String(r.likes).replace(/k/i, '000').replace(/m/i, '000000')) || 0;
      r.likedByMe = !wasLiked;
      r.likes = wasLiked ? Math.max(0, count - 1) : count + 1;
      next[index] = r;
      return next;
    });
    const result = await toggleLike(id.toString());
    if (!result.success) {
      // Revert
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

  const handleCommentSubmit = async (e?: React.FormEvent, parentId?: string) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !activeCommentReel) return;
    const text = commentText;
    setCommentText('');
    const index = reels.findIndex((r) => r.id === activeCommentReel);
    if (index !== -1) {
      setReels((prev) => {
        const next = [...prev];
        const r = { ...next[index] };
        r.comments = (parseInt(String(r.comments).replace(/k/i, '000')) || 0) + 1;
        next[index] = r;
        return next;
      });
    }
    const tempId = 'temp-' + Date.now();
    setModalComments((prev) => [{
      id: tempId,
      content: text,
      parentId: parentId || null,
      author: { name: session?.user?.name || 'You', username: (session?.user as any)?.username || 'me', avatar: session?.user?.image },
      createdAt: new Date().toISOString(),
    }, ...prev]);
    const result = await addComment(activeCommentReel, text, parentId);
    if (!result.success) {
      if (index !== -1) {
        setReels((prev) => {
          const next = [...prev];
          const r = { ...next[index] };
          r.comments = Math.max(0, (parseInt(String(r.comments).replace(/k/i, '000')) || 1) - 1);
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
    const result = await toggleSavePost(id.toString());
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
      const count = parseInt(String(r.reposts || '0')) || 0;
      r.repostedByMe = !wasReposted;
      r.reposts = wasReposted ? Math.max(0, count - 1) : count + 1;
      next[index] = r;
      return next;
    });
    const result = await toggleRepost(id.toString());
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

  /* ── Shared action prop builder ── */
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

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ────────────────────────────────────────────────────────────────
          MOBILE: full-screen fixed immersive (hidden on lg+)
         ──────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed inset-0 z-40 bg-black text-white overflow-hidden flex justify-center">

        {/* Mobile top bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition-all mr-1"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-bold text-white drop-shadow-md">Reels</h1>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <CreatePostModal onPost={handleNewPost} videoOnly>
                <button
                  id="reels-upload-mobile"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm border border-white/30 transition-all"
                >
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </CreatePostModal>
            )}
            {session?.user && (
              <Link href="/u/me">
                <Avatar className="w-8 h-8 border border-white/50 shadow-md">
                  <AvatarImage src={getValidAvatarUrl(session.user.image)} />
                  <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>

        {itemsToRender.length === 0 ? (
          <EmptyState onPost={handleNewPost} />
        ) : (
          /* Mobile scroll container */
          <div
            ref={mobileScrollRef}
            className="w-full sm:max-w-[450px] h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
          >
            {itemsToRender.map((item, index) => {
              if (item.type === 'ad') {
                // Find preceding reel details to attribute revenue correctly
                let precedingReelId: string | undefined = undefined;
                let precedingToleeId: string | undefined = undefined;
                for (let i = index - 1; i >= 0; i--) {
                  if (itemsToRender[i].type === 'reel') {
                    precedingReelId = itemsToRender[i].data.id;
                    precedingToleeId = itemsToRender[i].data.toleeId;
                    break;
                  }
                }

                const preloadParams = getPreloadParams(index);
                return (
                  <AdReelSlide
                    key={`ad-${item.data.id}-${index}`}
                    ad={item.data}
                    index={index}
                    isActive={!isDesktop && index === mobileActiveIndex}
                    desktop={false}
                    onAdClick={handleAdClick}
                    contentId={precedingReelId}
                    toleeId={precedingToleeId}
                    onPlaybackFailed={handlePlaybackFailed}
                    shouldLoad={preloadParams.shouldLoad}
                    preload={preloadParams.preload}
                  />
                );
              }
              const reel = item.data;
              const originalIndex = reels.findIndex(r => r.id === reel.id);
              const preloadParams = getPreloadParams(index);
              return (
                <ReelSlide
                  key={`reel-${reel.id}-${index}`}
                  reel={reel}
                  index={index}
                  // Only activate if this layout is currently VISIBLE (not desktop)
                  isActive={!isDesktop && index === mobileActiveIndex}
                  isMuted={isMuted}
                  session={session}
                  desktop={false}
                  onMuteToggle={() => handleSetIsMuted((m) => !m)}
                  followStatus={followStates[reel.authorId]}
                  onFollow={() => handleFollowAuthor(reel.authorId, reel.author, reel.id)}
                  onPlaybackFailed={handlePlaybackFailed}
                  shouldLoad={preloadParams.shouldLoad}
                  preload={preloadParams.preload}
                  {...makeActions(reel, originalIndex)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          DESKTOP: inline layout — sidebar stays visible (hidden on < lg)
         ──────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-4rem)] bg-black overflow-hidden relative">

        {/* Desktop top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-2xl font-black text-white tracking-tight select-none">Reels</h1>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            {session?.user && (
              <CreatePostModal onPost={handleNewPost} videoOnly>
                <button
                  id="reels-upload-desktop"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-gray-100 font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Create Reel
                </button>
              </CreatePostModal>
            )}
            <button
              onClick={() => handleSetIsMuted((m) => !m)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 text-white transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {itemsToRender.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState onPost={handleNewPost} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full gap-6 px-4">

            {/* Prev / Next arrows */}
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
                disabled={desktopActiveIndex >= itemsToRender.length - 1}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* 9:16 Centered reel player */}
            <div
              ref={desktopScrollRef}
              className="relative flex-shrink-0 overflow-y-scroll snap-y snap-mandatory hide-scrollbar rounded-2xl shadow-2xl shadow-black/60"
              style={{ width: 'min(380px, 40vw)', height: 'min(676px, calc(100vh - 80px))' }}
            >
              {itemsToRender.map((item, index) => {
                if (item.type === 'ad') {
                  // Find preceding reel details to attribute revenue correctly
                  let precedingReelId: string | undefined = undefined;
                  let precedingToleeId: string | undefined = undefined;
                  for (let i = index - 1; i >= 0; i--) {
                    if (itemsToRender[i].type === 'reel') {
                      precedingReelId = itemsToRender[i].data.id;
                      precedingToleeId = itemsToRender[i].data.toleeId;
                      break;
                    }
                  }

                const preloadParams = getPreloadParams(index);
                return (
                  <AdReelSlide
                    key={`ad-${item.data.id}-${index}`}
                    ad={item.data}
                    index={index}
                    isActive={isDesktop && index === desktopActiveIndex}
                    desktop={true}
                    onAdClick={handleAdClick}
                    contentId={precedingReelId}
                    toleeId={precedingToleeId}
                    onPlaybackFailed={handlePlaybackFailed}
                    shouldLoad={preloadParams.shouldLoad}
                    preload={preloadParams.preload}
                  />
                );
              }
              const reel = item.data;
              const originalIndex = reels.findIndex(r => r.id === reel.id);
              const preloadParams = getPreloadParams(index);
              return (
                <ReelSlide
                  key={`reel-${reel.id}-${index}`}
                  reel={reel}
                  index={index}
                  // Only activate if this layout is currently VISIBLE (desktop)
                  isActive={isDesktop && index === desktopActiveIndex}
                  isMuted={isMuted}
                  session={session}
                  desktop={true}
                  onMuteToggle={() => handleSetIsMuted((m) => !m)}
                  followStatus={followStates[reel.authorId]}
                  onFollow={() => handleFollowAuthor(reel.authorId, reel.author, reel.id)}
                  onPlaybackFailed={handlePlaybackFailed}
                  shouldLoad={preloadParams.shouldLoad}
                  preload={preloadParams.preload}
                  {...makeActions(reel, originalIndex)}
                />
              );
            })}
            </div>

            {/* Desktop right-side action bar */}
            {itemsToRender[desktopActiveIndex] && itemsToRender[desktopActiveIndex].type === 'reel' && (
              <DesktopActionBar
                reel={itemsToRender[desktopActiveIndex].data}
                {...makeActions(
                  itemsToRender[desktopActiveIndex].data,
                  reels.findIndex(r => r.id === itemsToRender[desktopActiveIndex].data.id)
                )}
              />
            )}

            {/* Desktop Side Panel for Comments & Description */}
            {isDesktop && activeCommentReel && reels.find(r => r.id === activeCommentReel) && (
              <ReelsSidePanel
                reel={reels.find(r => r.id === activeCommentReel)}
                onClose={() => { setActiveCommentReel(null); setModalComments([]); }}
                comments={modalComments}
                isLoading={isModalLoading}
                commentText={commentText}
                setCommentText={setCommentText}
                onSubmit={handleCommentSubmit}
                session={session}
                followStatus={followStates[reels.find(r => r.id === activeCommentReel)?.authorId]}
                onFollow={() => {
                  const authorId = reels.find(r => r.id === activeCommentReel)?.authorId;
                  const authorName = reels.find(r => r.id === activeCommentReel)?.author;
                  if (authorId) handleFollowAuthor(authorId, authorName, activeCommentReel);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ══════════════ SHARED MODALS ══════════════ */}
      <CommentsModal
        open={!!activeCommentReel && !isDesktop}
        onClose={() => { setActiveCommentReel(null); setModalComments([]); }}
        comments={modalComments}
        isLoading={isModalLoading}
        commentText={commentText}
        setCommentText={setCommentText}
        onSubmit={handleCommentSubmit}
        session={session}
        reel={reels.find(r => r.id === activeCommentReel)}
        followStatus={activeCommentReel ? followStates[reels.find(r => r.id === activeCommentReel)?.authorId] : null}
        onFollow={() => {
          const authorId = reels.find(r => r.id === activeCommentReel)?.authorId;
          const authorName = reels.find(r => r.id === activeCommentReel)?.author;
          if (authorId) handleFollowAuthor(authorId, authorName, activeCommentReel || undefined);
        }}
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

      {/* Reposts list modal */}
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
                    <Skeleton className="h-8 w-24 rounded-full bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : modalReposts.length > 0 ? (
              modalReposts.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border border-gray-700"><AvatarImage src={getValidAvatarUrl(user.avatar)} /><AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback></Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-[#1a1a1a] rounded-full p-[2px]"><div className="bg-green-500 rounded-full p-0.5"><Repeat className="w-2.5 h-2.5 text-white stroke-[2.5]" /></div></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] text-white">{user.name || user.username}</span>
                      {user.username && <span className="text-xs text-gray-400">@{user.username}</span>}
                      <span className="text-[10px] text-gray-500">{user.repostedAt ? new Date(user.repostedAt).toLocaleDateString() : 'ReShared'}</span>
                    </div>
                  </div>
                  {user.username ? (
                    <Link href={`/u/${user.username}`} onClick={() => setActiveRepostReel(null)}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white font-bold text-xs px-4 bg-transparent text-gray-300">View Profile</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="h-8 rounded-full border-gray-800 text-gray-600 font-bold text-xs px-4 bg-transparent">Anonymous</Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center"><Repeat className="w-8 h-8 text-gray-600" /></div>
                <p className="font-bold text-gray-400">No reshares yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReShareModal
        isOpen={reshareModalOpen}
        onClose={() => setReshareModalOpen(false)}
        postId={selectedPostIdForReshare || ''}
        onSuccess={(id: string) => {
          setReels((curr) => curr.map((r) => r.id === id ? { ...r, reposts: (r.reposts || 0) + 1, repostedByMe: true } : r));
        }}
      />

      {selectedReelForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setSelectedReelForShare(null); }}
          postId={selectedReelForShare.id}
          shareUrl={getContentPermanentUrl({ id: selectedReelForShare.id, postType: 'reel' })}
          previewText={selectedReelForShare.caption || 'Check out this reel on Tolee!'}
          postMediaUrl={selectedReelForShare.video}
          postMediaType="video"
          postAuthor={selectedReelForShare.author}
          postAuthorAvatar={selectedReelForShare.authorAvatar}
          postCaption={selectedReelForShare.caption}
          onShareSuccess={(count: number) => {
            setReels((curr) => curr.map((r) => r.id === selectedReelForShare.id ? { ...r, shares: count.toString() } : r));
          }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ReelSlide — memoized so it only re-renders when its own props change.
   This is critical: prevents ALL slides from re-rendering when only
   activeReelIndex changes, which was causing play/pause race conditions.
   ═══════════════════════════════════════════════════════════════════════ */
const ReelSlide = memo(function ReelSlide({
  reel, index, isActive, isMuted, session, desktop,
  onMuteToggle, onLike, onComment, onReshare,
  onRepostsModal, onShare, onSave, onOptions, onBoost,
  followStatus, onFollow,
  onPlaybackFailed,
  shouldLoad,
  preload = 'auto',
}: {
  reel: any; index: number; isActive: boolean; isMuted: boolean;
  session: any; desktop: boolean;
  onMuteToggle: () => void; onLike: () => void; onComment: () => void;
  onReshare: () => void; onRepostsModal: () => void; onShare: () => void;
  onSave: () => void; onOptions: () => void; onBoost: () => void;
  followStatus?: 'approved' | 'pending' | null;
  onFollow?: () => void;
  onPlaybackFailed?: (index: number, errDetail: string) => void;
  shouldLoad: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}) {
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);

  if (reel.isUnavailable) {
    return (
      <div
        data-index={index}
        className="reel-container w-full h-full snap-start snap-always relative flex flex-col items-center justify-center overflow-hidden bg-black text-center p-6 select-none"
        style={{ scrollSnapStop: 'always' }}
      >
        <div className="max-w-xs bg-zinc-900/60 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 text-white shadow-xl">
          <AlertCircle className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
          <h3 className="text-sm font-black mb-2">Video Unavailable</h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
            This video is no longer available. It may have been deleted, set to private, or expired.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (isActive) {
      setIsReady(false);
      setIsError(false);
    }
  }, [isActive]);

  const handleVideoError = (e: any) => {
    setIsError(true);
    console.error(`[Reel Play Error] Index: ${index}, ID: ${reel.id}, URL: ${reel.video}, Error:`, e);
    if (onPlaybackFailed && isActive) {
      onPlaybackFailed(index, `Video playback failed for URL: ${reel.video}`);
    }
  };

  const isOwner = session?.user && (
    (session.user as any).id === reel.authorId || 
    (session.user as any).username === reel.author || 
    session.user.name === reel.author
  );

  const youtubeId = extractYouTubeVideoId(reel.video) || 
                    extractYouTubeVideoId(reel.youtubeId) || 
                    extractYouTubeVideoId(reel.sourceUrl) || 
                    extractYouTubeVideoId(reel.mediaUrls);
  const isYouTube = Boolean(youtubeId);

  return (
    <div
      data-index={index}
      className="reel-container w-full h-full snap-start snap-always relative flex items-center justify-center overflow-hidden bg-black"
      style={{ scrollSnapStop: 'always' }}
    >
      {/* ── Video Playback: YouTube Player vs Native Tolee Video ── */}
      {isYouTube && youtubeId ? (
        <YouTubeReelPlayer
          videoId={youtubeId}
          title={reel.caption || 'YouTube Video'}
          isActive={isActive}
          isMuted={isMuted}
          desktop={desktop}
          posterUrl={getPosterUrl(reel.video)}
        />
      ) : (
        <>
          <HLSVideo
            src={reel.video}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            poster={getPosterUrl(reel.video)}
            isActive={isActive}
            shouldLoad={shouldLoad}
            preload={preload}
            contentId={reel.id}
            contentType="reel"
            trafficSource="reels"
            isVisible={isActive}
            loop
            muted={isMuted}
            playsInline
            onCanPlay={() => setIsReady(true)}
            onError={handleVideoError}
            onLoadStart={() => {
              setIsReady(false);
              setIsError(false);
            }}
          />

          {/* ── Thumbnail Overlay (shown before first frame is ready) ── */}
          {!isReady && !isError && getPosterUrl(reel.video) && (
            <img
              src={getPosterUrl(reel.video)}
              alt="Thumbnail"
              className="absolute inset-0 w-full h-full object-cover z-0 filter blur-[2px] scale-105"
            />
          )}

          {/* ── Reel Loading Skeleton Shimmer ── */}
          {isActive && !isReady && !isError && (
            <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-xs flex flex-col justify-end p-6 pb-24 space-y-4 animate-pulse pointer-events-none z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20" />
                <div className="w-24 h-4 bg-white/20 rounded-md" />
              </div>
              <div className="w-2/3 h-4 bg-white/10 rounded-md" />
              <div className="w-1/2 h-3.5 bg-white/10 rounded-md" />
            </div>
          )}

          {/* ── Error Placeholder ── */}
          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 z-10 space-y-4">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-zinc-200">Video Unavailable</h4>
                <p className="text-xs text-zinc-500 max-w-[200px]">This video asset could not be loaded.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Mobile volume button */}
      {!desktop && (
        <div className="absolute top-16 right-4 z-10">
          <button onClick={onMuteToggle} className="text-white bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-md transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Mobile right action bar */}
      {!desktop && (
        <div className="absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3.5 z-10 pointer-events-auto">
          <MobileActionBar reel={reel} session={session} onLike={onLike} onComment={onComment} onReshare={onReshare} onRepostsModal={onRepostsModal} onShare={onShare} onSave={onSave} onOptions={onOptions} onBoost={onBoost} />
        </div>
      )}

      {/* Bottom info */}
      <div className={`absolute z-10 pointer-events-auto flex flex-col gap-2 ${desktop ? 'bottom-4 left-3 right-3' : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-16'}`}>
        <div className="flex items-center gap-2">
          <Link href={`/u/${reel.author}`}>
            <div className={`relative rounded-full ${reel.hasActiveStory ? 'p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600' : ''}`}>
              <Avatar className="w-8 h-8 border-2 border-black cursor-pointer">
                <AvatarImage src={getValidAvatarUrl(reel.authorAvatar)} />
                <AvatarFallback>{reel.author?.[0]}</AvatarFallback>
              </Avatar>
            </div>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 flex-wrap">
              <Link href={`/u/${reel.author}`}>
                <span className="font-semibold text-[14px] text-white cursor-pointer hover:underline drop-shadow">{reel.author}</span>
              </Link>
              {reel.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400 fill-white" />}
              {!isOwner && onFollow && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onFollow(); }}
                  className={`h-6 px-3 bg-transparent border rounded-lg font-semibold text-xs ml-1 transition-all duration-300 active:scale-95 ${
                    followStatus === 'approved' 
                      ? 'border-white/25 text-gray-300 hover:bg-white/10' 
                      : followStatus === 'pending'
                        ? 'border-amber-400 text-amber-400 hover:bg-amber-400/10'
                        : 'border-white text-white hover:bg-white/20'
                  }`}
                >
                  {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                </button>
              )}
            </div>
            {reel.toleeName && reel.toleeSlug && (
              <Link href={`/t/${reel.toleeSlug}`} className="text-[11px] text-gray-300 hover:text-white hover:underline mt-0.5 w-fit" onClick={(e) => e.stopPropagation()}>
                from <span className="font-semibold text-white">{reel.toleeName}</span>
              </Link>
            )}
          </div>
        </div>
        {(() => {
          if (!reel.caption) return null;
          const cleanCap = decodeHtmlEntities(reel.caption);
          const lines = cleanCap.split('\n');
          const maxLines = 2;
          const isLongCaption = lines.length > maxLines || cleanCap.length > 120;
          
          if (isLongCaption) {
            let displayCaption = lines.slice(0, maxLines).join('\n');
            if (displayCaption.length > 110) {
              displayCaption = displayCaption.substring(0, 110).trim();
            }
            return (
              <p className="text-[13px] text-white drop-shadow leading-snug whitespace-pre-wrap">
                {displayCaption}...
                <button
                  onClick={(e) => { e.stopPropagation(); onComment(); }}
                  className="font-extrabold text-white ml-1.5 opacity-90 hover:opacity-100 hover:underline focus:outline-none cursor-pointer"
                >
                  more
                </button>
              </p>
            );
          }
          return (
            <p className="text-[13px] text-white drop-shadow leading-snug whitespace-pre-wrap">{cleanCap}</p>
          );
        })()}
        <div className="flex items-center gap-1.5 text-[12px] text-white/80 drop-shadow">
          <Music className="w-3 h-3" />
          <span>{reel.audio}</span>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   AdReelSlide — renders active sponsored ads interleaved in Reels stream
   ═══════════════════════════════════════════════════════════════════════ */
const AdReelSlide = memo(function AdReelSlide({
  ad,
  index,
  isActive,
  desktop,
  onAdClick,
  contentId,
  toleeId,
  onPlaybackFailed,
  shouldLoad,
  preload = 'auto',
}: {
  ad: any;
  index: number;
  isActive: boolean;
  desktop: boolean;
  onAdClick: (e: React.MouseEvent, ad: any) => void;
  contentId?: string;
  toleeId?: string;
  onPlaybackFailed?: (index: number, errDetail: string) => void;
  shouldLoad: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}) {
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsReady(false);
      setIsError(false);
    }
  }, [isActive]);

  const handleVideoError = (e: any) => {
    setIsError(true);
    console.error(`[Ad Reel Play Error] Index: ${index}, Ad ID: ${ad.id}, URL: ${displayMedia}, Error:`, e);
    if (onPlaybackFailed && isActive) {
      onPlaybackFailed(index, `Ad video playback failed for URL: ${displayMedia}`);
    }
  };

  const advertiserName = ad.adSet?.campaign?.user?.name || 'Tolee Sponsor';
  const advertiserAvatar = getValidAvatarUrl(ad.adSet?.campaign?.user?.avatar || ad.adSet?.campaign?.user?.image);
  const mediaList = ad.mediaUrls ? ad.mediaUrls.split(/,(?=https?:\/\/)/).map((u: string) => u.trim()).filter(Boolean) : [];
  const displayMedia = mediaList[0] || null;
  const isVideo = displayMedia ? isVideoUrl(displayMedia) : false;

  return (
    <div
      data-index={index}
      className="reel-container w-full h-full snap-start snap-always relative flex items-center justify-center overflow-hidden bg-[#0d0d0f]"
      style={{ scrollSnapStop: 'always' }}
    >
      {/* ── Impression Tracker ── */}
      <AdTracker adId={ad.id} type="impression" contentId={contentId} toleeId={toleeId} placementType="normal_feed" />

      {/* ── Ad Media ── */}
      {displayMedia && (
        <AdTracker adId={ad.id} type="click" contentId={contentId} toleeId={toleeId} placementType="normal_feed" className="w-full h-full cursor-pointer absolute inset-0 z-0">
          <div onClick={(e) => onAdClick(e, ad)} className="w-full h-full block">
            {isVideo ? (
              <>
                <HLSVideo
                  src={displayMedia}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                  poster={getPosterUrl(displayMedia)}
                  isActive={isActive}
                  shouldLoad={shouldLoad}
                  preload={preload}
                  loop
                  muted
                  playsInline
                  onCanPlay={() => setIsReady(true)}
                  onError={handleVideoError}
                  onLoadStart={() => {
                    setIsReady(false);
                    setIsError(false);
                  }}
                />

                {/* Thumbnail Overlay (shown before first frame is ready) */}
                {!isReady && !isError && getPosterUrl(displayMedia) && (
                  <img
                    src={getPosterUrl(displayMedia)}
                    alt="Ad Thumbnail"
                    className="absolute inset-0 w-full h-full object-cover z-0 filter blur-[2px] scale-105"
                  />
                )}

                {/* ── Ad Reel Loading Skeleton Shimmer ── */}
                {isActive && !isReady && !isError && (
                  <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-xs flex flex-col justify-end p-6 pb-24 space-y-4 animate-pulse pointer-events-none z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/20" />
                      <div className="w-24 h-4 bg-white/20 rounded-md" />
                    </div>
                    <div className="w-2/3 h-4 bg-white/10 rounded-md" />
                    <div className="w-1/2 h-3.5 bg-white/10 rounded-md" />
                  </div>
                )}

                {/* Error placeholder */}
                {isError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-6 z-10 space-y-4">
                    <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-zinc-200">Video Unavailable</h4>
                      <p className="text-xs text-zinc-500 max-w-[200px]">This sponsored ad video could not be loaded.</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={displayMedia}
                alt={ad.headline || 'Sponsored Ad'}
                className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-out]"
              />
            )}
          </div>
        </AdTracker>
      )}

      {/* Premium Glassmorphic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/75 pointer-events-none z-10" />

      {/* Premium Sponsored Badge (Top Center) */}
      <div className="absolute top-16 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-indigo-500/30 backdrop-blur-md">
          <Rocket className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">
            Sponsored Ad
          </span>
        </div>
        <div className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 backdrop-blur-sm">
          Verified Brand
        </div>
      </div>

      {/* Mobile-only action sidebar on the right */}
      {!desktop && (
        <div className="absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-4 z-20 pointer-events-auto">
          {/* Heart/Engagement buttons placeholders for ads to match alignment, but styled as sponsored */}
          <div className="flex flex-col items-center gap-1 opacity-70">
            <Heart className="w-7 h-7 text-white fill-transparent drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]" />
            <span className="text-xs font-bold text-white drop-shadow mt-0.5">Ad</span>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-70">
            <MessageCircle className="w-7 h-7 text-white fill-transparent drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]" />
            <span className="text-xs font-bold text-white drop-shadow mt-0.5">Promo</span>
          </div>
          <AdTracker adId={ad.id} type="lead" contentId={contentId} toleeId={toleeId} placementType="normal_feed">
            <div onClick={(e) => onAdClick(e, ad)} className="cursor-pointer">
              <button className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg border border-white/20 animate-bounce hover:scale-105 active:scale-95 transition-transform">
                <Rocket className="w-4 h-4 text-white" />
              </button>
            </div>
          </AdTracker>
          <span className="text-[9px] font-extrabold text-emerald-400 drop-shadow mt-0.5 tracking-tighter uppercase">Visit</span>
        </div>
      )}

      {/* Brand & Ad Info Bottom Overlay */}
      <div className={`absolute z-20 pointer-events-auto flex flex-col gap-3 ${desktop ? 'bottom-4 left-3 right-3' : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-16'}`}>
        {/* Brand Info */}
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9 border border-indigo-400/30 shadow-md">
            {advertiserAvatar ? (
              <AvatarImage src={advertiserAvatar} alt={advertiserName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-emerald-500 text-white font-black text-xs">
              {advertiserName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-[14px] text-white drop-shadow">{advertiserName}</span>
            <span className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase drop-shadow flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              Direct Brand Partner
            </span>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-1.5">
          {ad.headline && (
            <h4 className="text-[15px] font-black text-white leading-snug tracking-tight drop-shadow">
              {ad.headline}
            </h4>
          )}
          {ad.primaryText && (
            <p className="text-[13px] text-gray-200 line-clamp-2 leading-relaxed drop-shadow">
              {ad.primaryText}
            </p>
          )}
          {ad.description && (
            <p className="text-[11px] text-gray-400 line-clamp-1 leading-normal drop-shadow">
              {ad.description}
            </p>
          )}
        </div>

        {/* High-visibility Call-To-Action Button */}
        <AdTracker adId={ad.id} type="lead" contentId={contentId} toleeId={toleeId} placementType="normal_feed" className="w-full mt-1">
          <div onClick={(e) => onAdClick(e, ad)} className="block w-full cursor-pointer">
            <button className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:via-teal-600 hover:to-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn active:scale-[0.98]">
              <Rocket className="w-3.5 h-3.5 animate-pulse text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              <span>
                {ad.ctaButton === 'send_message' ? 'Send Message' : ad.ctaButton === 'shop_now' ? 'Shop Now' : ad.ctaButton === 'sign_up' ? 'Sign Up' : 'Learn More'}
              </span>
            </button>
          </div>
        </AdTracker>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   Mobile Action Bar
   ═══════════════════════════════════════════════════════════════════════ */
function MobileActionBar({ reel, session, onLike, onComment, onReshare, onRepostsModal, onShare, onSave, onOptions, onBoost }: any) {
  const sz = 'w-7 h-7';
  const sh = 'drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]';
  const isOwner = session?.user && (
    (session.user as any).id === reel.authorId || 
    (session.user as any).username === reel.author || 
    session.user.name === reel.author
  );

  return (
    <>
      {isOwner && (
        <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onBoost(); }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg border border-white/20 hover:from-blue-600 hover:to-emerald-600 animate-pulse">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className={`text-[10px] font-bold text-emerald-400 ${sh} mt-0.5 uppercase tracking-tighter`}>Boost</span>
        </div>
      )}
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onLike(); }}>
        <Heart className={`${sz} ${sh} transition-all ${reel.likedByMe ? 'fill-red-500 text-red-500' : 'text-white fill-transparent group-hover:text-gray-200'}`} />
        <span className={`text-xs font-bold text-white ${sh} mt-0.5`}>{reel.likes}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onComment(); }}>
        <MessageCircle className={`${sz} text-white fill-transparent ${sh} group-hover:text-gray-200`} />
        <span className={`text-xs font-bold text-white ${sh} mt-0.5`}>{reel.comments}</span>
      </div>
      <div className="flex flex-col items-center gap-1 group transition-all hover:scale-110 active:scale-90">
        <button onClick={(e) => { e.stopPropagation(); onReshare(); }} className="focus:outline-none">
          <Repeat className={`${sz} ${sh} transition-all hover:rotate-180 ${reel.repostedByMe ? 'text-green-500' : 'text-white group-hover:text-gray-200'}`} />
        </button>
        <span className={`text-xs font-bold text-white ${sh} mt-0.5 ${(reel.reposts || 0) > 0 ? 'cursor-pointer hover:underline' : ''}`} onClick={(e) => { e.stopPropagation(); onRepostsModal(); }}>{reel.reposts || '0'}</span>
      </div>
      <div className="flex flex-col items-center gap-1 pointer-events-none">
        <Eye className={`${sz} text-white ${sh}`} />
        <span className={`text-xs font-bold text-white ${sh} mt-0.5`}>{formatViewCount(reel.views || 0)}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onShare(); }}>
        <Send className={`${sz} text-white fill-transparent ${sh} group-hover:text-gray-200`} />
        <span className={`text-xs font-bold text-white ${sh} mt-0.5`}>{reel.shares}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onSave(); }}>
        <Bookmark className={`${sz} ${sh} transition-all ${reel.savedByMe ? 'fill-white text-white' : 'text-white fill-transparent group-hover:text-gray-200'}`} />
        <span className={`text-[10px] font-bold text-white ${sh} mt-0.5 uppercase tracking-tighter`}>{reel.savedByMe ? 'Saved' : 'Save'}</span>
      </div>
      <div className="cursor-pointer transition-all hover:scale-110 active:scale-90" onClick={(e) => { e.stopPropagation(); onOptions(); }}>
        <MoreVertical className="w-6 h-6 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]" />
      </div>
      <div className="mt-0.5 w-8 h-8 rounded-full bg-black/60 border-2 border-white/80 overflow-hidden animate-[spin_8s_linear_infinite] shadow-lg">
        <img src={reel.authorAvatar || '/default-user-avatar.svg'} alt="audio" className="w-full h-full object-cover rounded-full" />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Desktop Action Bar (right side, outside video)
   ═══════════════════════════════════════════════════════════════════════ */
function DesktopActionBar({ reel, session, onLike, onComment, onReshare, onRepostsModal, onShare, onSave, onOptions, onBoost }: any) {
  const sz = 'w-7 h-7';
  const isOwner = session?.user && (
    (session.user as any).id === reel.authorId || 
    (session.user as any).username === reel.author || 
    session.user.name === reel.author
  );

  return (
    <div className="flex flex-col items-center gap-5 shrink-0">
      {isOwner && (
        <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={onBoost}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg border border-white/20 hover:from-blue-600 hover:to-emerald-600 animate-pulse">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5 uppercase tracking-tight">Boost</span>
        </div>
      )}
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={onLike}>
        <Heart className={`${sz} transition-all ${reel.likedByMe ? 'fill-red-500 text-red-500' : 'text-white fill-transparent group-hover:text-red-400'}`} />
        <span className="text-xs font-bold text-gray-200">{reel.likes}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={onComment}>
        <MessageCircle className={`${sz} text-white fill-transparent group-hover:text-primary transition-colors`} />
        <span className="text-xs font-bold text-gray-200">{reel.comments}</span>
      </div>
      <div className="flex flex-col items-center gap-1 group transition-all hover:scale-110 active:scale-90">
        <button onClick={onReshare} className="focus:outline-none">
          <Repeat className={`${sz} transition-all hover:rotate-180 ${reel.repostedByMe ? 'text-green-400' : 'text-white group-hover:text-green-400'}`} />
        </button>
        <span className={`text-xs font-bold text-gray-200 ${(reel.reposts || 0) > 0 ? 'cursor-pointer hover:underline' : ''}`} onClick={onRepostsModal}>{reel.reposts || '0'}</span>
      </div>
      <div className="flex flex-col items-center gap-1 pointer-events-none">
        <Eye className={`${sz} text-white/70`} />
        <span className="text-xs font-bold text-gray-400">{formatViewCount(reel.views || 0)}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={onShare}>
        <Send className={`${sz} text-white fill-transparent group-hover:text-primary transition-colors`} />
        <span className="text-xs font-bold text-gray-200">{reel.shares}</span>
      </div>
      <div className="flex flex-col items-center gap-1 cursor-pointer group transition-all hover:scale-110 active:scale-90" onClick={onSave}>
        <Bookmark className={`${sz} transition-all ${reel.savedByMe ? 'fill-white text-white' : 'text-white fill-transparent group-hover:text-yellow-300'}`} />
        <span className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-tight">{reel.savedByMe ? 'Saved' : 'Save'}</span>
      </div>
      <div className="cursor-pointer transition-all hover:scale-110 active:scale-90" onClick={onOptions}>
        <MoreVertical className="w-6 h-6 text-white hover:text-gray-300 transition-colors" />
      </div>
      <div className="w-9 h-9 rounded-full bg-black/40 border-2 border-white/60 overflow-hidden animate-[spin_8s_linear_infinite] shadow-lg mt-1">
        <img src={reel.authorAvatar || '/default-user-avatar.svg'} alt="audio" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════════════ */
function EmptyState({ onPost }: { onPost: (d: any) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <p className="text-gray-400 text-lg">No reels found. Be the first to upload one!</p>
      <CreatePostModal onPost={onPost} videoOnly>
        <Button variant="outline" className="text-black bg-white hover:bg-gray-200 font-bold rounded-full border-none">
          Upload Video
        </Button>
      </CreatePostModal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ReelsDetailsContent (Shared Details & Comments Component)
   ═══════════════════════════════════════════════════════════════════════ */
interface ReelsDetailsContentProps {
  reel: any;
  comments: any[];
  isLoading: boolean;
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e?: React.FormEvent, parentId?: string) => Promise<void>;
  session: any;
  followStatus: 'approved' | 'pending' | null;
  onFollow: () => void;
}

function ReelsDetailsContent({
  reel,
  comments,
  isLoading,
  commentText,
  setCommentText,
  onSubmit,
  session,
  followStatus,
  onFollow
}: ReelsDetailsContentProps) {
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const composerInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (comments.length === 0) return;
    const commentId = searchParams?.get('commentId');
    const replyId = searchParams?.get('replyId');
    if (commentId) {
      const targetId = replyId || commentId;
      const targetExists = comments.some((c: any) => 
        c.id === targetId || (comments.some((child: any) => child.parentId === c.id && child.id === targetId))
      );

      if (targetExists) {
        if (replyId) {
          setExpandedReplies(prev => ({ ...prev, [commentId]: true }));
        }

        setTimeout(() => {
          const el = document.getElementById(`comment-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(targetId);

            const targetComment = comments.find((c: any) => c.id === targetId) || 
                                  comments.find((c: any) => c.parentId === commentId && c.id === targetId);
            const authorName = targetComment?.author?.username || targetComment?.author?.name || 'User';

            setReplyingTo({
              commentId: commentId,
              authorName
            });
            setTimeout(() => {
              composerInputRef.current?.focus();
            }, 300);

            setTimeout(() => {
              setHighlightedCommentId(null);
            }, 3000);
          }
        }, 500);
      } else {
        alert("This comment is no longer available.");
      }
    }
  }, [comments, searchParams]);

  const [likedComments, setLikedComments] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tolee_liked_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const updated = { ...prev, [commentId]: !prev[commentId] };
      try {
        localStorage.setItem('tolee_liked_comments', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const getCommentLikeCount = (comment: any) => {
    let baseLikes = 0;
    if (comment.id && !comment.id.startsWith('temp-') && !comment.id.startsWith('sim-')) {
      const charSum = comment.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      baseLikes = charSum % 12;
    }
    return likedComments[comment.id] ? baseLikes + 1 : baseLikes;
  };

  const getRepliesForComment = (commentId: string) => {
    return comments.filter((c: any) => c.parentId === commentId);
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const getFormattedTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d`;
      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    } catch (e) {
      return '1d';
    }
  };

  const getFormattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  const formatCaption = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-blue-400 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        const username = part.slice(1).replace(/[^\w]/g, '');
        return (
          <Link key={i} href={`/u/${username}`} className="text-blue-400 font-medium hover:underline">
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onSubmit(e, replyingTo?.commentId);
    setReplyingTo(null);
  };

  const rootComments = comments.filter((c: any) => !c.parentId);

  const renderCommentItem = (comment: any, isReply = false) => {
    const isLiked = likedComments[comment.id];
    const likeCount = getCommentLikeCount(comment);
    const replies = !isReply ? getRepliesForComment(comment.id) : [];
    const isExpanded = expandedReplies[comment.id];

    return (
      <div 
        key={comment.id} 
        id={`comment-${comment.id}`}
        className={`flex flex-col ${isReply ? 'ml-10 mt-3' : 'mt-4'} transition-all duration-500 rounded-xl p-2 ${
          highlightedCommentId === comment.id 
            ? 'bg-yellow-950/30 border border-yellow-900/30 scale-102 shadow-sm animate-pulse' 
            : ''
        }`}
      >
        <div className="flex gap-3 items-start">
          <Avatar className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} shrink-0 border border-gray-700`}>
            <AvatarImage src={getValidAvatarUrl(comment.author?.avatar)} />
            <AvatarFallback>{comment.author?.username?.[0] || comment.author?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px] text-gray-200 truncate hover:underline cursor-pointer">
                {comment.author?.username || comment.author?.name || 'User'}
              </span>
              <span className="text-[11px] text-gray-500 shrink-0">
                {comment.createdAt ? getFormattedTime(comment.createdAt) : 'Just now'}
              </span>
            </div>
            <span className="text-[13.5px] text-gray-100 leading-snug mt-0.5 break-words">
              {formatCaption(comment.content)}
            </span>
            <div className="flex items-center gap-4 text-[11px] text-gray-500 font-semibold mt-1.5">
              <button 
                onClick={() => {
                  setReplyingTo({ commentId: comment.id, authorName: comment.author?.username || comment.author?.name || 'User' });
                  composerInputRef.current?.focus();
                }} 
                className="hover:text-gray-300"
              >
                Reply
              </button>
            </div>
          </div>
          <button 
            onClick={() => handleLikeComment(comment.id)} 
            className="flex flex-col items-center gap-0.5 justify-center shrink-0 min-w-[24px] pt-1"
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500 hover:text-gray-300'}`} />
            {likeCount > 0 && <span className="text-[10px] text-gray-500 font-medium">{likeCount}</span>}
          </button>
        </div>

        {!isReply && replies.length > 0 && (
          <div className="flex flex-col">
            <button 
              onClick={() => toggleReplies(comment.id)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-white pl-11 py-2 text-left w-fit"
            >
              <span className="w-6 h-[1px] bg-gray-700 inline-block mr-1"></span>
              {isExpanded ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
            {isExpanded && (
              <div className="space-y-1">
                {replies.map((reply: any) => renderCommentItem(reply, true))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isOwner = session?.user && (
    (session.user as any).id === reel.authorId || 
    (session.user as any).username === reel.author || 
    session.user.name === reel.author
  );

  return (
    <div className="flex flex-col h-full bg-[#262626] text-white overflow-hidden">
      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Reel Author & Description */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-gray-700">
                <AvatarImage src={getValidAvatarUrl(reel.authorAvatar)} />
                <AvatarFallback>{reel.author?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[14px] text-white hover:underline cursor-pointer">{reel.author}</span>
                  {reel.isVerified && <ShieldCheck className="w-4 h-4 text-blue-400 fill-white" />}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mt-0.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>{reel.audio}</span>
                </div>
              </div>
            </div>
            {!isOwner && onFollow && (
              <button 
                onClick={(e) => { e.stopPropagation(); onFollow(); }}
                className={`h-7 px-4 rounded-lg font-bold text-xs transition-all duration-300 active:scale-95 border ${
                  followStatus === 'approved' 
                    ? 'border-gray-600 text-gray-300 hover:bg-white/5' 
                    : followStatus === 'pending'
                      ? 'border-amber-400/55 text-amber-400 hover:bg-amber-400/5'
                      : 'bg-white text-black border-transparent hover:bg-gray-200'
                }`}
              >
                {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
              </button>
            )}
          </div>

          {/* Description details */}
          <div className="space-y-2 mt-1">
            <p className="text-[14px] text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
              {formatCaption(reel.caption)}
            </p>
            {reel.location && (
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>📍 {reel.location}{reel.subLocation ? ` · ${reel.subLocation}` : ''}</span>
              </div>
            )}
            <div className="text-[11.5px] text-gray-500 font-semibold mt-1">
              {getFormattedDate(reel.createdAt)}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-gray-800/80 my-3" />

        {/* Comments section header */}
        <h3 className="font-bold text-[14px] text-gray-300 tracking-tight">Comments</h3>

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0 bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2"><Skeleton className="h-3 w-20 rounded bg-zinc-800" /><Skeleton className="h-2.5 w-12 rounded bg-zinc-800" /></div>
                    <Skeleton className="h-3.5 w-11/12 rounded bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : rootComments.length > 0 ? (
            rootComments.map((comment: any) => renderCommentItem(comment))
          ) : (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <MessageCircle className="w-10 h-10 text-gray-600" />
              <h4 className="font-bold text-[15px] text-gray-300">No comments yet</h4>
              <p className="text-xs text-gray-500">Start the conversation by posting a comment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Composer Section at Bottom */}
      <div className="p-3 border-t border-gray-800/80 bg-[#262626] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Replying Status banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/5 rounded-md mb-2 text-xs text-gray-400">
            <span>Replying to <span className="font-bold text-gray-200">@{replyingTo.authorName}</span></span>
            <button onClick={() => setReplyingTo(null)} className="hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Shortcuts */}
        <div className="flex justify-between mb-3 px-1">
          {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji) => (
            <button 
              key={emoji} 
              type="button" 
              className="text-2xl hover:scale-125 transition-transform duration-150" 
              onClick={() => setCommentText((p) => p + emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Comment input form */}
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
          <form onSubmit={handleComposerSubmit} className="flex-1 relative flex items-center border border-gray-700/80 rounded-full px-4 h-10 bg-black/10 focus-within:border-gray-600 transition-all duration-200">
            <input 
              ref={composerInputRef}
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value)} 
              placeholder={replyingTo ? `Reply to @${replyingTo.authorName}...` : "What do you think of this?"} 
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-0 text-[13.5px] placeholder:text-gray-500 text-white h-full" 
              autoComplete="off" 
            />
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <button 
                type="button" 
                className="text-gray-400 hover:text-white transition-colors p-1"
                onClick={() => setCommentText((p) => p + ' 👾')}
              >
                <Smile className="w-4 h-4" />
              </button>
              {commentText.trim().length > 0 ? (
                <button type="submit" className="text-primary font-bold text-[13.5px] hover:text-primary/80 transition-colors">Post</button>
              ) : (
                <button 
                  type="button" 
                  className="text-gray-400 hover:text-white transition-colors text-[11px] font-bold border border-gray-700 px-1.5 py-0.5 rounded"
                  onClick={() => alert("GIF selection is not available, but you can post emojis & text!")}
                >
                  GIF
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ReelsSidePanel (Desktop Comments Side Panel)
   ═══════════════════════════════════════════════════════════════════════ */
function ReelsSidePanel({ reel, onClose, comments, isLoading, commentText, setCommentText, onSubmit, session, followStatus, onFollow }: any) {
  if (!reel) return null;
  return (
    <div 
      className="w-[360px] max-w-[360px] h-full bg-[#262626] border border-gray-800 text-white flex flex-col overflow-hidden shadow-2xl relative rounded-2xl"
      style={{ height: 'min(676px, calc(100vh - 80px))' }}
    >
      {/* Side Panel Header */}
      <div className="p-4 border-b border-gray-800/80 bg-[#1e1e1e]/60 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-[15px]">Comments</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReelsDetailsContent
          reel={reel}
          comments={comments}
          isLoading={isLoading}
          commentText={commentText}
          setCommentText={setCommentText}
          onSubmit={onSubmit}
          session={session}
          followStatus={followStatus}
          onFollow={onFollow}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CommentsModal (Mobile Details & Comments Bottom Sheet)
   ═══════════════════════════════════════════════════════════════════════ */
function CommentsModal({ open, onClose, comments, isLoading, commentText, setCommentText, onSubmit, session, reel, followStatus, onFollow }: any) {
  if (!reel) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] w-full h-[75vh] sm:h-[600px] mt-auto sm:mt-0 mb-0 rounded-t-3xl sm:rounded-3xl bg-[#262626] border-gray-800 text-white p-0 flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-gray-800/85 shrink-0 flex justify-between items-center relative">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-1 bg-gray-600 rounded-full sm:hidden" />
          <DialogTitle className="text-center font-bold text-[15px] pt-1 sm:pt-0 mx-auto">Comments</DialogTitle>
          <button onClick={onClose} className="absolute right-4 top-3 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5 sm:hidden">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ReelsDetailsContent
            reel={reel}
            comments={comments}
            isLoading={isLoading}
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmit={onSubmit}
            session={session}
            followStatus={followStatus}
            onFollow={onFollow}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Options Modal
   ═══════════════════════════════════════════════════════════════════════ */
function OptionsModal({ open, onClose, reel, session, setReels, hiddenReelIds, setHiddenReelIds, isMuted, setIsMuted, handleShare }: any) {
  if (!reel) return null;
  const isOwner = session?.user && ((session.user as any).id === reel.authorId || (session.user as any).username === reel.author);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] w-full mt-auto sm:mt-0 mb-0 rounded-t-3xl sm:rounded-3xl bg-[#262626] border-gray-800 text-white p-0 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex flex-col text-center divide-y divide-gray-700/50">
          {isOwner ? (
            <>
              <div className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02]">Reel Controls (Owner)</div>
              <button onClick={async () => { const nc = window.prompt('Edit caption:', reel.caption); if (nc !== null) { const res = await editPostCaption(reel.id, nc); if (res.success) setReels((r: any[]) => r.map((x) => x.id === reel.id ? { ...x, caption: nc } : x)); } onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Edit Reel</button>
              {['hidden_from_others', 'hidden_from_public', 'only_me'].map((v) => (
                <button key={v} onClick={async () => { const res = await updatePostVisibility(reel.id, v); if (res.success) setReels((r: any[]) => r.map((x) => x.id === reel.id ? { ...x, visibility: v } : x)); onClose(); }} className={`py-4 font-semibold hover:bg-white/5 w-full outline-none text-[15px] ${reel.visibility === v ? 'text-green-500 font-bold' : 'text-white'}`}>
                  {v === 'hidden_from_others' ? 'Hide from Others' : v === 'hidden_from_public' ? 'Hide from Public' : 'Only Me'} {reel.visibility === v ? '✓' : ''}
                </button>
              ))}
              {reel.visibility !== 'public' && <button onClick={async () => { const res = await updatePostVisibility(reel.id, 'public'); if (res.success) setReels((r: any[]) => r.map((x) => x.id === reel.id ? { ...x, visibility: 'public' } : x)); onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Make Public</button>}
              <button onClick={async () => { if (window.confirm('Delete this reel permanently?')) { const res = await deletePostPermanently(reel.id); if (res.success) setReels((r: any[]) => r.filter((x: any) => x.id !== reel.id)); } onClose(); }} className="py-4 text-red-500 font-bold hover:bg-white/5 w-full outline-none text-[15px]">Delete Permanently</button>
              <button onClick={async () => { try { await copyContentUrl({ id: reel.id, postType: 'reel' }); alert('Link copied!'); } catch {} onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Copy Link</button>
            </>
          ) : (
            <>
              <button onClick={() => { setHiddenReelIds((p: string[]) => [...p, reel.id]); alert('Reported.'); onClose(); }} className="py-4 text-red-500 font-bold hover:bg-white/5 w-full outline-none text-[15px]">Report</button>
              <button onClick={async () => { try { await copyContentUrl({ id: reel.id, postType: 'reel' }); alert('Link copied!'); } catch {} onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Copy Link</button>
              <button onClick={() => { handleShare(reel); onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Share To...</button>
              <button onClick={() => { setHiddenReelIds((p: string[]) => [...p, reel.id]); alert('Noted.'); onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">Not Interested</button>
            </>
          )}
          <button onClick={() => { setIsMuted((m: boolean) => !m); onClose(); }} className="py-4 text-white font-semibold hover:bg-white/5 w-full outline-none text-[15px]">{isMuted ? 'Unmute Audio' : 'Mute Audio'}</button>
          <button onClick={onClose} className="py-4 text-gray-400 hover:bg-white/5 w-full outline-none text-[15px]">Cancel</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
