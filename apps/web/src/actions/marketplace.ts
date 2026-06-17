'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyMultipleAssets } from '@/lib/cloudinary-cleanup';
import { createSystemNotificationsMany } from '@/lib/notification-service';

export async function getListings() {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: { in: ['active', 'sold'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
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
        }
      }
    });
    return { success: true, listings };
  } catch (error) {
    console.error("Error fetching listings:", error);
    return { success: false, listings: [] };
  }
}

export async function getListingById(id: string) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true
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
        }
      }
    });

    if (listing) {
      // Increment view count inside server action
      await prisma.listing.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });
    }

    return { success: true, listing };
  } catch (error) {
    console.error("Error fetching listing by id:", error);
    return { success: false, error: 'Failed to fetch listing' };
  }
}

export async function createListing(data: {
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  locationText: string;
  images: string;
  availability?: string;
  tags?: string;
  deliveryMethod?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactEmail?: string;
  attributes?: any; // JSON
  status?: string; // e.g. "draft" or "active"
  selectedToleeIds: string[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { marketplaceRestricted: true }
    });

    if (user?.marketplaceRestricted) {
      return { success: false, error: 'You are restricted from creating marketplace listings.' };
    }

    const { writeLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many requests. Please cool down.' };
    }

    if (isNaN(data.price) || data.price < 0) {
      return { success: false, error: 'Price cannot be negative or invalid.' };
    }

    if (!data.selectedToleeIds || data.selectedToleeIds.length === 0) {
      return { success: false, error: 'Please select at least one Tolee before publishing your listing.' };
    }

    const { sanitizeText, validateEmail } = require('@/lib/sanitize');
    const safeTitle = sanitizeText(data.title || '', 100);
    const safeDescription = sanitizeText(data.description || '', 3000);
    const safeCategory = sanitizeText(data.category || '', 50);
    const safeCondition = data.condition ? sanitizeText(data.condition, 50) : undefined;
    const safeLocationText = sanitizeText(data.locationText || '', 200);
    const safeAvailability = data.availability ? sanitizeText(data.availability, 50) : undefined;
    const safeTags = data.tags ? sanitizeText(data.tags, 200) : undefined;
    const safeDeliveryMethod = data.deliveryMethod ? sanitizeText(data.deliveryMethod, 100) : undefined;
    const safeContactPhone = data.contactPhone ? sanitizeText(data.contactPhone, 30) : undefined;
    const safeContactWhatsApp = data.contactWhatsApp ? sanitizeText(data.contactWhatsApp, 30) : undefined;

    let safeContactEmail = undefined;
    if (data.contactEmail) {
      if (!validateEmail(data.contactEmail)) {
        return { success: false, error: 'Invalid contact email format.' };
      }
      safeContactEmail = data.contactEmail;
    }

    // AI Panchayat Content Moderation Check
    const { moderateContent } = require('@/lib/aiPanchayat');
    const moderation = await moderateContent({
      userId,
      contentType: 'listing',
      content: `${safeTitle} ${safeDescription} ${safeTags || ''}`
    });

    if (moderation.isFlagged) {
      return { 
        success: false, 
        error: `🚨 Listing flagged by AI Panchayat: ${moderation.reason} Your trust score is now ${moderation.newScore}%.` 
      };
    }

    if (data.price < 0) {
      return { success: false, error: 'Price cannot be negative.' };
    }

    let imagePublicIds: string | null = null;
    let imageResourceTypes: string | null = null;

    if (data.images) {
      const urls = data.images.split(',').map(url => url.trim()).filter(Boolean);
      const ids = urls.map(url => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
      const types = urls.map(url => extractResourceTypeFromUrl(url));
      
      if (ids.length > 0) {
        imagePublicIds = ids.join(',');
        imageResourceTypes = types.join(',');
      }
    }

    const listing = await prisma.listing.create({
      data: {
        title: safeTitle,
        description: safeDescription,
        price: data.price,
        category: safeCategory,
        condition: safeCondition,
        locationText: safeLocationText,
        images: data.images,
        imagePublicIds,
        imageResourceTypes,
        availability: safeAvailability,
        tags: safeTags,
        deliveryMethod: safeDeliveryMethod,
        contactPhone: safeContactPhone,
        contactWhatsApp: safeContactWhatsApp,
        contactEmail: safeContactEmail,
        attributes: data.attributes ? data.attributes : undefined,
        sellerId: userId,
        status: data.status || 'active',
        tolees: {
          create: data.selectedToleeIds.map(toleeId => ({
            tolee: { connect: { id: toleeId } }
          }))
        }
      }
    });

    // Notify group members if status is active
    if (listing.status === 'active' && data.selectedToleeIds.length > 0) {
      try {
        const members = await prisma.toleeMember.findMany({
          where: {
            toleeId: { in: data.selectedToleeIds },
            userId: { not: userId },
            status: 'approved'
          },
          select: {
            userId: true,
            tolee: {
              select: {
                name: true
              }
            }
          }
        });

        if (members.length > 0) {
          const uniqueMemberIds = Array.from(new Set(members.map(m => m.userId)));
          const seller = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, username: true }
          });
          const sellerName = seller?.name || seller?.username || "A user";
          const toleeNameList = Array.from(new Set(members.map(m => m.tolee.name))).join(', ');
          const messageText = `${sellerName} shared a new Marketplace listing in ${toleeNameList}: "${safeTitle}"`;

          await createSystemNotificationsMany(uniqueMemberIds.map(memberId => ({
            userId: memberId,
            type: 'marketplace',
            message: messageText.length > 250 ? messageText.substring(0, 247) + '...' : messageText,
            link: `/marketplace/listing/${listing.id}`
          })));
        }
      } catch (notifErr) {
        console.error("Error dispatching listing notifications:", notifErr);
      }
    }

    revalidatePath('/marketplace');
    return { success: true, listing };
  } catch (error) {
    console.error("Error creating listing:", error);
    return { success: false, error: 'Failed to create listing' };
  }
}

