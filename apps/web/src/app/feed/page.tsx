import { FeedStream } from '@/components/FeedStream';
import { getPosts } from '@/actions/post';
import { prisma } from '@/lib/prisma';
import { prismaAI } from '@/lib/prisma-ai'; // 🛡️ AI content from tolee-1 DB

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { publishDailyNewsBatch } from '@/lib/newsAutoPublisher';
import { publishYouTubeVideosBatch } from '@/lib/youtubeAutoPublisher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GlobalFeedPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/');
  }
  
  const currentUserId = (session?.user as any)?.id;

  // 🛡️ Bandwidth Safeguard: Auto-publish fresh news & videos only if latest AI post is older than 6 hours (Max 10/day)
  try {
    const latestAIPost = await prismaAI.post.findFirst({
      where: { isArchived: false, status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });
    const timeSince = latestAIPost ? Date.now() - new Date(latestAIPost.createdAt).getTime() : Infinity;
    if (timeSince > 6 * 60 * 60 * 1000) { // 6 hours interval
      publishDailyNewsBatch(false).catch(() => {});
      publishYouTubeVideosBatch(false).catch(() => {});
    }
  } catch (e) {}

  // Fetch real posts from Main DB
  let dbPosts: any[] = [];
  try {
    const res = await getPosts();
    if (res.success && res.posts) {
      const authorIds = res.posts.map(p => p.author?.id).filter(Boolean);

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

      dbPosts = res.posts.map(post => {
        // Find the first tolee name
        const firstTolee = post.tolees?.[0]?.tolee;
        const likedByMe = currentUserId ? post.likes?.some((like: any) => like.userId === currentUserId) : false;
        const savedByMe = currentUserId ? post.savedBy?.some((save: any) => save.userId === currentUserId) : false;
        const repostedByMe = currentUserId ? post.reposts?.some((rep: any) => rep.userId === currentUserId) : false;
        const repostsCount = post._count?.reposts || 0;

        const mostRecentRepost = post.reposts?.[0];
        const resharedByUser = mostRecentRepost ? {
          username: mostRecentRepost.user.username,
          name: mostRecentRepost.user.name,
          avatar: mostRecentRepost.user.avatar || '/default-user-avatar.svg'
        } : null;
        
        const isFollowing = post.author?.id ? followedAuthorIds.includes(post.author.id) : false;
        const followStatus = post.author?.id 
          ? (pendingFollowAuthorIds.includes(post.author.id) ? 'pending' : (isFollowing ? 'approved' : null))
          : null;
        
        const isAnon = !!post.isAnonymous;
        return {
          id: post.id,
          authorId: isAnon ? null : post.author?.id,
          authorIsPrivate: isAnon ? false : (post.author?.isPrivate || false),
          isFollowing: isAnon ? false : isFollowing,
          followStatus: isAnon ? null : followStatus,
          visibility: post.visibility,
          author: isAnon ? 'Anonymous' : (post.author?.username || post.author?.name || 'Anonymous'),
          authorAvatar: isAnon ? '/default-user-avatar.svg' : (post.author?.avatar || '/default-user-avatar.svg'),
          toleeName: firstTolee?.name || 'Tolee',
          toleeSlug: firstTolee?.slug || 'group',
          role: (firstTolee?.ownerId && post.author?.id && firstTolee.ownerId === post.author.id && !isAnon) ? 'Admin' : 'Member',
          time: `${new Date(post.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} | ${new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`,
          content: post.caption || '',
          image: post.mediaTypes && post.mediaTypes.split(',')[0] === 'image' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
          video: post.mediaTypes && post.mediaTypes.split(',')[0] === 'video' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
          mediaUrls: post.mediaUrls,
          mediaTypes: post.mediaTypes,
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0,
          views: post._count?.views || 0,
          reposts: repostsCount,
          isWin: post.postType === 'win',
          postType: post.postType,
          location: post.location,
          subLocation: post.subLocation,
          likedByMe,
          savedByMe,
          repostedByMe,
          commentsList: post.comments || [],
          resharedByUser,
          // Listing fields
          title: post.title || null,
          price: post.price || null,
          currency: post.currency || null,
          category: post.category || null,
          condition: post.condition || null,
          locationText: post.locationText || null,
          worldProjectId: post.worldProjectId || null,
          worldProject: post.worldProject || null,
          newsRelation: post.newsRelation || null,
        };
      });
    }
  } catch (err) {
    console.error("Failed to load DB posts", err);
  }

  // 🛡️ Fetch AI news/video posts from tolee-1 AI Database and merge into feed
  try {
    const aiPosts = await prismaAI.post.findMany({
      where: { isArchived: false, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, caption: true, postType: true, mediaUrls: true, mediaTypes: true,
        visibility: true, createdAt: true, isAnonymous: true, location: true, subLocation: true,
        title: true, price: true, currency: true, category: true, condition: true, locationText: true,
        newsRelation: { select: { id: true, headline: true, slug: true, summary: true, category: true, readingTime: true, language: true, sourceUrl: true, viewsCount: true } },
        author: { select: { id: true, name: true, username: true, avatar: true } },
        tolees: { select: { tolee: { select: { name: true, slug: true, ownerId: true } } } },
        _count: { select: { likes: true, comments: true, views: true } },
      }
    });

    const aiPostsMapped = aiPosts.map((post: any) => {
      const firstTolee = post.tolees?.[0]?.tolee;
      return {
        id: post.id,
        authorId: post.author?.id,
        authorIsPrivate: false,
        isFollowing: false,
        followStatus: null,
        visibility: post.visibility || 'public',
        author: post.author?.username || post.author?.name || 'Tolee News',
        authorAvatar: post.author?.avatar || '/default-user-avatar.svg',
        toleeName: firstTolee?.name || 'Tolee',
        toleeSlug: firstTolee?.slug || 'group',
        role: 'Admin',
        time: `${new Date(post.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} | ${new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`,
        content: post.caption || '',
        image: post.mediaTypes && post.mediaTypes.split(',')[0] === 'image' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        video: post.mediaTypes && post.mediaTypes.split(',')[0] === 'video' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        mediaUrls: post.mediaUrls,
        mediaTypes: post.mediaTypes,
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        views: post._count?.views || 0,
        reposts: 0,
        isWin: false,
        postType: post.postType,
        location: post.location,
        subLocation: post.subLocation,
        likedByMe: false,
        savedByMe: false,
        repostedByMe: false,
        commentsList: [],
        resharedByUser: null,
        title: post.title || null,
        price: post.price || null,
        currency: post.currency || null,
        category: post.category || null,
        condition: post.condition || null,
        locationText: post.locationText || null,
        worldProjectId: null,
        worldProject: null,
        newsRelation: post.newsRelation || null,
        _isAIPost: true, // Flag to identify AI posts in feed
      };
    });

    // Merge and sort by time (interleave AI posts with real posts)
    dbPosts = [...dbPosts, ...aiPostsMapped].sort((a, b) => {
      const dateA = new Date(a.time?.split(' | ')[0] || 0).getTime();
      const dateB = new Date(b.time?.split(' | ')[0] || 0).getTime();
      return dateB - dateA;
    });
  } catch (err) {
    console.error("Failed to load AI posts from tolee-1", err);
  }

  return <FeedStream initialPosts={dbPosts} />;
}
