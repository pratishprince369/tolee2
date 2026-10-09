import { ReelsStream } from '@/components/ReelsStream';
import { getPosts } from '@/actions/post';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { extractYouTubeVideoId } from '@/lib/youtube';
import { getTrendingYouTubeShorts } from '@/lib/youtubeShortsService';
import { getStreamableVideoUrl, getPosterUrl, isGoogleDriveUrl } from '@/lib/media';
import { triggerBackgroundReelsPublisherIfNeeded } from '@/lib/reelsBundleAutoPublisher';
import type { Metadata } from 'next';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Tolee Reels – Discover Trending Short Videos & Creator Clips',
  description: 'Watch viral vertical video reels, discover trending local creators, comedy clips, dances, and tutorials across India on Tolee Reels.',
  keywords: ['Tolee Reels', 'short videos', 'reels India', 'trending videos', 'creator clips', 'viral reels', 'local videos'],
  alternates: {
    canonical: 'https://tolee.in/reels',
  },
  openGraph: {
    title: 'Tolee Reels – Discover Trending Short Videos & Creator Clips',
    description: 'Watch viral vertical video reels, discover trending local creators, comedy clips, dances, and tutorials on Tolee Reels.',
    url: 'https://tolee.in/reels',
    siteName: 'Tolee Reels',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Reels' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Reels – Discover Trending Short Videos & Creator Clips',
    description: 'Watch viral vertical video reels and discover trending creators on Tolee Reels.',
    images: ['https://tolee.in/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function ReelsPage({ searchParams }: { searchParams: { videoId?: string; excludeIds?: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

  // ⚡ Lazy Self-Healing Google Drive Auto-Publisher: runs in background on page visits
  triggerBackgroundReelsPublisherIfNeeded();

  // Fetch candidate posts with Unseen Prioritization and Dynamic Rotation (Steps 14 & 15)
  let dbReels: any[] = [];
  try {
    // 1. Fetch user watch history & client session excludeIds for anti-repetition (Step 14 & 15)
    const viewedReelIds = new Set<string>();
    if (searchParams?.excludeIds) {
      searchParams.excludeIds.split(',').forEach(id => {
        const clean = id.trim();
        if (clean) viewedReelIds.add(clean);
      });
    }

    if (currentUserId) {
      try {
        const recentViews = await prisma.view.findMany({
          where: {
            contentType: 'reel',
            viewer_user_id: currentUserId,
          },
          select: { contentId: true },
          take: 500,
          orderBy: { createdAt: 'desc' }
        });
        recentViews.forEach((v: any) => {
          if (v.contentId) viewedReelIds.add(v.contentId);
        });
      } catch {}
    }

    // 2. Fetch candidates: real creator & automated reels (Google Drive bundles, Apify Instagram, Cloudinary).
    // Exclude static images, suppress generic Pexels stock video footage, and filter out viewed reels at DB level.
    let candidatePosts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        status: 'published',
        isArchived: false,
        visibility: 'public',
        mediaUrls: { not: null },
        NOT: [
          { mediaUrls: { contains: '/image/upload/' } },
          { mediaUrls: { contains: 'pexels.com' } }
        ],
        ...(viewedReelIds.size > 0 ? { id: { notIn: Array.from(viewedReelIds).slice(0, 300) } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isPrivate: true,
            isVerified: true
          }
        },
        tolees: {
          include: {
            tolee: { select: { id: true, name: true, slug: true, ownerId: true } }
          }
        },
        likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        savedBy: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        reposts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            userId: true,
            user: { select: { id: true, name: true, username: true, avatar: true } }
          }
        },
        _count: {
          select: { likes: true, comments: true, reposts: true, views: true }
        }
      }
    });

    // Fallback if unseen pool is low, backfill from general pool
    if (candidatePosts.length < 15) {
      const fallbackPosts = await prisma.post.findMany({
        where: {
          postType: 'reel',
          status: 'published',
          isArchived: false,
          visibility: 'public',
          mediaUrls: { not: null },
          NOT: { mediaUrls: { contains: '/image/upload/' } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: { select: { id: true, name: true, username: true, avatar: true, isPrivate: true, isVerified: true } },
          tolees: { include: { tolee: { select: { id: true, name: true, slug: true, ownerId: true } } } },
          likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
          savedBy: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
          reposts: { orderBy: { createdAt: 'desc' }, take: 1, select: { userId: true, user: { select: { id: true, name: true, username: true, avatar: true } } } },
          _count: { select: { likes: true, comments: true, reposts: true, views: true } }
        }
      });
      candidatePosts = [...candidatePosts, ...fallbackPosts];
    }

    // 3. Deduplicate by canonical video stream URL (Step 4 & 16)
    const seenVideoKeys = new Set<string>();
    const unseenPosts: any[] = [];
    const seenPosts: any[] = [];

    for (const post of candidatePosts) {
      if (!post.mediaUrls) continue;
      const cleanV = (post.mediaUrls.split(/,(?=https?:\/\/)/)[0] || '').split('?')[0].toLowerCase();
      if (cleanV && seenVideoKeys.has(cleanV)) continue;
      if (cleanV) seenVideoKeys.add(cleanV);

      if (viewedReelIds.has(post.id)) {
        seenPosts.push(post);
      } else {
        unseenPosts.push(post);
      }
    }

    // 4. True Fisher-Yates Dynamic Randomization:
    // Ensures fresh non-repeating mix every time the user visits Reels
    const shuffledUnseen = shuffleArray(unseenPosts);
    const selectedPosts: any[] = shuffledUnseen.slice(0, 15);

    // If unseen pool is exhausted, backfill with shuffled seen posts (never static order)
    if (selectedPosts.length < 15 && seenPosts.length > 0) {
      const shuffledSeen = shuffleArray(seenPosts);
      for (const sp of shuffledSeen) {
        if (selectedPosts.length >= 15) break;
        selectedPosts.push(sp);
      }
    }

    const authorIds = selectedPosts.map(p => p.author?.id).filter(Boolean);

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
      followedAuthorIds = follows.filter((f: any) => f.status === 'approved').map((f: any) => f.followingId);
      pendingFollowAuthorIds = follows.filter((f: any) => f.status === 'pending').map((f: any) => f.followingId);
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
      authorsWithActiveStories = activeStories.map((s: any) => s.authorId);
    }

    dbReels = selectedPosts.map(post => {
      const firstTolee = post.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? (post.likes?.length > 0) : false;
      const savedByMe = currentUserId ? (post.savedBy?.length > 0) : false;
      const repostedByMe = currentUserId ? (post.reposts?.[0]?.userId === currentUserId) : false;
      const repostsCount = post._count?.reposts || 0;

      const mostRecentRepost = post.reposts?.[0];
      const resharedByUser = mostRecentRepost ? {
        username: mostRecentRepost.user.username,
        name: mostRecentRepost.user.name,
        avatar: mostRecentRepost.user.avatar || '/default-user-avatar.svg'
      } : null;

      const isFollowing = followedAuthorIds.includes(post.author?.id);
      const followStatus = pendingFollowAuthorIds.includes(post.author?.id) 
        ? 'pending' 
        : (isFollowing ? 'approved' : null);

      const hasActiveStory = authorsWithActiveStories.includes(post.author?.id);
      
      return {
        id: post.id,
        authorId: post.author?.id || 'unknown',
        authorIsPrivate: post.author?.isPrivate || false,
        visibility: post.visibility,
        video: getStreamableVideoUrl(post.mediaUrls.split(/,(?=https?:\/\/)/)[0]),
        author: post.author?.username || 'creator',
        authorAvatar: post.author?.avatar || '/default-user-avatar.svg',
        toleeName: firstTolee?.name || null,
        toleeSlug: firstTolee?.slug || null,
        toleeId: firstTolee?.id || null,
        role: firstTolee?.ownerId === post.author?.id ? 'Admin' : 'Member',
        caption: post.caption || '',
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        views: post._count?.views || 0,
        shares: '0',
        reposts: repostsCount,
        audio: 'Original Audio',
        isVerified: (post.author as any)?.isVerified || false,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser,
        isFollowing,
        followStatus,
        hasActiveStory,
        location: post.location || null,
        poster: getPosterUrl(post.mediaUrls.split(/,(?=https?:\/\/)/)[0]),
        createdAt: post.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: 'hls',
        audioInfo: 'Original Audio',
      };
    });

    // Direct target video arrangement
    const targetVideoId = searchParams?.videoId;
    if (targetVideoId) {
      const targetIdx = dbReels.findIndex(r => r.id === targetVideoId);
      if (targetIdx !== -1) {
        const [targetReel] = dbReels.splice(targetIdx, 1);
        dbReels.unshift(targetReel);
      } else {
        try {
          // 1. Try Post
          const post = await prisma.post.findUnique({
            where: { id: targetVideoId },
            include: {
              author: true,
              likes: true,
              comments: true,
              reposts: {
                include: { user: true }
              },
              tolees: {
                include: { tolee: true }
              },
              _count: {
                select: { views: true, reposts: true }
              }
            }
          });

          if (post) {
            const isAuthorized = post.visibility !== 'only_me' || post.authorId === currentUserId;
            const isPublished = post.status === 'published';
            const ytId = extractYouTubeVideoId(post.mediaUrls) || extractYouTubeVideoId(post.sourceUrl);
            const isYouTube = Boolean(ytId);
            const hasVideo = Boolean(
              post.mediaUrls && (post.postType === 'reel' || post.postType === 'video' || post.mediaTypes?.includes('video') || isYouTube)
            );

            if (!isAuthorized || !isPublished || !hasVideo) {
              dbReels.unshift({
                id: targetVideoId,
                isUnavailable: true,
                caption: 'This video is no longer available.',
                author: 'Unavailable',
                video: '',
                likes: 0,
                comments: 0,
                views: 0
              });
            } else {
              const firstTolee = post.tolees?.[0]?.tolee;
              const likedByMe = currentUserId ? post.likes.some((like: any) => like.userId === currentUserId) : false;
              const savedByMe = currentUserId ? post.savedBy?.some((save: any) => save.userId === currentUserId) : false;
              const repostedByMe = currentUserId ? post.reposts?.some((rep: any) => rep.userId === currentUserId) : false;
              const repostsCount = post._count?.reposts || 0;
              const mostRecentRepost = post.reposts?.[0];
              const resharedByUser = mostRecentRepost ? {
                username: mostRecentRepost.user.username,
                name: mostRecentRepost.user.name,
                avatar: mostRecentRepost.user.avatar || '/default-user-avatar.svg'
              } : null;

              let isFollowing = false;
              let followStatus = null;
              if (currentUserId) {
                const follow = await prisma.follow.findFirst({
                  where: { followerId: currentUserId, followingId: post.author.id }
                });
                if (follow) {
                  isFollowing = follow.status === 'approved';
                  followStatus = follow.status;
                }
              }

              const activeStory = await prisma.story.findFirst({
                where: { authorId: post.author.id, expiresAt: { gte: new Date() } }
              });
              const hasActiveStory = !!activeStory;

              const singleReel = {
                id: post.id,
                authorId: post.author.id,
                authorIsPrivate: post.author.isPrivate || false,
                visibility: post.visibility,
                video: post.mediaUrls ? getStreamableVideoUrl(post.mediaUrls.split(/,(?=https?:\/\/)/)[0]) : '',
                isYouTube,
                youtubeId: ytId,
                author: post.author.username,
                authorAvatar: post.author.avatar || '/default-user-avatar.svg',
                toleeName: firstTolee?.name || null,
                toleeSlug: firstTolee?.slug || null,
                toleeId: firstTolee?.id || null,
                role: firstTolee?.ownerId === post.author.id ? 'Admin' : 'Member',
                caption: post.caption || '',
                likes: post.likes?.length || 0,
                comments: post.comments?.length || 0,
                views: post._count?.views || 0,
                shares: '0',
                reposts: repostsCount,
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
                videoType: isYouTube ? 'youtube' : 'hls',
                audioInfo: 'Original Audio',
              };
              dbReels.unshift(singleReel);
            }
          } else {
            // 2. Try ScreenVideo
            const screenVid = await prisma.screenVideo.findUnique({
              where: { id: targetVideoId },
              include: {
                user: true,
                likes: true,
                comments: true,
                _count: { select: { likes: true, comments: true, views: true } }
              }
            });

            if (screenVid) {
              const isAuthorized = screenVid.visibility !== 'only_me' || screenVid.userId === currentUserId;
              const isPublished = screenVid.status === 'published';

              if (!isAuthorized || !isPublished) {
                dbReels.unshift({
                  id: targetVideoId,
                  isUnavailable: true,
                  caption: 'This video is no longer available.',
                  author: 'Unavailable',
                  video: '',
                  likes: 0,
                  comments: 0,
                  views: 0
                });
              } else {
                const likedByMe = currentUserId ? screenVid.likes.some((like: any) => like.userId === currentUserId) : false;
                let isFollowing = false;
                let followStatus = null;
                if (currentUserId) {
                  const follow = await prisma.follow.findFirst({
                    where: { followerId: currentUserId, followingId: screenVid.user.id }
                  });
                  if (follow) {
                    isFollowing = follow.status === 'approved';
                    followStatus = follow.status;
                  }
                }

                const singleReel = {
                  id: screenVid.id,
                  authorId: screenVid.userId,
                  authorIsPrivate: false,
                  visibility: screenVid.visibility,
                  video: screenVid.mediaUrl,
                  author: screenVid.user.username || 'creator',
                  authorAvatar: screenVid.user.avatar || '/default-user-avatar.svg',
                  toleeName: null,
                  toleeSlug: null,
                  toleeId: null,
                  role: 'Member',
                  caption: screenVid.title || screenVid.description || '',
                  likes: screenVid.likes?.length || screenVid.likesCount || 0,
                  comments: screenVid.comments?.length || 0,
                  views: screenVid.viewsCount || screenVid._count?.views || 0,
                  shares: '0',
                  reposts: 0,
                  audio: 'Original Audio',
                  isVerified: false,
                  likedByMe,
                  savedByMe: false,
                  repostedByMe: false,
                  resharedByUser: null,
                  isFollowing,
                  followStatus,
                  hasActiveStory: false,
                  location: null,
                  subLocation: null,
                  createdAt: screenVid.createdAt,
                  duration: 15,
                  aspectRatio: '9:16',
                  videoType: 'mp4',
                  audioInfo: 'Original Audio',
                };
                dbReels.unshift(singleReel);
              }
            } else {
              // 3. Try Listing
              const listing = await prisma.listing.findUnique({
                where: { id: targetVideoId },
                include: { seller: true }
              });

              if (listing) {
                const isAuthorized = listing.status === 'active';
                const videoUrl = listing.images?.split(',').find((url: string) => url.includes('.mp4') || url.includes('.m3u8') || url.includes('video') || url.includes('.mov') || url.includes('.webm'));

                if (!isAuthorized || !videoUrl) {
                  dbReels.unshift({
                    id: targetVideoId,
                    isUnavailable: true,
                    caption: 'This video is no longer available.',
                    author: 'Unavailable',
                    video: '',
                    likes: 0,
                    comments: 0,
                    views: 0
                  });
                } else {
                  const singleReel = {
                    id: listing.id,
                    authorId: listing.sellerId,
                    authorIsPrivate: false,
                    visibility: 'public',
                    video: videoUrl,
                    author: listing.seller.username || 'seller',
                    authorAvatar: listing.seller.avatar || '/default-user-avatar.svg',
                    toleeName: null,
                    toleeSlug: null,
                    toleeId: null,
                    role: 'Seller',
                    caption: `${listing.title} - ${listing.price ? `₹${listing.price.toLocaleString('en-IN')}` : 'Free'}`,
                    likes: 0,
                    comments: 0,
                    views: listing.viewCount || 0,
                    shares: '0',
                    reposts: 0,
                    audio: 'Original Audio',
                    isVerified: false,
                    likedByMe: false,
                    savedByMe: false,
                    repostedByMe: false,
                    resharedByUser: null,
                    isFollowing: false,
                    followStatus: null,
                    hasActiveStory: false,
                    location: listing.locationText || null,
                    subLocation: null,
                    createdAt: listing.createdAt,
                    duration: 15,
                    aspectRatio: '9:16',
                    videoType: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
                    audioInfo: 'Original Audio',
                  };
                  dbReels.unshift(singleReel);
                }
              } else {
                // 4. Not found anywhere
                dbReels.unshift({
                  id: targetVideoId,
                  isUnavailable: true,
                  caption: 'This video is no longer available.',
                  author: 'Unavailable',
                  video: '',
                  likes: 0,
                  comments: 0,
                  views: 0
                });
              }
            }
          }
        } catch (err) {
          console.error("Failed to query direct target video for reels:", err);
        }
      }
    }

  } catch (err) {
    console.error("Failed to load DB reels", err);
  }

  // 🎥 Auto-fetch trending YouTube Shorts only if initial DB reels count is low (< 8)
  if (dbReels.length < 8) {
    try {
      const shortsLimit = Math.max(3, 8 - dbReels.length);
      const trendingShorts = await getTrendingYouTubeShorts(shortsLimit);
      if (trendingShorts.length > 0) {
        const existingIds = new Set(dbReels.map((r: any) => r.youtubeId || r.id));
        const freshShorts = trendingShorts.filter((s: any) => !existingIds.has(s.youtubeId) && !existingIds.has(s.id));
        dbReels = [...dbReels, ...freshShorts];
      }
    } catch (shortsErr) {
      console.warn('YouTube Shorts auto-fetch notice:', shortsErr);
    }
  }

  return <ReelsStream initialReels={dbReels} />;
}
