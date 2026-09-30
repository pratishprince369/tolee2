import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    // Security validation: only allow safe http/https URLs
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Disallowed protocol' }, { status: 403 });
    }

    // Forward request with optional game API keys stored securely in process.env
    const headers: Record<string, string> = {
      'User-Agent': 'Tolee-Game-Proxy/1.0',
    };

    if (process.env.GAME_API_SECRET_KEY) {
      headers['Authorization'] = `Bearer ${process.env.GAME_API_SECRET_KEY}`;
    }

    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 30 },
    });

    const contentType = res.headers.get('content-type') || 'application/json';
    const data = await res.text();

    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/games/proxy:', error);
    return NextResponse.json({ error: error.message || 'Proxy Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tolee-Game-Proxy/1.0',
      },
      body: JSON.stringify(body),
    });

    const data = await res.text();
    const contentType = res.headers.get('content-type') || 'application/json';

    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/games/proxy POST:', error);
    return NextResponse.json({ error: error.message || 'Proxy Error' }, { status: 500 });
  }
}
