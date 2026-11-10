import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Fetch authenticated user's listings
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const listings = await prisma.expoListing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        package: true,
        microsite: {
          include: {
            products: true,
            gallery: true
          }
        },
        _count: {
          select: { enquiries: true }
        }
      }
    });

    return NextResponse.json({ success: true, listings });
  } catch (err: any) {
    console.error('Error fetching user expo listings:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch listings' }, { status: 500 });
  }
}

// POST: Create a new listing with multi-step data
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      // Step 1: Business Info
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
      country,
      googleMapsUrl,

      // Step 2: Branding
      logoUrl,
      coverUrl,
      bannerUrl,
      profileUrl,
      primaryColor,
      secondaryColor,

      // Step 3: Expo Offer
      productName,
      offerLabel,
      offerDescription,
      originalPrice,
      expoPrice,
      discountPct,
      couponCode,
      tags,
      features,
      thumbnailUrl,

      // Step 4: Slug & Microsite
      customSlug,

      // Step 5: Package
      packageId,
      amountPaid,
      paymentTxnId
    } = body;

    if (!brandName?.trim() || !category || !productName?.trim() || !contactNumber || !city) {
      return NextResponse.json(
        { success: false, error: 'Brand name, category, product offer, phone number, and city are required.' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let baseSlug = (customSlug || brandName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'expo-brand';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.expoListing.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Calculate discount % if not provided
    const orig = Number(originalPrice) || Number(expoPrice) || 0;
    const exp = Number(expoPrice) || orig;
    const computedDiscount = orig > exp ? Math.round(((orig - exp) / orig) * 100) : (discountPct || 0);

    // Save in database inside transaction
    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.expoListing.create({
        data: {
          userId,
          packageId: packageId || null,
          status: 'PENDING_APPROVAL', // Strict approval rule: never auto-approved
          brandName: brandName.trim(),
          slug: uniqueSlug,
          category: category.toLowerCase(),
          subcategory: subcategory?.trim() || null,
          shortDescription: shortDescription?.trim() || offerDescription?.trim() || brandName,
          fullDescription: fullDescription?.trim() || shortDescription?.trim() || brandName,
          ownerName: ownerName?.trim() || session?.user?.name || brandName,
          contactNumber: contactNumber.trim(),
          whatsappNumber: whatsappNumber?.trim() || contactNumber.trim(),
          email: email?.trim() || session?.user?.email || '',
          websiteUrl: websiteUrl?.trim() || null,
          address: address?.trim() || null,
          city: city.trim(),
          state: state?.trim() || 'India',
          country: country?.trim() || 'India',
          googleMapsUrl: googleMapsUrl?.trim() || null,
          logoUrl: logoUrl || thumbnailUrl || null,
          coverUrl: coverUrl || null,
          bannerUrl: bannerUrl || null,
          profileUrl: profileUrl || logoUrl || null,
          primaryColor: primaryColor || '#0D9488',
          secondaryColor: secondaryColor || '#0F172A',
          productName: productName.trim(),
          offerLabel: offerLabel?.trim() || 'FLAT DISCOUNT EXPO DEAL',
          offerDescription: offerDescription?.trim() || shortDescription?.trim() || '',
          originalPrice: orig,
          expoPrice: exp,
          discountPct: computedDiscount,
          couponCode: couponCode?.trim() || null,
          tags: Array.isArray(tags) ? tags : [],
          features: Array.isArray(features) ? features : [],
          thumbnailUrl: thumbnailUrl || logoUrl || null,
          amountPaid: Number(amountPaid) || 0,
          paymentStatus: paymentTxnId ? 'MANUAL_VERIFIED' : 'PENDING',
          paymentTxnId: paymentTxnId || null,
          paymentDate: paymentTxnId ? new Date() : null,
          microsite: {
            create: {
              template: 'vcard-modern-1',
              businessHours: {
                monday: '09:30 AM - 08:00 PM',
                tuesday: '09:30 AM - 08:00 PM',
                wednesday: '09:30 AM - 08:00 PM',
                thursday: '09:30 AM - 08:00 PM',
                friday: '09:30 AM - 08:00 PM',
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
                    discountPct: computedDiscount,
                    imageUrl: thumbnailUrl || coverUrl || null,
                    isFeatured: true
                  }
                ]
              }
            }
          },
          activityLogs: {
            create: {
              action: 'SUBMITTED',
              performedBy: userId,
              role: 'OWNER',
              details: { initialStatus: 'PENDING_APPROVAL' }
            }
          }
        },
        include: {
          microsite: true
        }
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: 'Expo listing submitted successfully and is pending approval.',
      listing
    });
  } catch (err: any) {
    console.error('Error creating expo listing:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to create listing' }, { status: 500 });
  }
}
