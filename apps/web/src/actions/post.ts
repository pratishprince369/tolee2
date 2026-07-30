'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyMultipleAssets } from '@/lib/cloudinary-cleanup';
import { createSystemNotification, createSystemNotificationsMany } from '@/lib/notification-service';
import { getSimulationSettings, getSimulatedEngagement, generateDynamicComments, detectCountryCode, getAICacheSync } from '@/lib/simulation';
import { runNewsAIPipeline } from '@/lib/aiNews';
import { getMediaThumbnail } from '@/lib/media';

export async function createPost(data: {
  content?: string;
  postType: string;
  media?: { type: string; url: string } | null;
  toleeIds?: string[];
  location?: string | null;
  subLocation?: string | null;
  status?: string;
  isAnonymous?: boolean;
  // News fields
  headline?: string;
  summary?: string;
  category?: string;
  metaDescription?: string;
  keywords?: string;
  tags?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'You must be logged in to post.' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { postingRestricted: true, reelsRestricted: true }
    });

    if (user?.postingRestricted) {
      return { success: false, error: 'You are restricted from creating posts.' };
    }

    if (data.media?.type === 'video' && user?.reelsRestricted) {
      return { success: false, error: 'You are restricted from uploading reels.' };
    }

    const { writeLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many requests. Please cool down.' };
    }

    const isDraft = data.status?.toLowerCase() === 'draft';
    const { sanitizeText } = require('@/lib/sanitize');
    
    // For news postType, the "headline" is the primary visual text. We sanitize the headline or content
    const safeContent = sanitizeText(data.content || '', 15000);
    const safeHeadline = sanitizeText(data.headline || '', 200);

    if (data.postType === 'news' && !isDraft && (!safeHeadline || !safeHeadline.trim())) {
      return { success: false, error: 'Headline is mandatory for news posts.' };
    }

    if (!isDraft && !safeContent && !safeHeadline) {
      return { success: false, error: 'Post content cannot be empty.' };
    }

    if (!isDraft && safeContent) {
      // AI Panchayat Content Moderation Check
      const { moderateContent } = require('@/lib/aiPanchayat');
      const moderation = await moderateContent({
        userId,
        contentType: 'post',
        content: safeContent
      });

      if (moderation.isFlagged) {
        return { 
          success: false, 
          error: `🚨 Post flagged by AI Panchayat: ${moderation.reason} Your trust score is now ${moderation.newScore}%.` 
        };
      }
    }

    if (!isDraft && (!data.toleeIds || data.toleeIds.length === 0)) {
      return { success: false, error: 'Please select at least one Tolee.' };
    }

    // CRITICAL: Reject blob URLs
    if (data.media?.url.startsWith('blob:')) {
      return { success: false, error: 'Internal Error: Temporary media URL detected. Upload failed.' };
    }

    // Create the post first
    let mediaPublicIds: string | null = null;
    let mediaResourceTypes: string | null = null;

    if (data.media?.url) {
      const urls = data.media.url.split(/,(?=https?:\/\/)/);
      const ids = urls.map(url => extractPublicIdFromUrl(url.trim())).filter(Boolean) as string[];
      const types = urls.map(url => extractResourceTypeFromUrl(url.trim()));
      
      if (ids.length > 0) {
        mediaPublicIds = ids.join(',');
        mediaResourceTypes = types.join(',');
      }
    }

    // Auto-generate URL slug for news posts on the backend
    let slug: string | undefined = undefined;
    if (data.postType === 'news') {
      const rawHeadline = data.headline || 'Untitled News';
      slug = rawHeadline.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (!slug) {
        slug = `news-${Date.now()}`;
      }

      // Ensure uniqueness
      const existingSlug = await prisma.newsPost.findFirst({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    let newsCategory = data.category || 'General News';
    let newsSummary = data.summary || '';
    let newsContent = data.content || '';
    let newsMetaDesc = data.metaDescription || '';
    let newsKeywords = data.keywords || '';
    let newsTags = data.tags || '';
    let newsReadingTime = 1;
    let newsScoreAnalysis = null;
    let postStatus = isDraft ? 'draft' : 'published';
    let aiReport = null;

    if (data.postType === 'news' && !isDraft) {
      try {
        const aiResult = await runNewsAIPipeline({
          headline: data.headline || 'Untitled News',
          content: data.content || '',
          mediaUrls: data.media ? data.media.url : null
        });

        newsCategory = aiResult.category;
        newsSummary = aiResult.summary;
        newsContent = aiResult.content;
        newsMetaDesc = aiResult.metaDescription;
        newsKeywords = aiResult.keywords;
        newsTags = aiResult.tags;
        newsReadingTime = aiResult.readingTime;
        newsScoreAnalysis = aiResult.scoreAnalysis;

        if (!aiResult.clean) {
          postStatus = 'flagged_ai';
          aiReport = aiResult.moderationReason;
        }
      } catch (aiErr) {
        console.error("AI news pipeline failed, falling back to manual inputs:", aiErr);
      }
    }

    const post = await prisma.post.create({
      data: {
        caption: data.postType === 'news' ? (safeHeadline || 'Untitled News') : (safeContent || ''),
        postType: data.postType,
        mediaUrls: data.media ? data.media.url : null,
        mediaTypes: data.media ? data.media.type : null,
        mediaPublicIds,
        mediaResourceTypes,
        location: data.location || null,
        subLocation: data.subLocation || null,
        status: postStatus,
        aiReport,
        authorId: userId,
        isAnonymous: !!data.isAnonymous,
        tolees: data.toleeIds && data.toleeIds.length > 0 ? {
          create: data.toleeIds.map(id => ({
            toleeId: id
          }))
        } : undefined,
        newsRelation: data.postType === 'news' ? {
          create: {
            headline: data.headline || 'Untitled News',
            slug: slug!,
            summary: newsSummary,
            category: newsCategory,
            content: newsContent || data.content || '',
            metaDescription: newsMetaDesc,
            keywords: newsKeywords,
            tags: newsTags,
            viewsCount: 0,
            seoScore: 80,
            aeoScore: 75,
            geoScore: 70,
            scoreAnalysis: newsScoreAnalysis,
            readingTime: newsReadingTime
          }
        } : undefined
      },
      include: {
        author: true,
        tolees: {
          include: {
            tolee: true
          }
        }
      }
    });

    // Handle advanced AI matchmaking for requirement posts
    if (data.postType === 'requirement') {
      try {
        const { matchRequirement } = require('@/lib/aiMatchmaker');
        await matchRequirement({
          id: post.id,
          caption: safeContent,
          location: data.location || null,
          authorId: userId,
          authorName: session?.user?.name || 'User'
        });
      } catch (matchErr) {
        console.error("Error running AI Matchmaker on new post:", matchErr);
      }
    }

    const tolees = data.toleeIds && data.toleeIds.length > 0
      ? await prisma.tolee.findMany({
          where: { id: { in: data.toleeIds } },
          select: { slug: true }
        })
      : [];

    revalidatePath('/feed');
    tolees.forEach(t => {
       revalidatePath(`/t/${t.slug}`);
    });
    
    return { success: true, post };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: 'Something went wrong while creating your post.' };
  }
}

