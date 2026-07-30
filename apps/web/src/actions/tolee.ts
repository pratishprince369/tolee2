'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';
import { createSystemNotification, createSystemNotificationsMany } from '@/lib/notification-service';
import { writeLimiter, getClientIp } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/sanitize';
import { getSimulationSettings, getGroupMemberCount, getSimulatedEngagement, generateDynamicGroupPosts, detectCountryCode } from '@/lib/simulation';


export async function getTolees() {
  try {
    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    const tolees = await prisma.tolee.findMany({
      include: {
        members: true,
      }
    });

    const mappedTolees = tolees.map(t => {
      const realCount = t.members.length;
      const count = getGroupMemberCount(t.id, t.name, realCount, isSimOn, simSettings.minGroupMembers, simSettings.maxGroupMembers);
      return {
        ...t,
        membersCount: count
      };
    });

    return { success: true, tolees: mappedTolees };
  } catch (error) {
    console.error("Error fetching tolees:", error);
    return { success: false, tolees: [] };
  }
}

export async function getToleeBySlug(slug: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    // Check if the current user is an approved member of this tolee slug
    let isMember = false;
    if (currentUserId) {
      const membership = await prisma.toleeMember.findFirst({
        where: {
          user: { id: currentUserId },
          tolee: { slug },
          status: 'approved'
        }
      });
      isMember = !!membership;
    }

    const tolee = await prisma.tolee.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        isPrivate: true,
        ownerId: true,
        isLive: true,
        liveHostId: true,
        liveSessionType: true,
        liveStartedAt: true,
        liveViewerCount: true,
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            members: true
          }
        },
        posts: {
          take: 10,
          where: {
            post: {
              ...(!isSimOn ? { isSimulation: false } : {}),
              ...(currentUserId ? {
                OR: [
                  { authorId: currentUserId },
                  { visibility: 'public' },
                  ...(isMember ? [{ visibility: 'hidden_from_public' }] : [])
                ]
              } : {
                visibility: 'public'
              })
            }
          },
          include: {
            post: {
              select: {
                id: true,
                caption: true,
                mediaUrls: true,
                mediaTypes: true,
                postType: true,
                visibility: true,
                shareCount: true,
                createdAt: true,
                worldProjectId: true,
                isAnonymous: true,
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
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
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
                }
              }
            }
          },
          orderBy: {
            post: {
              createdAt: 'desc'
            }
          }
        }
      }
    });
    if (tolee) {
      if (tolee.isLive) {
        console.log(`[DEBUG] [Live Session Found] Live session is active for Tolee: ${tolee.name} (${tolee.id})`);
      } else {
        console.log(`[DEBUG] [Live Session Missing] No active live session for Tolee: ${tolee.name} (${tolee.id})`);
      }

      const realCount = tolee._count?.members || 0;
      const count = getGroupMemberCount(tolee.id, tolee.name, realCount, isSimOn, simSettings.minGroupMembers, simSettings.maxGroupMembers);

      let mappedPosts = tolee.posts;
      if (isSimOn) {
        const countryCode = await detectCountryCode(currentUserId);
        const category = (tolee as any).category || 'General';
        mappedPosts = generateDynamicGroupPosts(tolee.id, tolee.name, category, tolee.posts, countryCode);
        
        mappedPosts = mappedPosts.map((p: any) => {
          if (!p.post.isSimulation) {
            const eng = getSimulatedEngagement(p.post.id);
            return {
              ...p,
              post: {
                ...p.post,
                savesCount: eng.saves,
                _count: {
                  likes: eng.likes,
                  comments: eng.comments,
                  reposts: p.post._count?.reposts || eng.shares,
                  views: eng.views,
                  saves: eng.saves
                }
              }
            };
          }
          return p;
        });
      }

      return {
        success: true,
        tolee: {
          ...tolee,
          _count: {
            ...tolee._count,
            members: count
          },
          posts: mappedPosts
        }
      };
    }
    return { success: true, tolee: null };
  } catch (error) {
    console.error("Error fetching tolee by slug:", error);
    return { success: false, tolee: null };
  }
}

