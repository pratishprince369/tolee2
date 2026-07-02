'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper to slugify text
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

export async function createWorldProject(data: {
  type: string; // "WEBSITE" | "BLOG" | "RESTAURANT" | "STORE"
  name: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  content: any; // JSON representation of content
  locationText?: string;
  latitude?: number;
  longitude?: number;
  seoTitle?: string;
  seoDesc?: string;
  seoKeywords?: string;
  status?: string; // "published" | "draft" | "hidden"
  selectedToleeIds: string[];
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  contactNumber?: string;
  whatsapp?: string;
  website?: string;
  openingHours?: string;
  photos?: string;
  videos?: string;
  offers?: string;
  socialLinks?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'You must be logged in to create a project.' };
    }
    const userId = (session.user as any).id;

    if (!data.name.trim()) {
      return { success: false, error: 'Project name is required.' };
    }

    if (!data.selectedToleeIds || data.selectedToleeIds.length === 0) {
      return { success: false, error: 'You must select at least one Tolee/group to publish.' };
    }

    // Generate unique slug
    let baseSlug = slugify(data.slug || data.name);
    if (!baseSlug) baseSlug = 'project';
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.worldProject.findUnique({
        where: { slug: finalSlug }
      });
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create project
    const project = await prisma.worldProject.create({
      data: {
        type: data.type,
        name: data.name.trim(),
        slug: finalSlug,
        description: data.description || null,
        bannerImage: data.bannerImage || null,
        content: data.content || {},
        locationText: data.locationText || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        country: data.country || null,
        state: data.state || null,
        district: data.district || null,
        city: data.city || null,
        area: data.area || null,
        contactNumber: data.contactNumber || null,
        whatsapp: data.whatsapp || null,
        website: data.website || null,
        openingHours: data.openingHours || null,
        photos: data.photos || null,
        videos: data.videos || null,
        offers: data.offers || null,
        socialLinks: data.socialLinks || null,
        seoTitle: data.seoTitle || null,
        seoDesc: data.seoDesc || null,
        seoKeywords: data.seoKeywords || null,
        status: data.status || 'published',
        creatorId: userId,
        tolees: {
          create: data.selectedToleeIds.map(toleeId => ({
            toleeId
          }))
        }
      }
    });

    // Create Feed Post for community distribution (if published)
    if (project.status === 'published') {
      let pagePrefix = '';
      if (project.type === 'WEBSITE') pagePrefix = 'micro-website';
      else if (project.type === 'BLOG') pagePrefix = 'blog';
      else if (project.type === 'RESTAURANT') pagePrefix = 'restaurant';
      else if (project.type === 'STORE') pagePrefix = 'store';

      const projectUrl = `/${pagePrefix}/${project.slug}`;
      const captionText = `🚀 Created a new ${project.type.toLowerCase()} in Tolee World!\n\nCheck it out here: ${project.name}\n\n${project.description || ''}`;

      await prisma.post.create({
        data: {
          caption: captionText,
          postType: 'world_project',
          mediaUrls: project.bannerImage || null,
          mediaTypes: project.bannerImage ? 'image' : null,
          location: project.locationText || null,
          authorId: userId,
          worldProjectId: project.id,
          tolees: {
            create: data.selectedToleeIds.map(toleeId => ({
              toleeId
            }))
          }
        }
      });

      // Dispatch notifications to selected group members
      try {
        const members = await prisma.toleeMember.findMany({
          where: {
            toleeId: { in: data.selectedToleeIds },
            userId: { not: userId },
            status: 'approved'
          },
          select: {
            userId: true,
            tolee: { select: { name: true } }
          }
        });

        if (members.length > 0) {
          const uniqueMemberIds = Array.from(new Set(members.map(m => m.userId)));
          const creatorName = session.user.name || "A creator";
          const toleeNameList = Array.from(new Set(members.map(m => m.tolee.name))).join(', ');
          const messageText = `${creatorName} launched a new Tolee World ${project.type.toLowerCase()} in ${toleeNameList}: "${project.name}"`;

          await prisma.notification.createMany({
            data: uniqueMemberIds.map(memberId => ({
              userId: memberId,
              type: 'world_project',
              message: messageText.length > 250 ? messageText.substring(0, 247) + '...' : messageText,
              link: projectUrl
            }))
          });
        }
      } catch (notifErr) {
        console.error("Error sending project notifications:", notifErr);
      }
    }

    revalidatePath('/world');
    revalidatePath('/feed');
    return { success: true, project };
  } catch (error: any) {
    console.error("Error creating Tolee World project:", error);
    return { success: false, error: error.message || 'Something went wrong.' };
  }
}