export async function getPosts(options?: { mediaType?: string; limit?: number }) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    const limit = options?.limit || 30;
    const mediaType = options?.mediaType;

    // Trigger dynamic simulation activity in background if simulated latest post is too old
    if (isSimOn) {
      const checkAndTrigger = async () => {
        try {
          const latestSimPost = await prisma.post.findFirst({
            where: { isSimulation: true },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          });
          const timeSinceLast = latestSimPost 
            ? Date.now() - new Date(latestSimPost.createdAt).getTime()
            : Infinity;
          
          if (timeSinceLast > 15 * 60 * 1000) { // 15 minutes
            console.log('[Simulation Activity Trigger] Latest post is old. Triggering background simulation activity...');
            const { runBackgroundSimulationActivity } = require('@/lib/simulation');
            runBackgroundSimulationActivity();
          }
        } catch (e) {
          console.error('[Simulation Activity Trigger] Check failed:', e);
        }
      };
      checkAndTrigger();
    }

    // Determine viewed post history to support Anti-Repetition
    let viewedPostIds: string[] = [];
    if (currentUserId) {
      const recentViews = await prisma.view.findMany({
        where: {
          viewer_user_id: currentUserId,
          contentType: 'post',
          createdAt: {
            gte: new Date(Date.now() - 2 * 3600 * 1000) // last 2 hours
          }
        },
        select: {
          contentId: true
        }
      });
      viewedPostIds = recentViews.map(v => v.contentId);
    }

    // Fetch all published posts
    let posts = await prisma.post.findMany({
      where: {
        isArchived: false,
        status: 'published',
        ...(mediaType ? { mediaTypes: mediaType } : {}),
        AND: [
          ...(!isSimOn ? [{
            OR: [
              { isSimulation: false },
              ...(currentUserId ? [{ authorId: currentUserId }] : [])
            ]
          }] : []),
          currentUserId ? {
            OR: [
              {
                author: { isPrivate: false },
                visibility: 'public'
              },
              {
                authorId: currentUserId
              },
              {
                author: {
                  isPrivate: true,
                  followers: {
                    some: {
                      followerId: currentUserId,
                      status: 'approved'
                    }
                  }
                },
                visibility: 'public'
              }
            ]
          } : {
            visibility: 'public',
            author: {
              isPrivate: false
            }
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: isSimOn ? 250 : 50, // Grab a larger pool when simulation is active for proper mixing
      select: {
        id: true,
        caption: true,
        postType: true,
        mediaUrls: true,
        mediaTypes: true,
        visibility: true,
        shareCount: true,
        location: true,
        subLocation: true,
        createdAt: true,
        worldProjectId: true,
        isSimulation: true,
        isAnonymous: true,
        newsRelation: {
          select: {
            id: true,
            headline: true,
            slug: true,
            summary: true,
            category: true,
            readingTime: true,
            viewsCount: true,
          }
        },
        worldProject: {
          select: {
            id: true,
            type: true,
            name: true,
            slug: true,
            description: true,
            bannerImage: true,
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isPrivate: true
          }
        },
        tolees: {
          select: {
            tolee: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerId: true,
                category: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        savedBy: {
          select: {
            userId: true
          }
        },
        reposts: {
          orderBy: { createdAt: 'desc' },
          select: {
            userId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
            views: true
          }
        },
        comments: {
          where: !isSimOn ? { isSimulation: false } : {},
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            content: true,
            author: {
              select: {
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Dynamic Pexels Injection for simulated reels
    if (isSimOn && mediaType === 'video') {
      try {
        const aiCache = getAICacheSync('IN');
        const cachedVideos = aiCache.mediaAssets?.filter(m => m.type === 'video') || [];

        if (cachedVideos.length > 0) {
          const simUsers = await prisma.user.findMany({
            where: { isSimulation: true },
            take: 15
          });

          if (simUsers.length > 0) {
            // Shuffle and take up to 15
            const shuffledVideos = [...cachedVideos].sort(() => 0.5 - Math.random()).slice(0, 15);
            const dynamicReels = shuffledVideos.map((video, idx) => {
              const author = simUsers[idx % simUsers.length];
              return {
                id: `pexels_dyn_reel_${idx}_${Date.now()}`,
                caption: video.caption,
                postType: 'reel',
                mediaUrls: video.url,
                mediaTypes: 'video',
                visibility: 'public',
                shareCount: Math.floor(Math.random() * 100),
                location: author.location,
                subLocation: null,
                createdAt: new Date(Date.now() - idx * 10 * 60 * 1000),
                isSimulation: true,
                author: {
                  id: author.id,
                  name: author.name,
                  username: author.username,
                  avatar: author.avatar,
                  isPrivate: false
                },
                tolees: [],
                likes: [],
                savedBy: [],
                reposts: [],
                _count: {
                  likes: Math.floor(Math.random() * 200 + 10),
                  comments: Math.floor(Math.random() * 10 + 1),
                  reposts: Math.floor(Math.random() * 5),
                  views: Math.floor(Math.random() * 1000 + 100)
                },
                comments: []
              };
            });
            posts.push(...dynamicReels);
          }
        } else {
          // Fallback to fetch on-the-fly from Pexels API
          const apiKey = process.env.PEXELS_API_KEY;
          if (apiKey && apiKey.trim() !== '') {
            const categories = ['nature', 'fitness', 'cooking', 'travel', 'technology', 'dance', 'comedy', 'lifestyle'];
            const randomCat = categories[Math.floor(Math.random() * categories.length)];
            const randomPage = Math.floor(Math.random() * 5) + 1; // page 1-5
            
            const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(randomCat)}&per_page=15&page=${randomPage}`, {
              headers: { 'Authorization': apiKey }
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.videos)) {
                const simUsers = await prisma.user.findMany({
                  where: { isSimulation: true },
                  take: 15
                });
                
                if (simUsers.length > 0) {
                  const captionsList = aiCache.reelCaptions[randomCat] || aiCache.reelCaptions.general || ['Awesome video! #reels'];
                  
                  const dynamicReels = data.videos.map((video: any, idx: number) => {
                    const author = simUsers[idx % simUsers.length];
                    const file = video.video_files?.find((f: any) => f.width && f.height && f.height > f.width) || video.video_files?.[0];
                    
                    if (!file?.link) return null;
                    
                    const caption = captionsList[idx % captionsList.length] || 'Enjoying this! 🌟 #reels';
                    
                    return {
                      id: `pexels_dyn_${video.id}_${Date.now()}`,
                      caption,
                      postType: 'reel',
                      mediaUrls: file.link,
                      mediaTypes: 'video',
                      visibility: 'public',
                      shareCount: Math.floor(Math.random() * 100),
                      location: author.location,
                      subLocation: null,
                      createdAt: new Date(Date.now() - idx * 10 * 60 * 1000),
                      isSimulation: true,
                      author: {
                        id: author.id,
                        name: author.name,
                        username: author.username,
                        avatar: author.avatar,
                        isPrivate: false
                      },
                      tolees: [],
                      likes: [],
                      savedBy: [],
                      reposts: [],
                      _count: {
                        likes: Math.floor(Math.random() * 200 + 10),
                        comments: Math.floor(Math.random() * 10 + 1),
                        reposts: Math.floor(Math.random() * 5),
                        views: Math.floor(Math.random() * 1000 + 100)
                      },
                      comments: []
                    };
                  }).filter(Boolean);
                  
                  posts.push(...(dynamicReels as any[]));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[Dynamic Reels Pexels Fetch/Cache Failed]:', err);
      }
    }

    // Dynamic Pexels Injection for simulated media (feed: both images and videos)
    if (isSimOn && !mediaType) {
      try {
        const aiCache = getAICacheSync('IN');
        const cachedMedia = aiCache.mediaAssets || [];

        if (cachedMedia.length > 0) {
          const simUsers = await prisma.user.findMany({
            where: { isSimulation: true },
            take: 20
          });

          if (simUsers.length > 0) {
            // Shuffle and take up to 20 media items (mix of images and videos)
            const shuffledMedia = [...cachedMedia].sort(() => 0.5 - Math.random()).slice(0, 20);
            const dynamicPosts = shuffledMedia.map((media, idx) => {
              const author = simUsers[idx % simUsers.length];
              return {
                id: `pexels_dyn_feed_${idx}_${Date.now()}`,
                caption: media.caption,
                postType: 'regular',
                mediaUrls: media.url,
                mediaTypes: media.type,
                visibility: 'public',
                shareCount: Math.floor(Math.random() * 50),
                location: author.location,
                subLocation: null,
                createdAt: new Date(Date.now() - idx * 12 * 60 * 1000),
                isSimulation: true,
                author: {
                  id: author.id,
                  name: author.name,
                  username: author.username,
                  avatar: author.avatar,
                  isPrivate: false
                },
                tolees: [],
                likes: [],
                savedBy: [],
                reposts: [],
                _count: {
                  likes: Math.floor(Math.random() * 150 + 5),
                  comments: Math.floor(Math.random() * 8),
                  reposts: Math.floor(Math.random() * 3),
                  views: Math.floor(Math.random() * 500 + 50)
                },
                comments: []
              };
            });
            posts.push(...dynamicPosts);
          }
        } else {
          // Fallback to fetch on-the-fly from Pexels API
          const apiKey = process.env.PEXELS_API_KEY;
          if (apiKey && apiKey.trim() !== '') {
            const categories = ['nature', 'fitness', 'cooking', 'travel', 'technology', 'dance', 'comedy', 'lifestyle'];
            const randomCat = categories[Math.floor(Math.random() * categories.length)];
            const randomPage = Math.floor(Math.random() * 5) + 1; // page 1-5
            
            const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(randomCat)}&per_page=15&page=${randomPage}`, {
              headers: { 'Authorization': apiKey }
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.photos)) {
                const simUsers = await prisma.user.findMany({
                  where: { isSimulation: true },
                  take: 15
                });
                
                if (simUsers.length > 0) {
                  const captionsList = aiCache.captions[randomCat] || aiCache.captions.general || ['Love this vibe! 📸'];
                  
                  const dynamicImages = data.photos.map((photo: any, idx: number) => {
                    const author = simUsers[idx % simUsers.length];
                    const caption = captionsList[idx % captionsList.length] || 'Loving this moment! 🌟';
                    
                    return {
                      id: `pexels_dyn_img_${photo.id}_${Date.now()}`,
                      caption,
                      postType: 'regular',
                      mediaUrls: photo.src?.large || null,
                      mediaTypes: 'image',
                      visibility: 'public',
                      shareCount: Math.floor(Math.random() * 50),
                      location: author.location,
                      subLocation: null,
                      createdAt: new Date(Date.now() - idx * 12 * 60 * 1000),
                      isSimulation: true,
                      author: {
                        id: author.id,
                        name: author.name,
                        username: author.username,
                        avatar: author.avatar,
                        isPrivate: false
                      },
                      tolees: [],
                      likes: [],
                      savedBy: [],
                      reposts: [],
                      _count: {
                        likes: Math.floor(Math.random() * 150 + 5),
                        comments: Math.floor(Math.random() * 8),
                        reposts: Math.floor(Math.random() * 3),
                        views: Math.floor(Math.random() * 500 + 50)
                      },
                      comments: []
                    };
                  }).filter((p: any) => p.mediaUrls);
                  
                  posts.push(...(dynamicImages as any[]));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[Dynamic Images Pexels Fetch/Cache Failed]:', err);
      }
    }

    let listings: any[] = [];
    if (currentUserId && !mediaType) { // only fetch marketplace listings for general feed (not reels)
      const memberships = await prisma.toleeMember.findMany({
        where: {
          userId: currentUserId,
          status: 'approved'
        },
        select: {
          toleeId: true
        }
      });
      const joinedToleeIds = memberships.map(m => m.toleeId);

      listings = await prisma.listing.findMany({
        where: {
          status: 'active',
          OR: [
            { sellerId: currentUserId },
            joinedToleeIds.length > 0 ? {
              tolees: {
                some: {
                  toleeId: { in: joinedToleeIds }
                }
              }
            } : undefined
          ].filter(Boolean) as any[]
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          currency: true,
          images: true,
          category: true,
          condition: true,
          locationText: true,
          createdAt: true,
          viewCount: true,
          seller: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          tolees: {
            select: {
              tolee: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  ownerId: true
                }
              }
            }
          }
        }
      });
    }

    const mappedListings = listings.map(listing => ({
      id: listing.id,
      caption: listing.description,
      postType: 'listing',
      mediaUrls: listing.images?.split(/,(?=https?:\/\/)/)[0] || listing.images || null,
      mediaTypes: 'image',
      visibility: 'public',
      shareCount: 0,
      location: listing.locationText,
      subLocation: null,
      createdAt: listing.createdAt,
      author: listing.seller,
      tolees: listing.tolees,
      likes: [],
      savedBy: [],
      reposts: [],
      _count: {
        likes: 0,
        comments: 0,
        reposts: 0,
        views: listing.viewCount
      },
      comments: [],
      title: listing.title,
      price: listing.price,
      currency: listing.currency,
      category: listing.category,
      condition: listing.condition,
      locationText: listing.locationText,
      isSimulation: false
    }));

    const combinedPosts = [...posts, ...mappedListings];

    let finalPosts = combinedPosts;

    if (isSimOn) {
      // PERSONALIZATION DATA
      const likedPostIds = currentUserId ? (await prisma.like.findMany({
        where: { userId: currentUserId },
        select: { postId: true }
      })).map(l => l.postId) : [];

      const savedPostIds = currentUserId ? (await prisma.savedPost.findMany({
        where: { userId: currentUserId },
        select: { postId: true }
      })).map(s => s.postId) : [];

      const followedAuthorIds = currentUserId ? (await prisma.follow.findMany({
        where: { followerId: currentUserId, status: 'approved' },
        select: { followingId: true }
      })).map(f => f.followingId) : [];

      const joinedToleeCategories = currentUserId ? (await prisma.toleeMember.findMany({
        where: { userId: currentUserId, status: 'approved' },
        select: { tolee: { select: { category: true } } }
      })).map(m => m.tolee?.category).filter(Boolean) as string[] : [];

      // ANTI-REPETITION FILTER: Filter out recently viewed posts
      let candidates = combinedPosts.filter(p => !viewedPostIds.includes(p.id));
      if (candidates.length < 10) {
        // Fallback: If too few posts remain, ignore viewed filter to prevent empty feed
        candidates = combinedPosts;
      }

      // PERSONALIZATION SCORING
      const scoredCandidates = candidates.map(post => {
        let score = 1.0;
        
        // Freshness boost: newer posts get higher priority
        const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (3600 * 1000);
        score += Math.max(0, 5.0 - (ageInHours / 24)); // boost up to +5.0 for very fresh posts

        // Follow boost
        const authorId = post.author?.id || post.authorId;
        if (authorId && followedAuthorIds.includes(authorId)) {
          score += 3.0;
        }

        // Like/Save boosts
        if (likedPostIds.includes(post.id) || savedPostIds.includes(post.id)) {
          score += 1.0;
        }

        // Category matching boost based on user's interests (joined Tolees)
        const postCategory = post.category || (post.tolees?.[0]?.tolee?.category);
        if (postCategory && joinedToleeCategories.includes(postCategory)) {
          score += 2.0;
        }

        // Randomize slightly so they don't see the exact same order each refresh
        score *= (0.5 + Math.random() * 1.0);

        return { post, score };
      });

      // Split into Real and Simulation pools
      const realPool = scoredCandidates.filter(c => !c.post.isSimulation).sort((a, b) => b.score - a.score).map(c => c.post);
      const simPool = scoredCandidates.filter(c => c.post.isSimulation).sort((a, b) => b.score - a.score).map(c => c.post);

      // MIXING ALGORITHM: 40-60% real user content, backfilled by simulated content
      const mixed: any[] = [];
      const targetSize = Math.min(limit, candidates.length);
      
      // Calculate how many real posts to take. Aim for 50%
      const targetRealCount = Math.floor(targetSize * 0.5);
      const actualRealCount = Math.min(realPool.length, targetRealCount);
      const actualSimCount = targetSize - actualRealCount;

      const selectedReal = realPool.slice(0, actualRealCount);
      const selectedSim = simPool.slice(0, actualSimCount);

      // Interleave them to mix naturally
      let rIdx = 0;
      let sIdx = 0;
      while (mixed.length < targetSize) {
        if (sIdx < selectedSim.length && (mixed.length % 2 === 0 || rIdx >= selectedReal.length)) {
          mixed.push(selectedSim[sIdx++]);
        } else if (rIdx < selectedReal.length) {
          mixed.push(selectedReal[rIdx++]);
        } else if (sIdx < selectedSim.length) {
          mixed.push(selectedSim[sIdx++]);
        } else {
          break;
        }
      }

      // SPACING OUT posts by the same author to prevent consecutive identical posters
      for (let i = 1; i < mixed.length; i++) {
        const currentAuthor = mixed[i].author?.id || mixed[i].authorId;
        const prevAuthor = mixed[i - 1].author?.id || mixed[i - 1].authorId;
        if (currentAuthor && currentAuthor === prevAuthor) {
          for (let j = i + 1; j < mixed.length; j++) {
            const nextAuthor = mixed[j].author?.id || mixed[j].authorId;
            if (nextAuthor && nextAuthor !== currentAuthor) {
              const temp = mixed[i];
              mixed[i] = mixed[j];
              mixed[j] = temp;
              break;
            }
          }
        }
      }

      finalPosts = mixed;
    } else {
      // Simulation is OFF: sort by date descending
      finalPosts = combinedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const mappedPosts = finalPosts.map((post: any) => {
      if (isSimOn && post.isSimulation) {
        const eng = getSimulatedEngagement(post.id);
        return {
          ...post,
          savesCount: eng.saves,
          _count: {
            likes: eng.likes,
            comments: eng.comments,
            reposts: post._count?.reposts || eng.shares,
            views: eng.views,
            saves: eng.saves
          },
        };
      }
      return post;
    });

    return { success: true, posts: mappedPosts.slice(0, limit) };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { success: false, posts: [] };
  }
}


export async function toggleLike(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      return { success: true, liked: false };
    } else {
      await prisma.like.create({
        data: {
          userId,
          postId
        }
      });

      // Create notification for post author
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { author: true }
      });

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (post && user && post.authorId !== userId) {
        await createSystemNotification({
          userId: post.authorId,
          type: 'like',
          message: `${user.username || user.name} liked your post.`,
          link: `/post/${postId}`
        });
      }

      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return { success: false, error: 'Failed to toggle like' };
  }
}

export async function addComment(postId: string, content: string, parentId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { commentRestricted: true }
    });

    if (user?.commentRestricted) {
      return { success: false, error: 'You are restricted from sending comments.' };
    }

    const { writeLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many requests. Please cool down.' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const safeContent = sanitizeText(content || '', 2000);

    if (!safeContent) {
      return { success: false, error: 'Comment cannot be empty.' };
    }

    const comment = await prisma.comment.create({
      data: {
        content: safeContent,
        postId,
        authorId: userId,
        parentId: parentId || null
      },
      include: {
        author: true
      }
    });

    // Create notification for post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { newsRelation: true }
    });

    if (post) {
      const commentIdParam = parentId || comment.id;
      let linkUrl = '';
      if (post.postType === 'reel') {
        linkUrl = `/reels?videoId=${postId}&commentId=${commentIdParam}`;
      } else if (post.newsRelation) {
        linkUrl = `/news/${post.newsRelation.slug}?commentId=${commentIdParam}`;
      } else {
        linkUrl = `/post/${postId}?commentId=${commentIdParam}`;
      }
      if (parentId) {
        linkUrl += `&replyId=${comment.id}`;
      }

      // 1. Notify Post Author (only for top-level comments)
      if (post.authorId !== userId && !parentId) {
        const itemType = post.postType === 'reel' ? 'reel' : post.newsRelation ? 'news article' : 'post';
        await createSystemNotification({
          userId: post.authorId,
          type: 'comment',
          message: `${comment.author.username || comment.author.name} commented on your ${itemType}: "${safeContent.substring(0, 20)}${safeContent.length > 20 ? '...' : ''}"`,
          link: linkUrl
        });
      }

      // 2. Notify Parent Comment Author & Thread Participants (for replies)
      let parentCommentAuthorId: string | null = null;
      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
          include: { author: true }
        });
        if (parentComment) {
          parentCommentAuthorId = parentComment.authorId;
          if (parentComment.authorId !== userId) {
            await createSystemNotification({
              userId: parentComment.authorId,
              type: 'reply',
              message: `${comment.author.username || comment.author.name} replied to your comment: "${safeContent.substring(0, 20)}${safeContent.length > 20 ? '...' : ''}"`,
              link: linkUrl
            });
          }

          // Thread participation notification for others
          const otherReplies = await prisma.comment.findMany({
            where: {
              parentId,
              authorId: {
                notIn: [userId, post.authorId, parentComment.authorId].filter(Boolean) as string[]
              }
            },
            select: { authorId: true }
          });
          const uniqueOtherUserIds = Array.from(new Set(otherReplies.map(r => r.authorId)));
          for (const otherUserId of uniqueOtherUserIds) {
            await createSystemNotification({
              userId: otherUserId,
              type: 'reply',
              message: `${comment.author.username || comment.author.name} replied in a thread you participated in.`,
              link: linkUrl
            });
          }
        }
      }

      // 3. Notify Tagged Mentions (@username)
      const mentions = safeContent.match(/@(\w+)/g);
      if (mentions) {
        const mentionedUsernames = mentions.map(m => m.slice(1));
        const usersToNotify = await prisma.user.findMany({
          where: {
            username: { in: mentionedUsernames },
            id: { not: userId }
          },
          select: { id: true }
        });
        for (const u of usersToNotify) {
          const alreadyNotified = u.id === post.authorId || (parentCommentAuthorId && u.id === parentCommentAuthorId);
          if (!alreadyNotified) {
            await createSystemNotification({
              userId: u.id,
              type: 'mention',
              message: `${comment.author.username || comment.author.name} mentioned you in a comment.`,
              link: linkUrl
            });
          }
        }
      }
    }

    return { success: true, comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { success: false, error: 'Failed to add comment' };
  }
}

export async function getComments(postId: string) {
  try {
    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    let comments = await prisma.comment.findMany({
      where: {
        postId,
        ...(!isSimOn ? { isSimulation: false } : {})
      },
      include: { 
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (isSimOn) {
      const session = await getServerSession(authOptions);
      const currentUserId = session?.user ? (session.user as any).id : null;
      const countryCode = await detectCountryCode(currentUserId);
      const eng = getSimulatedEngagement(postId);
      // Generate comments corresponding to the engagement distribution
      const simComments = generateDynamicComments(postId, Math.min(eng.comments, 15), countryCode);
      comments = [...comments, ...simComments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return { success: true, comments };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return { success: false, error: 'Failed to fetch comments' };
  }
}

export async function getLikes(postId: string) {
  try {
    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    return { success: true, likes: likes.map(l => l.user) };
  } catch (error) {
    console.error("Error fetching likes:", error);
    return { success: false, error: 'Failed to fetch likes' };
  }
}

export async function toggleSavePost(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingSave) {
      await prisma.savedPost.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      return { success: true, saved: false };
    } else {
      await prisma.savedPost.create({
        data: {
          userId,
          postId
        }
      });
      return { success: true, saved: true };
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    return { success: false, error: 'Failed to toggle save post' };
  }
}

export async function toggleRepost(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingRepost) {
      await prisma.repost.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      return { success: true, reposted: false };
    } else {
      await prisma.repost.create({
        data: {
          userId,
          postId
        }
      });

      // Create notification for post author if reposting others' post
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (post && user && post.authorId !== userId) {
        await createSystemNotification({
          userId: post.authorId,
          type: 'repost',
          message: `${user.username || user.name} reposted your post.`,
          link: `/post/${postId}`
        });
      }

      return { success: true, reposted: true };
    }
  } catch (error) {
    console.error("Error toggling repost:", error);
    return { success: false, error: 'Failed to toggle repost' };
  }
}

export async function getJoinedTolees() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, tolees: [] };
    }
    const userId = (session.user as any).id;

    const memberships = await prisma.toleeMember.findMany({
      where: {
        userId,
        status: 'approved'
      },
      include: {
        tolee: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true
          }
        }
      }
    });

    const tolees = memberships.map(m => m.tolee).filter(Boolean);
    return { success: true, tolees };
  } catch (error) {
    console.error("Error fetching joined tolees:", error);
    return { success: false, tolees: [] };
  }
}

