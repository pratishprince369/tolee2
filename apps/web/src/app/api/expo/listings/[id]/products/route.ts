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

// POST: Add new product to listing's microsite
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, originalPrice, discountPct, imageUrl, productUrl, category, isFeatured } = body;

    if (!name?.trim() || price === undefined) {
      return NextResponse.json({ success: false, error: 'Product name and price are required' }, { status: 400 });
    }

    // Ensure microsite exists
    let microsite = await prisma.expoMicrosite.findUnique({
      where: { listingId: params.id }
    });

    if (!microsite) {
      microsite = await prisma.expoMicrosite.create({
        data: { listingId: params.id }
      });
    }

    const product = await prisma.expoMicrositeProduct.create({
      data: {
        micrositeId: microsite.id,
        name: name.trim(),
        description: description?.trim() || null,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        discountPct: discountPct ? Number(discountPct) : null,
        imageUrl: imageUrl || null,
        productUrl: productUrl || null,
        category: category || null,
        isFeatured: Boolean(isFeatured)
      }
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Edit existing product
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { productId, name, description, price, originalPrice, discountPct, imageUrl, productUrl, category, isFeatured } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const updated = await prisma.expoMicrositeProduct.update({
      where: { id: productId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
        ...(discountPct !== undefined && { discountPct: Number(discountPct) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(productUrl !== undefined && { productUrl }),
        ...(category !== undefined && { category }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      }
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove product
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    await prisma.expoMicrositeProduct.delete({
      where: { id: productId }
    });

    return NextResponse.json({ success: true, message: 'Product removed' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
