import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    const body = await req.json();
    const { action, reason } = body;
    const userId = params.id;

    let updateData: any = {};
    let auditAction = '';

    switch (action) {
      case 'update_moderation':
        const {
          isSuspended,
          isBanned,
          suspensionReason,
          postingRestricted,
          messagingRestricted,
          groupCreationRestricted,
          commentRestricted,
          reelsRestricted,
          marketplaceRestricted,
          restrictionExpiresAt
        } = body;
        updateData = {
          isSuspended: !!isSuspended,
          isBanned: !!isBanned,
          suspensionReason: suspensionReason || null,
          postingRestricted: !!postingRestricted,
          messagingRestricted: !!messagingRestricted,
          groupCreationRestricted: !!groupCreationRestricted,
          commentRestricted: !!commentRestricted,
          reelsRestricted: !!reelsRestricted,
          marketplaceRestricted: !!marketplaceRestricted,
          restrictionExpiresAt: restrictionExpiresAt ? new Date(restrictionExpiresAt) : null
        };
        auditAction = 'update_moderation_settings';
        break;
      case 'suspend':
        updateData = { isSuspended: true, suspensionReason: reason || 'Suspended by admin' };
        auditAction = 'suspend_user'; break;
      case 'unsuspend':
        updateData = { isSuspended: false, suspensionReason: null };
        auditAction = 'unsuspend_user'; break;
      case 'verify':
        updateData = { isVerified: true };
        auditAction = 'verify_user'; break;
      case 'unverify':
        updateData = { isVerified: false };
        auditAction = 'unverify_user'; break;
      case 'restrict_posting':
        updateData = { postingRestricted: true };
        auditAction = 'restrict_posting'; break;
      case 'unrestrict_posting':
        updateData = { postingRestricted: false };
        auditAction = 'unrestrict_posting'; break;
      case 'restrict_messaging':
        updateData = { messagingRestricted: true };
        auditAction = 'restrict_messaging'; break;
      case 'unrestrict_messaging':
        updateData = { messagingRestricted: false };
        auditAction = 'unrestrict_messaging'; break;
      case 'delete':
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            avatar: true,
            avatarPublicId: true,
            coverImage: true,
            coverImagePublicId: true
          }
        });
        if (user) {
          

          if (user.avatar) {
            const deleteId = user.avatarPublicId || extractPublicIdFromUrl(user.avatar);
            if (deleteId) {
              const resType = extractResourceTypeFromUrl(user.avatar);
              await destroyAsset(deleteId, resType);
            }
          }

          if (user.coverImage) {
            const deleteId = user.coverImagePublicId || extractPublicIdFromUrl(user.coverImage);
            if (deleteId) {
              const resType = extractResourceTypeFromUrl(user.coverImage);
              await destroyAsset(deleteId, resType);
            }
          }
        }
        // Pre-clean database relations lacking cascade delete rules
        try {
          const uIds = [userId];
          await prisma.storyView.deleteMany({
            where: {
              OR: [
                { story: { authorId: { in: uIds } } },
                { userId: { in: uIds } }
              ]
            }
          });
          await prisma.story.deleteMany({
            where: { authorId: { in: uIds } }
          });
          await prisma.postTolee.deleteMany({
            where: { post: { authorId: { in: uIds } } }
          });
          await prisma.like.deleteMany({
            where: {
              OR: [
                { userId: { in: uIds } },
                { post: { authorId: { in: uIds } } }
              ]
            }
          });
          await prisma.comment.deleteMany({
            where: {
              parentId: { not: null },
              OR: [
                { authorId: { in: uIds } },
                { post: { authorId: { in: uIds } } }
              ]
            }
          });
          await prisma.comment.deleteMany({
            where: {
              OR: [
                { authorId: { in: uIds } },
                { post: { authorId: { in: uIds } } }
              ]
            }
          });
          await prisma.savedPost.deleteMany({
            where: {
              OR: [
                { userId: { in: uIds } },
                { post: { authorId: { in: uIds } } }
              ]
            }
          });
          await prisma.repost.deleteMany({
            where: {
              OR: [
                { userId: { in: uIds } },
                { post: { authorId: { in: uIds } } }
              ]
            }
          });
          await prisma.post.deleteMany({
            where: { authorId: { in: uIds } }
          });
          await prisma.listingTolee.deleteMany({
            where: { listing: { sellerId: { in: uIds } } }
          });
          await prisma.listing.deleteMany({
            where: { sellerId: { in: uIds } }
          });

          const ownedTolees = await prisma.tolee.findMany({
            where: { ownerId: { in: uIds } },
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
            where: { userId: { in: uIds } }
          });
          await prisma.chatParticipant.deleteMany({
            where: { userId: { in: uIds } }
          }).catch(() => {});
          await prisma.message.deleteMany({
            where: { senderId: { in: uIds } }
          });
          await prisma.follow.deleteMany({
            where: {
              OR: [
                { followerId: { in: uIds } },
                { followingId: { in: uIds } }
              ]
            }
          });
          await prisma.notification.deleteMany({
            where: { userId: { in: uIds } }
          });
          await prisma.lessonProgress.deleteMany({
            where: { userId: { in: uIds } }
          });
          await prisma.transaction.deleteMany({
            where: { userId: { in: uIds } }
          });
        } catch (cleanErr) {
          console.error('[Clean Relations Error]', cleanErr);
        }

        await prisma.user.delete({ where: { id: userId } });
        await prisma.auditLog.create({ data: { action: 'delete_user', target: userId, targetType: 'user', ipAddress: ip } });
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });
    await prisma.auditLog.create({
      data: {
        action: auditAction,
        target: userId,
        targetType: 'user',
        details: JSON.stringify({ reason: reason || suspensionReason || body.reason || body.suspensionReason, ...updateData }),
        ipAddress: ip
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[User Action Error]', err);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
