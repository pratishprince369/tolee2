'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import { getOrCreatePersonalChat } from './chat';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyMultipleAssets } from '@/lib/cloudinary-cleanup';
import { createSystemNotification, createSystemNotificationsMany } from '@/lib/notification-service';
import { getSimulationSettings, getSimulatedEngagement, generateDynamicComments, detectCountryCode, getAICacheSync } from '@/lib/simulation';

export async function createPost(data: {
  content?: string;
  postType: string;
  media?: { type: string; url: string } | null;
  toleeIds?: string[];
  location?: string | null;
  subLocation?: string | null;
  status?: string;
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
    const safeContent = sanitizeText(data.content || '', 5000);

    if (!isDraft && !safeContent) {
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

    const post = await prisma.post.create({
      data: {
        caption: safeContent || '',
        postType: data.postType,
        mediaUrls: data.media ? data.media.url : null,
        mediaTypes: data.media ? data.media.type : null,
        mediaPublicIds,
        mediaResourceTypes,
        location: data.location || null,
        subLocation: data.subLocation || null,
        status: isDraft ? 'DRAFT' : 'published',
        authorId: userId,
        tolees: data.toleeIds && data.toleeIds.length > 0 ? {
          create: data.toleeIds.map(id => ({
            toleeId: id
          }))
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
        ...(!isSimOn ? { isSimulation: false } : {}),
        ...(mediaType ? { mediaTypes: mediaType } : {}),
        ...(currentUserId ? {
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
        })
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
          link: `/feed?postId=${postId}`
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
      where: { id: postId }
    });

    if (post && post.authorId !== userId) {
      await createSystemNotification({
        userId: post.authorId,
        type: 'comment',
        message: `${comment.author.username || comment.author.name} commented on your post: "${safeContent.substring(0, 20)}${safeContent.length > 20 ? '...' : ''}"`,
        link: `/feed?postId=${postId}`
      });
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
          link: `/feed?postId=${postId}`
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
          link: `/feed?postId=${postId}`
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

export async function recordView(contentId: string, contentType: 'post' | 'reel', deviceFingerprint?: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    
    if (!userId && !deviceFingerprint) {
      return { success: false, error: 'Cannot track view without identification' };
    }

    const reqHeaders = headers();
    const ip_address = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '';
    const user_agent = reqHeaders.get('user-agent') || '';

    // Create a robust unique hash for DB uniqueness check
    const viewer_hash = userId 
      ? `user_${userId}` 
      : `anon_${deviceFingerprint}_${ip_address.split(',')[0]}`;

    await prisma.view.create({
      data: {
        contentId,
        contentType,
        viewer_user_id: userId,
        device_fingerprint: deviceFingerprint,
        ip_address,
        user_agent,
        viewer_hash
      }
    });

    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      // Unique constraint failed = User/Device has already viewed this! 
      // This is expected and ensures accurate counts, so we silently succeed.
      return { success: true, duplicate: true };
    }
    console.error("Error recording view:", error);
    return { success: false, error: 'Failed to record view' };
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
    const senderName = session.user.name || 'A friend';

    if (friendIds.length === 0) {
      return { success: false, error: 'No friends selected.' };
    }

    // Deliver content to each selected friend
    for (const friendId of friendIds) {
      // 1. Get or create DM
      const chatResult = await getOrCreatePersonalChat(friendId);
      if (!chatResult.success || !chatResult.chatId) {
        console.error(`Failed to get/create personal chat with user ${friendId}`);
        continue;
      }
      const chatId = chatResult.chatId;

      // 2. Format a message that recipient will receive
      const msgContent = `📢 Shared a Post/Reel from Tolee:\n"${previewText}"\n\n🔗 ${shareUrl}`;

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



