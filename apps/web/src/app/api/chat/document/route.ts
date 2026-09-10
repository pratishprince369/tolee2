import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'document.pdf';
    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Missing document URL' }, { status: 400 });
    }

    // Security check: Only allow fetching from trusted storage hosts
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(mediaUrl, request.url);
    } catch {
      return NextResponse.json({ error: 'Invalid document URL' }, { status: 400 });
    }

    const isCloudinary = parsedUrl.hostname.includes('cloudinary.com') || parsedUrl.hostname.includes('res.cloudinary.com');
    const isAllowedHost = isCloudinary || 
      parsedUrl.hostname.includes('localhost') || 
      parsedUrl.hostname.includes('127.0.0.1') ||
      parsedUrl.hostname.includes('tolee.in') ||
      parsedUrl.hostname.endsWith('.tolee.in') ||
      parsedUrl.hostname.includes('firebasestorage.googleapis.com') ||
      parsedUrl.hostname.includes('amazonaws.com');

    if (!isAllowedHost) {
      return NextResponse.json({ error: 'Invalid document host' }, { status: 400 });
    }

    // Clean any transformations and hash fragments from URLs
    let cleanFetchUrl = mediaUrl.split('#')[0];
    if (cleanFetchUrl.includes('/upload/q_auto,f_auto/')) {
      cleanFetchUrl = cleanFetchUrl.replace('/upload/q_auto,f_auto/', '/upload/');
    }
    if (cleanFetchUrl.includes('/upload/q_auto/')) {
      cleanFetchUrl = cleanFetchUrl.replace('/upload/q_auto/', '/upload/');
    }
    if (cleanFetchUrl.includes('/upload/f_auto/')) {
      cleanFetchUrl = cleanFetchUrl.replace('/upload/f_auto/', '/upload/');
    }

    // Forward range header if present
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    let docRes = await fetch(cleanFetchUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    });

    // If initial fetch failed with 404 on Cloudinary, try alternative resource_type paths
    if (docRes.status === 404 && isCloudinary) {
      const altUrls: string[] = [];
      if (cleanFetchUrl.includes('/raw/upload/')) {
        altUrls.push(cleanFetchUrl.replace('/raw/upload/', '/image/upload/'));
        altUrls.push(cleanFetchUrl.replace('/raw/upload/', '/auto/upload/'));
      } else if (cleanFetchUrl.includes('/image/upload/')) {
        altUrls.push(cleanFetchUrl.replace('/image/upload/', '/raw/upload/'));
        altUrls.push(cleanFetchUrl.replace('/image/upload/', '/auto/upload/'));
      } else if (cleanFetchUrl.includes('/auto/upload/')) {
        altUrls.push(cleanFetchUrl.replace('/auto/upload/', '/raw/upload/'));
        altUrls.push(cleanFetchUrl.replace('/auto/upload/', '/image/upload/'));
      }

      for (const altUrl of altUrls) {
        const retryRes = await fetch(altUrl, {
          headers: fetchHeaders,
          cache: 'no-store',
        });
        if (retryRes.ok || retryRes.status === 206) {
          docRes = retryRes;
          break;
        }
      }
    }

    if (!docRes.ok && docRes.status !== 206) {
      return NextResponse.json(
        { error: `Failed to retrieve document (${docRes.status})` },
        { status: docRes.status }
      );
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const contentType = MIME_MAP[ext] || docRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = docRes.headers.get('content-length');
    const contentRange = docRes.headers.get('content-range');

    const sanitizedFilename = filename.replace(/["\r\n]/g, '_');
    const disposition = isDownload
      ? `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`
      : `inline; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`;

    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });

    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new NextResponse(docRes.body as any, {
      status: docRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[DocumentProxy] Error serving document:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
