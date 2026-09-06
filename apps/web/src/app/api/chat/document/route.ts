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

    // Security check: Only allow fetching from trusted media storage
    const parsedUrl = new URL(mediaUrl);
    const isCloudinary = parsedUrl.hostname.includes('cloudinary.com') || parsedUrl.hostname.includes('res.cloudinary.com');
    if (!isCloudinary && !parsedUrl.hostname.includes('localhost') && !parsedUrl.hostname.includes('127.0.0.1')) {
      return NextResponse.json({ error: 'Invalid document host' }, { status: 400 });
    }

    // Clean any transformations from PDF URLs
    let cleanFetchUrl = mediaUrl;
    if (cleanFetchUrl.includes('/upload/q_auto,f_auto/')) {
      cleanFetchUrl = cleanFetchUrl.replace('/upload/q_auto,f_auto/', '/upload/');
    }

    // Forward range header if present
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const docRes = await fetch(cleanFetchUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    });

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