export async function resharePostToTolees(postId: string, toleeIds: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    if (!toleeIds || toleeIds.length === 0) {
      return { success: false, error: 'No Tolee groups selected' };
    }

    // 1. Create or ensure Repost record exists for this user-post pair
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (!existingRepost) {
      await prisma.repost.create({
        data: {
          userId,
          postId
        }
      });

      // Notify original author
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (post && user && post.authorId !== userId) {
        await createSystemNotification({
          userId: post.authorId,
          type: 'repost',
          message: `${user.username || user.name} reposted your post.`,
          link: `/post/${postId}`
        });
      }
    }

    // 2. Link post to the selected Tolees via PostTolee
    for (const toleeId of toleeIds) {
      const existingLink = await prisma.postTolee.findUnique({
        where: {
          postId_toleeId: {
            postId,
            toleeId
          }
        }
      });

      if (!existingLink) {
        await prisma.postTolee.create({
          data: {
            postId,
            toleeId
          }
        });
      }
    }

    // Revalidate paths
    const tolees = await prisma.tolee.findMany({
      where: { id: { in: toleeIds } },
      select: { slug: true }
    });

    revalidatePath('/feed');
    tolees.forEach(t => {
      revalidatePath(`/t/${t.slug}`);
    });

    return { success: true };
  } catch (error) {
    console.error("Error resharing post:", error);
    return { success: false, error: 'Failed to reshare post' };
  }
}

