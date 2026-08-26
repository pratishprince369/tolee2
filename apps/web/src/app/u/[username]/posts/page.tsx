import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ProfileFeedView } from '@/components/ProfileFeedView';
import { toggleLike, addComment, getComments, getLikes } from '@/actions/post';
import { toggleFollow } from '@/actions/user';

interface PageProps {
  params: Promise<{ username: string }> | { username: string };
}

export default async function UserProfileFeed({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || null;
  
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawUsername = resolvedParams?.username || '';

  if (rawUsername === 'me' && !currentUserId) {
    redirect('/');
  }

  let user;
  const userSelect = {
    id: true,
    username: true,
    name: true,
    avatar: true,
    coverImage: true,
    bio: true,
    location: true,
    website: true,
    createdAt: true,
    isVerified: true,
    level: true,
    trustScore: true,
    isPrivate: true,
    showActivityStatus: true,
    searchEngineIndexable: true,
    _count: {
      select: {
        followers: true,
        following: true,
        posts: true,
        tolees: true,
        friends: true
      }
    }
  };

  if (rawUsername === 'me') {
    if (!currentUserId) return notFound();
    user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: userSelect
    });
  } else if (rawUsername) {
    user = await prisma.user.findUnique({
      where: { username: rawUsername },
      select: userSelect
    });
    
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: rawUsername },
        select: userSelect
      });
    }
  }

  if (!user) {
    return notFound();
  }

  const followRelation = currentUserId
    ? await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      })
    : null;

  const isFollowing = followRelation?.status === 'approved';
  const followStatus = followRelation?.status || null;
  const isMe = currentUserId === user.id;
  const isAccountPrivate = user.isPrivate && !isMe && !isFollowing;

  // Retrieve user posts
  const userPosts = isAccountPrivate ? [] : await prisma.post.findMany({
    where: {
      authorId: user.id,
      isArchived: false,
      ...(isMe ? {} : { visibility: 'public', isAnonymous: false })
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      caption: true,
      mediaUrls: true,
      mediaTypes: true,
      postType: true,
      visibility: true,
      authorId: true,
      createdAt: true,
      isAnonymous: true,
      shareCount: true,
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
        select: {
          userId: true
        }
      },
      tolees: {
        include: {
          tolee: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          views: true,
          reposts: true
        }
      }
    }
  });

  // Map user posts to match ProfileFeedView props requirements
  const posts = userPosts.map((post: any) => {
    const firstTolee = post.tolees?.[0]?.tolee;
    const likedByMe = currentUserId ? post.likes.some((like: any) => like.userId === currentUserId) : false;
    const savedByMe = currentUserId ? post.savedBy.some((save: any) => save.userId === currentUserId) : false;
    const repostedByMe = currentUserId ? post.reposts.some((r: any) => r.userId === currentUserId) : false;
    
    return {
      id: post.id,
      caption: post.caption,
      mediaUrls: post.mediaUrls,
      mediaTypes: post.mediaTypes,
      postType: post.postType,
      visibility: post.visibility,
      authorId: post.authorId,
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
      shareCount: post.shareCount || 0,
      author: user.username || user.name || 'user',
      authorName: user.name || user.username || 'Creator',
      authorAvatar: user.avatar,
      isVerified: user.isVerified,
      toleeName: firstTolee?.name || null,
      toleeSlug: firstTolee?.slug || null,
      likes: post.likes,
      _count: {
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        views: post._count?.views || 0,
        reposts: post._count?.reposts || 0
      },
      likedByMe,
      savedByMe,
      repostedByMe
    };
  });

  return (
    <ProfileFeedView
      user={{
        ...user,
        level: user.level || 1,
        trustScore: user.trustScore || 100
      }}
      posts={posts}
      isMe={isMe}
      currentUserId={currentUserId}
      initialIsFollowing={isFollowing}
      initialFollowStatus={followStatus}
      toggleFollowAction={toggleFollow}
      toggleLikeAction={toggleLike}
      addCommentAction={addComment}
      getCommentsAction={getComments}
      getLikesAction={getLikes}
    />
  );
}
