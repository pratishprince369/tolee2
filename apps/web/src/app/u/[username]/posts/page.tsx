import React from 'react';
import type { Metadata } from 'next';
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
        title: 'Private Account Posts | Tolee',
        robots: { index: false, follow: false },
      };
    }

    const name = user.name || user.username || 'Creator';
    return {
      title: `${name}'s Posts | Tolee Feed`,
      description: `Explore public community posts and discussions shared by ${name} on Tolee.`,
      alternates: {
        canonical: `https://tolee.in/u/${user.username || rawUsername}/posts`,
      },
      openGraph: {
        title: `${name}'s Posts | Tolee Feed`,
        description: `Explore public community posts and discussions shared by ${name} on Tolee.`,
        url: `https://tolee.in/u/${user.username || rawUsername}/posts`,
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
    return { title: 'Posts | Tolee' };
  }
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
      reelAudio: {
        select: {
          songId: true,
          startTime: true,
          endTime: true,
          duration: true,
          song: {
            select: {
              id: true,
              title: true,
              audioUrl: true,
              coverUrl: true,
              artist: { select: { id: true, name: true } },
              album: { select: { id: true, title: true } },
            },
          },
        },
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
      repostedByMe,
      reelAudio: post.reelAudio || null,
    };
  });

  const profileName = user.name || user.username || 'Creator';
  const profileUsername = user.username || user.id;

  const jsonLdProfileFeed = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${profileName}'s Posts Feed`,
    "description": `Public posts, discussions, and updates shared by ${profileName} on Tolee.`,
    "url": `https://tolee.in/u/${profileUsername}/posts`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": posts.slice(0, 10).map((p: any, idx: number) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": p.caption?.slice(0, 80) || `Post #${p.id}`,
        "url": `https://tolee.in/post/${p.id}`
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
        "name": "Posts",
        "item": `https://tolee.in/u/${profileUsername}/posts`
      }
    ]
  };

  return (
    <>
      {!user.isPrivate && user.searchEngineIndexable !== false && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProfileFeed) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
          />
        </>
      )}
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
    </>
  );
}