export async function getReposts(postId: string) {
  try {
    const reposts = await prisma.repost.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    return { success: true, reposts: reposts.map(r => ({ ...r.user, repostedAt: r.createdAt })) };
  } catch (error) {
    console.error("Error fetching reposts:", error);
    return { success: false, error: 'Failed to fetch reposts' };
  }
}

export async function recordView(contentId: string, contentType: 'post' | 'reel' | 'screen', deviceFingerprint?: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    
    if (!userId && !deviceFingerprint) {
      return { success: false, error: 'Cannot track view without identification' };
    }

    const reqHeaders = headers();
    const ip_address = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '';
    const user_agent = reqHeaders.get('user-agent') || '';

    // Create a robust unique hash for DB uniqueness check with rolling 24-hour date suffix
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const viewer_hash = userId 
      ? `user_${userId}_${todayStr}` 
      : `anon_${deviceFingerprint}_${ip_address.split(',')[0]}_${todayStr}`;

    const isScreen = contentType === 'screen';

    await prisma.view.create({
      data: {
        contentId,
        contentType,
        viewer_user_id: userId,
        device_fingerprint: deviceFingerprint,
        ip_address,
        user_agent,
        viewer_hash,
        postId: isScreen ? null : contentId,
        screenVideoId: isScreen ? contentId : null
      }
    });

    // If it is a screen video, we also increment the viewsCount field in the ScreenVideo table
    if (isScreen) {
      await prisma.screenVideo.update({
        where: { id: contentId },
        data: { viewsCount: { increment: 1 } }
      }).catch(err => console.error("Error incrementing ScreenVideo viewsCount:", err));
    }

    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      // Unique constraint failed = User/Device has already viewed this within 24 hours! 
      // This is expected and ensures accurate counts, so we silently succeed.
      return { success: true, duplicate: true };
    }
    console.error("Error recording view:", error);
    return { success: false, error: 'Failed to record view' };
  }
}

