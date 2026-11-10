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

// GET: Fetch leads for a specific listing
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const enquiries = await prisma.expoEnquiry.findMany({
      where: { listingId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, enquiries });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update lead status & internal notes
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const isAllowed = await verifyListingOwner(params.id);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { enquiryId, status, internalNotes } = body;

    if (!enquiryId) {
      return NextResponse.json({ success: false, error: 'Enquiry ID required' }, { status: 400 });
    }

    const updated = await prisma.expoEnquiry.update({
      where: { id: enquiryId },
      data: {
        ...(status && { status }),
        ...(internalNotes !== undefined && { internalNotes })
      }
    });

    return NextResponse.json({ success: true, enquiry: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
