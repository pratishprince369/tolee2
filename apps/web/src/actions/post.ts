'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import { getOrCreatePersonalChat } from './chat';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyMultipleAssets } from '@/lib/cloudinary-cleanup';
import { createSystemNotification, createSystemNotificationsMany } from '@/lib/notification-service';

export async function createPost(data: {
  content: string;
  postType: string;
  media?: { type: string; url: string } | null;
  toleeIds: string[];
  location?: string | null;
  subLocation?: string | null;
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

    const { sanitizeText } = require('@/lib/sanitize');
    const safeContent = sanitizeText(data.content || '', 5000);

    if (!safeContent) {
      return { success: false, error: 'Post content cannot be empty.' };
    }

    if (!data.toleeIds || data.toleeIds.length === 0) {
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
        caption: safeContent,
        postType: data.postType,
        mediaUrls: data.media ? data.media.url : null,
        mediaTypes: data.media ? data.media.type : null,
        mediaPublicIds,
        mediaResourceTypes,
        location: data.location || null,
        subLocation: data.subLocation || null,
        authorId: userId,
        tolees: {
          create: data.toleeIds.map(id => ({
            toleeId: id
          }))
        }
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

    // Handle notifications for requirement posts
    const matchLocation = data.location?.trim() || "";
    const matchSubLocation = data.subLocation?.trim() || "";

    if (data.postType === 'requirement' && (matchLocation || matchSubLocation)) {
      try {
        const matchingUsers = await prisma.user.findMany({
          where: {
            id: { not: userId },
            location: {
              not: null,
            },
            OR: [
              matchLocation ? {
                location: {
                  contains: matchLocation,
                  mode: 'insensitive',
                }
              } : undefined,
              matchSubLocation ? {
                location: {
                  contains: matchSubLocation,
                  mode: 'insensitive',
                }
              } : undefined,
            ].filter(Boolean) as any[]
          },
          select: {
            id: true,
            name: true,
            username: true,
          }
        });

        if (matchingUsers.length > 0) {
          const truncatedCaption = safeContent.length > 40
            ? safeContent.substring(0, 40) + '...'
            : safeContent;

          const notificationPromises = matchingUsers.map(u => {
            return createSystemNotification({
              userId: u.id,
              type: 'requirement',
              message: `A new requirement in your location: "${truncatedCaption}"`,
              link: `/feed`,
            });
          });

          await Promise.all(notificationPromises);
        }
      } catch (notifErr) {
        console.error("Error dispatching requirement notifications:", notifErr);
      }
    }

    const tolees = await prisma.tolee.findMany({
      where: { id: { in: data.toleeIds } },
      select: { slug: true }
    });

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

export async function getPosts() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const posts = await prisma.post.findMany({
      where: {
        isArchived: false,
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
      take: 20,
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
        },
        comments: {
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

    let listings: any[] = [];
    if (currentUserId) {
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
      locationText: listing.locationText
    }));

    const combinedPosts = [...posts, ...mappedListings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, posts: combinedPosts.slice(0, 30) };
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
    const comments = await prisma.comment.findMany({
      where: { postId },
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