export async function submitPlaybackSession(data: {
  contentId: string;
  contentType: 'post' | 'reel' | 'screen';
  watchTime: number;
  videoDuration: number;
  playbackStart: string; // ISO string
  playbackEnd: string;   // ISO string
  deviceFingerprint?: string;
  trafficSource?: string;
  referrer?: string;
  language?: string;
  isAutomation?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    
    const reqHeaders = headers();
    const ip_address = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '';
    const user_agent = reqHeaders.get('user-agent') || '';

    // Approximate geolocation from headers
    const country = reqHeaders.get('x-vercel-ip-country') || 'India';
    const city = reqHeaders.get('x-vercel-ip-city') || 'Mumbai';

    // Parse User Agent to identify OS, Browser, Device Type
    let deviceType = 'desktop';
    let os = 'Unknown';
    let browser = 'Other';

    const ua = user_agent.toLowerCase();
    
    // Simple device detection
    if (ua.includes('ipad') || ua.includes('tablet')) {
      deviceType = 'tablet';
    } else if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
      deviceType = 'mobile';
    }

    // OS detection
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('linux')) os = 'Linux';

    // Browser detection
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('chrome') || ua.includes('crios')) browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';

    // Spam Detection Pipeline
    let isSpam = false;
    let spamReason: string | null = null;

    // Rule 1: Headless / Automation tools
    if (
      data.isAutomation ||
      ua.includes('headlesschrome') ||
      ua.includes('puppeteer') ||
      ua.includes('selenium') ||
      ua.includes('playwright') ||
      ua.includes('phantomjs') ||
      ua.includes('bot') ||
      ua.includes('crawl') ||
      ua.includes('spider') ||
      ua.includes('wget') ||
      ua.includes('curl')
    ) {
      isSpam = true;
      spamReason = 'AUTOMATED_AGENT';
    }

    // Rule 2: Impossible Playback / Tampering (Elapsed duration vs watchTime)
    const startMs = new Date(data.playbackStart).getTime();
    const endMs = new Date(data.playbackEnd).getTime();
    const elapsedSeconds = (endMs - startMs) / 1000;

    if (!isSpam && data.watchTime > elapsedSeconds * 1.5 + 2) {
      isSpam = true;
      spamReason = 'SPEED_TAMPERING';
    }

    // Rule 3: Extreme Spikes Rate Limiting (recent sessions per video/device/IP)
    if (!isSpam) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentSessionsCount = await prisma.videoPlaybackSession.count({
        where: {
          contentId: data.contentId,
          createdAt: { gte: tenMinutesAgo },
          OR: [
            data.deviceFingerprint ? { device_fingerprint: data.deviceFingerprint } : undefined,
            ip_address ? { ip_address: ip_address.split(',')[0] } : undefined,
          ].filter(Boolean) as any[]
        }
      });

      if (recentSessionsCount >= 10) {
        isSpam = true;
        spamReason = 'RATE_LIMIT_EXCEEDED';
      }
    }

    // Checkpoints reached
    const ratio = data.videoDuration > 0 ? (data.watchTime / data.videoDuration) : 0;
    const reached10s = data.watchTime >= 10;
    const reached25 = ratio >= 0.25;
    const reached50 = ratio >= 0.50;
    const reached75 = ratio >= 0.75;
    const reached100 = ratio >= 0.98; // Allow slight buffer for completion

    // Determine view threshold eligibility
    // Videos < 30s: 5s continuous watch. Videos >= 30s: 10s continuous watch.
    const viewThreshold = data.videoDuration < 30 ? 5 : 10;
    const meetsThreshold = data.watchTime >= viewThreshold;
    const isVerified = !isSpam && meetsThreshold;

    const isScreen = data.contentType === 'screen';

    // Create session record
    const playbackSession = await prisma.videoPlaybackSession.create({
      data: {
        contentId: data.contentId,
        contentType: data.contentType,
        viewer_user_id: userId,
        device_fingerprint: data.deviceFingerprint,
        ip_address: ip_address.split(',')[0],
        user_agent,
        watchTime: data.watchTime,
        videoDuration: data.videoDuration,
        completionRate: ratio * 100,
        playbackStart: new Date(data.playbackStart),
        playbackEnd: new Date(data.playbackEnd),
        deviceType,
        browser,
        os,
        country,
        city,
        language: data.language || 'en',
        referrer: data.referrer || 'direct',
        trafficSource: data.trafficSource || 'feed',
        isVerified,
        isSpam,
        spamReason,
        reached10s,
        reached25,
        reached50,
        reached75,
        reached100,
        postId: isScreen ? null : data.contentId,
        screenVideoId: isScreen ? data.contentId : null
      }
    });

    // If verified, record verified public view
    if (isVerified) {
      await recordView(data.contentId, data.contentType, data.deviceFingerprint);
    }

    return { 
      success: true, 
      verified: isVerified, 
      spam: isSpam, 
      playbackSessionId: playbackSession.id 
    };

  } catch (error) {
    console.error("Error submitting playback session:", error);
    return { success: false, error: 'Failed to record playback session' };
  }
}

export async function updatePostVisibility(postId: string, visibility: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if user is author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'You are not authorized to edit this post.' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { visibility },
      select: {
        id: true,
        visibility: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error updating post visibility:", error);
    return { success: false, error: 'Failed to update visibility.' };
  }
}

export async function editPostCaption(postId: string, caption: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'You are not authorized to edit this post.' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { caption },
      select: {
        id: true,
        caption: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error editing post:", error);
    return { success: false, error: 'Failed to edit post.' };
  }
}


