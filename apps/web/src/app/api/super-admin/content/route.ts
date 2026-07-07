import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { revalidatePath } from 'next/cache';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyMultipleAssets } from '@/lib/cloudinary-cleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all'; // all, reels, listings, flagged, hidden, reported
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    let items: any[] = [];
    let total = 0;

    if (filter === 'world_projects') {
      const [projects, count] = await Promise.all([
        prisma.worldProject.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, name: true, avatar: true, email: true } },
          },
        }).catch(() => []),
        prisma.worldProject.count().catch(() => 0),
      ]);

      items = projects.map((wp: any) => ({
        id: wp.id,
        caption: wp.description || '',
        mediaUrls: wp.bannerImage ? [wp.bannerImage] : [],
        status: wp.status === 'published' ? 'published' : wp.status === 'hidden' ? 'rejected' : 'pending',
        createdAt: wp.createdAt,
        type: 'world_project',
        author: wp.creator,
        _count: { likes: 0, comments: 0, views: wp.views || 0 },
        projectName: wp.name,
        projectSlug: wp.slug,
        projectType: wp.type,
      }));
      total = count;
    } else if (filter === 'listings') {
      const [listings, count] = await Promise.all([
        prisma.listing.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            seller: { select: { id: true, name: true, avatar: true, email: true } },
          },
        }).catch(() => []),
        prisma.listing.count().catch(() => 0),
      ]);

      // Normalize marketplace listings to match post interface for easy rendering
      items = listings.map((l: any) => ({
        id: l.id,
        caption: `${l.title} - INR ${l.price} (${l.category}) \n${l.description}`,
        mediaUrls: l.images,
        status: l.status === 'active' ? 'published' : l.status === 'hidden' ? 'rejected' : 'pending',
        createdAt: l.createdAt,
        type: 'listing',
        author: l.seller,
        _count: { likes: 0, comments: 0, views: l.viewCount || 0 },
      }));
      total = count;
    } else {
      // It's a post type query (regular posts, reels, flagged, reported, hidden)
      const where: any = {};

      if (filter === 'all') {
        where.NOT = { postType: 'reel' };
      } else if (filter === 'reels') {
        where.postType = 'reel';
      } else if (filter === 'flagged') {
        where.status = 'flagged_ai';
      } else if (filter === 'reported') {
        where.status = { in: ['flagged_ai', 'pending'] };
      } else if (filter === 'hidden') {
        where.status = 'rejected';
      }

      const [posts, count] = await Promise.all([
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, avatar: true, email: true } },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        }).catch(() => []),
        prisma.post.count({ where }).catch(() => 0),
      ]);

      items = posts.map((p: any) => ({
        id: p.id,
        caption: p.caption,
        mediaUrls: p.mediaUrls,
        status: p.status,
        createdAt: p.createdAt,
        type: p.postType === 'reel' ? 'reel' : p.postType === 'news' ? 'news' : 'post',
        author: p.author,
        _count: p._count,
      }));
      total = count;
    }

    return NextResponse.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Content API Error]', err);
    return NextResponse.json({ error: `Failed to fetch content: ${err?.message || err}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  const decodedToken = token ? verifySuperAdminToken(token) : null;
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, action, type } = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const adminEmail = decodedToken.email || 'unknown-admin';

  try {
    const isListing = type === 'listing';
    const isWorldProject = type === 'world_project';

    if (action === 'delete') {
      if (isWorldProject) {
        // Fetch details prior to deletion
        const project = await prisma.worldProject.findUnique({
          where: { id },
          include: {
            tolees: {
              include: {
                tolee: { select: { slug: true } }
              }
            }
          }
        });

        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Hard delete project
        await prisma.worldProject.delete({ where: { id } });

        // Retrieve admin database User record (if matches email)
        const adminUser = await prisma.user.findFirst({
          where: { email: { equals: adminEmail, mode: 'insensitive' } }
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            action: 'delete_world_project',
            target: id,
            targetType: 'world_project',
            adminId: adminUser?.id || null,
            ipAddress: ip,
            details: JSON.stringify({
              adminEmail,
              projectId: id,
              name: project.name,
              slug: project.slug,
              type: project.type,
              timestamp: new Date()
            })
          }
        });

        // Revalidate Paths
        try {
          revalidatePath('/');
          revalidatePath('/world');
          revalidatePath('/feed');
          let pagePrefix = '';
          if (project.type === 'WEBSITE') pagePrefix = 'micro-website';
          else if (project.type === 'BLOG') pagePrefix = 'blog';
          else if (project.type === 'RESTAURANT') pagePrefix = 'restaurant';
          else if (project.type === 'STORE') pagePrefix = 'store';
          if (pagePrefix) {
            revalidatePath(`/${pagePrefix}/${project.slug}`);
          }
          for (const item of project.tolees) {
            if (item.tolee?.slug) {
              revalidatePath(`/t/${item.tolee.slug}`);
            }
          }
        } catch (revalError) {
          console.error("Cache revalidation error:", revalError);
        }
      } else if (isListing) {
        // Fetch details prior to deletion
        const listing = await prisma.listing.findUnique({
          where: { id },
          include: {
            tolees: {
              include: {
                tolee: {
                  select: { slug: true }
                }
              }
            }
          }
        });

        if (!listing) {
          return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Clean up Cloudinary assets resiliently prior to database deletion
        if (listing.imagePublicIds || listing.images) {
          let idsToDestroy: string[] = [];
          let typesToDestroy: string[] = [];

          if (listing.imagePublicIds) {
            idsToDestroy = listing.imagePublicIds.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (listing.imageResourceTypes) {
              typesToDestroy = listing.imageResourceTypes.split(',').map((s: string) => s.trim());
            }
          } else if (listing.images) {
            const urls = listing.images.split(',').map((s: string) => s.trim()).filter(Boolean);
            idsToDestroy = urls.map((url: string) => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
            typesToDestroy = urls.map((url: string) => extractResourceTypeFromUrl(url));
          }

          if (idsToDestroy.length > 0) {
            await destroyMultipleAssets(idsToDestroy, typesToDestroy);
          }
        }

        // Hard delete listing (ListingTolee cascades automatically)
        await prisma.listing.delete({ where: { id } });

        // Retrieve admin database User record (if matches email)
        const adminUser = await prisma.user.findFirst({
          where: { email: { equals: adminEmail, mode: 'insensitive' } }
        });

        // Detailed Audit Log
        await prisma.auditLog.create({
          data: {
            action: 'delete_listing',
            target: id,
            targetType: 'listing',
            adminId: adminUser?.id || null,
            ipAddress: ip,
            details: JSON.stringify({
              adminEmail,
              listingId: id,
              title: listing.title,
              sellerId: listing.sellerId,
              timestamp: new Date()
            })
          }
        });

        // Revalidate Paths immediately
        try {
          revalidatePath('/');
          revalidatePath('/marketplace');
          revalidatePath(`/marketplace/listing/${id}`);
          revalidatePath('/search');

          // Revalidate paths for all groups/Tolees that this listing was shared in
          for (const item of listing.tolees) {
            if (item.tolee?.slug) {
              revalidatePath(`/t/${item.tolee.slug}`);
            }
          }
        } catch (revalError) {
          console.error("Cache revalidation error:", revalError);
        }

      } else {
        // For post deletion
        const post = await prisma.post.findUnique({
          where: { id }
        });

        if (post) {
          // Clean up post/reel media from Cloudinary!
          if (post.mediaUrls || post.mediaPublicIds) {
            
            let idsToDestroy: string[] = [];
            let typesToDestroy: string[] = [];
            
            if (post.mediaPublicIds) {
              idsToDestroy = post.mediaPublicIds.split(',').map((s: string) => s.trim()).filter(Boolean);
              if (post.mediaResourceTypes) {
                typesToDestroy = post.mediaResourceTypes.split(',').map((s: string) => s.trim());
              }
            } else if (post.mediaUrls) {
              const urls = post.mediaUrls.split(',').map((s: string) => s.trim()).filter(Boolean);
              idsToDestroy = urls.map((url: string) => extractPublicIdFromUrl(url)).filter(Boolean) as string[];
              typesToDestroy = urls.map((url: string) => extractResourceTypeFromUrl(url));
            }
            
            if (idsToDestroy.length > 0) {
              await destroyMultipleAssets(idsToDestroy, typesToDestroy);
            }
          }
        }

        await prisma.post.delete({ where: { id } });

        const adminUser = await prisma.user.findFirst({
          where: { email: { equals: adminEmail, mode: 'insensitive' } }
        });

        await prisma.auditLog.create({
          data: {
            action: 'delete_post',
            target: id,
            targetType: 'post',
            adminId: adminUser?.id || null,
            ipAddress: ip,
            details: JSON.stringify({
              adminEmail,
              postId: id,
              authorId: post?.authorId,
              timestamp: new Date()
            })
          }
        });

        try {
          revalidatePath('/');
          revalidatePath('/feed');
          revalidatePath('/reels');
        } catch (revalError) {
          console.error("Cache revalidation error:", revalError);
        }
      }

      return NextResponse.json({ success: true });
    }

    // Moderate / Update status
    let updateData: any = {};
    let auditAction = '';

    if (isWorldProject) {
      if (action === 'hide') {
        updateData = { status: 'hidden' };
        auditAction = 'hide_world_project';
      } else {
        updateData = { status: 'published' };
        auditAction = 'restore_world_project';
      }
      await prisma.worldProject.update({ where: { id }, data: updateData });
    } else if (isListing) {
      if (action === 'hide') {
        updateData = { status: 'hidden' };
        auditAction = 'hide_listing';
      } else {
        updateData = { status: 'active' };
        auditAction = 'restore_listing';
      }
      await prisma.listing.update({ where: { id }, data: updateData });
    } else {
      if (action === 'hide') {
        updateData = { status: 'rejected' };
        auditAction = 'hide_post';
      } else if (action === 'restore' || action === 'approve') {
        updateData = { status: 'published' };
        auditAction = 'restore_post';
      }
      await prisma.post.update({ where: { id }, data: updateData });
    }

    const adminUser = await prisma.user.findFirst({
      where: { email: { equals: adminEmail, mode: 'insensitive' } }
    });

    await prisma.auditLog.create({
      data: {
        action: auditAction,
        target: id,
        targetType: isListing ? 'listing' : isWorldProject ? 'world_project' : 'post',
        adminId: adminUser?.id || null,
        ipAddress: ip,
        details: JSON.stringify({
          adminEmail,
          timestamp: new Date()
        })
      },
    });

    // Also trigger path revalidation for hides/restores/approvals
    try {
      if (isWorldProject) {
        revalidatePath('/world');
        revalidatePath('/feed');
        revalidatePath('/');
        const project = await prisma.worldProject.findUnique({
          where: { id },
          include: { tolees: { include: { tolee: { select: { slug: true } } } } }
        });
        if (project) {
          let pagePrefix = '';
          if (project.type === 'WEBSITE') pagePrefix = 'micro-website';
          else if (project.type === 'BLOG') pagePrefix = 'blog';
          else if (project.type === 'RESTAURANT') pagePrefix = 'restaurant';
          else if (project.type === 'STORE') pagePrefix = 'store';
          if (pagePrefix) {
            revalidatePath(`/${pagePrefix}/${project.slug}`);
          }
          for (const item of project.tolees) {
            if (item.tolee?.slug) {
              revalidatePath(`/t/${item.tolee.slug}`);
            }
          }
        }
      } else if (isListing) {
        revalidatePath('/marketplace');
        revalidatePath(`/marketplace/listing/${id}`);
        revalidatePath('/search');
        revalidatePath('/');
        
        // Fetch listing's associated Tolees to revalidate them
        const listing = await prisma.listing.findUnique({
          where: { id },
          include: { tolees: { include: { tolee: { select: { slug: true } } } } }
        });
        if (listing) {
          for (const item of listing.tolees) {
            if (item.tolee?.slug) {
              revalidatePath(`/t/${item.tolee.slug}`);
            }
          }
        }
      } else {
        revalidatePath('/');
        revalidatePath('/feed');
        revalidatePath('/reels');
      }
    } catch (revalError) {
      console.error("Cache revalidation error:", revalError);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Moderation Action Error]', err);
    return NextResponse.json({ error: `Failed to update content: ${err?.message || err}` }, { status: 500 });
  }
}
