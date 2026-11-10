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

// POST: Batch update display ordering & priority overrides
export async function POST(req: Request) {
  try {
    const admin = checkSuperAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Super Admin unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orders } = body; // Array of { id, displayOrder, isPinned, isFeatured }

    if (!Array.isArray(orders)) {
      return NextResponse.json({ success: false, error: 'Invalid orders payload' }, { status: 400 });
    }

    await prisma.$transaction(
      orders.map((item: any) =>
        prisma.expoListing.update({
          where: { id: item.id },
          data: {
            displayOrder: Number(item.displayOrder),
            ...(item.isPinned !== undefined && { isPinned: Boolean(item.isPinned) }),
            ...(item.isFeatured !== undefined && { isFeatured: Boolean(item.isFeatured) })
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Listing display priorities updated successfully.'
    });
  } catch (err: any) {
    console.error('Super Admin priority update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
