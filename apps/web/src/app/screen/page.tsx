'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Upload, Play, Tv, Eye, Calendar, Loader2, 
  CheckCircle2, Mic, Image as ImageIcon, Sparkles, TrendingUp, 
  Compass, Clock, Flame, Film, Music, Radio, Laptop, Gamepad2, 
  Newspaper, Dumbbell, HeartPulse, GraduationCap, X, Sliders, Volume2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { getScreenVideos } from '@/actions/screen';

const VIDEO_CATEGORIES = [
  'Recommended', 'Trending', 'Latest', 'Subscriptions',
  'Technology', 'Business', 'Education', 'Gaming', 'Comedy',
  'Entertainment', 'Music', 'Movies', 'News', 'Sports',
  'Health', 'Fashion', 'Finance', 'Real Estate', 'AI',
  'Programming', 'Travel', 'Food', 'Podcasts', 'Kids', 'Live'
];

// Format helpers
function formatDuration(seconds: number | null) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 65 % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// Category Icons Mapper for premium look
const CATEGORY_ICONS: Record<string, any> = {
  Recommended: Sparkles,
  Trending: Flame,
  Latest: Clock,
  Subscriptions: Tv,
  Technology: Laptop,
  Gaming: Gamepad2,
  Music: Music,
  Movies: Film,
  News: Newspaper,
  Sports: Dumbbell,
  Health: HeartPulse,
  Education: GraduationCap,
  Live: Radio
};