export async function deletePostPermanently(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if user is author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        authorId: true,
        mediaUrls: true,
        mediaPublicIds: true,
        mediaResourceTypes: true
      }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'You are not authorized to delete this post.' };
    }

    // Clean up post media from Cloudinary!
    if (post.mediaUrls || post.mediaPublicIds) {
      let idsToDestroy: string[] = [];
      let typesToDestroy: string[] = [];
      
      if (post.mediaPublicIds) {
        idsToDestroy = post.mediaPublicIds.split(',').map(s => s.trim()).filter(Boolean);
        if (post.mediaResourceTypes) {
          typesToDestroy = post.mediaResourceTypes.split(',').map(s => s.trim());
        }
      } else if (post.mediaUrls) {
        // Fallback for legacy posts: extract from URLs
        const urls = post.mediaUrls.split(/,(?=https?:\/\/)/).map(s => s.trim()).filter(Boolean);
        idsToDestroy = urls.map(url => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
        typesToDestroy = urls.map(url => extractResourceTypeFromUrl(url));
      }
      
      if (idsToDestroy.length > 0) {
        // Synchronous cleanup to prevent server environment from terminating unfinished requests
        await destroyMultipleAssets(idsToDestroy, typesToDestroy);
      }
    }

    // Get the tolee slugs before deleting so we can revalidate their pages
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });

    // Execute deletion inside transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete comments child replies first to avoid recursive key violation
      await tx.comment.deleteMany({
        where: {
          postId,
          parentId: { not: null }
        }
      });

      // 2. Delete parent comments
      await tx.comment.deleteMany({
        where: {
          postId,
          parentId: null
        }
      });

      // 3. Delete likes
      await tx.like.deleteMany({
        where: { postId }
      });

      // 4. Delete saved posts
      await tx.savedPost.deleteMany({
        where: { postId }
      });

      // 5. Delete reposts
      await tx.repost.deleteMany({
        where: { postId }
      });

      // 6. Delete post-tolee associations
      await tx.postTolee.deleteMany({
        where: { postId }
      });

      // 7. Delete views
      await tx.view.deleteMany({
        where: { contentId: postId, contentType: 'post' }
      });

      // 8. Delete the post itself
      await tx.post.delete({
        where: { id: postId }
      });
    });

    revalidatePath('/feed');
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: 'Failed to delete post.' };
  }
}

export async function incrementShareCount(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        shareCount: {
          increment: 1
        }
      },
      select: {
        id: true,
        shareCount: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, shareCount: updatedPost.shareCount };
  } catch (error) {
    console.error("Error incrementing share count:", error);
    return { success: false, error: 'Failed to increment share count.' };
  }
}

export async function sharePostToFriends(
  postId: string, 
  friendIds: string[], 
  shareUrl: string, 
  previewText: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;
    const userId = currentUserId;
    const senderName = session.user.name || 'A friend';

    if (friendIds.length === 0) {
      return { success: false, error: 'No friends selected.' };
    }

    // 1. Try finding in Post
    let postDetails = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      }
    });

    // 2. Try finding in ScreenVideo
    let screenDetails = null;
    if (!postDetails) {
      screenDetails = await prisma.screenVideo.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              image: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              views: true
            }
          }
        }
      });
    }

    // 3. Try finding in NewsPost
    let newsDetails = null;
    if (!postDetails && !screenDetails) {
      newsDetails = await prisma.newsPost.findFirst({
        where: { OR: [{ id: postId }, { slug: postId }, { postId: postId }] },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  image: true
                }
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                  views: true
                }
              }
            }
          }
        }
      });
    }

    // 4. Try finding in Listing
    let listingDetails = null;
    if (!postDetails && !screenDetails && !newsDetails) {
      listingDetails = await prisma.listing.findUnique({
        where: { id: postId },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              image: true
            }
          }
        }
      });
    }

    const isVideo = postDetails
      ? (postDetails.postType === 'reel' || postDetails.postType === 'win' || postDetails.postType === 'news' || postDetails.mediaTypes?.split(',')[0] === 'video' || postDetails.mediaTypes === 'video')
      : (screenDetails ? true : false);

    let contentType = 'feed';
    let creatorId = '';
    let creatorName = 'Creator';
    let creatorUsername = 'creator';
    let creatorAvatar = '/default-user-avatar.svg';
    let thumbnailUrl = '';
    let title = 'Shared Content';
    let caption = previewText || '';
    let likesCount = 0;
    let viewsCount = 0;

    let newsCategory = '';
    let newsReadingTime = 1;
    let newsPublisher = 'Tolee News';
    let listingPrice = 0;
    let listingLocation = '';

    if (postDetails) {
      creatorId = postDetails.author.id;
      creatorName = postDetails.author.name || 'Creator';
      creatorUsername = postDetails.author.username || 'creator';
      creatorAvatar = postDetails.author.avatar || postDetails.author.image || '/default-user-avatar.svg';
      
      if (postDetails.postType === 'reel') {
        contentType = 'reel';
      } else if (postDetails.postType === 'news') {
        contentType = 'news';
        const associatedNews = await prisma.newsPost.findUnique({ where: { postId: postDetails.id } });
        if (associatedNews) {
          newsCategory = associatedNews.category || '';
          newsReadingTime = associatedNews.readingTime || 1;
          newsPublisher = creatorName;
        }
      } else if (postDetails.postType === 'requirement') {
        contentType = 'requirement';
      } else {
        contentType = 'feed';
      }

      thumbnailUrl = postDetails.mediaUrls ? postDetails.mediaUrls.split(/,(?=https?:\/\/)/)[0] : '';
      title = postDetails.caption || (contentType === 'requirement' ? 'Requirement' : 'Shared Post');
      caption = previewText || postDetails.caption || '';
      likesCount = postDetails._count?.likes || 0;
      viewsCount = postDetails._count?.views || 0;

    } else if (screenDetails) {
      contentType = 'screen';
      creatorId = screenDetails.userId;
      creatorName = screenDetails.user.name || 'Creator';
      creatorUsername = screenDetails.user.username || 'creator';
      creatorAvatar = screenDetails.user.avatar || screenDetails.user.image || '/default-user-avatar.svg';
      thumbnailUrl = screenDetails.thumbnailUrl || (screenDetails.muxPlaybackId ? `https://image.mux.com/${screenDetails.muxPlaybackId}/thumbnail.png?width=640&height=360&fit_mode=smartcrop` : '') || screenDetails.mediaUrl || '';
      title = screenDetails.title || 'Shared Screen Video';
      caption = previewText || screenDetails.description || '';
      likesCount = screenDetails.likesCount || screenDetails._count?.likes || 0;
      viewsCount = screenDetails.viewsCount || screenDetails._count?.views || 0;

    } else if (newsDetails) {
      contentType = 'news';
      const author = newsDetails.post?.author;
      creatorId = author?.id || '';
      creatorName = author?.name || 'Creator';
      creatorUsername = author?.username || 'creator';
      creatorAvatar = author?.avatar || author?.image || '/default-user-avatar.svg';
      
      thumbnailUrl = newsDetails.post?.mediaUrls?.split(/,(?=https?:\/\/)/)[0] || '';
      title = newsDetails.headline || 'Shared News Article';
      caption = previewText || newsDetails.summary || '';
      likesCount = newsDetails.post?._count?.likes || 0;
      viewsCount = newsDetails.viewsCount || 0;
      newsCategory = newsDetails.category || '';
      newsReadingTime = newsDetails.readingTime || 1;
      newsPublisher = creatorName;

    } else if (listingDetails) {
      contentType = 'marketplace';
      creatorId = listingDetails.seller.id;
      creatorName = listingDetails.seller.name || 'Seller';
      creatorUsername = listingDetails.seller.username || 'seller';
      creatorAvatar = listingDetails.seller.avatar || listingDetails.seller.image || '/default-user-avatar.svg';
      
      thumbnailUrl = listingDetails.images?.split(',')[0] || '';
      title = listingDetails.title || 'Marketplace Item';
      caption = previewText || listingDetails.description || '';
      likesCount = 0;
      viewsCount = listingDetails.viewCount || 0;
      listingPrice = listingDetails.price || 0;
      listingLocation = listingDetails.locationText || '';
    }

    if (!thumbnailUrl) {
      if (contentType === 'news') {
        thumbnailUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop';
      } else if (contentType === 'reel') {
        thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop';
      } else if (contentType === 'marketplace') {
        thumbnailUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop';
      } else {
        thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop';
      }
    }

    // Deliver content to each selected friend
    for (const friendId of friendIds) {
      // 1. Get or create DM (inlined to avoid circular dependency)
      let chatId = null;
      try {
        const existingDms = await prisma.chat.findMany({
          where: {
            isGroupChat: false,
            participants: {
              some: { userId }
            }
          },
          include: {
            participants: true
          }
        });

        const targetChat = existingDms.find(chat => 
          chat.participants.some(p => p.userId === friendId)
        );

        if (targetChat) {
          if (targetChat.status === 'declined') {
            await prisma.chat.update({
              where: { id: targetChat.id },
              data: { status: 'pending', requestSenderId: null }
            });
          }
          chatId = targetChat.id;
        } else {
          const newChat = await prisma.chat.create({
            data: {
              isGroupChat: false,
              status: 'pending',
              requestSenderId: null,
              participants: {
                create: [
                  { userId },
                  { userId: friendId }
                ]
              }
            }
          });
          chatId = newChat.id;
        }
      } catch (err) {
        console.error("Error inline creating personal chat in sharePostToFriends:", err);
        continue;
      }

      // 2. Format a message that recipient will receive
      let msgContent;
      if (postDetails || screenDetails || newsDetails || listingDetails) {
        const origin = shareUrl ? new URL(shareUrl).origin : 'https://tolee.com';
        const finalShareUrl = contentType === 'reel' 
          ? `${origin}/reel/${postId}` 
          : contentType === 'screen' 
          ? `${origin}/screen/watch/${postId}` 
          : contentType === 'news' 
          ? `${origin}/news/${postId}` 
          : contentType === 'marketplace' 
          ? `${origin}/marketplace/listing/${postId}` 
          : `${origin}/post/${postId}`;

        const mediaCount = postDetails?.mediaUrls 
          ? postDetails.mediaUrls.split(/,(?=https?:\/\/)/).length 
          : 1;

        const payload = {
          type: isVideo ? 'shared_video' : 'shared_post',
          contentType,
          videoId: postId,
          creatorId,
          creatorName,
          creatorUsername,
          creatorAvatar,
          thumbnailUrl,
          title,
          caption,
          likesCount,
          viewsCount,
          shareUrl: finalShareUrl,
          deepLink: contentType === 'reel' ? `/reel/${postId}` : `/post/${postId}`,
          mediaCount,
          newsCategory,
          newsReadingTime,
          newsPublisher,
          listingPrice,
          listingLocation
        };
        msgContent = `__SHARED_CONTENT__:${JSON.stringify(payload)}`;
      } else {
        msgContent = `📢 Shared a Post/Reel from Tolee:\n"${previewText}"\n\n🔗 ${shareUrl}`;
      }

      // 3. Create the message
      await prisma.message.create({
        data: {
          content: msgContent,
          senderId: currentUserId,
          chatId
        }
      });

      // 4. Send a notification to the friend
      await createSystemNotification({
        userId: friendId,
        type: 'chat',
        message: `${senderName} shared a post with you: "${previewText.substring(0, 30)}${previewText.length > 30 ? '...' : ''}"`,
        link: `/chat?id=${chatId}`
      });
    }

    // 5. Increment Post share count by friendIds.length
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        shareCount: {
          increment: friendIds.length
        }
      },
      select: {
        id: true,
        shareCount: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, shareCount: updatedPost.shareCount };
  } catch (error) {
    console.error("Error sharing post to friends:", error);
    return { success: false, error: 'Failed to share post with friends.' };
  }
}

