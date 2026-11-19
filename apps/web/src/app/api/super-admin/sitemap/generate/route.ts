import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { AISitemapService } from '@/lib/seo/ai-sitemap-service';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function handleGenerate(req: NextRequest) {
  try {
    // 1. Verify Super Admin Access
    const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
    if (!token || !verifySuperAdminToken(token)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Super Admin credentials required' },
        { status: 401 }
      );
    }

    // 2. Execute Full Sitemap Generation & Overwrite public/sitemap.xml
    const result = await AISitemapService.generateFullSitemap();

    // 3. Purge Next.js App Router Cache for sitemap.xml
    try {
      revalidatePath('/sitemap.xml');
      revalidatePath('/sitemap');
    } catch (revErr) {
      console.warn('[Sitemap API] Revalidate path notice:', revErr);
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Sitemap API] Unexpected generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while generating sitemap' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleGenerate(req);
}

export async function GET(req: NextRequest) {
  return handleGenerate(req);
}
