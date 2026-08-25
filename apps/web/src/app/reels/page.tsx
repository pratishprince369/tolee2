import { ReelsStream } from '@/components/ReelsStream';
import { getPosts } from '@/actions/post';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

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

export default async function ReelsPage({ searchParams }: { searchParams: { videoId?: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

  // Fetch real posts from DB
  let dbReels: any[] = [];
  try {
    const res = await getPosts({ mediaType: 'video', limit: 100 });
    if (res.success && res.posts) {
      const videoPosts = res.posts.filter(post => post.postType === 'reel' && post.mediaUrls);
      const authorIds = videoPosts.map(p => p.author.id);

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

      dbReels = videoPosts.map(post => {
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
        
        return {
          id: post.id,
          authorId: post.author.id,
          authorIsPrivate: post.author.isPrivate || false,
          visibility: post.visibility,
          video: post.mediaUrls.split(/,(?=https?:\/\/)/)[0],
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
          videoType: 'hls',
          audioInfo: 'Original Audio',
        };
      });
    }

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
            const hasVideo = post.mediaUrls && (post.postType === 'reel' || post.mediaTypes?.includes('video'));

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
                video: post.mediaUrls.split(/,(?=https?:\/\/)/)[0],
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
                videoType: 'hls',
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
                const videoUrl = listing.images?.split(',').find(url => url.includes('.mp4') || url.includes('.m3u8') || url.includes('video') || url.includes('.mov') || url.includes('.webm'));

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

  // If no database reels, fall back to some mock data just to show UI
  if (dbReels.length === 0) {
    dbReels = [
      {
        id: 1,
        video: 'https://videos.pexels.com/video-files/7823396/7823396-hd_1080_1920_30fps.mp4',
        toleeName: 'AI Automation Society',
        toleeSlug: 'ai-automation-society',
        author: 'Alex Johnson',
        authorAvatar: 'https://i.pravatar.cc/150?u=99',
        caption: '3 tools you must know to build an AI agency in 2024. 🚀 Watch till the end! #ai #automation #business',
        likes: '45.2k',
        comments: '1.2k',
        shares: '8.4k',
        audio: 'Original Audio - Alex Johnson',
        isVerified: true
      },
      {
        id: 2,
        video: 'https://videos.pexels.com/video-files/10395606/10395606-hd_1080_1920_24fps.mp4',
        toleeName: 'That Pickleball Tolee',
        toleeSlug: 'pickleball',
        author: 'Sarah Chen',
        authorAvatar: 'https://i.pravatar.cc/150?u=41',
        caption: 'Perfect your backhand spin with this simple drill 🏓🔥 Practice this 10 mins daily!',
        likes: '12.8k',
        comments: '342',
        shares: '2.1k',
        audio: 'Pickleball Masters - Trending',
        isVerified: false
      }
    ];
  }

  return <ReelsStream initialReels={dbReels} />;
}