export async function updateWorldProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    bannerImage?: string;
    content?: any;
    locationText?: string;
    latitude?: number;
    longitude?: number;
    seoTitle?: string;
    seoDesc?: string;
    seoKeywords?: string;
    status?: string;
    selectedToleeIds?: string[];
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    const project = await prisma.worldProject.findUnique({
      where: { id },
      include: { tolees: true }
    });

    if (!project) {
      return { success: false, error: 'Project not found.' };
    }

    if (project.creatorId !== userId) {
      // Allow super admin to update/delete
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isAdmin = user?.email === 'adsvidia369@gmail.com' || user?.email === 'pratish@example.com';
      if (!isAdmin) {
        return { success: false, error: 'You are not authorized to update this project.' };
      }
    }

    const updatedData: any = {};
    if (data.name !== undefined) updatedData.name = data.name.trim();
    if (data.description !== undefined) updatedData.description = data.description;
    if (data.bannerImage !== undefined) updatedData.bannerImage = data.bannerImage;
    if (data.content !== undefined) updatedData.content = data.content;
    if (data.locationText !== undefined) updatedData.locationText = data.locationText;
    if (data.latitude !== undefined) updatedData.latitude = data.latitude;
    if (data.longitude !== undefined) updatedData.longitude = data.longitude;
    if (data.seoTitle !== undefined) updatedData.seoTitle = data.seoTitle;
    if (data.seoDesc !== undefined) updatedData.seoDesc = data.seoDesc;
    if (data.seoKeywords !== undefined) updatedData.seoKeywords = data.seoKeywords;
    if (data.status !== undefined) updatedData.status = data.status;

    if (data.selectedToleeIds !== undefined) {
      // Update mappings
      await prisma.worldProjectTolee.deleteMany({
        where: { projectId: id }
      });
      updatedData.tolees = {
        create: data.selectedToleeIds.map(toleeId => ({
          toleeId
        }))
      };
    }

    const updated = await prisma.worldProject.update({
      where: { id },
      data: updatedData
    });

    revalidatePath('/world');
    let pagePrefix = '';
    if (project.type === 'WEBSITE') pagePrefix = 'micro-website';
    else if (project.type === 'BLOG') pagePrefix = 'blog';
    else if (project.type === 'RESTAURANT') pagePrefix = 'restaurant';
    else if (project.type === 'STORE') pagePrefix = 'store';
    revalidatePath(`/${pagePrefix}/${updated.slug}`);

    return { success: true, project: updated };
  } catch (error: any) {
    console.error("Error updating project:", error);
    return { success: false, error: error.message || 'Something went wrong.' };
  }
}

export async function deleteWorldProject(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    const project = await prisma.worldProject.findUnique({
      where: { id }
    });

    if (!project) {
      return { success: false, error: 'Project not found.' };
    }

    if (project.creatorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isAdmin = user?.email === 'adsvidia369@gmail.com' || user?.email === 'pratish@example.com';
      if (!isAdmin) {
        return { success: false, error: 'You are not authorized to delete this project.' };
      }
    }

    await prisma.worldProject.delete({
      where: { id }
    });

    revalidatePath('/world');
    revalidatePath('/feed');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return { success: false, error: error.message || 'Something went wrong.' };
  }
}

export async function getWorldProjects() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    const projects = await prisma.worldProject.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        tolees: {
          include: {
            tolee: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      }
    });

    return { success: true, projects };
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return { success: false, error: error.message };
  }
}

export async function getPublicWorldProject(slug: string, type: string) {
  try {
    // Record visual analytics view count
    const project = await prisma.worldProject.findFirst({
      where: { slug, type }
    });

    if (!project) {
      return null;
    }

    // Increment view count inside database background
    await prisma.worldProject.update({
      where: { id: project.id },
      data: { views: { increment: 1 } }
    });

    return project;
  } catch (error) {
    console.error("Error fetching public project:", error);
    return null;
  }
}

export async function submitRestaurantOrder(data: {
  projectId: string;
  customerName: string;
  customerContact: string;
  orderDetails: string;
  totalPrice: number;
}) {
  try {
    const project = await prisma.worldProject.findUnique({
      where: { id: data.projectId }
    });

    if (!project) {
      return { success: false, error: 'Restaurant not found.' };
    }

    const order = await prisma.restaurantOrder.create({
      data: {
        projectId: data.projectId,
        customerName: data.customerName.trim(),
        customerContact: data.customerContact.trim(),
        orderDetails: data.orderDetails,
        totalPrice: data.totalPrice,
        status: 'pending'
      }
    });

    // Notify the creator of the restaurant
    await prisma.notification.create({
      data: {
        userId: project.creatorId,
        type: 'restaurant_order',
        message: `🍔 New order placed for ${project.name} by ${data.customerName}!`,
        link: `/world`
      }
    });

    return { success: true, order };
  } catch (error: any) {
    console.error("Error submitting order:", error);
    return { success: false, error: error.message };
  }
}

export async function getRestaurantOrders(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    const project = await prisma.worldProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.creatorId !== userId) {
      return { success: false, error: 'Unauthorized or not found.' };
    }

    const orders = await prisma.restaurantOrder.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, orders };
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: { project: true }
    });

    if (!order || order.project.creatorId !== userId) {
      return { success: false, error: 'Unauthorized or not found.' };
    }

    const updated = await prisma.restaurantOrder.update({
      where: { id: orderId },
      data: { status }
    });

    return { success: true, order: updated };
  } catch (error: any) {
    console.error("Error updating order status:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserCreatorStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized.' };
    }
    const userId = (session.user as any).id;

    // Get followers count (where followingId = userId and status = 'approved')
    const followersCount = await prisma.follow.count({
      where: {
        followingId: userId,
        status: 'approved'
      }
    });

    // Get maximum likes on any of the user's reels (postType = 'reel')
    const userReels = await prisma.post.findMany({
      where: {
        authorId: userId,
        postType: 'reel',
        isArchived: false
      },
      select: {
        _count: {
          select: {
            likes: true
          }
        }
      }
    });

    const maxReelLikes = userReels.length > 0
      ? Math.max(...userReels.map(r => r._count.likes))
      : 0;

    return {
      success: true,
      stats: {
        followersCount,
        maxReelLikes
      }
    };
  } catch (error: any) {
    console.error("Error fetching user creator stats:", error);
    return { success: false, error: error.message || 'Something went wrong.' };
  }
}

