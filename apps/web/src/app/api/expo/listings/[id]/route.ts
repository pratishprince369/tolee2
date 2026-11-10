import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

async function verifyAccess(listingId: string) {
  // Check Super Admin token
  const cookieStore = cookies();
  const saToken = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;
  if (saToken) {
    const verified = verifySuperAdminToken(saToken);
    if (verified) return { isSuperAdmin: true, userId: null };
  }

  // Check User session
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return null;

  const listing = await prisma.expoListing.findUnique({
    where: { id: listingId },
    select: { userId: true }
  });

  if (!listing || listing.userId !== userId) return null;

  return { isSuperAdmin: false, userId };
}

// GET: Fetch listing details with microsite, products, gallery, enquiries
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const access = await verifyAccess(params.id);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Unauthorized or listing not found' }, { status: 403 });
    }

    const listing = await prisma.expoListing.findUnique({
      where: { id: params.id },
      include: {
        package: true,
        microsite: {
          include: {
            products: { orderBy: { sortOrder: 'asc' } },
            gallery: { orderBy: { sortOrder: 'asc' } },
            sections: { orderBy: { sortOrder: 'asc' } }
          }
        },
        enquiries: { orderBy: { createdAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, listing });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update listing / microsite
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const access = await verifyAccess(params.id);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const {
      brandName,
      category,
      subcategory,
      shortDescription,
      fullDescription,
      ownerName,
      contactNumber,
      whatsappNumber,
      email,
      websiteUrl,
      address,
      city,
      state,
      logoUrl,
      coverUrl,
      bannerUrl,
      primaryColor,
      productName,
      offerLabel,
      offerDescription,
      originalPrice,
      expoPrice,
      discountPct,
      couponCode,
      features,
      tags,
      // Microsite specifics
      businessHours,
      socialLinks,
      customCss,
      // Super admin approval / priority fields
      status,
      rejectionReason,
      displayOrder,
      isFeatured,
      isPinned,
      isVerified
    } = body;

    // Normal users cannot directly approve or change display priority
    const updateData: any = {
      ...(brandName && { brandName: brandName.trim() }),
      ...(category && { category: category.toLowerCase() }),
      ...(subcategory !== undefined && { subcategory }),
      ...(shortDescription && { shortDescription: shortDescription.trim() }),
      ...(fullDescription && { fullDescription: fullDescription.trim() }),
      ...(ownerName && { ownerName }),
      ...(contactNumber && { contactNumber }),
      ...(whatsappNumber && { whatsappNumber }),
      ...(email && { email }),
      ...(websiteUrl !== undefined && { websiteUrl }),
      ...(address !== undefined && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(primaryColor && { primaryColor }),
      ...(productName && { productName }),
      ...(offerLabel && { offerLabel }),
      ...(offerDescription && { offerDescription }),
      ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
      ...(expoPrice !== undefined && { expoPrice: Number(expoPrice) }),
      ...(discountPct !== undefined && { discountPct: Number(discountPct) }),
      ...(couponCode !== undefined && { couponCode }),
      ...(features && { features }),
      ...(tags && { tags }),
    };

    // If Super Admin, allow status change, displayOrder, isFeatured, isPinned
    if (access.isSuperAdmin) {
      if (status) updateData.status = status;
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
      if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
      if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
      if (isVerified !== undefined) updateData.isVerified = Boolean(isVerified);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const listing = await tx.expoListing.update({
        where: { id: params.id },
        data: updateData
      });

      // Update microsite if provided
      if (businessHours || socialLinks || customCss !== undefined) {
        await tx.expoMicrosite.upsert({
          where: { listingId: params.id },
          create: {
            listingId: params.id,
            businessHours: businessHours || {},
            socialLinks: socialLinks || {},
            customCss: customCss || null
          },
          update: {
            ...(businessHours && { businessHours }),
            ...(socialLinks && { socialLinks }),
            ...(customCss !== undefined && { customCss })
          }
        });
      }

      // Log activity
      await tx.expoActivityLog.create({
        data: {
          listingId: params.id,
          action: access.isSuperAdmin && status ? `STATUS_${status}` : 'EDITED',
          performedBy: access.isSuperAdmin ? 'SUPER_ADMIN' : access.userId!,
          role: access.isSuperAdmin ? 'SUPER_ADMIN' : 'OWNER',
          details: { updatedFields: Object.keys(body) }
        }
      });

      return listing;
    });

    return NextResponse.json({ success: true, listing: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove listing
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const access = await verifyAccess(params.id);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.expoListing.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Listing deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
