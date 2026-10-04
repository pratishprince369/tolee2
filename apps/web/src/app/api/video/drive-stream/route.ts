import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildStreamHeaders(upstreamRes: Response): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'video/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Disposition', 'inline');
  headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400');
  headers.set('CDN-Cache-Control', 'public, max-age=31536000');
  headers.set('Vercel-CDN-Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Range, Accept-Ranges');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  const contentLength = upstreamRes.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  const contentRange = upstreamRes.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);

  return headers;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new NextResponse('Invalid or missing file id', { status: 400 });
  }

  const range = req.headers.get('range') || 'bytes=0-';
  const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

  const fetchHeaders: HeadersInit = {
    'User-Agent': USER_AGENT,
    Range: range,
  };

  try {
    let driveRes = await fetch(targetUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      // Fallback: try standard drive export url if usercontent fails
      const fallbackUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
      driveRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: fetchHeaders,
        cache: 'no-store',
        redirect: 'follow',
      });

      if (!driveRes.ok && driveRes.status !== 206) {
        return new NextResponse('Video stream unavailable from upstream source', { status: driveRes.status });
      }
    }

    const headers = buildStreamHeaders(driveRes);
    return new Response(driveRes.body, {
      status: driveRes.status,
      headers,
    });
  } catch (err: any) {
    console.error(`[DriveStreamProxy Error] fileId ${fileId}:`, err?.message || err);
    return NextResponse.redirect(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`, {
      status: 307,
    });
  }
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const driveRes = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
    });

    const headers = buildStreamHeaders(driveRes);
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Accept-Ranges',
      'Access-Control-Max-Age': '86400',
    },
  });
}
