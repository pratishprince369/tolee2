import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const filter = searchParams.get('filter') || 'all';
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (filter === 'suspended') where.isSuspended = true;
  if (filter === 'verified') where.isVerified = true;
  if (filter === 'restricted') {
    where.OR = [
      { postingRestricted: true },
      { messagingRestricted: true },
      { groupCreationRestricted: true },
      { commentRestricted: true },
      { reelsRestricted: true },
      { marketplaceRestricted: true }
    ];
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, username: true, avatar: true,
          isVerified: true, isSuspended: true, isBanned: true,
          postingRestricted: true, messagingRestricted: true,
          groupCreationRestricted: true, commentRestricted: true,
          reelsRestricted: true, marketplaceRestricted: true,
          suspensionReason: true, restrictionExpiresAt: true,
          createdAt: true, lastLoginAt: true, lastLoginIp: true,
          lastLoginDevice: true, trustScore: true,
          _count: { select: { posts: true, tolees: true, followers: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Users API Error]', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    const { action, userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (action === 'bulk_ban') {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isBanned: true, isSuspended: true, suspensionReason: 'Bulk banned by admin' }
      });

      // Audit log (non-blocking)
      await prisma.auditLog.create({
        data: {
          action: 'bulk_ban_users',
          target: userIds.join(','),
          targetType: 'user',
          details: `Bulk banned ${userIds.length} users`,
          ipAddress: ip
        }
      }).catch(() => {});

      return NextResponse.json({ success: true });
    } else if (action === 'bulk_delete') {
      for (const userId of userIds) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true, avatarPublicId: true, coverImage: true, coverImagePublicId: true }
          });
          if (user) {
            if (user.avatar) {
              const deleteId = user.avatarPublicId || extractPublicIdFromUrl(user.avatar);
              if (deleteId) {
                const resType = extractResourceTypeFromUrl(user.avatar);
                await destroyAsset(deleteId, resType).catch(() => {});
              }
            }
            if (user.coverImage) {
              const deleteId = user.coverImagePublicId || extractPublicIdFromUrl(user.coverImage);
              if (deleteId) {
                const resType = extractResourceTypeFromUrl(user.coverImage);
                await destroyAsset(deleteId, resType).catch(() => {});
              }
            }
          }
        } catch (cloudinaryErr) {
          console.error('[Cloudinary Bulk Clean Error]', cloudinaryErr);
        }
      }

      // Pre-clean database relations lacking cascade delete rules
      try {
        await prisma.storyView.deleteMany({
          where: {
            OR: [
              { story: { authorId: { in: userIds } } },
              { userId: { in: userIds } }
            ]
          }
        });
        await prisma.story.deleteMany({
          where: { authorId: { in: userIds } }
        });
        await prisma.postTolee.deleteMany({
          where: { post: { authorId: { in: userIds } } }
        });
        await prisma.like.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { post: { authorId: { in: userIds } } }
            ]
          }
        });
        await prisma.comment.deleteMany({
          where: {
            parentId: { not: null },
            OR: [
              { authorId: { in: userIds } },
              { post: { authorId: { in: userIds } } }
            ]
          }
        });
        await prisma.comment.deleteMany({
          where: {
            OR: [
              { authorId: { in: userIds } },
              { post: { authorId: { in: userIds } } }
            ]
          }
        });
        await prisma.savedPost.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { post: { authorId: { in: userIds } } }
            ]
          }
        });
        await prisma.repost.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { post: { authorId: { in: userIds } } }
            ]
          }
        });
        await prisma.post.deleteMany({
          where: { authorId: { in: userIds } }
        });
        await prisma.listingTolee.deleteMany({
          where: { listing: { sellerId: { in: userIds } } }
        });
        await prisma.listing.deleteMany({
          where: { sellerId: { in: userIds } }
        });

        const ownedTolees = await prisma.tolee.findMany({
          where: { ownerId: { in: userIds } },
          select: { id: true }
        });
        const ownedToleeIds = ownedTolees.map(t => t.id);
        if (ownedToleeIds.length > 0) {
          await prisma.postTolee.deleteMany({ where: { toleeId: { in: ownedToleeIds } } });
          await prisma.listingTolee.deleteMany({ where: { toleeId: { in: ownedToleeIds } } });
          await prisma.toleeMember.deleteMany({ where: { toleeId: { in: ownedToleeIds } } });
          await prisma.worldProjectTolee.deleteMany({ where: { toleeId: { in: ownedToleeIds } } });
          await prisma.tolee.deleteMany({ where: { id: { in: ownedToleeIds } } });
        }

        await prisma.toleeMember.deleteMany({
          where: { userId: { in: userIds } }
        });
        await prisma.chatParticipant.deleteMany({
          where: { userId: { in: userIds } }
        }).catch(() => {});
        await prisma.message.deleteMany({
          where: { senderId: { in: userIds } }
        });
        await prisma.follow.deleteMany({
          where: {
            OR: [
              { followerId: { in: userIds } },
              { followingId: { in: userIds } }
            ]
          }
        });
        await prisma.notification.deleteMany({
          where: { userId: { in: userIds } }
        });
        await prisma.lessonProgress.deleteMany({
          where: { userId: { in: userIds } }
        });
        await prisma.transaction.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (cleanErr) {
        console.error('[Clean Relations Error]', cleanErr);
      }

      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });


      // Audit log (non-blocking)
      await prisma.auditLog.create({
        data: {
          action: 'bulk_delete_users',
          target: userIds.join(','),
          targetType: 'user',
          details: `Bulk deleted ${userIds.length} users`,
          ipAddress: ip
        }
      }).catch(() => {});

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Bulk Action API Error]', err);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
