'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sanitizeText } from '@/lib/sanitize';
import { getSimulationSettings, getGroupMemberCount, getSimulatedEngagement } from '@/lib/simulation';

export interface SearchFilters {
  type?: 'all' | 'users' | 'reels' | 'posts' | 'groups' | 'marketplace' | 'requirements' | 'locations' | 'trending';
  location?: string;
  category?: string;
  sortBy?: 'relevance' | 'newest' | 'engagement';
}

export interface SearchResultItem {
  id: string;
  type: 'user' | 'reel' | 'post' | 'group' | 'listing' | 'requirement';
  title: string;
  subtitle?: string | null;
  description?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  location?: string | null;
  category?: string | null;
  createdAt: Date;
  score: number;
  // Metadata fields for specific visual displays
  meta?: {
    username?: string;
    avatar?: string;
    isVerified?: boolean;
    likesCount?: number;
    commentsCount?: number;
    savesCount?: number;
    viewsCount?: number;
    price?: number;
    currency?: string;
    condition?: string | null;
    memberCount?: number;
    ownerName?: string;
  };
}

// Universal Media Thumbnail Extraction for Posts, Videos, Reels and Embeds
function extractMediaThumbnail(mediaUrls?: string | null, mediaTypes?: string | null, postType?: string | null): string | null {
  if (!mediaUrls || typeof mediaUrls !== 'string' || !mediaUrls.trim()) {
    return null;
  }

  // Split multiple URLs
  const urls = mediaUrls.split(/,(?=https?:\/\/|\/uploads\/)/).map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return null;

  // 1. If an image is explicitly in the list, prioritize it
  const imageCandidate = urls.find(u => /\.(jpeg|jpg|png|webp|gif|avif)($|\?)/i.test(u) && !u.includes('/video/'));
  if (imageCandidate) return imageCandidate;

  const first = urls[0];

  // 2. YouTube Video (watch, embed, shorts, youtu.be)
  const ytMatch = first.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 3. Cloudinary Video (.m3u8, .mp4, .mov, etc.)
  if (first.includes('cloudinary.com') && (first.includes('/video/upload/') || /\.(m3u8|mp4|webm|mov|mkv)($|\?)/i.test(first))) {
    let clean = first.replace(/\.(m3u8|mp4|webm|mov|mkv|avi)($|\?.*)/i, '.jpg');
    clean = clean.replace(/\/video\/upload\/(sp_[a-zA-Z0-9_-]+\/)?/, '/video/upload/so_0,f_jpg,q_auto,w_600/');
    return clean;
  }

  // 4. Check if any secondary URL is a thumbnail (e.g. Coverr, custom poster)
  const thumbCandidate = urls.find(u => u.includes('thumbnail') || u.includes('poster') || u.includes('/preview/'));
  if (thumbCandidate) return thumbCandidate;

  return first;
}

// Helper to sanitize search query
function getCleanQuery(query: string): string {
  return sanitizeText(query || '', 100);
}