export async function archivePost(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if user is author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'You are not authorized to archive this post.' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isArchived: true },
      select: {
        id: true,
        isArchived: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error archiving post:", error);
    return { success: false, error: 'Failed to archive post.' };
  }
}

export async function restorePost(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if user is author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'You are not authorized to restore this post.' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isArchived: false },
      select: {
        id: true,
        isArchived: true
      }
    });

    revalidatePath('/feed');
    const postTolees = await prisma.postTolee.findMany({
      where: { postId },
      include: { tolee: { select: { slug: true } } }
    });
    postTolees.forEach(pt => {
      revalidatePath(`/t/${pt.tolee.slug}`);
    });

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error restoring post:", error);
    return { success: false, error: 'Failed to restore post.' };
  }
}

export async function getArchivedPosts() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', posts: [] };
    }
    const userId = (session.user as any).id;

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        isArchived: true
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        caption: true,
        postType: true,
        mediaUrls: true,
        mediaTypes: true,
        visibility: true,
        shareCount: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      }
    });

    return { success: true, posts };
  } catch (error) {
    console.error("Error fetching archived posts:", error);
    return { success: false, error: 'Failed to fetch archived posts.', posts: [] };
  }
}

export async function getDraftPosts() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized', posts: [] };
    }

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'DRAFT',
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            isVerified: true
          }
        },
        tolees: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    return { success: true, posts };
  } catch (error) {
    console.error("Error fetching draft posts:", error);
    return { success: false, error: 'Failed to fetch draft posts.', posts: [] };
  }
}

export async function publishDraftPost(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify ownership
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        authorId: userId
      },
      select: {
        id: true,
        tolees: {
          select: {
             slug: true
          }
        }
      }
    });

    if (!existingPost) {
      return { success: false, error: 'Post not found or unauthorized' };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'published',
        createdAt: new Date() // reset published date to now
      }
    });

    revalidatePath('/feed');
    existingPost.tolees.forEach(t => {
      revalidatePath(`/t/${t.slug}`);
    });

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error publishing draft post:", error);
    return { success: false, error: 'Failed to publish draft.' };
  }
}

export async function getReels(skip = 0, take = 20) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    const posts = await prisma.post.findMany({
      where: {
        ...(!isSimOn ? { isSimulation: false } : {}),
        isArchived: false,
        status: 'published',
        mediaTypes: 'video',
        mediaUrls: { not: null },
        ...(currentUserId ? {
          OR: [
            // Public author
            {
              author: { isPrivate: false },
              visibility: 'public'
            },
            // My own posts
            {
              authorId: currentUserId
            },
            // Posts from private users I follow (approved)
            {
              author: {
                isPrivate: true,
                followers: {
                  some: {
                    followerId: currentUserId,
                    status: 'approved'
                  }
                }
              },
              visibility: 'public'
            }
          ]
        } : {
          visibility: 'public',
          author: {
            isPrivate: false
          }
        })
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        caption: true,
        postType: true,
        mediaUrls: true,
        mediaTypes: true,
        visibility: true,
        shareCount: true,
        location: true,
        subLocation: true,
        createdAt: true,
        worldProjectId: true,
        worldProject: {
          select: {
            id: true,
            type: true,
            name: true,
            slug: true,
            description: true,
            bannerImage: true,
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isPrivate: true
          }
        },
        tolees: {
          select: {
            tolee: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerId: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        savedBy: {
          select: {
            userId: true
          }
        },
        reposts: {
          orderBy: { createdAt: 'desc' },
          select: {
            userId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
            views: true
          }
        }
      }
    });

    const authorIds = posts.map(p => p.author.id);

    // Query follow statuses of these authors for the current user
    let followedAuthorIds: string[] = [];
    let pendingFollowAuthorIds: string[] = [];
    if (currentUserId && authorIds.length > 0) {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: authorIds }
        },
        select: { followingId: true, status: true }
      });
      followedAuthorIds = follows.filter(f => f.status === 'approved').map(f => f.followingId);
      pendingFollowAuthorIds = follows.filter(f => f.status === 'pending').map(f => f.followingId);
    }

    // Query active stories for these authors
    let authorsWithActiveStories: string[] = [];
    if (authorIds.length > 0) {
      const activeStories = await prisma.story.findMany({
        where: {
          authorId: { in: authorIds },
          expiresAt: { gte: new Date() }
        },
        select: { authorId: true }
      });
      authorsWithActiveStories = activeStories.map(s => s.authorId);
    }

    const reels = posts.map(post => {
      const firstTolee = post.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? post.likes.some((like: any) => like.userId === currentUserId) : false;
      const savedByMe = currentUserId ? post.savedBy.some((save: any) => save.userId === currentUserId) : false;
      const repostedByMe = currentUserId ? post.reposts.some((rep: any) => rep.userId === currentUserId) : false;
      const repostsCount = post._count?.reposts || 0;

      const mostRecentRepost = post.reposts?.[0];
      const resharedByUser = mostRecentRepost ? {
        username: mostRecentRepost.user.username,
        name: mostRecentRepost.user.name,
        avatar: mostRecentRepost.user.avatar || '/default-user-avatar.svg'
      } : null;

      const isFollowing = followedAuthorIds.includes(post.author.id);
      const followStatus = pendingFollowAuthorIds.includes(post.author.id) 
        ? 'pending' 
        : (isFollowing ? 'approved' : null);

      const hasActiveStory = authorsWithActiveStories.includes(post.author.id);
      
      const eng = isSimOn ? getSimulatedEngagement(post.id) : null;

      return {
        id: post.id,
        authorId: post.author.id,
        authorIsPrivate: post.author.isPrivate || false,
        visibility: post.visibility,
        video: post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : '',
        author: post.author.username || 'user',
        authorAvatar: post.author.avatar || '/default-user-avatar.svg',
        toleeName: firstTolee?.name || null,
        toleeSlug: firstTolee?.slug || null,
        toleeId: firstTolee?.id || null,
        role: firstTolee?.ownerId === post.author.id ? 'Admin' : 'Member',
        caption: post.caption || '',
        likes: eng ? eng.likes : (post.likes?.length || 0),
        comments: eng ? eng.comments : (post.comments?.length || 0),
        views: eng ? eng.views : (post._count?.views || 0),
        shares: eng ? String(eng.shares) : '0',
        reposts: eng ? eng.shares : repostsCount,
        audio: 'Original Audio',
        isVerified: false,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser,
        isFollowing,
        followStatus,
        hasActiveStory,
        location: post.location || null,
        subLocation: post.subLocation || null,
        createdAt: post.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: 'hls',
        audioInfo: 'Original Audio',
      };
    });

    return { success: true, reels };
  } catch (error) {
    console.error("Error fetching reels:", error);
    return { success: false, error: 'Failed to fetch reels.', reels: [] };
  }
}

