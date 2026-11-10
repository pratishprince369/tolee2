import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

function checkSuperAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
}

// GET: Fetch all expo listings for Super Admin with metrics
export async function GET(req: Request) {
  try {
    const admin = checkSuperAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Super Admin unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const [listings, packages, totalCount, pendingCount, approvedCount, rejectedCount, blockedCount, totalEnquiries] = await Promise.all([
      prisma.expoListing.findMany({
        where: whereClause,
        orderBy: [
          { isPinned: 'desc' },
          { displayOrder: 'asc' },
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          package: true,
          microsite: true,
          _count: { select: { enquiries: true } }
        }
      }),
      prisma.expoPackage.findMany({ orderBy: { defaultPriority: 'asc' } }),
      prisma.expoListing.count(),
      prisma.expoListing.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.expoListing.count({ where: { status: 'APPROVED' } }),
      prisma.expoListing.count({ where: { status: 'REJECTED' } }),
      prisma.expoListing.count({ where: { status: 'BLOCKED' } }),
      prisma.expoEnquiry.count(),
    ]);

    return NextResponse.json({
      success: true,
      listings,
      packages,
      metrics: {
        totalCount,
        pendingCount,
        approvedCount,
        rejectedCount,
        blockedCount,
        totalEnquiries
      }
    });
  } catch (err: any) {
    console.error('Super Admin Expo API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create listing for a client (Module 4)
export async function POST(req: Request) {
  try {
    const admin = checkSuperAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Super Admin unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      targetUserId,
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
      productName,
      offerLabel,
      offerDescription,
      originalPrice,
      expoPrice,
      discountPct,
      couponCode,
      packageId,
      amountPaid,
      paymentStatus,
      paymentTxnId,
      autoApprove
    } = body;

    if (!targetUserId || !brandName?.trim() || !contactNumber || !city || !productName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Target Client User, Brand Name, Product Offer, Contact, and City are required.' },
        { status: 400 }
      );
    }

    // Verify target client user exists
    const clientUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true }
    });

    if (!clientUser) {
      return NextResponse.json({ success: false, error: 'Selected client user does not exist.' }, { status: 404 });
    }

    // Generate unique slug
    let baseSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client-stall';
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await prisma.expoListing.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    const orig = Number(originalPrice) || Number(expoPrice) || 0;
    const exp = Number(expoPrice) || orig;
    const disc = orig > exp ? Math.round(((orig - exp) / orig) * 100) : (Number(discountPct) || 0);

    const listing = await prisma.expoListing.create({
      data: {
        userId: clientUser.id,
        createdById: admin.email || 'SUPER_ADMIN',
        packageId: packageId || null,
        status: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
        brandName: brandName.trim(),
        slug: uniqueSlug,
        category: category?.toLowerCase() || 'general',
        subcategory: subcategory?.trim() || null,
        shortDescription: shortDescription?.trim() || brandName,
        fullDescription: fullDescription?.trim() || shortDescription?.trim() || brandName,
        ownerName: ownerName?.trim() || clientUser.name,
        contactNumber: contactNumber.trim(),
        whatsappNumber: whatsappNumber?.trim() || contactNumber.trim(),
        email: email?.trim() || clientUser.email,
        websiteUrl: websiteUrl?.trim() || null,
        address: address?.trim() || null,
        city: city.trim(),
        state: state?.trim() || 'India',
        logoUrl: logoUrl || null,
        coverUrl: coverUrl || null,
        thumbnailUrl: logoUrl || coverUrl || null,
        productName: productName.trim(),
        offerLabel: offerLabel?.trim() || 'SPECIAL EXPO DEAL',
        offerDescription: offerDescription?.trim() || shortDescription?.trim() || '',
        originalPrice: orig,
        expoPrice: exp,
        discountPct: disc,
        couponCode: couponCode?.trim() || null,
        amountPaid: Number(amountPaid) || 0,
        paymentStatus: paymentStatus || (paymentTxnId ? 'MANUAL_VERIFIED' : 'PENDING'),
        paymentTxnId: paymentTxnId || null,
        paymentDate: paymentTxnId ? new Date() : null,
        isVerified: true,
        microsite: {
          create: {
            template: 'vcard-modern-1',
            businessHours: {
              monday: '09:30 AM - 08:00 PM',
              saturday: '10:00 AM - 09:00 PM',
              sunday: '11:00 AM - 06:00 PM'
            },
            socialLinks: {
              whatsapp: `https://wa.me/${(whatsappNumber || contactNumber).replace(/[^0-9]/g, '')}`,
              website: websiteUrl || null
            },
            products: {
              create: [
                {
                  name: productName.trim(),
                  description: offerDescription?.trim() || shortDescription?.trim(),
                  price: exp,
                  originalPrice: orig,
                  discountPct: disc,
                  imageUrl: coverUrl || logoUrl || null,
                  isFeatured: true
                }
              ]
            }
          }
        },
        activityLogs: {
          create: {
            action: 'CREATED_BY_SUPER_ADMIN',
            performedBy: admin.email || 'SUPER_ADMIN',
            role: 'SUPER_ADMIN',
            details: { clientUserId: clientUser.id, initialStatus: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL' }
          }
        }
      },
      include: {
        microsite: true
      }
    });

    // Notify client user
    await prisma.notification.create({
      data: {
        userId: clientUser.id,
        type: 'expo_listing_created',
        message: `Super Admin has created a new Tolee Expo Listing for your brand: "${listing.brandName}". Manage it in your My Expo Listings dashboard.`,
        link: `/expo/my-listings/${listing.id}/builder`
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Listing created for client successfully.',
      listing
    });
  } catch (err: any) {
    console.error('Super Admin create listing error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
