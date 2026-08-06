'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, PlusCircle, ArrowUpRight, Clock, Eye, MessageCircle, Heart, User, Calendar } from 'lucide-react';
import { NewsCardMenu } from '@/components/NewsCardMenu';
import { NewsEngagement } from '@/components/NewsEngagement';
import { getNewsFeedPosts } from '@/actions/news';
import { ViewTracker } from '@/components/ViewTracker';
import { OptimisticPostCard } from '@/components/OptimisticPostCard';
import { CreateNewsButton } from '@/components/CreateNewsButton';

interface NewsFeedStreamProps {
  initialNews: any[];
  categories: string[];
  initialCategory: string;
  currentUserId: string | null;
  isSuperAdmin: boolean;
}

export function NewsFeedStream({
  initialNews,
  categories,
  initialCategory,
  currentUserId,
  isSuperAdmin,
}: NewsFeedStreamProps) {
  const router = useRouter();
  const [newsPosts, setNewsPosts] = useState<any[]>(initialNews);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialNews.length >= 10);
  const [isLoading, setIsLoading] = useState(false);
  const [prefetchedNews, setPrefetchedNews] = useState<any[] | null>(null);
  const [prefetchCategory, setPrefetchCategory] = useState<string | null>(null);
  const [prefetchPage, setPrefetchPage] = useState<number | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset when initialNews changes from server
  useEffect(() => {
    setNewsPosts(initialNews);
    setActiveCategory(initialCategory);
    setPage(1);
    setHasMore(initialNews.length >= 10);
    setPrefetchedNews(null);
  }, [initialNews, initialCategory]);

  // Handle category change
  const handleCategoryChange = async (category: string) => {
    if (isLoading) return;
    setActiveCategory(category);
    setNewsPosts([]);
    setPage(1);
    setHasMore(false);
    setIsLoading(true);
    setPrefetchedNews(null);

    // Update URL query param client-side without full reload
    router.replace(`/news?cat=${category}`, { scroll: false });

    try {
      const res = await getNewsFeedPosts({ category, page: 1, limit: 10 });
      if (res.success && res.news) {
        setNewsPosts(res.news);
        setHasMore(res.hasMore || false);
      }
    } catch (err) {
      console.error('Failed to load category news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Background Prefetching of next page to make scrolling seamless
  useEffect(() => {
    if (isLoading || !hasMore) return;
    
    const nextPage = page + 1;
    // Avoid double prefetching same page
    if (prefetchCategory === activeCategory && prefetchPage === nextPage) return;

    const prefetchNextBatch = async () => {
      try {
        setPrefetchCategory(activeCategory);
        setPrefetchPage(nextPage);
        const res = await getNewsFeedPosts({ category: activeCategory, page: nextPage, limit: 10 });
        if (res.success && res.news) {
          setPrefetchedNews(res.news);
        }
      } catch (err) {
        console.error('Failed to prefetch next page:', err);
      }
    };

    const timer = setTimeout(prefetchNextBatch, 800);
    return () => clearTimeout(timer);
  }, [activeCategory, page, hasMore, isLoading]);

  // Infinite Scroll Trigger using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          setIsLoading(true);
          const nextPage = page + 1;

          // If we already prefetched this batch, use it instantly!
          if (prefetchedNews && prefetchCategory === activeCategory && prefetchPage === nextPage) {
            setNewsPosts((prev) => [...prev, ...prefetchedNews]);
            setPage(nextPage);
            setHasMore(prefetchedNews.length >= 10);
            setPrefetchedNews(null);
            setIsLoading(false);
            return;
          }

          // Otherwise fetch normally
          try {
            const res = await getNewsFeedPosts({ category: activeCategory, page: nextPage, limit: 10 });
            if (res.success && res.news) {
              setNewsPosts((prev) => [...prev, ...res.news]);
              setPage(nextPage);
              setHasMore(res.hasMore || false);
            }
          } catch (err) {
            console.error('Failed to load next page:', err);
          } finally {
            setIsLoading(false);
          }
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [activeCategory, page, hasMore, isLoading, prefetchedNews, prefetchCategory, prefetchPage]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Category Tabs list */}
      <div className="flex gap-2 overflow-x-auto pb-2 pr-2 custom-scrollbar sticky top-16 z-20 bg-gray-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`text-xs font-extrabold px-4.5 py-2.5 rounded-2xl select-none transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-102'
                : 'bg-white hover:bg-gray-50 dark:bg-[#121212] dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Feed Cards List */}
      <div className="space-y-6">
        <OptimisticPostCard />
        {newsPosts.map((item) => {
          const post = item.post;
          const coverImg = post?.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;
          const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <Card
              key={item.id}
              className="border-gray-100 dark:border-zinc-900/60 bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col relative"
            >
              {/* Invisible view tracker */}
              {post?.id && <ViewTracker contentId={post.id} contentType="post" />}

              {/* Card Header & News Badge / Actions */}
              <div className="p-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-50 hover:bg-indigo-150 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-none select-none">
                    {item.category}
                  </Badge>
                  {post?.status === 'draft' && (
                    <Badge className="bg-orange-50 dark:bg-orange-950/20 text-orange-500 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-none select-none">
                      Draft
                    </Badge>
                  )}
                  {post?.toleeName && (
                    <span className="text-[11px] text-gray-400 font-bold">
                      in <span className="text-indigo-600 dark:text-indigo-400">t/{post.toleeSlug}</span>
                    </span>
                  )}
                </div>
                {post?.id && (
                  <div className="z-10">
                    <NewsCardMenu
                      postId={post.id}
                      slug={item.slug}
                      canEdit={currentUserId === post.authorId || isSuperAdmin}
                    />
                  </div>
                )}
              </div>

              {/* Large Cover Image */}
              <Link href={`/news/${item.slug}`}>
                <div className="w-full overflow-hidden bg-slate-50 dark:bg-zinc-950 aspect-video relative cursor-pointer">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={item.headline}
                      className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-800">
                      <Newspaper className="w-16 h-16 stroke-[1.2]" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Headline & Summary */}
              <CardContent className="p-5 pt-4 space-y-2 flex-grow">
                <Link href={`/news/${item.slug}`}>
                  <h2 className="font-black text-[20px] sm:text-[22px] text-gray-900 dark:text-white leading-tight tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors">
                    {item.headline}
                  </h2>
                </Link>
                {item.summary && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 leading-relaxed font-medium">
                    {item.summary}
                  </p>
                )}
              </CardContent>

              {/* Author & Publish Date & Estimated read time */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <AvatarImage src={post?.author?.image || '/default-user-avatar.svg'} />
                    <AvatarFallback>{post?.author?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px] leading-tight text-gray-800 dark:text-zinc-200">
                      {post?.author?.name || 'Anonymous Creator'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 select-none">
                      <Calendar className="w-3 h-3" /> {dateStr}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 font-extrabold flex items-center gap-1 uppercase select-none">
                  <Clock className="w-3.5 h-3.5" /> {item.readingTime || 1} Min Read
                </div>
              </div>

              {/* Social Engagement bar */}
              {post?.id && (
                <div className="p-5 pt-0 mt-2">
                  <NewsEngagement
                    postId={post.id}
                    initialLikes={post.likes?.length || 0}
                    initialComments={post.comments?.length || 0}
                    initialReposts={post.reposts?.length || 0}
                    initialViews={item.viewsCount || 0}
                    initialLikedByMe={item.likedByMe || false}
                    initialSavedByMe={item.savedByMe || false}
                    initialRepostedByMe={item.repostedByMe || false}
                    shareCount={post.shareCount || 0}
                    slug={item.slug}
                    headline={item.headline}
                  />
                </div>
              )}
            </Card>
          );
        })}

        {/* Empty State */}
        {!isLoading && newsPosts.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#121212] border border-gray-100 dark:border-zinc-900 rounded-3xl space-y-4">
            <Newspaper className="w-12 h-12 text-zinc-300 mx-auto" />
            <h3 className="font-extrabold text-lg">No news articles found</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Be the first to publish a news story or blog in the "{activeCategory}" category!
            </p>
            <CreateNewsButton />
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2].map((idx) => (
              <Card key={idx} className="border-gray-100 dark:border-zinc-900/60 bg-white dark:bg-[#121212] rounded-3xl overflow-hidden p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="w-full aspect-video rounded-2xl" />
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-3.5 w-12 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Observer Trigger target */}
        {hasMore && <div ref={observerTarget} className="w-full h-8 flex items-center justify-center" />}
      </div>
    </div>
  );
}
