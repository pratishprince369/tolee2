import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      listingId,
      customerName,
      mobileNumber,
      emailAddress,
      productInterest,
      message,
      preferredMethod
    } = body;

    if (!listingId || !customerName?.trim() || !mobileNumber?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Listing ID, Customer Name, and Mobile Number are required.' },
        { status: 400 }
      );
    }

    // Verify listing existence & fetch owner
    const listing = await prisma.expoListing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true, brandName: true, status: true, slug: true }
    });

    if (!listing || listing.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'This Expo listing is currently unavailable for enquiries.' },
        { status: 404 }
      );
    }

    // Create lead in database linked to listing and owner
    const enquiry = await prisma.expoEnquiry.create({
      data: {
        listingId: listing.id,
        ownerUserId: listing.userId,
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        emailAddress: emailAddress?.trim() || null,
        productInterest: productInterest?.trim() || null,
        message: message?.trim() || 'Interested in Expo product/offer.',
        preferredMethod: preferredMethod || 'whatsapp',
        status: 'NEW'
      }
    });

    // Notify the listing owner in-app
    await prisma.notification.create({
      data: {
        userId: listing.userId,
        type: 'expo_enquiry',
        message: `New Expo Lead from ${customerName.trim()} for ${listing.brandName}: "${productInterest || 'General Offer'}". Mobile: ${mobileNumber.trim()}`,
        link: `/expo/my-listings/${listing.id}/enquiries`
      }
    }).catch((e) => console.error('Failed to create enquiry notification:', e));

    return NextResponse.json({
      success: true,
      message: 'Enquiry submitted successfully.',
      enquiryId: enquiry.id
    });
  } catch (err: any) {
    console.error('Expo enquiry API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing enquiry.' },
      { status: 500 }
    );
  }
}
