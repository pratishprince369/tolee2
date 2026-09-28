import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'reels');
const activeCompressions = new Map<string, Promise<void>>();

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function parseRange(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const safeStart = isNaN(start) ? 0 : Math.max(0, start);
  const safeEnd = isNaN(end) ? fileSize - 1 : Math.min(end, fileSize - 1);
  return { start: safeStart, end: safeEnd };
}

/**
 * Background compressor: downloads raw video from Google Drive and compresses with ffmpeg.
 * Scales to max 720p, applies H.264 CRF 26 + AAC, and moves 'moov' atom to the start (+faststart)
 * for instant, zero-buffer playback on mobile and web.
 */
function compressInBackground(fileId: string): Promise<void> {
  if (activeCompressions.has(fileId)) {
    return activeCompressions.get(fileId)!;
  }

  const promise = (async () => {
    try {
      ensureCacheDir();
      const compressedPath = path.join(CACHE_DIR, `${fileId}-720p.mp4`);
      if (fs.existsSync(compressedPath)) return;

      const rawPath = path.join(CACHE_DIR, `${fileId}-raw.mp4`);
      const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

      // Download raw video
      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': USER_AGENT },
        cache: 'no-store',
      });

      if (!res.ok) return;

      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(rawPath, Buffer.from(arrayBuffer));

      // Run ffmpeg compression with +faststart
      await new Promise<void>((resolve, reject) => {
        const ff = spawn('ffmpeg', [
          '-y',
          '-i', rawPath,
          '-vf', 'scale=min(720\\,iw):-2',
          '-c:v', 'libx264',
          '-crf', '26',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          compressedPath,
        ]);

        ff.on('close', (code) => {
          // Clean up raw temp file
          try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch {}
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        });

        ff.on('error', (err) => {
          try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch {}
          reject(err);
        });
      });
    } catch (err: any) {
      console.warn(`[DriveCompression] Non-fatal background compression notice for ${fileId}:`, err.message);
    } finally {
      activeCompressions.delete(fileId);
    }
  })();

  activeCompressions.set(fileId, promise);
  return promise;
}

function buildStreamHeaders(upstreamRes: Response): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'video/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Disposition', 'inline');
  headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Range, Accept-Ranges');

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

  ensureCacheDir();
  const compressedPath = path.join(CACHE_DIR, `${fileId}-720p.mp4`);

  // 1. FAST LOCAL DISK STREAM (Compressed 720p + faststart)
  if (fs.existsSync(compressedPath)) {
    try {
      const stat = fs.statSync(compressedPath);
      const fileSize = stat.size;
      const range = req.headers.get('range');

      const headers = new Headers();
      headers.set('Content-Type', 'video/mp4');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Disposition', 'inline');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');

      if (range) {
        const { start, end } = parseRange(range, fileSize);
        const chunkSize = end - start + 1;
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        headers.set('Content-Length', String(chunkSize));

        const nodeStream = fs.createReadStream(compressedPath, { start, end });
        const webStream = Readable.toWeb(nodeStream);
        return new Response(webStream as any, { status: 206, headers });
      } else {
        headers.set('Content-Length', String(fileSize));
        const nodeStream = fs.createReadStream(compressedPath);
        const webStream = Readable.toWeb(nodeStream);
        return new Response(webStream as any, { status: 200, headers });
      }
    } catch (e: any) {
      console.warn(`[DriveStream] Local read fallback for ${fileId}:`, e.message);
    }
  }

  // 2. Fallback / First-Time Access: stream directly from Google Drive while compressing in background
  void compressInBackground(fileId);

  const range = req.headers.get('range');
  const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

  const fetchHeaders: HeadersInit = {
    'User-Agent': USER_AGENT,
  };

  if (range) {
    fetchHeaders['Range'] = range;
  }

  try {
    const driveRes = await fetch(targetUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      const fallbackUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: fetchHeaders,
        cache: 'no-store',
      });

      if (!fallbackRes.ok && fallbackRes.status !== 206) {
        return new NextResponse('Video stream unavailable from upstream source', { status: fallbackRes.status });
      }

      const headers = buildStreamHeaders(fallbackRes);
      return new Response(fallbackRes.body, { status: fallbackRes.status, headers });
    }

    const headers = buildStreamHeaders(driveRes);
    return new Response(driveRes.body, { status: driveRes.status, headers });
  } catch (err: any) {
    console.error(`[DriveStreamProxy Error] fileId ${fileId}:`, err.message);
    return new NextResponse('Error streaming video', { status: 502 });
  }
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new NextResponse(null, { status: 400 });
  }

  ensureCacheDir();
  const compressedPath = path.join(CACHE_DIR, `${fileId}-720p.mp4`);

  if (fs.existsSync(compressedPath)) {
    const stat = fs.statSync(compressedPath);
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Disposition', 'inline');
    headers.set('Content-Length', String(stat.size));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(null, { status: 200, headers });
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
