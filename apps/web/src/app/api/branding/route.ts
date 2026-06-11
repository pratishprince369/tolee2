import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// Public endpoint — no auth needed — used by Header, Sidebar, layout to read branding
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    return NextResponse.json({
      siteName: settings?.siteName || 'tolee',
      tagline: settings?.tagline || 'Connect. Share. Discover.',
      headerLogoUrl: settings?.headerLogoUrl || null,
      faviconUrl: settings?.faviconUrl || null,
      mobileLogoUrl: settings?.mobileLogoUrl || null,
      splashScreenLogoUrl: settings?.splashScreenLogoUrl || null,
    }, {
      headers: {
        // Cache for 30 seconds — fast enough for near-real-time, avoids DB hammering
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      }
    });
  } catch {
    return NextResponse.json({
      siteName: 'tolee',
      tagline: 'Connect. Share. Discover.',
      headerLogoUrl: null,
      faviconUrl: null,
      mobileLogoUrl: null,
      splashScreenLogoUrl: null,
    });
  }
}
