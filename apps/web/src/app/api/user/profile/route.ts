import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';

export async function PUT(req: Request) {
  try {
    const { writeLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    console.log('UPDATING PROFILE FOR USER:', userId, 'WITH DATA:', body);
    
        const { name, bio, location, website, avatar, coverImage, username } = body;
    console.log('VALIDATING DATA:', { avatar, coverImage, username });

    if ((avatar && avatar.startsWith('blob:')) || (coverImage && coverImage.startsWith('blob:'))) {
      console.error('REJECTED BLOB URL IN PROFILE UPDATE:', { avatar, coverImage });
      return NextResponse.json({ error: 'Cannot save temporary blob URLs. Upload failed.' }, { status: 400 });
    }

    const { sanitizeText, sanitizeUrl } = require('@/lib/sanitize');
    const safeName = sanitizeText(name || '', 100);
    const safeBio = sanitizeText(bio || '', 500);
    const safeLocation = sanitizeText(location || '', 150);
    const safeWebsite = website ? sanitizeUrl(website) : '';
    const safeAvatar = avatar ? sanitizeUrl(avatar) : '';
    const safeCoverImage = coverImage ? sanitizeUrl(coverImage) : '';

    let finalUsername = undefined;
    if (username !== undefined && username !== null) {
      const cleanUsername = username.trim().toLowerCase();
      
      const existingDbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      
      if (existingDbUser?.username) {
        if (existingDbUser.username !== cleanUsername) {
          return NextResponse.json({ error: 'Username is permanent and cannot be changed.' }, { status: 400 });
        }
      } else if (cleanUsername !== '') {
        const RESERVED_USERNAMES = [
          'admin', 'feed', 'reels', 'me', 'u', 'tolee', 'api', 'chat', 'settings',
          'notifications', 'search', 'explore', 'auth', 'login', 'signup', 'signin',
          'logout', 'profile', 'support', 'help', 'contact', 'terms', 'privacy',
          'about', 'blog', 'jobs', 'press'
        ];

        if (cleanUsername.length < 3) {
          return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
        }
        if (cleanUsername.length > 30) {
          return NextResponse.json({ error: 'Username cannot exceed 30 characters.' }, { status: 400 });
        }
        if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
          return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores.' }, { status: 400 });
        }
        if (RESERVED_USERNAMES.includes(cleanUsername)) {
          return NextResponse.json({ error: 'This username is a reserved keyword.' }, { status: 400 });
        }

        const existingUserWithUsername = await prisma.user.findFirst({
          where: {
            username: {
              equals: cleanUsername,
              mode: 'insensitive'
            }
          }
        });

        if (existingUserWithUsername) {
          return NextResponse.json({ error: 'This username is already taken.' }, { status: 400 });
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
      // Check avatar replacement
      if (existingUser.avatar && existingUser.avatar !== safeAvatar) {
        const deleteId = existingUser.avatarPublicId || extractPublicIdFromUrl(existingUser.avatar);
        if (deleteId) {
          const resType = extractResourceTypeFromUrl(existingUser.avatar);
          // Trapped destruction (blocking/awaited)
          await destroyAsset(deleteId, resType);
        }
      }
      
      // Check coverImage replacement
      if (existingUser.coverImage && existingUser.coverImage !== safeCoverImage) {
        const deleteId = existingUser.coverImagePublicId || extractPublicIdFromUrl(existingUser.coverImage);
        if (deleteId) {
          const resType = extractResourceTypeFromUrl(existingUser.coverImage);
          await destroyAsset(deleteId, resType);
        }
      }
    }

    console.log('DATABASE: Updating user in Prisma...', userId);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: safeName,
        bio: safeBio,
        location: safeLocation,
        website: safeWebsite,
        avatar: safeAvatar,
        avatarPublicId: newAvatarPublicId,
        image: safeAvatar, // Also synchronize NextAuth image!
        coverImage: safeCoverImage,
        coverImagePublicId: newCoverImagePublicId,
        ...(finalUsername ? { username: finalUsername } : {}),
      },
    });
    console.log('DATABASE: Update successful!');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
