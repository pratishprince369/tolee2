import { NextRequest, NextResponse } from 'next/server';
import { isKnownUnplayable, markVideoHealth } from '@/lib/videoHealth';

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

function extractConfirmationUrl(html: string, fileId: string): string | null {
  const linkMatch = html.match(/href="(\/download\?[^"]*confirm=[^"]*)"/i) ||
                    html.match(/href="(https:\/\/drive\.usercontent\.google\.com\/download\?[^"]*confirm=[^"]*)"/i);
  if (linkMatch) {
    const raw = linkMatch[1];
    return raw.startsWith('http') ? raw : `https://drive.usercontent.google.com${raw}`;
  }

  const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/value="([^"]+)"\s+name="confirm"/i);
  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i) || html.match(/value="([^"]+)"\s+name="uuid"/i);
  if (confirmMatch && confirmMatch[1]) {
    let url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
    if (uuidMatch && uuidMatch[1]) {
      url += `&uuid=${uuidMatch[1]}`;
    }
    return url;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  // SSRF guard: ensure valid alphanumeric Google Drive file ID
  if (!fileId || !/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return new NextResponse('Invalid or missing file id', { status: 400 });
  }

  // Fast bail-out if this file was recently confirmed unplayable
  if (isKnownUnplayable(fileId)) {
    return new NextResponse(JSON.stringify({ error: 'unplayable_drive_video', cached: true }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  }

  const range = req.headers.get('range') || 'bytes=0-';
  const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

  const fetchHeaders: HeadersInit = {
    'User-Agent': USER_AGENT,
    Range: range,
  };

  try {
    let driveRes = await fetch(targetUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });

    // Check if Google returned an HTML page (e.g. virus warning or permission denied)
    let contentType = driveRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const htmlText = await driveRes.text();
      const confirmedUrl = extractConfirmationUrl(htmlText, fileId);

      if (confirmedUrl) {
        // Retry with extracted confirmation token
        driveRes = await fetch(confirmedUrl, {
          method: 'GET',
          headers: fetchHeaders,
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        });
        contentType = driveRes.headers.get('content-type') || '';
      }
    }

    // Fallback: try standard drive export url if status is non-success
    if ((!driveRes.ok && driveRes.status !== 206) || contentType.includes('text/html')) {
      const fallbackUrl = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t`;
      driveRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: fetchHeaders,
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      contentType = driveRes.headers.get('content-type') || '';
    }

    // If still non-ok or still returning HTML, file is unplayable
    if ((!driveRes.ok && driveRes.status !== 206) || contentType.includes('text/html')) {
      markVideoHealth(fileId, false, driveRes.status || 502, 'Stream returned HTML or error status');
      return new NextResponse(JSON.stringify({ error: 'unplayable_drive_video', status: driveRes.status }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        }
      });
    }

    markVideoHealth(fileId, true, driveRes.status);
    const headers = buildStreamHeaders(driveRes);
    return new Response(driveRes.body, {
      status: driveRes.status,
      headers,
    });
  } catch (err: any) {
    console.error(`[DriveStreamProxy Error] fileId ${fileId}:`, err?.message || err);
    markVideoHealth(fileId, false, 504, err?.message || 'Gateway timeout');
    return new NextResponse(JSON.stringify({ error: 'drive_gateway_timeout' }), {
      status: 504,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  }
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId || !/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return new NextResponse(null, { status: 400 });
  }

  if (isKnownUnplayable(fileId)) {
    return new NextResponse(null, { status: 502 });
  }

  try {
    const driveRes = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, 'Range': 'bytes=0-1024' },
      signal: AbortSignal.timeout(6000),
    });

    const ct = driveRes.headers.get('content-type') || '';
    if ((driveRes.ok || driveRes.status === 206) && !ct.includes('text/html')) {
      markVideoHealth(fileId, true, driveRes.status);
      const headers = buildStreamHeaders(driveRes);
      return new Response(null, { status: 200, headers });
    }

    markVideoHealth(fileId, false, 502, 'Probe returned HTML or non-200');
    return new Response(null, { status: 502 });
  } catch {
    markVideoHealth(fileId, false, 504, 'Probe timed out');
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
