import { NextResponse } from 'next/server';
import { AISitemapService } from '@/lib/seo/ai-sitemap-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await AISitemapService.generateDailySitemap();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await AISitemapService.generateDailySitemap();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
