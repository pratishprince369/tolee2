import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';
import { writeLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limit';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { createSafeErrorResponse } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return createRateLimitResponse(60);
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    
    const { name, bio, location, website, avatar, coverImage, username } = body;

    if ((avatar && typeof avatar === 'string' && avatar.startsWith('blob:')) || 
        (coverImage && typeof coverImage === 'string' && coverImage.startsWith('blob:'))) {
      return NextResponse.json({ success: false, error: 'Cannot save temporary blob URLs. Please upload image first.' }, { status: 400 });
    }

    const safeName = sanitizeText(name || '', 100);
    const safeBio = sanitizeText(bio || '', 500);
    const safeLocation = sanitizeText(location || '', 150);
    const safeWebsite = website ? sanitizeUrl(website) : '';
    const safeAvatar = avatar ? sanitizeUrl(avatar) : '';
    const safeCoverImage = coverImage ? sanitizeUrl(coverImage) : '';

    let finalUsername = undefined;
    if (username !== undefined && username !== null) {
      const cleanUsername = String(username).trim().toLowerCase();
      
      const existingDbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      
      if (existingDbUser?.username) {
        if (existingDbUser.username !== cleanUsername) {
          return NextResponse.json({ success: false, error: 'Username is permanent and cannot be changed.' }, { status: 400 });
        }
      } else if (cleanUsername !== '') {
        const RESERVED_USERNAMES = [
          'admin', 'feed', 'reels', 'me', 'u', 'tolee', 'api', 'chat', 'settings',
          'notifications', 'search', 'explore', 'auth', 'login', 'signup', 'signin',
          'logout', 'profile', 'support', 'help', 'contact', 'terms', 'privacy',
          'about', 'blog', 'jobs', 'press', 'super-admin'
        ];

        if (cleanUsername.length < 3) {
          return NextResponse.json({ success: false, error: 'Username must be at least 3 characters long.' }, { status: 400 });
        }
        if (cleanUsername.length > 30) {
          return NextResponse.json({ success: false, error: 'Username cannot exceed 30 characters.' }, { status: 400 });
        }
        if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
          return NextResponse.json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' }, { status: 400 });
        }
        if (RESERVED_USERNAMES.includes(cleanUsername)) {
          return NextResponse.json({ success: false, error: 'This username is a reserved keyword.' }, { status: 400 });
        }

        const existingUserWithUsername = await prisma.user.findFirst({
          where: {
            username: {
              equals: cleanUsername,
              mode: 'insensitive'
            }
          }
        });

        if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
          return NextResponse.json({ success: false, error: 'This username is already taken.' }, { status: 400 });
        }

        finalUsername = cleanUsername;
      }
    }

    // Fetch existing user to check for replaced assets
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarPublicId: true, coverImage: true, coverImagePublicId: true }
    });

    const newAvatarPublicId = body.avatarPublicId !== undefined 
      ? body.avatarPublicId 
      : (safeAvatar ? extractPublicIdFromUrl(safeAvatar) : null);
      
    const newCoverImagePublicId = body.coverImagePublicId !== undefined 
      ? body.coverImagePublicId 
      : (safeCoverImage ? extractPublicIdFromUrl(safeCoverImage) : null);

    if (existingUser) {
      if (existingUser.avatar && existingUser.avatar !== safeAvatar) {
        const deleteId = existingUser.avatarPublicId || extractPublicIdFromUrl(existingUser.avatar);
        if (deleteId) {
          const resType = extractResourceTypeFromUrl(existingUser.avatar);
          await destroyAsset(deleteId, resType);
        }
      }
      
      if (existingUser.coverImage && existingUser.coverImage !== safeCoverImage) {
        const deleteId = existingUser.coverImagePublicId || extractPublicIdFromUrl(existingUser.coverImage);
        if (deleteId) {
          const resType = extractResourceTypeFromUrl(existingUser.coverImage);
          await destroyAsset(deleteId, resType);
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: safeName,
        bio: safeBio,
        location: safeLocation,
        website: safeWebsite,
        avatar: safeAvatar,
        avatarPublicId: newAvatarPublicId,
        image: safeAvatar,
        coverImage: safeCoverImage,
        coverImagePublicId: newCoverImagePublicId,
        ...(finalUsername ? { username: finalUsername } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        location: true,
        website: true,
        avatar: true,
        image: true,
        coverImage: true,
        isPrivate: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return createSafeErrorResponse(error, 500, 'Failed to update user profile.', 'API_USER_PROFILE');
  }
}