export async function checkPostStatus(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        visibility: true,
        authorId: true,
        author: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!post) {
      return { success: true, status: 'deleted' };
    }

    if (post.visibility === 'only_me') {
      const userId = session?.user ? (session.user as any).id : null;
      if (post.authorId !== userId) {
        return { success: true, status: 'private' };
      }
    }

    return { success: true, status: 'active', post };
  } catch (error) {
    console.error("Error checking post status:", error);
    return { success: false, error: 'Failed to verify post status' };
  }
}

export async function incrementStoryShare(postId: string) {
  try {
    const analytics = await prisma.postStoryAnalytics.upsert({
      where: { postId },
      create: { postId, storyShares: 1 },
      update: { storyShares: { increment: 1 } }
    });
    return { success: true, analytics };
  } catch (error) {
    console.error("Error incrementing story share:", error);
    return { success: false, error: 'Failed to update story share count' };
  }
}

export async function incrementViewOriginalPostClick(postId: string) {
  try {
    const analytics = await prisma.postStoryAnalytics.upsert({
      where: { postId },
      create: { postId, viewPostClicks: 1 },
      update: { viewPostClicks: { increment: 1 } }
    });
    return { success: true, analytics };
  } catch (error) {
    console.error("Error incrementing view post clicks:", error);
    return { success: false, error: 'Failed to update view post clicks count' };
  }
}

export async function incrementStoryEngagement(postId: string) {
  try {
    const analytics = await prisma.postStoryAnalytics.upsert({
      where: { postId },
      create: { postId, engagementCount: 1 },
      update: { engagementCount: { increment: 1 } }
    });
    return { success: true, analytics };
  } catch (error) {
    console.error("Error incrementing story engagement count:", error);
    return { success: false, error: 'Failed to update engagement count' };
  }
}

export async function getPostStoryAnalytics(postId: string) {
  try {
    const analytics = await prisma.postStoryAnalytics.findUnique({
      where: { postId }
    });
    return {
      success: true,
      analytics: analytics || {
        storyShares: 0,
        storyViews: 0,
        viewPostClicks: 0,
        engagementCount: 0
      }
    };
  } catch (error) {
    console.error("Error fetching story analytics:", error);
    return { success: false, error: 'Failed to fetch story analytics' };
  }
}

let pexelsCache: string[] = [];

export async function getFreshPexelsVideoUrl(category = 'nature'): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  if (pexelsCache.length > 0) {
    return pexelsCache.pop() || null;
  }

  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(category)}&per_page=10&page=${randomPage}`, {
      headers: { 'Authorization': apiKey }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.videos) && data.videos.length > 0) {
        // Pick a random video that is vertical
        const shuffled = [...data.videos].sort(() => 0.5 - Math.random());
        const links: string[] = [];
        for (const video of shuffled) {
          const file = video.video_files?.find((f: any) => f.width && f.height && f.height > f.width) || video.video_files?.[0];
          if (file?.link) {
            links.push(file.link);
          }
        }
        if (links.length > 0) {
          const result = links.pop() || null;
          pexelsCache = [...pexelsCache, ...links];
          return result;
        }
      }
    }
  } catch (err) {
    console.error('[getFreshPexelsVideoUrl error]:', err);
  }
  return null;
}

export async function checkPostAvailability(postId: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { status: true, visibility: true }
    });
    if (post) {
      if (post.status !== 'published' || post.visibility === 'private') {
        return { success: true, available: false };
      }
      return { success: true, available: true };
    }

    const screenVid = await prisma.screenVideo.findUnique({
      where: { id: postId },
      select: { status: true, visibility: true }
    });
    if (screenVid) {
      if (screenVid.status !== 'published' || screenVid.visibility === 'private') {
        return { success: true, available: false };
      }
      return { success: true, available: true };
    }

    const news = await prisma.newsPost.findFirst({
      where: { OR: [{ id: postId }, { slug: postId }, { postId: postId }] }
    });
    if (news) {
      return { success: true, available: true };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: postId },
      select: { status: true }
    });
    if (listing) {
      if (listing.status !== 'active') {
        return { success: true, available: false };
      }
      return { success: true, available: true };
    }

    return { success: true, available: false };
  } catch (err) {
    return { success: false, available: false };
  }
}

// ─── Deep Linking: Fetch a single post by ID ───────────────────────────────
export async function getPostById(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isPrivate: true,
          },
        },
        tolees: {
          select: {
            tolee: {
              select: { id: true, name: true, slug: true, ownerId: true },
            },
          },
        },
        likes: { select: { userId: true } },
        savedBy: { select: { userId: true } },
        reposts: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true },
            },
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            author: {
              select: { id: true, name: true, username: true, avatar: true },
            },
            likes: { select: { userId: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              take: 5,
              include: {
                author: {
                  select: { id: true, name: true, username: true, avatar: true },
                },
              },
            },
          },
        },
        newsRelation: {
          select: {
            id: true,
            headline: true,
            slug: true,
            summary: true,
            category: true,
            readingTime: true,
            viewsCount: true,
          },
        },
        _count: {
          select: { likes: true, comments: true, reposts: true, views: true },
        },
      },
    });

    if (!post) return { success: false, post: null, error: 'Post not found' };

    // Authorization check
    const isOwner = post.authorId === currentUserId;
    const isPublic = post.visibility === 'public' && !post.author?.isPrivate;
    if (!isOwner && !isPublic && post.visibility === 'only_me') {
      return { success: false, post: null, error: 'Not authorized' };
    }

    const firstTolee = post.tolees?.[0]?.tolee;
    const likedByMe = currentUserId ? post.likes.some((l: any) => l.userId === currentUserId) : false;
    const savedByMe = currentUserId ? post.savedBy.some((s: any) => s.userId === currentUserId) : false;
    const repostedByMe = currentUserId ? post.reposts.some((r: any) => r.userId === currentUserId) : false;

    const mappedPost = {
      id: post.id,
      authorId: post.author?.id || null,
      author: post.author?.username || post.author?.name || 'Anonymous',
      authorName: post.author?.name || post.author?.username || 'Anonymous',
      authorAvatar: post.author?.avatar || '/default-user-avatar.svg',
      authorIsPrivate: post.author?.isPrivate || false,
      toleeName: firstTolee?.name || null,
      toleeSlug: firstTolee?.slug || null,
      postType: post.postType,
      caption: post.caption || '',
      mediaUrls: post.mediaUrls || '',
      mediaTypes: post.mediaTypes || '',
      image: post.mediaTypes?.split(',')[0] === 'image' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
      video: post.mediaTypes?.split(',')[0] === 'video' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
      visibility: post.visibility,
      location: post.location || null,
      subLocation: post.subLocation || null,
      likes: post._count?.likes || 0,
      comments: post._count?.comments || 0,
      reposts: post._count?.reposts || 0,
      views: post._count?.views || 0,
      likedByMe,
      savedByMe,
      repostedByMe,
      commentsList: post.comments || [],
      newsRelation: post.newsRelation || null,
      createdAt: post.createdAt.toISOString(),
      isSimulation: post.isSimulation || false,
    };

    return { success: true, post: mappedPost };
  } catch (err) {
    console.error('[getPostById] Error:', err);
    return { success: false, post: null, error: 'Server error' };
  }
}