export async function joinTolee(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    const existingMember = await prisma.toleeMember.findUnique({
      where: {
        userId_toleeId: {
          userId,
          toleeId
        }
      }
    });

    if (existingMember) {
      return { success: false, error: 'Already requested or joined' };
    }

    // Facebook Group Logic: Private group -> pending, Public -> approved
    const status = tolee.isPrivate ? 'pending' : 'approved';

    await prisma.toleeMember.create({
      data: {
        userId,
        toleeId,
        status,
        role: 'member'
      }
    });

    // Create notification for Tolee owner
    if (tolee.ownerId && tolee.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await createSystemNotification({
          userId: tolee.ownerId,
          type: 'follow',
          message: status === 'pending' 
            ? `${user.username || user.name} requested to join ${tolee.name}.`
            : `${user.username || user.name} joined ${tolee.name}.`,
          link: `/t/${tolee.slug}`
        });
      }
    }

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true, status };
  } catch (error) {
    console.error("Error joining tolee:", error);
    return { success: false, error: 'Failed to join tolee' };
  }
}

export async function createTolee(data: { 
  name: string, 
  isPrivate: boolean, 
  toleeType?: string,
  isSearchable?: boolean,
  isPublicVisible?: boolean,
  description?: string,
  category?: string,
  location?: string,
  membershipQuestions?: string,
  rules?: string,
  welcomeMessage?: string,
  pendingPostApproval?: boolean,
  coverImage?: string,
  coverImagePublicId?: string,
  avatar?: string,
  avatarPublicId?: string,
  latitude?: number,
  longitude?: number,
  address?: string,
  country?: string,
  state?: string,
  district?: string,
  city?: string,
  area?: string,
  tags?: string
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { groupCreationRestricted: true }
    });

    if (user?.groupCreationRestricted) {
      return { success: false, error: 'You are restricted from creating groups.' };
    }

    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many requests. Please cool down.' };
    }

    const safeName = sanitizeText(data.name || '', 80);
    if (!safeName) {
      return { success: false, error: 'Group name cannot be empty.' };
    }
    const safeDescription = sanitizeText(data.description || '', 1000);
    const safeCategory = data.category ? sanitizeText(data.category, 50) : undefined;
    const safeLocation = data.location ? sanitizeText(data.location, 100) : undefined;
    const safeMembershipQuestions = data.membershipQuestions ? sanitizeText(data.membershipQuestions, 2000) : undefined;
    const safeRules = data.rules ? sanitizeText(data.rules, 3000) : undefined;
    const safeWelcomeMessage = data.welcomeMessage ? sanitizeText(data.welcomeMessage, 1000) : undefined;
    const safeAddress = data.address ? sanitizeText(data.address, 200) : undefined;

    // Generate a simple slug
    const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    const avatarPublicId = data.avatarPublicId !== undefined 
      ? data.avatarPublicId 
      : (data.avatar ? extractPublicIdFromUrl(data.avatar) : null);
      
    const coverImagePublicId = data.coverImagePublicId !== undefined 
      ? data.coverImagePublicId 
      : (data.coverImage ? extractPublicIdFromUrl(data.coverImage) : null);

    const tolee = await prisma.tolee.create({
      data: {
        name: safeName,
        slug,
        description: safeDescription || `Welcome to ${safeName}!`,
        isPrivate: data.isPrivate,
        category: data.toleeType || safeCategory || 'general',
        location: safeLocation,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        address: safeAddress || null,
        country: data.country || null,
        state: data.state || null,
        district: data.district || null,
        city: data.city || null,
        area: data.area || null,
        tags: data.tags || (data.toleeType ? `type:${data.toleeType},searchable:${data.isSearchable !== false}` : null),
        membershipQuestions: safeMembershipQuestions,
        rules: safeRules,
        welcomeMessage: safeWelcomeMessage,
        pendingPostApproval: data.pendingPostApproval || false,
        coverImage: data.coverImage,
        coverImagePublicId,
        avatar: data.avatar,
        avatarPublicId,
        ownerId: userId,
        members: {
          create: {
            userId,
            status: 'approved',
            role: 'admin'
          }
        }
      }
    });

    revalidatePath('/discover');
    revalidatePath('/feed');
    revalidatePath('/map');
    
    return { success: true, tolee };
  } catch (error) {
    console.error("Error creating tolee:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getTrendingTolees() {
  try {
    // Try to get trending by member count first
    let tolees = await prisma.tolee.findMany({
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        price: true,
        owner: {
          select: {
            name: true,
            username: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        members: {
          _count: 'desc'
        }
      }
    });

    // If no tolees found with members, just get the most recent ones
    if (tolees.length === 0) {
      tolees = await prisma.tolee.findMany({
        take: 12,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avatar: true,
          coverImage: true,
          price: true,
          owner: {
            select: {
              name: true,
              username: true
            }
          },
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return {
      success: true,
      tolees: tolees.map(t => ({
        ...t,
        membersCount: t._count?.members || 0,
        adminName: t.owner?.name || t.owner?.username || 'Community'
      }))
    };
  } catch (error) {
    console.error("Error fetching trending tolees:", error);
    return { success: false, tolees: [] };
  }
}

export async function updateTolee(id: string, data: {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  rules?: string;
  avatar?: string;
  avatarPublicId?: string;
  coverImage?: string;
  coverImagePublicId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        slug: true,
        avatar: true,
        avatarPublicId: true,
        coverImage: true,
        coverImagePublicId: true
      }
    });

    if (!tolee || tolee.ownerId !== userId) {
      return { success: false, error: 'Not authorized to manage this Tolee' };
    }

    const safeName = data.name !== undefined ? sanitizeText(data.name, 80) : undefined;
    const safeDescription = data.description !== undefined ? sanitizeText(data.description, 1000) : undefined;
    const safeRules = data.rules !== undefined ? sanitizeText(data.rules, 3000) : undefined;

    const newAvatarPublicId = data.avatarPublicId !== undefined 
      ? data.avatarPublicId 
      : (data.avatar ? extractPublicIdFromUrl(data.avatar) : (data.avatar === null ? null : undefined));
      
    const newCoverImagePublicId = data.coverImagePublicId !== undefined 
      ? data.coverImagePublicId 
      : (data.coverImage ? extractPublicIdFromUrl(data.coverImage) : (data.coverImage === null ? null : undefined));

    if (tolee) {
      if (data.avatar !== undefined && tolee.avatar && tolee.avatar !== data.avatar) {
        const deleteId = tolee.avatarPublicId || extractPublicIdFromUrl(tolee.avatar);
        if (deleteId) {
          await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.avatar));
        }
      }
      
      if (data.coverImage !== undefined && tolee.coverImage && tolee.coverImage !== data.coverImage) {
        const deleteId = tolee.coverImagePublicId || extractPublicIdFromUrl(tolee.coverImage);
        if (deleteId) {
          await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.coverImage));
        }
      }
    }

    const updated = await prisma.tolee.update({
      where: { id },
      data: {
        name: safeName,
        description: safeDescription,
        isPrivate: data.isPrivate,
        rules: safeRules,
        avatar: data.avatar,
        avatarPublicId: newAvatarPublicId,
        coverImage: data.coverImage,
        coverImagePublicId: newCoverImagePublicId
      }
    });

    revalidatePath(`/t/${updated.slug}`);
    return { success: true, tolee: updated };
  } catch (error) {
    console.error("Error updating tolee:", error);
    return { success: false, error: 'Failed to update tolee' };
  }
}

