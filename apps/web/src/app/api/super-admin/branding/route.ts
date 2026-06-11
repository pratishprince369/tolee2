import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET — fetch current branding settings
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    return NextResponse.json({ success: true, settings: settings || { id: 'global', siteName: 'tolee', tagline: 'Connect. Share. Discover.', headerLogoUrl: null, faviconUrl: null, mobileLogoUrl: null, splashScreenLogoUrl: null } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST — update branding settings
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { siteName, tagline, headerLogoUrl, faviconUrl, mobileLogoUrl, splashScreenLogoUrl } = body;

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {
        ...(siteName !== undefined && { siteName }),
        ...(tagline !== undefined && { tagline }),
        ...(headerLogoUrl !== undefined && { headerLogoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(mobileLogoUrl !== undefined && { mobileLogoUrl }),
        ...(splashScreenLogoUrl !== undefined && { splashScreenLogoUrl }),
      },
      create: {
        id: 'global',
        siteName: siteName || 'tolee',
        tagline: tagline || 'Connect. Share. Discover.',
        headerLogoUrl: headerLogoUrl || null,
        faviconUrl: faviconUrl || null,
        mobileLogoUrl: mobileLogoUrl || null,
        splashScreenLogoUrl: splashScreenLogoUrl || null,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
