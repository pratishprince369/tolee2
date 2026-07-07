import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { InstagramProfileView } from '@/components/InstagramProfileView';
import { toggleLike, addComment, getComments, getLikes } from '@/actions/post';
import { toggleFollow } from '@/actions/user';

export default async function UserProfile({ params }: { params: { username: string } }) {
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
    },
    tolees: {
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
    }
  };

  if (params.username === 'me') {
    if (!currentUserId) return notFound();
    user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: userSelect
    });
  } else {
    // Attempt lookup by username first
    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: userSelect
    });
    
    // If not found, attempt lookup by user ID
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: params.username },
        select: userSelect
      });
    }
  }

  if (!user) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[70vh] px-4 text-center select-none animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-red-500/10 dark:bg-red-500/5 rounded-full flex items-center justify-center mb-6 text-red-500">
          <svg className="w-10 h-10 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Profile Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-6">
          The profile you are trying to view does not exist, has been removed, or the username is incorrect.
        </p>
        <a 
          href="/feed" 
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-bold text-xs shadow-md shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          Return to Feed
        </a>
      </div>
    );
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

  // Retrieve Subscription status & subscriber count
  const [subscriberCount, subscription] = await Promise.all([
    prisma.subscription.count({
      where: { creatorId: user.id }
    }),
    currentUserId
      ? prisma.subscription.findUnique({
          where: {
            subscriberId_creatorId: {
              subscriberId: currentUserId,
              creatorId: user.id
            }
          }
        })
      : Promise.resolve(null)
  ]);

  const isSubscribed = !!subscription;
  const bellPreference = subscription?.bellPreference || null;

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
      likes: {
        select: {
          userId: true
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

  // Retrieve saved posts if self profile
  let savedPosts: any[] = [];
  if (isMe && !isAccountPrivate) {
    savedPosts = await prisma.savedPost.findMany({
      where: { userId: user.id },
      include: {
        post: {
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

  // Retrieve user reposts (re-shared posts and reels)
  const resharedPostsData = isAccountPrivate ? [] : await prisma.repost.findMany({
    where: {
      userId: user.id,
      post: currentUserId ? {
        OR: [
          { authorId: currentUserId },
          { visibility: 'public' }
        ]
      } : {
        visibility: 'public'
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
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
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              isVerified: true
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
              reposts: true,
              views: true
            }
          }
        }
      }
    }
  });

  const resharedPosts = resharedPostsData
    .filter((rp: any) => rp.post !== null)
    .map((rp: any) => {
      const post = rp.post;
      const firstTolee = post.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? post.likes?.some((like: any) => like.userId === currentUserId) : false;
      const savedByMe = currentUserId ? post.savedBy?.some((save: any) => save.userId === currentUserId) : false;
      const repostedByMe = currentUserId ? post.reposts?.some((r: any) => r.userId === currentUserId) : false;
      
      return {
        id: post.id,
        caption: post.caption || '',
        mediaUrls: post.mediaUrls,
        mediaTypes: post.mediaTypes,
        postType: post.postType,
        createdAt: post.createdAt,
        repostedAt: rp.createdAt,
        author: post.author.username,
        authorName: post.author.name,
        authorAvatar: post.author.avatar || '/default-user-avatar.svg',
        isVerified: post.author.isVerified || false,
        toleeName: firstTolee?.name || null,
        toleeSlug: firstTolee?.slug || null,
        likes: post.likes || [],
        _count: {
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0,
          reposts: post._count?.reposts || 0
        },
        likedByMe,
        savedByMe,
        repostedByMe,
        shareCount: post.shareCount || 0,
        resharedByUser: {
          username: user.username,
          name: user.name,
          avatar: user.avatar || '/default-user-avatar.svg'
        }
      };
    });

  // Parse Tolee memberships
  const myTolees = user.tolees.map((t: any) => ({
    id: t.tolee.id,
    name: t.tolee.name,
    role: t.role,
    avatar: t.tolee.avatar || '/default-tolee-avatar.svg',
    slug: t.tolee.slug
  }));

  // Fetch user's news articles
  let userNewsArticles: any[] = [];
  try {
    userNewsArticles = await prisma.newsPost.findMany({
      where: {
        post: {
          authorId: user.id,
          isArchived: false,
          ...(isMe ? {} : { status: 'published' })
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
            mediaUrls: true,
            mediaTypes: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                views: true,
              }
            }
          }
        }
      }
    });
  } catch (e) {
    // NewsPost table may not exist yet
  }

  const isSuperAdmin = session?.user?.email === process.env.SUPER_ADMIN_EMAIL;

  return (
    <InstagramProfileView 
      user={{
        ...user,
        level: user.level || 1,
        trustScore: user.trustScore || 100
      }}
      posts={userPosts}
      savedPosts={savedPosts}
      resharedPosts={resharedPosts}
      tolees={myTolees}
      newsArticles={userNewsArticles}
      isMe={isMe}
      isSuperAdmin={isSuperAdmin}
      currentUserId={currentUserId}
      initialIsFollowing={isFollowing}
      initialFollowStatus={followStatus}
      toggleFollowAction={toggleFollow}
      toggleLikeAction={toggleLike}
      addCommentAction={addComment}
      getCommentsAction={getComments}
      getLikesAction={getLikes}
      initialSubscriberCount={subscriberCount}
      initialSubscribed={isSubscribed}
      initialBellPreference={bellPreference}
    />
  );
}

export async function generateMetadata({ params }: { params: { username: string } }) {
  const username = params.username === 'me' ? null : params.username;
  if (!username) return {};

  try {
    let user = await prisma.user.findUnique({
      where: { username },
      select: { searchEngineIndexable: true }
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: username },
        select: { searchEngineIndexable: true }
      });
    }

    if (!user || user.searchEngineIndexable === false) {
      return {
        robots: {
          index: false,
          follow: false
        }
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    robots: {
      index: true,
      follow: true
    }
  };
}