export async function updateListing(
  id: string,
  data: {
    title: string;
    description: string;
    price: number;
    category: string;
    condition?: string;
    locationText: string;
    images: string;
    availability?: string;
    tags?: string;
    deliveryMethod?: string;
    contactPhone?: string;
    contactWhatsApp?: string;
    contactEmail?: string;
    attributes?: any;
    status?: string;
    selectedToleeIds: string[];
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existingListing = await prisma.listing.findUnique({
      where: { id }
    });

    if (!existingListing) {
      return { success: false, error: 'Listing not found' };
    }

    if (existingListing.sellerId !== userId) {
      return { success: false, error: 'You are not authorized to edit this listing' };
    }

    if (!data.selectedToleeIds || data.selectedToleeIds.length === 0) {
      return { success: false, error: 'Please select at least one Tolee before publishing your listing.' };
    }

    const { sanitizeText, validateEmail } = require('@/lib/sanitize');
    const safeTitle = sanitizeText(data.title || '', 100);
    const safeDescription = sanitizeText(data.description || '', 3000);
    const safeCategory = sanitizeText(data.category || '', 50);
    const safeCondition = data.condition ? sanitizeText(data.condition, 50) : undefined;
    const safeLocationText = sanitizeText(data.locationText || '', 200);
    const safeAvailability = data.availability ? sanitizeText(data.availability, 50) : undefined;
    const safeTags = data.tags ? sanitizeText(data.tags, 200) : undefined;
    const safeDeliveryMethod = data.deliveryMethod ? sanitizeText(data.deliveryMethod, 100) : undefined;
    const safeContactPhone = data.contactPhone ? sanitizeText(data.contactPhone, 30) : undefined;
    const safeContactWhatsApp = data.contactWhatsApp ? sanitizeText(data.contactWhatsApp, 30) : undefined;

    let safeContactEmail = undefined;
    if (data.contactEmail) {
      if (!validateEmail(data.contactEmail)) {
        return { success: false, error: 'Invalid contact email format.' };
      }
      safeContactEmail = data.contactEmail;
    }

    if (data.price < 0) {
      return { success: false, error: 'Price cannot be negative.' };
    }

    
    // 1. Parse new images
    let newImagePublicIds: string | null = null;
    let newImageResourceTypes: string | null = null;

    if (data.images) {
      const urls = data.images.split(',').map(url => url.trim()).filter(Boolean);
      const ids = urls.map(url => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
      const types = urls.map(url => extractResourceTypeFromUrl(url));
      
      if (ids.length > 0) {
        newImagePublicIds = ids.join(',');
        newImageResourceTypes = types.join(',');
      }
    }

    // 2. Retrieve old public IDs and resource types
    let oldPublicIdsList: string[] = [];
    let oldResourceTypesList: string[] = [];

    if (existingListing.imagePublicIds) {
      oldPublicIdsList = existingListing.imagePublicIds.split(',').map(s => s.trim()).filter(Boolean);
      if (existingListing.imageResourceTypes) {
        oldResourceTypesList = existingListing.imageResourceTypes.split(',').map(s => s.trim());
      }
    } else if (existingListing.images) {
      // Fallback for legacy listings: parse public IDs from existing URLs
      const urls = existingListing.images.split(',').map(url => url.trim()).filter(Boolean);
      oldPublicIdsList = urls.map(url => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
      oldResourceTypesList = urls.map(url => extractResourceTypeFromUrl(url));
    }

    // 3. Find removed images
    const newIdsList = newImagePublicIds ? newImagePublicIds.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const idsToDestroy: string[] = [];
    const typesToDestroy: string[] = [];

    oldPublicIdsList.forEach((oldId, index) => {
      if (!newIdsList.includes(oldId)) {
        idsToDestroy.push(oldId);
        const type = oldResourceTypesList[index] || 'image';
        typesToDestroy.push(type);
      }
    });

    // 4. Destroy removed images synchronously to avoid orphaned assets
    if (idsToDestroy.length > 0) {
      await destroyMultipleAssets(idsToDestroy, typesToDestroy);
    }

    // Update listing core fields and replace Tolee mappings
    const listing = await prisma.listing.update({
      where: { id },
      data: {
        title: safeTitle,
        description: safeDescription,
        price: data.price,
        category: safeCategory,
        condition: safeCondition,
        locationText: safeLocationText,
        images: data.images,
        imagePublicIds: newImagePublicIds,
        imageResourceTypes: newImageResourceTypes,
        availability: safeAvailability,
        tags: safeTags,
        deliveryMethod: safeDeliveryMethod,
        contactPhone: safeContactPhone,
        contactWhatsApp: safeContactWhatsApp,
        contactEmail: safeContactEmail,
        attributes: data.attributes ? data.attributes : undefined,
        status: data.status || existingListing.status,
        tolees: {
          deleteMany: {},
          create: data.selectedToleeIds.map(toleeId => ({
            tolee: { connect: { id: toleeId } }
          }))
        }
      }
    });

    revalidatePath('/marketplace');
    revalidatePath(`/marketplace/listing/${id}`);
    return { success: true, listing };
  } catch (error) {
    console.error("Error updating listing:", error);
    return { success: false, error: 'Failed to update listing' };
  }
}

export async function deleteListing(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const listing = await prisma.listing.findUnique({
      where: { id }
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.sellerId !== userId) {
      return { success: false, error: 'You are not authorized to delete this listing' };
    }

    // Clean up Cloudinary assets resiliently (non-blocking)
    if (listing.imagePublicIds || listing.images) {
      let idsToDestroy: string[] = [];
      let typesToDestroy: string[] = [];

      if (listing.imagePublicIds) {
        idsToDestroy = listing.imagePublicIds.split(',').map(s => s.trim()).filter(Boolean);
        if (listing.imageResourceTypes) {
          typesToDestroy = listing.imageResourceTypes.split(',').map(s => s.trim());
        }
      } else if (listing.images) {
        const urls = listing.images.split(',').map(s => s.trim()).filter(Boolean);
        idsToDestroy = urls.map(url => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
        typesToDestroy = urls.map(url => extractResourceTypeFromUrl(url));
      }

      if (idsToDestroy.length > 0) {
        await destroyMultipleAssets(idsToDestroy, typesToDestroy);
      }
    }

    await prisma.listing.delete({
      where: { id }
    });

    revalidatePath('/marketplace');
    return { success: true };
  } catch (error) {
    console.error("Error deleting listing:", error);
    return { success: false, error: 'Failed to delete listing' };
  }
}

export async function updateListingStatus(id: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const listing = await prisma.listing.findUnique({
      where: { id }
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.sellerId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.listing.update({
      where: { id },
      data: { status }
    });

    revalidatePath('/marketplace');
    revalidatePath(`/marketplace/listing/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating listing status:", error);
    return { success: false, error: 'Failed to update status' };
  }
}
