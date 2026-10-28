import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ProfileReelsView } from '@/components/ProfileReelsView';
import { toggleFollow } from '@/actions/user';

interface PageProps {
  params: Promise<{ username: string }> | { username: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawUsername = resolvedParams?.username === 'me' ? null : resolvedParams?.username;
  if (!rawUsername) return {};

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: rawUsername }, { id: rawUsername }],
      },
      select: { name: true, username: true, isPrivate: true, searchEngineIndexable: true, avatar: true },
    });

    if (!user || user.isPrivate || user.searchEngineIndexable === false) {
      return {
        title: 'Private Account Reels | Tolee',
        robots: { index: false, follow: false },
      };
    }

    const name = user.name || user.username || 'Creator';
    return {
      title: `${name}'s Video Reels | Tolee Reels`,
      description: `Watch short-form vertical video reels and trending moments shared by ${name} on Tolee.`,
      alternates: {
        canonical: `https://tolee.in/u/${user.username || rawUsername}/reels`,
      },
      openGraph: {
        title: `${name}'s Video Reels | Tolee Reels`,
        description: `Watch short-form vertical video reels and trending moments shared by ${name} on Tolee.`,
        url: `https://tolee.in/u/${user.username || rawUsername}/reels`,
        images: [{ url: user.avatar || 'https://tolee.in/logo.png' }],
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
  } catch {
    return { title: 'Reels | Tolee' };
  }
}

export default async function UserProfileReels({ params }: PageProps) {
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
    lastActiveAt: true,
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

  // Fetch active stories count for this profile user
  const activeStoriesCount = await prisma.story.count({
    where: {
      authorId: user.id,
      expiresAt: { gte: new Date() }
    }
  });
  const hasActiveStory = activeStoriesCount > 0;

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
      author: user.username || user.name || 'user',
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
      repostedByMe,
      hasActiveStory
    };
  });

  const profileName = user.name || user.username || 'Creator';
  const profileUsername = user.username || user.id;

  const jsonLdProfileReels = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${profileName}'s Video Reels`,
    "description": `Short vertical video reels and highlights shared by ${profileName} on Tolee.`,
    "url": `https://tolee.in/u/${profileUsername}/reels`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": reels.slice(0, 10).map((r: any, idx: number) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": r.caption?.slice(0, 80) || `Reel by ${profileName}`,
        "url": `https://tolee.in/reel/${r.id}`
      }))
    }
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tolee.in"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": profileName,
        "item": `https://tolee.in/u/${profileUsername}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Reels",
        "item": `https://tolee.in/u/${profileUsername}/reels`
      }
    ]
  };

  return (
    <>
      {!user.isPrivate && user.searchEngineIndexable !== false && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProfileReels) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
          />
        </>
      )}
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
    </>
  );
}
