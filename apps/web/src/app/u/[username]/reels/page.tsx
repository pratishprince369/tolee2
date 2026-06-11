import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ProfileReelsView } from '@/components/ProfileReelsView';
import { toggleFollow } from '@/actions/user';

export default async function UserProfileReels({ 
  params 
}: { 
  params: { username: string } 
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/');
  }
  
  const currentUserId = (session?.user as any)?.id;

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

  if (params.username === 'me') {
    if (!currentUserId) return notFound();
    user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: userSelect
    });
  } else {
    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: userSelect
    });
    
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: params.username },
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

  // Retrieve user reels (video posts only)
  const userReels = isAccountPrivate ? [] : await prisma.post.findMany({
    where: {
      authorId: user.id,
      isArchived: false,
      mediaTypes: 'video',
      ...(isMe ? {} : { visibility: 'public' })
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
              slug: true,
              ownerId: true
            }
          }
        }
      },
      comments: {
        select: {
          id: true
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

  const reels = userReels.map((post: any) => {
    const firstTolee = post.tolees?.[0]?.tolee;
    const likedByMe = currentUserId ? post.likes.some((like: any) => like.userId === currentUserId) : false;
    const savedByMe = currentUserId ? post.savedBy.some((save: any) => save.userId === currentUserId) : false;
    const repostedByMe = currentUserId ? post.reposts.some((rep: any) => rep.userId === currentUserId) : false;

    return {
      id: post.id,
      authorId: post.authorId,
      visibility: post.visibility,
      video: post.mediaUrls,
      author: user.username || 'user',
      authorAvatar: user.avatar,
      toleeName: firstTolee?.name || null,
      toleeSlug: firstTolee?.slug || null,
      role: firstTolee?.ownerId === post.authorId ? 'Admin' : 'Member',
      caption: post.caption || '',
      likes: post._count?.likes || 0,
      comments: post._count?.comments || 0,
      views: post._count?.views || 0,
      shares: post.shareCount || 0,
      reposts: post._count?.reposts || 0,
      audio: 'Original Audio',
      isVerified: user.isVerified || false,
      likedByMe,
      savedByMe,
      repostedByMe
    };
  });

  return (
    <ProfileReelsView
      user={{
        ...user,
        level: user.level || 1,
        trustScore: user.trustScore || 100
      }}
      reels={reels}
      isMe={isMe}
      currentUserId={currentUserId}
      initialIsFollowing={isFollowing}
      initialFollowStatus={followStatus}
      toggleFollowAction={toggleFollow}
    />
  );
}
