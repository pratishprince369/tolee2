import { ReelsStream } from '@/components/ReelsStream';
import { getPosts } from '@/actions/post';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReelsPage({ searchParams }: { searchParams: { videoId?: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/');
  }
  
  const currentUserId = (session?.user as any)?.id;

  // Fetch real posts from DB
  let dbReels: any[] = [];
  try {
    const res = await getPosts({ mediaType: 'video', limit: 100 });
    if (res.success && res.posts) {
      const videoPosts = res.posts.filter(post => post.mediaTypes === 'video' && post.mediaUrls);
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

          if (post && post.mediaUrls && post.mediaTypes && post.mediaTypes.split(',')[0] === 'video') {
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
            };
            dbReels.unshift(singleReel);
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
        video: 'https://cdn.pixabay.com/video/2021/08/04/83896-584732159_large.mp4',
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
        video: 'https://cdn.pixabay.com/video/2020/05/11/38600-418859942_large.mp4',
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