export default function ScreenPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Recommended');
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  // Search details dropdown
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'nextjs tutorial', 'live coding stream', 'stock market 2026'
  ]);
  const trendingSearches = [
    'AI developments 2026', 'Next.js 16 features', 'Tolee Creator Program', 'Best Indie Music'
  ];

  // Voice Search Modal Simulation
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceText, setVoiceText] = useState('Listening...');

  // Image Search Simulation
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageAnalysisText, setImageAnalysisText] = useState('');

  // Intersection Observer Ref for Infinite Scroll
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch initial videos
  const fetchVideos = useCallback(async (query: string, category: string, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const res = await getScreenVideos(
      query, 
      category, 
      8, 
      isLoadMore ? nextCursor : undefined
    );

    if (res.success && res.videos) {
      if (isLoadMore) {
        setVideos(prev => [...prev, ...res.videos!]);
      } else {
        setVideos(res.videos);
      }
      setNextCursor(res.nextCursor || undefined);
      setHasMore(!!res.nextCursor);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [nextCursor]);

  // Trigger fetch on search query or category change
  useEffect(() => {
    fetchVideos(debouncedQuery, selectedCategory, false);
  }, [debouncedQuery, selectedCategory]);

  // Infinite Scroll Trigger (Intersection Observer)
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchVideos(debouncedQuery, selectedCategory, true);
      }
    }, { threshold: 0.8 });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [loading, loadingMore, hasMore, fetchVideos, debouncedQuery, selectedCategory]);

  // Simulated Voice Search Action
  const triggerVoiceSearch = () => {
    setShowVoiceModal(true);
    setVoiceText('Listening...');
    
    setTimeout(() => {
      setVoiceText('Thinking...');
    }, 1500);

    setTimeout(() => {
      const phrases = ['AI programming guide', 'Chef Rasoi food recipes', 'Cyberpunk gameplay', 'Workout routine'];
      const chosen = phrases[Math.floor(Math.random() * phrases.length)];
      setVoiceText(`"${chosen}"`);
      
      setTimeout(() => {
        setSearchQuery(chosen);
        setShowVoiceModal(false);
      }, 1000);
    }, 2800);
  };

  // Simulated Image Search Action
  const triggerImageSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setShowImageModal(true);
    setImageAnalysisText('Analyzing visual features...');

    setTimeout(() => {
      setImageAnalysisText('Detecting programming workspace details...');
    }, 1500);

    setTimeout(() => {
      setImageAnalysisText('Found matching tags: Tech, Code, Programming');
      
      setTimeout(() => {
        setSearchQuery('Programming');
        setShowImageModal(false);
      }, 1200);
    }, 3000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
    setShowSearchDropdown(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-16 pt-4 px-4 md:px-8">
      {/* Top Header bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 mb-6">
        
        {/* Top Row for Mobile (Branding + Upload Button) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Tolee Screen</h1>
          </div>

          {/* Right: Upload Button (Visible on Mobile inside top row) */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/screen/studio?tab=content">
              <Button
                className="bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 border border-zinc-200 dark:border-zinc-850 font-bold rounded-xl px-3 py-2.5 flex items-center gap-1 shadow-sm text-[10px]"
              >
                <Tv className="w-3 h-3" />
                My Content
              </Button>
            </Link>
            <Link href="/screen/studio?tab=upload">
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-3 py-2.5 flex items-center gap-1 shadow-md text-[10px]"
              >
                <Upload className="w-3 h-3" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>

        {/* Center: Search & Filter with Voice and Image Search option */}
        <div className="flex-1 max-w-xl w-full relative flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search videos, creators, or topics..."
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
            />
            
            {/* Image Search Input Trigger */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <label className="cursor-pointer p-1.5 rounded-full hover:bg-zinc-155 dark:hover:bg-zinc-850 text-zinc-400 hover:text-teal-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={triggerImageSearch}
                  className="hidden"
                />
                <ImageIcon className="w-4 h-4" />
              </label>
              
              <button
                type="button"
                onClick={triggerVoiceSearch}
                className="p-1.5 rounded-full hover:bg-zinc-155 dark:hover:bg-zinc-850 text-zinc-400 hover:text-teal-500 transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Search Suggestion Dropdown */}
          {showSearchDropdown && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowSearchDropdown(false)} 
              />
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-40 p-4 space-y-3">
                {recentSearches.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Recent Searches</h5>
                    <div className="flex flex-col gap-1.5">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchQuery(term);
                            setShowSearchDropdown(false);
                          }}
                          className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-teal-500 dark:hover:text-teal-400 flex items-center gap-2"
                        >
                          <Clock className="w-3.5 h-3.5 text-zinc-450" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Trending Searches</h5>
                  <div className="flex flex-col gap-1.5">
                    {trendingSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(term);
                          setShowSearchDropdown(false);
                        }}
                        className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-teal-500 dark:hover:text-teal-400 flex items-center gap-2"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Upload Trigger (Visible on Desktop/Tablet only) */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/screen/studio?tab=content">
            <Button
              className="bg-white hover:bg-zinc-50 text-teal-650 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-teal-400 font-bold rounded-2xl px-5 py-4 flex items-center gap-2 transform active:scale-95 transition-all shadow-sm border border-zinc-200 dark:border-zinc-800 text-xs"
            >
              <Tv className="w-3.5 h-3.5" />
              My Content
            </Button>
          </Link>
          <Link href="/screen/studio?tab=upload">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-5 py-4 flex items-center gap-2 transform active:scale-95 transition-all shadow-md shadow-teal-550/10 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video
            </Button>
          </Link>
        </div>
      </div>

      {/* Horizontal Category Tag list scrollbar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x mask-gradient">
          {VIDEO_CATEGORIES.map((category) => {
            const IconComponent = CATEGORY_ICONS[category];
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`snap-start px-4.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shadow-sm border ${
                  isSelected
                    ? 'bg-teal-600 dark:bg-teal-500 text-white border-teal-500/30'
                    : 'bg-white dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                }`}
              >
                {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto">
        {loading && videos.length === 0 ? (
          /* Skeleton grids on loading */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-11/12" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto text-2xl">
              📺
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No Videos Found</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {debouncedQuery 
                ? "We couldn't find any videos matching your search. Try another query or explore different categories." 
                : "No videos have been uploaded yet. Be the first to start the trend!"}
            </p>
            {isAuthenticated ? (
              <Link href="/screen/studio">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs py-3 px-5">
                  Go to Creator Studio
                </Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videos.map((video) => {
                // Calculate Likes Ratio
                const likeRatio = video.likesCount > 0 ? 98 : 95; // Default high values for display
                const isLive = selectedCategory === 'Live' || video.category === 'Live' || video.isLive;

                return (
                  <Link 
                    href={`/screen/watch/${video.id}`} 
                    key={video.id} 
                    className="group flex flex-col gap-3 cursor-pointer bg-white dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800 p-2.5 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {/* Thumbnail card */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-250 dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : video.muxPlaybackId ? (
                        <img 
                          src={`https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?width=640&height=360&fit_mode=smartcrop`}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="w-7 h-7 text-zinc-400" />
                        </div>
                      )}

                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Live Badge vs Duration Badge */}
                      {isLive ? (
                        <span className="absolute bottom-2.5 right-2.5 bg-red-600 px-2 py-0.5 rounded text-[8px] font-black text-white tracking-wider flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          LIVE
                        </span>
                      ) : video.duration ? (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wide font-mono">
                          {formatDuration(video.duration)}
                        </span>
                      ) : null}
                    </div>

                    {/* Video Info Details */}
                    <div className="flex gap-2.5 px-0.5">
                      <Avatar className="w-8.5 h-8.5 border border-zinc-200 dark:border-zinc-800">
                        <AvatarImage src={video.user.avatar} />
                        <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-teal-600">
                          {video.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs.5 text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-teal-605 dark:group-hover:text-teal-400 transition-colors">
                          {video.title}
                        </h4>
                        
                        {/* Channel title with Verified Badge */}
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-500 font-semibold truncate">
                          <span>{video.user.name}</span>
                          {video.user.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-555 fill-teal-500/10" />
                          )}
                        </div>

                        {/* Views, time ago, and likes ratio */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 font-medium">
                          <span>{video.viewsCount} views</span>
                          <span>•</span>
                          <span>{formatTimeAgo(video.createdAt)}</span>
                          <span>•</span>
                          <span className="text-teal-600 font-bold">{likeRatio}% Likes</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load More/Infinite Scroll Loader Target */}
            {hasMore && (
              <div 
                ref={observerRef} 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6 w-full"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 p-2.5 bg-white dark:bg-zinc-900/40 border border-transparent rounded-2xl animate-pulse">
                    <div className="aspect-video w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex gap-2.5 px-0.5">
                      <div className="w-8.5 h-8.5 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Voice Search Simulation Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-sm w-full rounded-3xl p-6 text-center space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowVoiceModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Mic className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Voice Search</h4>
              <p className="text-lg font-black text-zinc-855 dark:text-white transition-all duration-300">
                {voiceText}
              </p>
            </div>
            <p className="text-[10px] text-zinc-400">Say names, categories, or creators to find matches</p>
          </div>
        </div>
      )}

      {/* Image Search Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-sm w-full rounded-3xl p-6 text-center space-y-6 shadow-2xl relative">
            <div className="w-16 h-16 bg-teal-550/10 text-teal-500 rounded-full flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest animate-pulse">AI Search Vision</h4>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {imageAnalysisText}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-4 h-4 text-teal-550 animate-spin" />
              <span className="text-xs text-zinc-450 font-semibold">Running classification...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
