import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

async function verifyListingOwner(listingId: string) {
  const cookieStore = cookies();
  const saToken = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;
  if (saToken && verifySuperAdminToken(saToken)) return true;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return false;

  const listing = await prisma.expoListing.findUnique({
    where: { id: listingId },
    select: { userId: true }
  });

  return listing?.userId === userId;
}

// POST: Add gallery item
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { title, mediaType, mediaUrl, isFeatured } = body;

    if (!mediaUrl) {
      return NextResponse.json({ success: false, error: 'Media URL is required' }, { status: 400 });
    }

    let microsite = await prisma.expoMicrosite.findUnique({
      where: { listingId: params.id }
    });

    if (!microsite) {
      microsite = await prisma.expoMicrosite.create({
        data: { listingId: params.id }
      });
    }

    const item = await prisma.expoMicrositeGallery.create({
      data: {
        micrositeId: microsite.id,
        title: title?.trim() || null,
        mediaType: mediaType || 'image',
        mediaUrl,
        isFeatured: Boolean(isFeatured)
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove gallery item
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'Gallery Item ID required' }, { status: 400 });
    }

    await prisma.expoMicrositeGallery.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ success: true, message: 'Item removed' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