// 1. PERFORM SEARCH WITH AI-POWERED RELEVANCE SCORING
export async function performSearch(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  take = 12
): Promise<{ success: boolean; data: SearchResultItem[]; total: number }> {
  try {
    const session = await getServerSession(authOptions);
    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;
    const userId = session?.user ? (session.user as any).id : null;
    const userLocation = session?.user ? (session.user as any).location : null;

    const cleanQuery = getCleanQuery(query);
    const skip = (page - 1) * take;

    // Track search history if user is logged in
    if (userId && cleanQuery.length >= 2) {
      await saveSearchQuery(cleanQuery, filters.type || 'all');
    }

    // Determine what to search based on the filter type
    const searchType = filters.type || 'all';

    // 1. Gather all raw records concurrently
    const [rawUsers, rawPosts, rawTolees, rawListings] = await Promise.all([
      // Users Search
      searchType === 'all' || searchType === 'users'
        ? prisma.user.findMany({
            where: {
              ...(!isSimOn ? { isSimulation: false } : {}),
              OR: [
                { username: { contains: cleanQuery, mode: 'insensitive' } },
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { bio: { contains: cleanQuery, mode: 'insensitive' } },
                { location: { contains: cleanQuery, mode: 'insensitive' } }
              ]
            },
            take: searchType === 'users' ? take * 3 : 30
          })
        : Promise.resolve([]),

      // Posts, Reels, and Requirements Search (distinguished by postType)
      searchType === 'all' || searchType === 'posts' || searchType === 'reels' || searchType === 'requirements' || searchType === 'locations' || searchType === 'trending'
        ? prisma.post.findMany({
            where: {
              status: 'published',
              visibility: 'public',
              isArchived: false,
              ...(!isSimOn ? { isSimulation: false } : {}),
              AND: [
                // Filter by type
                searchType === 'reels' ? { postType: 'reel' } : {},
                searchType === 'requirements' ? { postType: 'requirement' } : {},
                searchType === 'posts' ? { postType: { notIn: ['reel', 'requirement'] } } : {},
                // Query matching
                cleanQuery.length > 0
                  ? {
                      OR: [
                        { caption: { contains: cleanQuery, mode: 'insensitive' } },
                        { ocrText: { contains: cleanQuery, mode: 'insensitive' } },
                        { audioTranscript: { contains: cleanQuery, mode: 'insensitive' } },
                        { visualTags: { contains: cleanQuery, mode: 'insensitive' } },
                        { location: { contains: cleanQuery, mode: 'insensitive' } },
                        { subLocation: { contains: cleanQuery, mode: 'insensitive' } }
                      ]
                    }
                  : {}
              ]
            },
            include: {
              author: true,
              likes: true,
              comments: true,
              savedBy: true,
              views: true
            },
            take: searchType === 'all' ? 50 : take * 3
          })
        : Promise.resolve([]),

      // Tolees (Groups) Search
      searchType === 'all' || searchType === 'groups' || searchType === 'trending'
        ? prisma.tolee.findMany({
            where: {
              isPublicVisible: true,
              OR: [
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { description: { contains: cleanQuery, mode: 'insensitive' } },
                { category: { contains: cleanQuery, mode: 'insensitive' } },
                { location: { contains: cleanQuery, mode: 'insensitive' } }
              ]
            },
            include: {
              members: true,
              owner: true
            },
            take: searchType === 'groups' ? take * 3 : 20
          })
        : Promise.resolve([]),

      // Marketplace Listings Search
      searchType === 'all' || searchType === 'marketplace' || searchType === 'trending'
        ? prisma.listing.findMany({
            where: {
              status: 'active',
              AND: [
                cleanQuery.length > 0
                  ? {
                      OR: [
                        { title: { contains: cleanQuery, mode: 'insensitive' } },
                        { description: { contains: cleanQuery, mode: 'insensitive' } },
                        { category: { contains: cleanQuery, mode: 'insensitive' } },
                        { tags: { contains: cleanQuery, mode: 'insensitive' } },
                        { visualTags: { contains: cleanQuery, mode: 'insensitive' } },
                        { locationText: { contains: cleanQuery, mode: 'insensitive' } }
                      ]
                    }
                  : {}
              ]
            },
            include: {
              seller: true
            },
            take: searchType === 'marketplace' ? take * 3 : 20
          })
        : Promise.resolve([])
    ]);

    // Fetch user preferences (for personalization interest boost)
    let preferredCategories: string[] = [];
    if (userId) {
      const [joinedTolees, likedPosts] = await Promise.all([
        prisma.toleeMember.findMany({
          where: { userId },
          include: { tolee: true },
          take: 10
        }),
        prisma.like.findMany({
          where: { userId },
          include: { post: true },
          take: 20
        })
      ]);

      const toleeCats = joinedTolees.map(m => m.tolee.category).filter(Boolean) as string[];
      const postTags = likedPosts
        .map(l => l.post?.visualTags)
        .filter(Boolean)
        .flatMap(tags => tags!.split(',').map(t => t.trim().toLowerCase()));

      preferredCategories = [...new Set([...toleeCats, ...postTags])];
    }

    const results: SearchResultItem[] = [];

    // --- RANKING & SCORING FUNCTION ---
    function calculateRelevanceScore(
      item: any,
      type: SearchResultItem['type'],
      textFields: { primary: string; secondary?: string; extra?: string }
    ): number {
      let score = 0;
      const lowerQuery = cleanQuery.toLowerCase();

      // 1. Keyword Weighting
      if (lowerQuery.length > 0) {
        if (textFields.primary?.toLowerCase().includes(lowerQuery)) {
          score += 15.0; // High weight for exact match in title/name
          if (textFields.primary.toLowerCase() === lowerQuery) {
            score += 10.0; // Extra boost for perfect match
          }
        }
        if (textFields.secondary?.toLowerCase().includes(lowerQuery)) {
          score += 5.0; // Medium weight for subtitle/bio/description
        }
        if (textFields.extra?.toLowerCase().includes(lowerQuery)) {
          score += 2.0; // Low weight for visual tags/ocrText/audio
        }
      } else {
        // Default base score for discovery feed when no query is present
        score += 1.0;
      }

      // 2. Freshness Decay (Exponential Decay based on age in hours)
      const createdAt = new Date(item.createdAt || Date.now());
      const ageInHours = Math.max(1, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
      const freshnessBoost = Math.max(0, 8 - Math.log(ageInHours)); // Logarithmic decay
      score += freshnessBoost;

      // 3. Location Proximity Boost
      const itemLocation = (item.location || item.locationText || item.subLocation || '').toLowerCase();
      if (userLocation && itemLocation) {
        const viewerLoc = userLocation.toLowerCase();
        if (itemLocation.includes(viewerLoc) || viewerLoc.includes(itemLocation)) {
          score += 8.0; // Strong local boost
        }
      }

      // 4. Engagement Boost (weighted likes, comments, members, or views)
      if (type === 'reel' || type === 'post' || type === 'requirement') {
        const likes = item.likes?.length || 0;
        const comments = item.comments?.length || 0;
        const saves = item.savedBy?.length || 0;
        const views = item.views?.length || 0;
        const shareCount = item.shareCount || 0;

        const engagementSum = likes * 1.5 + comments * 2.0 + saves * 2.5 + shareCount * 3.0 + views * 0.1;
        const engagementVelocity = engagementSum / Math.sqrt(ageInHours);
        score += engagementVelocity;
      } else if (type === 'group') {
        const memberCount = item.members?.length || 0;
        score += Math.log15(memberCount + 1) * 3.0; // Log scale boost for popular groups
      } else if (type === 'listing') {
        const viewCount = item.viewCount || 0;
        score += Math.min(5.0, viewCount * 0.2);
      }

      // 5. Personalization Interest Boost
      const itemCategory = (item.category || '').toLowerCase();
      const itemVisualTags = (item.visualTags || '').toLowerCase();

      let hasPersonalInterest = false;
      for (const prefCat of preferredCategories) {
        const pref = prefCat.toLowerCase();
        if (
          (itemCategory && itemCategory.includes(pref)) ||
          (itemVisualTags && itemVisualTags.includes(pref)) ||
          (textFields.primary && textFields.primary.toLowerCase().includes(pref))
        ) {
          hasPersonalInterest = true;
          break;
        }
      }

      if (hasPersonalInterest) {
        score += 6.0; // Add personalization weight
      }

      return score;
    }

    // Helper for Math.log base 15
    const MathLog15 = (val: number) => Math.log(val) / Math.log(15);
    (Math as any).log15 = (Math as any).log15 || MathLog15;

    // --- Transform & Score Users ---
    if (searchType === 'all' || searchType === 'users') {
      for (const u of rawUsers) {
        const score = calculateRelevanceScore(u, 'user', {
          primary: u.username || u.name,
          secondary: u.bio || '',
          extra: u.location || ''
        });
        results.push({
          id: u.id,
          type: 'user',
          title: u.name,
          subtitle: u.username ? `@${u.username}` : null,
          description: u.bio,
          mediaUrl: u.avatar || u.image || '/images/default-avatar.png',
          location: u.location,
          createdAt: u.createdAt,
          score,
          meta: {
            username: u.username || u.id,
            avatar: u.avatar || u.image || '',
            isVerified: u.isVerified
          }
        });
      }
    }

    // --- Transform & Score Posts / Reels / Requirements ---
    for (const p of rawPosts) {
      let type: SearchResultItem['type'] = 'post';
      if (p.postType === 'reel') type = 'reel';
      else if (p.postType === 'requirement') type = 'requirement';

      const score = calculateRelevanceScore(p, type, {
        primary: p.caption || '',
        secondary: p.visualTags || '',
        extra: `${p.ocrText || ''} ${p.audioTranscript || ''} ${p.location || ''}`
      });

      const eng = isSimOn ? getSimulatedEngagement(p.id) : null;

      const mediaThumb = extractMediaThumbnail(p.mediaUrls, p.mediaTypes, p.postType);

      results.push({
        id: p.id,
        type,
        title: p.author.name,
        subtitle: p.author.username ? `@${p.author.username}` : null,
        description: p.caption,
        mediaUrl: mediaThumb,
        mediaType: p.mediaTypes ? p.mediaTypes.split(',')[0] : (type === 'reel' ? 'video' : 'image'),
        location: p.location || p.subLocation,
        createdAt: p.createdAt,
        score,
        meta: {
          username: p.author.username || '',
          avatar: p.author.avatar || p.author.image || '',
          isVerified: p.author.isVerified,
          likesCount: eng ? eng.likes : (p.likes?.length || 0),
          commentsCount: eng ? eng.comments : (p.comments?.length || 0),
          savesCount: eng ? eng.saves : (p.savedBy?.length || 0),
          viewsCount: eng ? eng.views : (p.views?.length || 0)
        }
      });
    }

    // --- Transform & Score Tolees ---
    if (searchType === 'all' || searchType === 'groups' || searchType === 'trending') {
      for (const t of rawTolees) {
        const score = calculateRelevanceScore(t, 'group', {
          primary: t.name,
          secondary: t.description || '',
          extra: `${t.category || ''} ${t.location || ''}`
        });

        const realCount = t.members?.length || 0;
        const simulatedCount = getGroupMemberCount(t.id, t.name, realCount, isSimOn, simSettings.minGroupMembers, simSettings.maxGroupMembers);

        results.push({
          id: t.id,
          type: 'group',
          title: t.name,
          subtitle: `${simulatedCount.toLocaleString()} members`,
          description: t.description,
          mediaUrl: t.avatar || '/images/default-tolee.png',
          location: t.location,
          category: t.category,
          createdAt: t.createdAt,
          score,
          meta: {
            memberCount: simulatedCount,
            ownerName: t.owner?.name
          }
        });
      }
    }

    // --- Transform & Score Listings ---
    if (searchType === 'all' || searchType === 'marketplace' || searchType === 'trending') {
      for (const l of rawListings) {
        const score = calculateRelevanceScore(l, 'listing', {
          primary: l.title,
          secondary: l.description,
          extra: `${l.category} ${l.tags || ''} ${l.visualTags || ''} ${l.locationText}`
        });

        results.push({
          id: l.id,
          type: 'listing',
          title: l.title,
          subtitle: `₹${l.price}`,
          description: l.description,
          mediaUrl: l.images ? l.images.split(/,(?=https?:\/\/)/)[0] : null,
          location: l.locationText,
          category: l.category,
          createdAt: l.createdAt,
          score,
          meta: {
            price: l.price,
            currency: l.currency,
            condition: l.condition
          }
        });
      }
    }

    // Sort results based on sorting filter
    let sortedResults = results;
    if (filters.sortBy === 'newest') {
      sortedResults = results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (filters.sortBy === 'engagement') {
      sortedResults = results.sort((a, b) => {
        const engA = (a.meta?.likesCount || 0) + (a.meta?.commentsCount || 0) + (a.meta?.memberCount || 0) * 2;
        const engB = (b.meta?.likesCount || 0) + (b.meta?.commentsCount || 0) + (b.meta?.memberCount || 0) * 2;
        return engB - engA;
      });
    } else {
      // Default: Sort by relevance score
      sortedResults = results.sort((a, b) => b.score - a.score);
    }

    const total = sortedResults.length;
    const paginatedResults = sortedResults.slice(skip, skip + take);

    return {
      success: true,
      data: paginatedResults,
      total
    };
  } catch (error) {
    console.error('Error during search:', error);
    return { success: false, data: [], total: 0 };
  }
}

// 2. LIVE SEARCH SUGGESTIONS COMPILER
export async function getSearchSuggestions(query: string): Promise<any[]> {
  try {
    const cleanQuery = getCleanQuery(query);
    if (cleanQuery.length < 2) return [];

    // Concurrently fetch matching Users, Groups, Listings, and Recent Popular searches
    const [users, tolees, listings, historyMatches] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: cleanQuery, mode: 'insensitive' } },
            { name: { contains: cleanQuery, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, username: true, avatar: true },
        take: 4
      }),
      prisma.tolee.findMany({
        where: {
          isPublicVisible: true,
          name: { contains: cleanQuery, mode: 'insensitive' }
        },
        select: { id: true, name: true, avatar: true, category: true },
        take: 3
      }),
      prisma.listing.findMany({
        where: { title: { contains: cleanQuery, mode: 'insensitive' } },
        select: { id: true, title: true, category: true },
        take: 3
      }),
      prisma.searchHistory.groupBy({
        by: ['query'],
        where: { query: { contains: cleanQuery, mode: 'insensitive' } },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 5
      })
    ]);

    const suggestions: any[] = [];

    // Add query history suggestions first
    for (const h of historyMatches) {
      suggestions.push({
        id: `history-${h.query}`,
        type: 'query',
        text: h.query,
        subtitle: 'Popular Search'
      });
    }

    // Add user profile suggestions
    for (const u of users) {
      suggestions.push({
        id: u.id,
        type: 'user',
        text: u.name,
        subtitle: u.username ? `@${u.username}` : '',
        avatar: u.avatar || '/images/default-avatar.png'
      });
    }

    // Add Tolee suggestions
    for (const t of tolees) {
      suggestions.push({
        id: t.id,
        type: 'group',
        text: t.name,
        subtitle: `Tolee Group • ${t.category || 'General'}`,
        avatar: t.avatar || '/images/default-tolee.png'
      });
    }

    // Add marketplace listings suggestions
    for (const l of listings) {
      suggestions.push({
        id: l.id,
        type: 'marketplace',
        text: l.title,
        subtitle: `Listing in ${l.category}`
      });
    }

    // Deduplicate suggestions by text value
    const seen = new Set();
    return suggestions.filter(item => {
      const key = `${item.type}-${item.text}`;
      return seen.has(key) ? false : seen.add(key);
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
}

// 3. SAVE SEARCH QUERY TO HISTORY
export async function saveSearchQuery(query: string, filterType: string = 'all'): Promise<{ success: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false };
    }
    const userId = (session.user as any).id;
    const cleanQuery = getCleanQuery(query);

    if (cleanQuery.length < 2) return { success: false };

    // Check if query was recently searched by this user
    const existing = await prisma.searchHistory.findFirst({
      where: { userId, query: cleanQuery }
    });

    if (existing) {
      await prisma.searchHistory.update({
        where: { id: existing.id },
        data: {
          clickCount: { increment: 1 },
          filters: filterType
        }
      });
    } else {
      await prisma.searchHistory.create({
        data: {
          userId,
          query: cleanQuery,
          filters: filterType
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving search query:', error);
    return { success: false };
  }
}

// 4. LOG RESULT CLICKS FOR CONVERSION ANALYTICS
export async function logSearchClick(query: string, clickedId: string, clickedType: string): Promise<{ success: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    const cleanQuery = getCleanQuery(query);

    await prisma.searchClickLog.create({
      data: {
        query: cleanQuery,
        clickedId,
        clickedType,
        userId
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging search click:', error);
    return { success: false };
  }
}

// 5. GET SEARCH HISTORY
export async function getSearchHistory(): Promise<any[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) return [];
    const userId = (session.user as any).id;

    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
}

// 6. CLEAR SEARCH HISTORY
export async function clearSearchHistory(id?: string): Promise<{ success: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    if (id) {
      // Clear single item
      await prisma.searchHistory.delete({
        where: { id, userId }
      });
    } else {
      // Clear all history for this user
      await prisma.searchHistory.deleteMany({
        where: { userId }
      });
    }

    revalidatePath('/search');
    return { success: true };
  } catch (error) {
    console.error('Error clearing search history:', error);
    return { success: false };
  }
}

// 7. GET TRENDING CONTENT CAROUSEL
export async function getTrendingContent(): Promise<{
  reels: any[];
  hashtags: { tag: string; count: number }[];
  tolees: any[];
  listings: any[];
  locations: string[];
}> {
  try {
    // 1. Trending Reels: Reels sorted by views + likes + comments, limited to the last 14 days
    const reels = await prisma.post.findMany({
      where: {
        postType: 'reel',
        status: 'published',
        visibility: 'public',
        isArchived: false
      },
      include: {
        author: true,
        likes: true,
        comments: true,
        views: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Sort reels based on engagement score
    const scoredReels = reels
      .map(r => {
        const score = (r.likes.length * 2) + (r.comments.length * 3) + (r.views.length * 0.5) + (r.shareCount * 5);
        return { ...r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // 2. Extract trending hashtags from recent posts
    const recentPosts = await prisma.post.findMany({
      where: { status: 'published', isArchived: false },
      select: { caption: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const hashTagCounts: { [key: string]: number } = {};
    for (const p of recentPosts) {
      if (p.caption) {
        const tags = p.caption.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g);
        if (tags) {
          for (const t of tags) {
            const normalized = t.toLowerCase();
            hashTagCounts[normalized] = (hashTagCounts[normalized] || 0) + 1;
          }
        }
      }
    }

    const hashtags = Object.entries(hashTagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 3. Trending Tolee groups: Groups with the most members
    const tolees = await prisma.tolee.findMany({
      where: {
        isPublicVisible: true
      },
      include: {
        members: true
      },
      take: 20
    });

    const sortedTolees = tolees
      .sort((a, b) => b.members.length - a.members.length)
      .slice(0, 6);

    // 4. Trending Marketplace Listings: active listings with high views
    const listings = await prisma.listing.findMany({
      where: { status: 'active' },
      include: { seller: true },
      orderBy: { viewCount: 'desc' },
      take: 6
    });

    // 5. Trending locations mentioned in posts / listings / groups
    const uniqueLocations = await prisma.post.findMany({
      where: { location: { not: null } },
      select: { location: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const locationCounts: { [key: string]: number } = {};
    for (const l of uniqueLocations) {
      if (l.location) {
        const loc = l.location.trim();
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    }

    const locations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 5);

    return {
      reels: scoredReels,
      hashtags,
      tolees: sortedTolees,
      listings,
      locations
    };
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return { reels: [], hashtags: [], tolees: [], listings: [], locations: [] };
  }
}

// 8. HASHTAG SEARCH & DETAIL PAGE
export async function getHashtagDetails(tag: string): Promise<{
  tag: string;
  topPosts: any[];
  recentPosts: any[];
  relatedHashtags: string[];
}> {
  try {
    const targetTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;

    // Fetch all posts with a caption containing the hashtag
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        isArchived: false,
        caption: { contains: targetTag, mode: 'insensitive' }
      },
      include: {
        author: true,
        likes: true,
        comments: true,
        savedBy: true,
        views: true
      }
    });

    // Score and divide into Top and Recent
    const scoredPosts = posts.map(p => {
      const likesCount = p.likes?.length || 0;
      const commentsCount = p.comments?.length || 0;
      const savesCount = p.savedBy?.length || 0;
      const score = likesCount * 2 + commentsCount * 3 + savesCount * 4;
      return { ...p, score };
    });

    const topPosts = [...scoredPosts].sort((a, b) => b.score - a.score).slice(0, 9);
    const recentPosts = [...scoredPosts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 18);

    // Get related hashtags from these posts
    const hashTagCounts: { [key: string]: number } = {};
    for (const p of posts) {
      if (p.caption) {
        const tags = p.caption.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g);
        if (tags) {
          for (const t of tags) {
            const normalized = t.toLowerCase();
            if (normalized !== targetTag) {
              hashTagCounts[normalized] = (hashTagCounts[normalized] || 0) + 1;
            }
          }
        }
      }
    }

    const relatedHashtags = Object.entries(hashTagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 6);

    return {
      tag: targetTag,
      topPosts,
      recentPosts,
      relatedHashtags
    };
  } catch (error) {
    console.error('Error fetching hashtag details:', error);
    return { tag, topPosts: [], recentPosts: [], relatedHashtags: [] };
  }
}

// 9. SUPER ADMIN SEARCH ANALYTICS
export async function getSuperAdminSearchAnalytics(): Promise<{
  success: boolean;
  totalQueries: number;
  averageCTR: number;
  trendingKeyword: string;
  topKeywords: any[];
  clickLogs: any[];
}> {
  try {
    // Check if Super Admin session exists
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).isSuperAdmin) {
      // Try cookie authorization
      const { headers } = require('next/headers');
      const reqHeaders = headers();
      const cookieHeader = reqHeaders.get('cookie') || '';
      const jwt = require('jsonwebtoken');
      
      const adminCookie = cookieHeader
        .split('; ')
        .find((row: string) => row.startsWith('super-admin-token='))
        ?.split('=')[1];

      if (!adminCookie) {
        return { success: false, totalQueries: 0, averageCTR: 0, trendingKeyword: 'N/A', topKeywords: [], clickLogs: [] };
      }

      try {
        jwt.verify(adminCookie, process.env.SUPER_ADMIN_JWT_SECRET);
      } catch (err) {
        return { success: false, totalQueries: 0, averageCTR: 0, trendingKeyword: 'N/A', topKeywords: [], clickLogs: [] };
      }
    }

    // 1. Total search queries
    const totalQueries = await prisma.searchHistory.count();

    // 2. Total clicks
    const totalClicks = await prisma.searchClickLog.count();

    // 3. Average CTR (Click Through Rate)
    const averageCTR = totalQueries > 0 ? (totalClicks / totalQueries) * 100 : 0;

    // 4. Top keywords grouped by query
    const topKeywordsRaw = await prisma.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10
    });

    const topKeywords = await Promise.all(
      topKeywordsRaw.map(async tk => {
        // Find clicks for this keyword
        const clicksCount = await prisma.searchClickLog.count({
          where: { query: tk.query }
        });
        const ctr = tk._count.query > 0 ? (clicksCount / tk._count.query) * 100 : 0;

        return {
          keyword: tk.query,
          searchCount: tk._count.query,
          clickCount: clicksCount,
          ctr: Math.round(ctr * 10) / 10
        };
      })
    );

    // 5. Real-time click logs with user details
    const clickLogsRaw = await prisma.searchClickLog.findMany({
      include: {
        user: {
          select: { name: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    const clickLogs = clickLogsRaw.map(log => ({
      id: log.id,
      query: log.query,
      clickedId: log.clickedId,
      clickedType: log.clickedType,
      user: log.user ? `${log.user.name} (@${log.user.username})` : 'Anonymous',
      createdAt: log.createdAt
    }));

    // 6. Trending Keyword of the Day
    const trendingKeyword = topKeywords.length > 0 ? topKeywords[0].keyword : 'N/A';

    return {
      success: true,
      totalQueries,
      averageCTR: Math.round(averageCTR * 10) / 10,
      trendingKeyword,
      topKeywords,
      clickLogs
    };
  } catch (error) {
    console.error('Error gathering admin search analytics:', error);
    return { success: false, totalQueries: 0, averageCTR: 0, trendingKeyword: 'N/A', topKeywords: [], clickLogs: [] };
  }
}

// 10. EXPLORE FEED (Mixed Photos, Videos, and Reels for Discovery Grid)
export async function getExploreFeed(page: number = 1, limit: number = 24) {
  try {
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        isArchived: false,
        mediaUrls: { not: null },
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        _count: {
          select: { likes: true, comments: true, views: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit * 2,
      skip,
    });

    const items = posts
      .map((p) => {
        const isReel = p.postType === 'reel' || p.mediaTypes === 'video' || Boolean(p.mediaUrls && (p.mediaUrls.includes('.m3u8') || p.mediaUrls.includes('.mp4') || p.mediaUrls.includes('youtube') || p.mediaUrls.includes('youtu.be')));
        const mediaThumb = extractMediaThumbnail(p.mediaUrls, p.mediaTypes, p.postType);
        if (!mediaThumb) return null;

        return {
          id: p.id,
          type: isReel ? ('reel' as const) : ('post' as const),
          mediaUrl: mediaThumb,
          mediaType: p.mediaTypes || (isReel ? 'video' : 'image'),
          caption: p.caption || '',
          likesCount: p._count.likes || 0,
          commentsCount: p._count.comments || 0,
          viewsCount: p._count.views || 0,
          author: {
            id: p.author.id,
            name: p.author.name || 'User',
            username: p.author.username || '',
            avatar: p.author.avatar || '/default-user-avatar.svg',
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.mediaUrl))
      .slice(0, limit);

    return {
      success: true,
      items,
    };
  } catch (error) {
    console.error('Error fetching explore feed:', error);
    return { success: false, items: [] };
  }
}

