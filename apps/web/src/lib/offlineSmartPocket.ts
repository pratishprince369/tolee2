'use client';

/**
 * Tolee Offline Smart Pocket Engine
 * Automatically pre-caches top news articles & videos for zero-data offline reading & watching
 */

const POCKET_CACHE_KEY = 'tolee_offline_pocket_cache';
const POCKET_MAX_ITEMS = 40;

export interface CachedPocketPost {
  id: string;
  headline: string;
  summary?: string;
  category?: string;
  coverImage?: string;
  sourceUrl?: string;
  slug: string;
  postType: string;
  mediaUrls?: string;
  createdAt: string;
}

export function savePostsToOfflinePocket(posts: any[]) {
  if (typeof window === 'undefined' || !posts || !Array.isArray(posts)) return;

  try {
    const existingStr = localStorage.getItem(POCKET_CACHE_KEY);
    let existing: CachedPocketPost[] = existingStr ? JSON.parse(existingStr) : [];

    const newItems: CachedPocketPost[] = posts.map((p) => {
      const news = p.newsRelation || p;
      return {
        id: p.id || news.id || `pocket-${Date.now()}`,
        headline: news.headline || p.caption || 'News Article',
        summary: news.summary || news.metaDescription || p.caption || '',
        category: news.category || 'General',
        coverImage: news.coverCaption || p.mediaUrls?.split(',')[0] || '',
        sourceUrl: news.sourceUrl || '',
        slug: news.slug || p.id,
        postType: p.postType || 'news',
        mediaUrls: p.mediaUrls || '',
        createdAt: p.createdAt || new Date().toISOString()
      };
    });

    // Merge and deduplicate by id/slug
    const mergedMap = new Map<string, CachedPocketPost>();
    [...newItems, ...existing].forEach((item) => {
      if (item.slug && !mergedMap.has(item.slug)) {
        mergedMap.set(item.slug, item);
      }
    });

    const finalPocketList = Array.from(mergedMap.values()).slice(0, POCKET_MAX_ITEMS);
    localStorage.setItem(POCKET_CACHE_KEY, JSON.stringify(finalPocketList));
  } catch (e) {
    console.warn('[Offline Smart Pocket] Cache error:', e);
  }
}

export function getOfflinePocketPosts(): CachedPocketPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const cacheStr = localStorage.getItem(POCKET_CACHE_KEY);
    return cacheStr ? JSON.parse(cacheStr) : [];
  } catch {
    return [];
  }
}
