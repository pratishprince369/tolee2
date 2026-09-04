'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Compass,
  Video,
  ShoppingBag,
  FileText,
  MapPin,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  SlidersHorizontal,
  Hash,
  Clock,
  X,
  Play,
  Newspaper
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  performSearch,
  getTrendingContent,
  getHashtagDetails,
  getSearchSuggestions,
  getExploreFeed,
  logSearchClick,
  SearchResultItem
} from '@/actions/search';

// Helper to format numbers (e.g., 1.2M, 368K)
function formatCount(count: number): string {
  if (!count || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return count.toString();
}

// Resilient Thumbnail Component with Smooth Loading & Fallback
function DiscoveryThumbnail({
  src,
  alt,
  isVideo = false,
  fallbackText = ''
}: {
  src?: string | null;
  alt?: string;
  isVideo?: boolean;
  fallbackText?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If no source is provided or image errored out, show a clean Tolee branded card
  if (!src || hasError) {
    return (
      <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-teal-900/40 via-zinc-900 to-zinc-950 border border-teal-500/20 text-white select-none">
        <div className="flex items-center justify-between">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold">
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
        </div>
        <span className="text-[11px] sm:text-xs font-semibold line-clamp-3 text-zinc-200 leading-snug">
          {fallbackText || alt || (isVideo ? 'Watch Video' : 'View Post')}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-800/60 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt || 'Tolee media'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get('q') || '';
  const tabParam = (searchParams.get('type') || 'all') as any;
  const sortParam = (searchParams.get('sort') || 'relevance') as any;

  // Local state
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'reels' | 'posts' | 'groups' | 'marketplace' | 'news'>(tabParam);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'engagement'>(sortParam);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  // Explore feed state (Instagram-style mixed visual grid)
  const [exploreItems, setExploreItems] = useState<any[]>([]);
  const [isExploreLoading, setIsExploreLoading] = useState(false);

  // Live autocomplete suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Trending & Hashtag states
  const [trendingData, setTrendingData] = useState<any>(null);
  const [hashtagData, setHashtagData] = useState<any>(null);
  const [isHashtagView, setIsHashtagView] = useState(false);

  // Restore scroll position when navigating back
  useEffect(() => {
    try {
      const savedScroll = sessionStorage.getItem('tolee_search_scroll');
      if (savedScroll) {
        const posY = parseInt(savedScroll, 10);
        if (!isNaN(posY) && posY > 0) {
          setTimeout(() => {
            window.scrollTo({ top: posY, behavior: 'instant' as any });
          }, 50);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch explore grid content (Mixed photos, videos, reels) with caching
  const fetchExploreFeed = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem('tolee_explore_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExploreItems(parsed);
            return;
          }
        }
      } catch {
        // Fallback to fetch
      }
    }

    setIsExploreLoading(true);
    try {
      const res = await getExploreFeed(1, 36);
      if (res.success && res.items) {
        setExploreItems(res.items);
        try {
          sessionStorage.setItem('tolee_explore_cache', JSON.stringify(res.items));
        } catch {
          // Quota handling
        }
      }
    } catch (err) {
      console.error('Failed to load explore feed:', err);
    } finally {
      setIsExploreLoading(false);
    }
  }, []);

  // Fetch trending content
  const fetchTrending = useCallback(async () => {
    try {
      const data = await getTrendingContent();
      setTrendingData(data);
    } catch (err) {
      console.error('Failed to load trending content:', err);
    }
  }, []);

  // Handle Search Execution
  const executeSearch = async (targetQuery: string, currentTab: string, currentSort: string, targetPage = 1) => {
    const cleanQ = targetQuery.trim();
    setShowSuggestions(false);

    // If query is empty and tab is 'all', show the mixed explore feed
    if (!cleanQ && currentTab === 'all') {
      setIsHashtagView(false);
      setHashtagData(null);
      setResults([]);
      fetchExploreFeed();
      fetchTrending();
      return;
    }

    if (targetPage === 1) {
      setIsLoading(true);
    } else {
      setIsMoreLoading(true);
    }

    try {
      if (cleanQ.startsWith('#')) {
        setIsHashtagView(true);
        const data = await getHashtagDetails(cleanQ);
        setHashtagData(data);
        setIsLoading(false);
        setIsMoreLoading(false);
        return;
      } else {
        setIsHashtagView(false);
        setHashtagData(null);
      }

      const res = await performSearch(
        cleanQ,
        {
          type: currentTab === 'all' ? 'all' : (currentTab as any),
          sortBy: currentSort as any,
        },
        targetPage,
        24
      );

      if (res.success) {
        if (targetPage === 1) {
          setResults(res.data);
        } else {
          setResults((prev) => [...prev, ...res.data]);
        }
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  };

  // Sync state with URL parameter changes
  useEffect(() => {
    setQuery(queryParam);
    setActiveTab(tabParam);
    setSortBy(sortParam);

    if (queryParam || tabParam !== 'all') {
      executeSearch(queryParam, tabParam, sortParam, 1);
    } else {
      setIsHashtagView(false);
      fetchExploreFeed();
      fetchTrending();
    }
  }, [queryParam, tabParam, sortParam, fetchExploreFeed, fetchTrending]);

  // Handle Tab changes & sync URL params
  const handleTabChange = (newTab: 'all' | 'users' | 'reels' | 'posts' | 'groups' | 'marketplace' | 'news') => {
    setActiveTab(newTab);
    setPage(1);

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (newTab !== 'all') params.set('type', newTab);
    if (sortBy !== 'relevance') params.set('sort', sortBy);

    const queryString = params.toString();
    router.replace(queryString ? `/search?${queryString}` : '/search', { scroll: false });
  };

  // Handle Sort changes & sync URL params
  const handleSortChange = (newSort: 'relevance' | 'newest' | 'engagement') => {
    setSortBy(newSort);
    setPage(1);

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (activeTab !== 'all') params.set('type', activeTab);
    if (newSort !== 'relevance') params.set('sort', newSort);

    const queryString = params.toString();
    router.replace(queryString ? `/search?${queryString}` : '/search', { scroll: false });
  };

  // Handle live autocomplete debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const sugg = await getSearchSuggestions(val.trim());
          setSuggestions(sugg);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 180);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    executeSearch(query, activeTab, sortBy, nextPage);
  };

  // Helper to determine destination URL for any item
  const getItemHref = (item: { id: string; type: string; meta?: any }) => {
    if (item.type === 'user') return `/u/${item.meta?.username || item.id}`;
    if (item.type === 'group') return `/t/${item.id}`;
    if (item.type === 'listing' || item.type === 'marketplace') return `/marketplace/${item.id}`;
    if (item.type === 'reel') return `/reels?videoId=${item.id}`;
    return `/post/${item.id}`;
  };

  // Click handler: Record click asynchronously without blocking navigation & save scroll
  const handleItemClick = (item: { id: string; type: string; meta?: any }) => {
    try {
      sessionStorage.setItem('tolee_search_scroll', window.scrollY.toString());
    } catch {
      // Ignore
    }
    // Asynchronous non-blocking telemetry
    void logSearchClick(query || 'explore', item.id, item.type);
  };

  // Search local submit trigger
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const cleanQ = query.trim();
    const params = new URLSearchParams();
    if (cleanQ) params.set('q', cleanQ);
    if (activeTab !== 'all') params.set('type', activeTab);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    router.push(params.toString() ? `/search?${params.toString()}` : '/search');
  };

  // Render Category Filter Pills
  const renderTabs = () => {
    const tabs = [
      { id: 'all', label: 'All', icon: <Compass className="w-3.5 h-3.5" /> },
      { id: 'users', label: 'People', icon: <User className="w-3.5 h-3.5" /> },
      { id: 'reels', label: 'Reels', icon: <Video className="w-3.5 h-3.5" /> },
      { id: 'posts', label: 'Posts', icon: <FileText className="w-3.5 h-3.5" /> },
      { id: 'groups', label: 'Groups', icon: <Users className="w-3.5 h-3.5" /> },
      { id: 'marketplace', label: 'Market', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
      { id: 'news', label: 'News', icon: <Newspaper className="w-3.5 h-3.5" /> },
    ];

    return (
      <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2.5 mt-2.5 overflow-x-auto no-scrollbar gap-3 select-none">
        <div className="flex gap-1.5 min-w-max pb-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-extrabold'
                    : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1 flex-shrink-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full px-2.5 py-1 shadow-2xs">
          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="text-[11px] font-bold bg-transparent border-none text-slate-600 dark:text-zinc-400 focus:ring-0 focus:outline-none cursor-pointer p-0 pr-2"
          >
            <option value="relevance">Top</option>
            <option value="newest">Latest</option>
            <option value="engagement">Popular</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 pt-0 pb-24 min-h-screen">
      
      {/* 1. TOP STICKY SEARCH BAR CARD */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-2 pb-2.5 border-b border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
        <form onSubmit={handleLocalSubmit} className="relative w-full group">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Search people, reels, posts, groups, marketplace..."
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-150 dark:hover:bg-zinc-850 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl text-[14px] sm:text-[15px] text-slate-900 dark:text-zinc-100 placeholder-slate-400 shadow-2xs focus:shadow-md transition-all duration-200 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                  router.push('/search');
                }}
                className="absolute right-3.5 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition-colors focus:outline-none active:scale-90"
                aria-label="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-zinc-800/60">
              {suggestions.map((sug, idx) => (
                <div
                  key={sug.id || idx}
                  onClick={() => {
                    if (sug.type === 'user') {
                      router.push(`/u/${sug.subtitle.replace('@', '')}`);
                    } else if (sug.type === 'group') {
                      router.push(`/t/${sug.id}`);
                    } else if (sug.type === 'marketplace') {
                      router.push(`/marketplace/${sug.id}`);
                    } else {
                      setQuery(sug.text);
                      setShowSuggestions(false);
                      router.push(`/search?q=${encodeURIComponent(sug.text)}`);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                >
                  {sug.avatar ? (
                    <Avatar className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700">
                      <AvatarImage src={sug.avatar} />
                      <AvatarFallback className="text-xs font-bold">{sug.text[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {sug.type === 'group' ? <Users className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{sug.text}</span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">{sug.subtitle}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{sug.type}</span>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Filter Pills (Always visible for fast exploration) */}
        {renderTabs()}
      </div>

      {/* 2. LOADING SKELETON */}
      {(isLoading || isExploreLoading) && (
        <div className="pt-4">
          <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg sm:rounded-xl bg-slate-200 dark:bg-zinc-850" />
            ))}
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT (INSTAGRAM-STYLE EXPLORE GRID / SEARCH RESULTS) */}
      {!isLoading && !isExploreLoading && (
        <>
          {/* ========================================================
              A. HASHTAG VIEW (When user clicks #tag or searches #...)
             ======================================================== */}
          {isHashtagView && hashtagData && (
            <div className="space-y-6 pt-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-teal-500/10 to-primary/5 border border-primary/20">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0">
                  <Hash className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100">{hashtagData.tag}</h2>
                  <p className="text-xs font-semibold text-primary mt-0.5 uppercase tracking-wider">
                    {hashtagData.topPosts.length + hashtagData.recentPosts.length}+ active posts
                  </p>
                </div>
              </div>

              {/* Related tags */}
              {hashtagData.relatedHashtags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Related:</span>
                  {hashtagData.relatedHashtags.map((tag: string) => (
                    <Link href={`/search?q=${encodeURIComponent(tag)}`} key={tag}>
                      <Badge className="bg-slate-100 hover:bg-primary/10 hover:text-primary transition-colors text-slate-600 dark:bg-zinc-900 dark:text-zinc-400 py-1 px-2.5 text-xs font-bold border border-slate-200 dark:border-zinc-800 cursor-pointer">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Top Posts in Hashtag (3-Column Discovery Grid) */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                {hashtagData.topPosts.map((post: any) => (
                  <div
                    key={post.id}
                    onClick={() => router.push(`/post/${post.id}`)}
                    className="group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 cursor-pointer border border-black/5 dark:border-zinc-800/80 active:scale-[0.98] transition-all"
                  >
                    {post.mediaUrls ? (
                      <img
                        src={post.mediaUrls.split(/,(?=https?:\/\/)/)[0]}
                        alt="Hashtag media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-950 text-white">
                        <span className="text-xs line-clamp-3 font-semibold">{post.caption}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity text-white text-xs font-bold">
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-white" /> {post.likes?.length || 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 fill-white" /> {post.comments?.length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              B. DEFAULT EXPLORE DISCOVERY GRID (Instagram Reference)
                 Rendered when query is empty and tab is 'all'
             ======================================================== */}
          {!query && !isHashtagView && activeTab === 'all' && (
            <div className="pt-3 space-y-6 animate-in fade-in duration-200">
              
              {/* Trending Tag Chips */}
              {trendingData?.hashtags?.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mr-1 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span>Trending:</span>
                  </div>
                  {trendingData.hashtags.map((item: any) => (
                    <Link href={`/search?q=${encodeURIComponent(item.tag)}`} key={item.tag} className="shrink-0">
                      <Badge className="bg-white dark:bg-zinc-900 hover:bg-primary hover:text-white text-slate-700 dark:text-zinc-300 py-1 px-3 text-xs font-bold border border-slate-200 dark:border-zinc-800 shadow-2xs transition-all active:scale-95 cursor-pointer">
                        {item.tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Instagram-style 3-Column Mixed Content Discovery Grid */}
              <div>
                {exploreItems.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Compass className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-zinc-700 animate-pulse" />
                    <p className="text-sm font-semibold">Discovering fresh public content...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                    {exploreItems.map((item) => {
                      const isReel = item.type === 'reel';
                      const href = getItemHref(item);

                      return (
                        <Link
                          key={item.id}
                          href={href}
                          onClick={() => handleItemClick(item)}
                          prefetch={true}
                          className="group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 border border-black/5 dark:border-zinc-800/80 active:scale-[0.97] transition-all duration-200 shadow-2xs block cursor-pointer"
                        >
                          {/* Resilient Media Thumbnail */}
                          <DiscoveryThumbnail
                            src={item.mediaUrl}
                            alt={item.caption || 'Explore item'}
                            isVideo={isReel}
                            fallbackText={item.caption}
                          />

                          {/* Reel / Video Indicator Badge (Top-Right) */}
                          {isReel && (
                            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black/60 backdrop-blur-xs text-white p-1 sm:p-1.5 rounded-md flex items-center justify-center pointer-events-none shadow-sm">
                              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                          )}

                          {/* Views Count Badge (Bottom-Left on mobile) */}
                          {isReel && item.viewsCount > 0 && (
                            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white drop-shadow-md bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md pointer-events-none">
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>{formatCount(item.viewsCount)}</span>
                            </div>
                          )}

                          {/* Hover Desktop Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity duration-200 text-white text-xs sm:text-sm font-bold pointer-events-none">
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4 fill-white" />
                              {formatCount(item.likesCount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4 fill-white" />
                              {formatCount(item.commentsCount)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              C. ACTIVE SEARCH RESULTS (Filtered by Tab or All)
             ======================================================== */}
          {(Boolean(query) || activeTab !== 'all') && !isHashtagView && (
            <div className="pt-3 animate-in fade-in duration-200">
              {results.length === 0 ? (
                /* Empty Search State */
                <div className="text-center py-16 bg-slate-50/50 dark:bg-zinc-900/30 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl px-4 mt-2">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                    {query ? `No results found for "${query}"` : `No ${activeTab} found`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    Try checking your spelling, using more general keywords, or exploring trending topics below.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {['#Tolee', '#Trending', '#Reels', '#AI', '#Viral', '#India'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setQuery(tag);
                          router.push(`/search?q=${encodeURIComponent(tag)}`);
                        }}
                        className="px-3 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Results Count */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>Found {total} results</span>
                    <span className="capitalize">{activeTab} results</span>
                  </div>

                  {/* 1. ALL / REELS TAB -> 3-Column Visual Grid */}
                  {(activeTab === 'all' || activeTab === 'reels') && (
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                      {results.map((item) => {
                        const isReel = item.type === 'reel';
                        const href = getItemHref(item);

                        return (
                          <Link
                            key={item.id}
                            href={href}
                            onClick={() => handleItemClick(item)}
                            prefetch={true}
                            className="group relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 border border-black/5 dark:border-zinc-800/80 active:scale-[0.97] transition-all duration-200 shadow-2xs block cursor-pointer"
                          >
                            <DiscoveryThumbnail
                              src={item.mediaUrl}
                              alt={item.title || 'Result item'}
                              isVideo={isReel}
                              fallbackText={item.description || item.title}
                            />

                            {/* Badge */}
                            {isReel && (
                              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md pointer-events-none">
                                <Video className="w-3 h-3" />
                              </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200 text-white text-xs font-bold pointer-events-none">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 fill-white" />
                                {formatCount(item.meta?.likesCount || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                {formatCount(item.meta?.commentsCount || 0)}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. CREATORS / PEOPLE TAB */}
                  {activeTab === 'users' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.map((item) => (
                        <Link
                          key={item.id}
                          href={getItemHref(item)}
                          onClick={() => handleItemClick(item)}
                          prefetch={true}
                          className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl hover:border-primary/30 active:scale-[0.98] transition-all shadow-2xs block cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-12 h-12 rounded-full border border-slate-200 dark:border-zinc-700">
                              <AvatarImage src={item.mediaUrl || '/default-user-avatar.svg'} />
                              <AvatarFallback className="font-bold">{item.title[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{item.title}</span>
                              <span className="text-xs text-slate-400 dark:text-zinc-500 truncate">{item.subtitle}</span>
                              {item.location && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-primary" /> {item.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="rounded-full text-xs font-bold px-4 shrink-0 text-primary border-primary hover:bg-primary/5 pointer-events-none">
                            View
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 3. GROUPS / TOLEES TAB */}
                  {activeTab === 'groups' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.map((item) => (
                        <Link
                          key={item.id}
                          href={getItemHref(item)}
                          onClick={() => handleItemClick(item)}
                          prefetch={true}
                          className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl hover:border-primary/30 active:scale-[0.98] transition-all shadow-2xs block cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-12 h-12 rounded-xl border border-slate-200 dark:border-zinc-700">
                              <AvatarImage src={item.mediaUrl || '/default-tolee-avatar.svg'} />
                              <AvatarFallback className="font-bold text-primary">{item.title[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{item.title}</span>
                              <span className="text-xs text-slate-400 dark:text-zinc-500 truncate">{item.description || 'Tolee Group'}</span>
                            </div>
                          </div>
                          <Badge className="bg-primary/10 text-primary text-[10px] font-bold py-1 px-2.5 rounded-full shrink-0">
                            {item.meta?.memberCount || 0} members
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 4. MARKETPLACE TAB */}
                  {activeTab === 'marketplace' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {results.map((item) => (
                        <Link
                          key={item.id}
                          href={getItemHref(item)}
                          onClick={() => handleItemClick(item)}
                          prefetch={true}
                          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between block cursor-pointer"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-zinc-800 relative">
                            {item.mediaUrl ? (
                              <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Image</div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white font-extrabold text-xs px-2 py-0.5 rounded-md">
                              ₹{item.meta?.price}
                            </div>
                          </div>
                          <div className="p-3">
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">{item.title}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 5. POSTS / NEWS TAB */}
                  {(activeTab === 'posts' || activeTab === 'news') && (
                    <div className="space-y-3">
                      {results.map((item) => (
                        <Link
                          key={item.id}
                          href={getItemHref(item)}
                          onClick={() => handleItemClick(item)}
                          prefetch={true}
                          className="block cursor-pointer"
                        >
                          <Card className="hover:border-primary/30 active:scale-[0.99] transition-all rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                            <CardContent className="p-4 flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={item.meta?.avatar || '/default-user-avatar.svg'} />
                                    <AvatarFallback>{item.title[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-200">{item.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 line-clamp-3">{item.description}</p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Load More Button */}
                  {total > results.length && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={loadMore}
                        disabled={isMoreLoading}
                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-2 rounded-full text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        {isMoreLoading ? 'Loading more...' : 'Load More Results'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