export async function muteGroupNotifications(toleeId: string, duration?: '1h' | '8h' | '24h' | 'until_turned_on') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    let mutedUntil: Date | null = null;
    let isMuted = true;

    if (duration) {
      const now = new Date();
      if (duration === '1h') {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (duration === '8h') {
        mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      } else if (duration === '24h') {
        mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (duration === 'until_turned_on') {
        mutedUntil = null; // indefinitely
      }
    } else {
      // Unmute
      isMuted = false;
    }

    await prisma.toleeMember.update({
      where: {
        userId_toleeId: {
          userId,
          toleeId
        }
      },
      data: {
        isMuted,
        mutedUntil
      }
    });

    return { success: true, isMuted, mutedUntil };
  } catch (error) {
    console.error("Error muting tolee notifications:", error);
    return { success: false, error: 'Failed to mute notifications' };
  }
}

export async function leaveToleeGroup(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Optional: check if they are the owner and handle accordingly, 
    // for now we'll just allow leaving by deleting the membership
    await prisma.toleeMember.delete({
      where: {
        userId_toleeId: {
          userId,
          toleeId
        }
      }
    });

    const group = await prisma.tolee.findUnique({ where: { id: toleeId } });
    if (group) {
      revalidatePath(`/t/${group.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error leaving tolee group:", error);
    return { success: false, error: 'Failed to leave group' };
  }
}

export async function getUserOwnedTolees() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', tolees: [] };
    }
    const userId = (session.user as any).id;

    const tolees = await prisma.tolee.findMany({
      where: {
        ownerId: userId
      },
      include: {
        _count: {
          select: {
            members: true,
            posts: true
          }
        },
        posts: {
          take: 1,
          orderBy: {
            post: {
              createdAt: 'desc'
            }
          },
          include: {
            post: {
              select: {
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, tolees };
  } catch (error) {
    console.error("Error fetching user owned tolees:", error);
    return { success: false, error: 'Failed to fetch your Tolees', tolees: [] };
  }
}

export async function deleteTolee(id: string, confirmationText?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    if (confirmationText !== undefined && confirmationText.trim().toUpperCase() !== 'DELETE') {
      return { success: false, error: 'Please type DELETE to confirm group deletion.' };
    }

    const tolee = await prisma.tolee.findUnique({
      where: { id },
      select: {
        ownerId: true,
        avatar: true,
        avatarPublicId: true,
        coverImage: true,
        coverImagePublicId: true
      }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    if (tolee.ownerId !== userId) {
      return { success: false, error: 'Not authorized to delete this Tolee' };
    }

    // Clean up Tolee avatar and cover image assets from Cloudinary before deleting

    if (tolee.avatar) {
      const deleteId = tolee.avatarPublicId || extractPublicIdFromUrl(tolee.avatar);
      if (deleteId) {
        await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.avatar));
      }
    }

    if (tolee.coverImage) {
      const deleteId = tolee.coverImagePublicId || extractPublicIdFromUrl(tolee.coverImage);
      if (deleteId) {
        await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.coverImage));
      }
    }

    // Delete course-related entries
    const courses = await prisma.course.findMany({ where: { toleeId: id }, select: { id: true } });
    const courseIds = courses.map(c => c.id);
    const modules = await prisma.module.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
    const moduleIds = modules.map(m => m.id);
    const lessons = await prisma.lesson.findMany({ where: { moduleId: { in: moduleIds } }, select: { id: true } });
    const lessonIds = lessons.map(l => l.id);

    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } }),
      prisma.lesson.deleteMany({ where: { moduleId: { in: moduleIds } } }),
      prisma.module.deleteMany({ where: { courseId: { in: courseIds } } }),
      prisma.course.deleteMany({ where: { toleeId: id } }),
      prisma.toleeMember.deleteMany({ where: { toleeId: id } }),
      prisma.postTolee.deleteMany({ where: { toleeId: id } }),
      prisma.tolee.delete({ where: { id } })
    ]);

    revalidatePath('/discover');
    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error("Error deleting tolee:", error);
    return { success: false, error: 'Failed to delete Tolee' };
  }
}

export async function startLiveSession(toleeId: string, type: 'public' | 'private') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      include: {
        members: {
          where: { status: 'approved' }
        }
      }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    if (tolee.ownerId !== userId) {
      return { success: false, error: 'Only the admin/owner can start a live session' };
    }

    // Update Tolee live state
    await prisma.tolee.update({
      where: { id: toleeId },
      data: {
        isLive: true,
        liveHostId: userId,
        liveSessionType: type,
        liveStartedAt: new Date()
      }
    });

    console.log(`[DEBUG] [Live Created] Live session started for Tolee ID: ${toleeId}, Host: ${userId}, Type: ${type}`);

    // Notify all other members of the group
    const otherMembers = tolee.members.filter((m: any) => m.userId !== userId);
    if (otherMembers.length > 0) {
      const hostName = session.user.name || 'Admin';
      const notifications = otherMembers.map((m: any) => ({
        userId: m.userId,
        type: 'live', // Use live notification type to prevent filtering
        message: `🔴 Live Now\n\n${tolee.name} has started a live session. Tap to join.`,
        link: `/t/${tolee.slug}?tab=live`
      }));
      await createSystemNotificationsMany(notifications, { groupName: tolee.name });
      console.log(`[DEBUG] [Notification Sent] Group notifications created for ${notifications.length} members of Tolee: ${tolee.name}`);
    }

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error starting live session:", error);
    return { success: false, error: 'Failed to start live session' };
  }
}

export async function endLiveSession(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    if (tolee.ownerId !== userId) {
      return { success: false, error: 'Only the admin/owner can end a live session' };
    }

    await prisma.$transaction([
      prisma.tolee.update({
        where: { id: toleeId },
        data: {
          isLive: false,
          liveHostId: null,
          liveSessionType: null,
          liveStartedAt: null,
          liveViewerCount: 0
        }
      }),
      prisma.liveJoinRequest.deleteMany({
        where: { toleeId }
      })
    ]);

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error ending live session:", error);
    return { success: false, error: 'Failed to end live session' };
  }
}

export async function requestToJoinLive(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if membership is approved
    const membership = await prisma.toleeMember.findUnique({
      where: {
        userId_toleeId: {
          userId,
          toleeId
        }
      }
    });

    if (!membership || membership.status !== 'approved') {
      return { success: false, error: 'You must be a member of this Tolee to join the live session' };
    }

    // Create or update join request
    const request = await prisma.liveJoinRequest.upsert({
      where: {
        toleeId_userId: {
          toleeId,
          userId
        }
      },
      update: {
        status: 'pending'
      },
      create: {
        toleeId,
        userId,
        status: 'pending'
      }
    });

    return { success: true, request };
  } catch (error) {
    console.error("Error requesting to join live:", error);
    return { success: false, error: 'Failed to request to join live session' };
  }
}

export async function handleLiveJoinRequest(requestId: string, approve: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const request = await prisma.liveJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        tolee: true,
        user: true
      }
    });

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    if (request.tolee.ownerId !== userId) {
      return { success: false, error: 'Only the admin/owner can handle join requests' };
    }

    const updatedRequest = await prisma.liveJoinRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'approved' : 'rejected'
      }
    });

    return { success: true, request: updatedRequest };
  } catch (error) {
    console.error("Error handling live join request:", error);
    return { success: false, error: 'Failed to handle live join request' };
  }
}

export async function getLiveJoinRequests(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    if (tolee.ownerId !== userId) {
      return { success: false, error: 'Only the admin/owner can view join requests' };
    }

    const requests = await prisma.liveJoinRequest.findMany({
      where: {
        toleeId,
        status: 'pending'
      },
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

    return { success: true, requests };
  } catch (error) {
    console.error("Error fetching live join requests:", error);
    return { success: false, requests: [] };
  }
}

export async function getMemberLiveStatus(toleeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const request = await prisma.liveJoinRequest.findUnique({
      where: {
        toleeId_userId: {
          toleeId,
          userId
        }
      }
    });

    return { success: true, status: request?.status || null };
  } catch (error) {
    console.error("Error fetching member live status:", error);
    return { success: false, status: null };
  }
}

export async function getToleeById(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const tolee = await prisma.tolee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        isPrivate: true,
        ownerId: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }

    let isMember = false;
    let membershipStatus = null;
    if (currentUserId) {
      const membership = await prisma.toleeMember.findUnique({
        where: {
          userId_toleeId: {
            userId: currentUserId,
            toleeId: id
          }
        }
      });
      isMember = membership?.status === 'approved';
      membershipStatus = membership?.status || null;
    }

    return { success: true, tolee, isMember, membershipStatus };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Tolee' };
  }
}

// ==========================================
// GROUP SETTINGS & GOVERNANCE SERVER ACTIONS
// ==========================================

export async function updateGroupSettings(toleeId: string, settingsData: {
  name?: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
  isSearchable?: boolean;
  rules?: string;
  membershipQuestions?: string;
  welcomeMessage?: string;
  pendingPostApproval?: boolean;
  coverImage?: string;
  avatar?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  customSlug?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return { success: false, error: 'Unauthorized' };

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      include: { members: true }
    });

    if (!tolee) return { success: false, error: 'Group not found' };

    const isOwner = tolee.ownerId === userId;
    const member = tolee.members.find(m => m.userId === userId && m.status === 'approved');
    const isAdmin = member?.role === 'admin' || isOwner;

    if (!isAdmin) {
      return { success: false, error: 'Only admins can modify group settings.' };
    }

    const updatePayload: any = {};
    if (settingsData.name) updatePayload.name = sanitizeText(settingsData.name, 80);
    if (settingsData.description !== undefined) updatePayload.description = sanitizeText(settingsData.description, 1000);
    if (settingsData.category) updatePayload.category = sanitizeText(settingsData.category, 50);
    if (settingsData.isPrivate !== undefined) updatePayload.isPrivate = settingsData.isPrivate;
    if (settingsData.rules !== undefined) updatePayload.rules = sanitizeText(settingsData.rules, 3000);
    if (settingsData.membershipQuestions !== undefined) updatePayload.membershipQuestions = sanitizeText(settingsData.membershipQuestions, 2000);
    if (settingsData.welcomeMessage !== undefined) updatePayload.welcomeMessage = sanitizeText(settingsData.welcomeMessage, 1000);
    if (settingsData.pendingPostApproval !== undefined) updatePayload.pendingPostApproval = settingsData.pendingPostApproval;
    if (settingsData.coverImage !== undefined) updatePayload.coverImage = settingsData.coverImage;
    if (settingsData.avatar !== undefined) updatePayload.avatar = settingsData.avatar;

    if (settingsData.isSearchable !== undefined) {
      const typeMatch = tolee.tags?.match(/type:([a-z_]+)/);
      const typeStr = typeMatch ? typeMatch[1] : (tolee.category || 'general');
      updatePayload.tags = `type:${typeStr},searchable:${settingsData.isSearchable}`;
    }

    const updated = await prisma.tolee.update({
      where: { id: toleeId },
      data: updatePayload
    });

    revalidatePath(`/t/${updated.slug}`);
    revalidatePath(`/create-tolee`);
    return { success: true, tolee: updated };
  } catch (err: any) {
    console.error("Error updating group settings:", err);
    return { success: false, error: err.message || 'Failed to update settings' };
  }
}

export async function transferToleeOwnership(toleeId: string, newOwnerUserId: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    if (!currentUserId) return { success: false, error: 'Unauthorized' };

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      select: { id: true, ownerId: true, name: true, slug: true }
    });

    if (!tolee) return { success: false, error: 'Group not found' };

    if (tolee.ownerId !== currentUserId) {
      return { success: false, error: 'Only the Founder can transfer group ownership.' };
    }

    if (currentUserId === newOwnerUserId) {
      return { success: false, error: 'You are already the owner of this group.' };
    }

    const targetMember = await prisma.toleeMember.findUnique({
      where: {
        userId_toleeId: {
          userId: newOwnerUserId,
          toleeId
        }
      }
    });

    if (!targetMember || targetMember.status !== 'approved') {
      return { success: false, error: 'The selected user is not an approved member of this group.' };
    }

    await prisma.$transaction([
      prisma.tolee.update({
        where: { id: toleeId },
        data: { ownerId: newOwnerUserId }
      }),
      prisma.toleeMember.update({
        where: {
          userId_toleeId: {
            userId: newOwnerUserId,
            toleeId
          }
        },
        data: { role: 'admin' }
      })
    ]);

    await createSystemNotification({
      userId: newOwnerUserId,
      type: 'TOLEE_OWNERSHIP_TRANSFERRED',
      title: '👑 Group Ownership Transferred',
      message: `You are now the Founder & Super Admin of ${tolee.name}.`,
      link: `/t/${tolee.slug}`
    });

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error transferring ownership:", err);
    return { success: false, error: err.message || 'Failed to transfer ownership' };
  }
}

export async function updateMemberRole(toleeId: string, targetUserId: string, newRole: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return { success: false, error: 'Unauthorized' };

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      select: { id: true, ownerId: true, slug: true }
    });

    if (!tolee) return { success: false, error: 'Group not found' };

    const callerMember = await prisma.toleeMember.findUnique({
      where: { userId_toleeId: { userId, toleeId } }
    });

    const isCallerAdmin = callerMember?.role === 'admin' || tolee.ownerId === userId;
    if (!isCallerAdmin) {
      return { success: false, error: 'Only group admins can update member roles.' };
    }

    if (targetUserId === tolee.ownerId && newRole !== 'admin') {
      return { success: false, error: 'Cannot demote the Founder.' };
    }

    await prisma.toleeMember.update({
      where: {
        userId_toleeId: {
          userId: targetUserId,
          toleeId
        }
      },
      data: { role: newRole }
    });

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error updating member role:", err);
    return { success: false, error: err.message || 'Failed to update member role' };
  }
}

export async function sendEmergencyGroupBroadcast(toleeId: string, broadcastMessage: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return { success: false, error: 'Unauthorized' };

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      include: {
        members: { where: { status: 'approved' }, select: { userId: true } }
      }
    });

    if (!tolee) return { success: false, error: 'Group not found' };

    const isOwner = tolee.ownerId === userId;
    const callerMember = tolee.members.find(m => m.userId === userId);
    const isAdmin = callerMember || isOwner;

    if (!isAdmin) {
      return { success: false, error: 'Only admins can send emergency broadcasts.' };
    }

    const memberIds = tolee.members.map(m => m.userId).filter(id => id !== userId);

    if (memberIds.length > 0) {
      await createSystemNotificationsMany({
        userIds: memberIds,
        type: 'TOLEE_EMERGENCY_BROADCAST',
        title: `🚨 Emergency Announcement: ${tolee.name}`,
        message: broadcastMessage,
        link: `/t/${tolee.slug}`
      });
    }

    return { success: true, count: memberIds.length };
  } catch (err: any) {
    console.error("Error sending emergency broadcast:", err);
    return { success: false, error: err.message || 'Failed to send broadcast' };
  }
}

