'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  SlidersHorizontal,
  Hash,
  Share2,
  Clock,
  X
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
  logSearchClick,
  SearchResultItem
} from '@/actions/search';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';

  // Local state
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'reels' | 'posts' | 'groups' | 'marketplace' | 'requirements' | 'locations' | 'trending'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'engagement'>('relevance');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  // Trending & Hashtag states
  const [trendingData, setTrendingData] = useState<any>(null);
  const [hashtagData, setHashtagData] = useState<any>(null);
  const [isHashtagView, setIsHashtagView] = useState(false);

  // Load search results when query or activeTab/sortBy changes
  const handleSearch = async (resetPage = true) => {
    const curPage = resetPage ? 1 : page;
    if (resetPage) {
      setPage(1);
      setIsLoading(true);
    } else {
      setIsMoreLoading(true);
    }

    try {
      const cleanQ = query.trim();

      // Check if it's a hashtag search
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

      // Normal Search
      const res = await performSearch(
        cleanQ,
        {
          type: activeTab,
          sortBy
        },
        curPage,
        12
      );

      if (res.success) {
        if (resetPage) {
          setResults(res.data);
        } else {
          setResults(prev => [...prev, ...res.data]);
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

  // Fetch trending content if query is empty or "trending" tab selected
  const fetchTrending = async () => {
    setIsLoading(true);
    try {
      const data = await getTrendingContent();
      setTrendingData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state with URL parameter
  useEffect(() => {
    setQuery(queryParam);
    if (queryParam) {
      handleSearch(true);
    } else {
      setIsHashtagView(false);
      fetchTrending();
    }
  }, [queryParam]);

  // Handle Tab changes
  useEffect(() => {
    if (query) {
      handleSearch(true);
    }
  }, [activeTab, sortBy]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      handleSearch(false);
    }
  }, [page]);

  const handleResultClick = async (item: SearchResultItem) => {
    // Log conversion click
    await logSearchClick(query || 'discovery', item.id, item.type);

    // Redirect to respective detail pages
    if (item.type === 'user') {
      router.push(`/u/${item.meta?.username || item.id}`);
    } else if (item.type === 'group') {
      // Find slug for groups
      router.push(`/t/${item.id}`);
    } else if (item.type === 'listing') {
      router.push(`/marketplace/${item.id}`);
    } else if (item.type === 'reel') {
      router.push(`/reels?id=${item.id}`);
    } else {
      router.push(`/post/${item.id}`);
    }
  };

  // Search local submit trigger
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Render Horizontal Sliding Filter Tabs
  const renderTabs = () => {
    const tabs = [
      { id: 'all', label: 'All Results', icon: <Compass className="w-4 h-4" /> },
      { id: 'users', label: 'Creators', icon: <User className="w-4 h-4" /> },
      { id: 'reels', label: 'Reels', icon: <Video className="w-4 h-4" /> },
      { id: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" /> },
      { id: 'groups', label: 'Tolees', icon: <Users className="w-4 h-4" /> },
      { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'requirements', label: 'Requirements', icon: <Sparkles className="w-4 h-4" /> }
    ];

    return (
      <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-zinc-800/50 pt-4 mt-6 overflow-x-auto no-scrollbar gap-4">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/10 scale-105'
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
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full px-3.5 py-2 shadow-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold bg-transparent border-none text-slate-600 dark:text-zinc-400 focus:ring-0 focus:outline-none cursor-pointer p-0 pr-4"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="engagement">Popular</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-0 sm:px-4 lg:px-6 pt-2 sm:pt-6 pb-24 max-w-3xl min-h-screen">
      
      {/* 1. Discovery Gradient Header Card */}
      <div className="bg-gradient-to-b from-[#f0f9fa]/80 via-[#f7fdfd]/40 to-white/10 dark:from-teal-950/10 dark:to-transparent rounded-3xl p-5 sm:p-7 mb-6 border border-teal-100/50 dark:border-teal-950/20 shadow-xs relative overflow-hidden">
        {/* Decorative background light */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-16 text-[10px] text-teal-400/60 opacity-60 pointer-events-none select-none">✦</div>
        
        <div className="relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight select-none">
              {query ? 'Discovery' : 'Explore'}{' '}
              <span className="text-[#0a7c85]">
                {query ? 'Results' : 'Tolee'}
              </span>
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
              {query ? (
                <>
                  Discovering items relating to <span className="text-[#0a7c85] font-semibold">"{query}"</span>
                </>
              ) : (
                'Intelligent recommendations curated just for you'
              )}
            </p>
          </div>

          {/* Search bar Input Form */}
          <form onSubmit={handleLocalSubmit} className="relative w-full group mt-5">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-[#0a7c85] transition-colors" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search creators, Tolees, marketplace..."
                className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 focus:border-[#0a7c85] dark:focus:border-[#0a7c85] rounded-2xl text-[14.5px] text-slate-800 dark:text-zinc-100 placeholder-slate-400 shadow-sm focus:shadow-md transition-all duration-300 outline-none focus:ring-4 focus:ring-teal-50 dark:focus:ring-teal-950/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); router.push('/search'); }}
                  className="absolute right-4 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center justify-center transition-colors focus:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Tabs Navigation pill filters */}
          {query && !isHashtagView && renderTabs()}
        </div>
      </div>

      {/* 2. LOADING STATE */}
      {isLoading && (
        <div className="space-y-8 py-6">
          {/* Main skeleton layout to match the Instagram-style search results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Skeleton key={n} className="aspect-square rounded-2xl" />
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                <Skeleton className="h-6 w-40 rounded-lg mb-2" />
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 py-1">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-24 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-full shrink-0" />
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                <Skeleton className="h-6 w-32 rounded-lg mb-2" />
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between py-1">
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="w-5 h-5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ========================================================
              HASHTAG DETAILED DASHBOARD VIEW
             ======================================================== */}
          {isHashtagView && hashtagData && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Hashtag Header */}
              <div className="flex items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-primary/5 border border-violet-500/10 backdrop-blur-md">
                <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                  <Hash className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-gray-800 dark:text-zinc-100">{hashtagData.tag}</h2>
                  <p className="text-xs font-semibold text-primary mt-1 uppercase tracking-wider">
                    {hashtagData.topPosts.length + hashtagData.recentPosts.length}+ active posts
                  </p>
                </div>
              </div>

              {/* Related Hashtags list */}
              {hashtagData.relatedHashtags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mr-2">Related tags:</span>
                  {hashtagData.relatedHashtags.map((tag: string) => (
                    <Link href={`/search?q=${encodeURIComponent(tag)}`} key={tag}>
                      <Badge className="bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors text-gray-600 dark:bg-zinc-900/60 dark:text-zinc-400 py-1 px-3 text-xs font-bold border border-gray-200 dark:border-zinc-800 cursor-pointer">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Top Posts (3x3 grid like Instagram) */}
              <section>
                <div className="flex items-center gap-2.5 mb-4 px-1">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-150">Top Posts</h3>
                </div>
                {hashtagData.topPosts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-zinc-400 pl-1">No top posts in this tag yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {hashtagData.topPosts.map((post: any) => (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/post/${post.id}`)}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 shadow-md cursor-pointer border border-gray-200/50 dark:border-zinc-800/80 active:scale-[0.98] transition-all duration-200"
                      >
                        {post.mediaUrls ? (
                          <img
                            src={post.mediaUrls.split(/,(?=https?:\/\/)/)[0]}
                            alt="Hashtag media"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-950">
                            <span className="text-sm font-semibold text-zinc-300 line-clamp-4">{post.caption}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">Text Post</span>
                          </div>
                        )}
                        {/* Hover Overlay Stats */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-5 transition-all duration-300 text-white font-bold">
                          <span className="flex items-center gap-1.5"><Heart className="w-5 h-5 fill-white" /> {post.likes?.length || 0}</span>
                          <span className="flex items-center gap-1.5"><MessageCircle className="w-5 h-5 fill-white" /> {post.comments?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Posts Grid */}
              <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-150">Most Recent</h3>
                </div>
                {hashtagData.recentPosts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-zinc-400 pl-1">No recent posts found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {hashtagData.recentPosts.map((post: any) => (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/post/${post.id}`)}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 shadow-md cursor-pointer border border-gray-200/50 dark:border-zinc-800/80 active:scale-[0.98] transition-all duration-200"
                      >
                        {post.mediaUrls ? (
                          <img
                            src={post.mediaUrls.split(/,(?=https?:\/\/)/)[0]}
                            alt="Hashtag media"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-950">
                            <span className="text-sm font-semibold text-zinc-300 line-clamp-4">{post.caption}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">Text Post</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-5 transition-all duration-300 text-white font-bold">
                          <span className="flex items-center gap-1.5"><Heart className="w-5 h-5 fill-white" /> {post.likes?.length || 0}</span>
                          <span className="flex items-center gap-1.5"><MessageCircle className="w-5 h-5 fill-white" /> {post.comments?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}

          {/* ========================================================
              TRENDING / DISCOVERY PAGE VIEW (No Query Entered)
             ======================================================== */}
          {!query && trendingData && (
            <div className="space-y-10 animate-in fade-in duration-300">
              
              {/* Trending Hashtags row */}
              {trendingData.hashtags?.length > 0 && (
                <div className="p-4.5 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Trending Tags Today</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingData.hashtags.map((item: any) => (
                      <Link href={`/search?q=${encodeURIComponent(item.tag)}`} key={item.tag}>
                        <Badge className="bg-white hover:bg-primary hover:text-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 py-1.5 px-3.5 text-xs font-bold border border-gray-200/80 dark:border-zinc-800 shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95">
                          {item.tag} ({item.count})
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Reels section */}
              <section>
                <div className="flex items-center justify-between mb-4.5 px-1">
                  <div className="flex items-center gap-2">
                    <Video className="w-5.5 h-5.5 text-primary" />
                    <h2 className="text-xl font-extrabold text-gray-800 dark:text-zinc-150">Trending Reels</h2>
                  </div>
                  <Link href="/reels" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    View Stream <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {trendingData.reels?.length === 0 ? (
                  <p className="text-sm text-gray-500 pl-1">No trending reels found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                    {trendingData.reels.map((reel: any) => (
                      <div
                        key={reel.id}
                        onClick={() => router.push(`/reels?id=${reel.id}`)}
                        className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 shadow-md cursor-pointer border border-gray-200/50 dark:border-zinc-800/80 active:scale-[0.98] transition-all duration-200"
                      >
                        {reel.mediaUrls ? (
                          <img
                            src={reel.mediaUrls.split(/,(?=https?:\/\/)/)[0]}
                            alt="Reel thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-950">
                            <span className="text-xs font-semibold text-zinc-300 line-clamp-5">{reel.caption}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">No video preview</span>
                          </div>
                        )}
                        {/* Hover Overlay Stats */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-all duration-300 text-white">
                          <span className="text-xs font-bold truncate">@{reel.author?.username}</span>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold">
                            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-white" /> {reel.likes?.length || 0}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {reel.views?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Trending Tolees & Marketplace Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Popular Tolees */}
                <section>
                  <div className="flex items-center justify-between mb-4.5 px-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-5.5 h-5.5 text-primary" />
                      <h2 className="text-xl font-extrabold text-gray-800 dark:text-zinc-150">Popular Tolees</h2>
                    </div>
                  </div>
                  {trendingData.tolees?.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-1">No popular Tolees yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {trendingData.tolees.map((tolee: any) => (
                        <div
                          key={tolee.id}
                          onClick={() => router.push(`/t/${tolee.slug}`)}
                          className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-800/80 rounded-2xl cursor-pointer hover:border-primary/30 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Avatar className="w-11 h-11 rounded-xl border border-gray-200/50">
                              <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} className="object-cover" />
                              <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">{tolee.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-gray-800 dark:text-zinc-200 truncate">{tolee.name}</span>
                              <span className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{tolee.description || 'No description'}</span>
                            </div>
                          </div>
                          <Badge className="bg-primary/10 text-primary font-bold text-xs py-1 px-3 shrink-0 rounded-full">
                            {tolee.members?.length || 0} members
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Popular Listings */}
                <section>
                  <div className="flex items-center justify-between mb-4.5 px-1">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5.5 h-5.5 text-primary" />
                      <h2 className="text-xl font-extrabold text-gray-800 dark:text-zinc-150">Trending Items</h2>
                    </div>
                    <Link href="/marketplace" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                      Explore Market <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {trendingData.listings?.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-1">No listings found.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      {trendingData.listings.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => router.push(`/marketplace/${item.id}`)}
                          className="group bg-white dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-800/80 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                          <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-zinc-850 relative">
                            {item.images ? (
                              <img
                                src={item.images.split(/,(?=https?:\/\/)/)[0]}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/60 text-white font-extrabold text-xs px-2 py-0.5 rounded-md">
                              ₹{item.price}
                            </div>
                          </div>
                          <div className="p-3">
                            <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 line-clamp-1">{item.title}</span>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="truncate">{item.locationText}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>

            </div>
          )}

          {/* ========================================================
              ACTIVE KEYWORD SEARCH RESULTS HUB VIEW
             ======================================================== */}
          {query && !isHashtagView && (
            <div className="animate-in fade-in duration-300">
              {/* RENDERED CARDS GRID */}
              {results.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 dark:bg-zinc-900/20 border border-dashed border-gray-250 dark:border-zinc-800 rounded-2xl">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 dark:text-zinc-300">No results found</h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto px-4">
                    We couldn't find any results matching your search. Try adjusting your filters or spelling.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Grid Layout depending on Type */}
                  <div className={
                    activeTab === 'reels' 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" 
                      : activeTab === 'marketplace'
                        ? "grid grid-cols-2 sm:grid-cols-3 gap-4"
                        : activeTab === 'users' || activeTab === 'groups'
                          ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                          : "space-y-4"
                  }>
                    {results.map((item) => {
                      
                      // 1. REELS DISPLAY
                      if (item.type === 'reel') {
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-gray-200/50 dark:border-zinc-800/80 shadow-md cursor-pointer active:scale-95 transition-all duration-200"
                          >
                            {item.mediaUrl ? (
                              <img
                                src={item.mediaUrl}
                                alt="Reel media"
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                              />
                            ) : (
                              <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-950">
                                <span className="text-xs font-semibold text-zinc-300 line-clamp-5">{item.description}</span>
                                <span className="text-[9px] text-zinc-600">Reel Post</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-all duration-300 text-white">
                              <span className="text-xs font-bold truncate">{item.subtitle}</span>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-bold">
                                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-white" /> {item.meta?.likesCount || 0}</span>
                                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.meta?.viewsCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. CREATOR PROFILES DISPLAY
                      if (item.type === 'user') {
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="flex items-center justify-between p-4.5 bg-white dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800 rounded-3xl cursor-pointer hover:border-[#0a7c85]/20 hover:shadow-xs transition-all duration-300"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Avatar with simple border and badge */}
                              <div className="relative shrink-0">
                                <Avatar className="w-12 h-12 rounded-full overflow-hidden border border-slate-200/80 dark:border-zinc-800">
                                  <AvatarImage src={item.mediaUrl || '/default-user-avatar.svg'} className="object-cover" />
                                  <AvatarFallback className="font-bold bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400">{item.title[0]}</AvatarFallback>
                                </Avatar>
                                {item.meta?.isVerified && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0a7c85] border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-md">
                                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white stroke-white stroke-[3]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[15px] font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1">
                                  {item.title}
                                  {item.meta?.isVerified && (
                                    <span className="inline-flex items-center justify-center bg-[#0a7c85] text-white rounded-full p-[2px] w-4 h-4 shadow-sm" title="Verified Creator">
                                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-none stroke-white stroke-[4]"><path d="M5 12l5 5L20 7"/></svg>
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</span>
                                {item.location && (
                                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 flex items-center gap-1 font-semibold">
                                    <MapPin className="w-3.5 h-3.5 text-[#0a7c85]" /> {item.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(item);
                              }}
                              className="text-xs font-bold px-5 shrink-0 rounded-full border-[#0a7c85] text-[#0a7c85] hover:bg-[#0a7c85]/5 dark:border-[#0a7c85] dark:text-[#0a7c85] hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                              View Profile
                            </Button>
                          </div>
                        );
                      }

                      // 3. TOLEE GROUPS DISPLAY
                      if (item.type === 'group') {
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-800/85 rounded-2xl cursor-pointer hover:border-primary/20 hover:shadow-sm transition-all duration-300"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <Avatar className="w-12 h-12 rounded-xl border border-gray-250/80">
                                <AvatarImage src={item.mediaUrl || '/default-tolee-avatar.svg'} className="object-cover" />
                                <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">{item.title[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-gray-800 dark:text-zinc-150 truncate">{item.title}</span>
                                <span className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{item.description || 'No description'}</span>
                                {item.location && (
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3 text-emerald-500" /> {item.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-3 py-1 shrink-0 rounded-full border border-emerald-500/10">
                              {item.meta?.memberCount || 0} members
                            </Badge>
                          </div>
                        );
                      }

                      // 4. MARKETPLACE DISPLAY
                      if (item.type === 'listing') {
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="group bg-white dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-800/85 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-zinc-850 relative">
                              {item.mediaUrl ? (
                                <img
                                  src={item.mediaUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                              )}
                              <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white font-extrabold text-xs px-2.5 py-1 rounded-lg">
                                ₹{item.meta?.price}
                              </div>
                            </div>
                            <div className="p-3.5">
                              <span className="text-xs font-extrabold text-gray-800 dark:text-zinc-150 line-clamp-1 leading-tight">{item.title}</span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 line-clamp-2 mt-1 min-h-[30px] leading-tight">
                                {item.description}
                              </span>
                              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-zinc-850">
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 truncate">
                                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </span>
                                <Badge className="bg-primary/5 text-primary text-[9px] font-bold py-0.5 px-2">
                                  {item.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 5. REGULAR POSTS & REQUIREMENTS DISPLAY
                      return (
                        <Card
                          key={item.id}
                          onClick={() => handleResultClick(item)}
                          className="hover:border-primary/20 hover:bg-primary/5 dark:hover:bg-zinc-900/30 transition-all duration-300 cursor-pointer rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm"
                        >
                          <CardContent className="p-4.5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 border border-gray-250/80">
                                  <AvatarImage src={item.meta?.avatar || '/default-user-avatar.svg'} />
                                  <AvatarFallback className="font-bold bg-primary/5 text-primary">{item.title[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm flex items-center gap-1 text-gray-800 dark:text-zinc-200">
                                    {item.title}
                                    {item.meta?.isVerified && <span className="text-sky-500 text-xs">✓</span>}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-zinc-500">{item.subtitle}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.type === 'requirement' && (
                                  <Badge className="bg-red-500 text-white font-extrabold text-[10px] py-1 px-3 rounded-full uppercase tracking-wider animate-pulse">
                                    Requirement
                                  </Badge>
                                )}
                                <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                              {item.mediaUrl && (
                                <div className="w-full md:w-32 aspect-video md:aspect-square rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-zinc-800">
                                  {item.mediaType === 'video' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                      <Video className="w-6 h-6 text-white" />
                                    </div>
                                  ) : (
                                    <img src={item.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                                  )}
                                </div>
                              )}
                              <div className="flex flex-col justify-between flex-grow min-w-0">
                                <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-55/60 dark:border-zinc-850/60 text-xs text-gray-400 dark:text-zinc-500">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1 font-semibold"><Heart className="w-4 h-4 text-red-500" /> {item.meta?.likesCount || 0}</span>
                                    <span className="flex items-center gap-1 font-semibold"><MessageCircle className="w-4 h-4 text-primary" /> {item.meta?.commentsCount || 0}</span>
                                    {item.meta?.savesCount !== undefined && (
                                      <span className="flex items-center gap-1 font-semibold"><Bookmark className="w-4 h-4 text-amber-500" /> {item.meta?.savesCount || 0}</span>
                                    )}
                                  </div>

                                  {item.location && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                      <MapPin className="w-3.5 h-3.5 text-primary" /> {item.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Load More Button */}
                  {total > results.length && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={loadMore}
                        disabled={isMoreLoading}
                        className="bg-primary hover:bg-primary/95 text-white font-bold px-8 py-2.5 rounded-full text-xs shadow-md transition-all duration-300"
                      >
                        {isMoreLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Retrieving records...</span>
                          </div>
                        ) : (
                          'Load More Content'
                        )}
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
