import { prisma } from '@/lib/prisma';
import { extractFileId, markVideoHealth, isKnownUnplayable } from '@/lib/videoHealth';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type ValidationStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'READY'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'INVALID'
  | 'DISABLED';

export interface ValidationCheckResult {
  isValid: boolean;
  status: ValidationStatus;
  httpStatus: number;
  reason?: string;
  sourceType: 'google_drive' | 'cloudinary' | 'direct';
}

/**
 * 1. Deep probe for Google Drive video files.
 * Performs a byte-range request to verify that the file exists, is publicly accessible,
 * and streams actual binary video content rather than an HTML error or virus-warning page.
 */
export async function probeGoogleDriveVideo(fileId: string): Promise<ValidationCheckResult> {
  const cleanId = extractFileId(fileId) || fileId;
  if (!cleanId || cleanId.length < 15) {
    return {
      isValid: false,
      status: 'INVALID',
      httpStatus: 400,
      reason: 'Malformed or missing Google Drive file ID',
      sourceType: 'google_drive',
    };
  }

  const primaryUrl = `https://drive.usercontent.google.com/download?id=${cleanId}&export=download&confirm=t`;
  const fetchHeaders: HeadersInit = {
    'User-Agent': USER_AGENT,
    Range: 'bytes=0-1024',
  };

  try {
    let res = await fetch(primaryUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });

    let contentType = (res.headers.get('content-type') || '').toLowerCase();
    let status = res.status;

    // If Google returned an HTML page (confirmation, auth requirement, or error page)
    if (contentType.includes('text/html')) {
      const htmlText = await res.text();
      // Check for download confirmation link
      const confirmMatch =
        htmlText.match(/href="(\/download\?[^"]*confirm=[^"]*)"/i) ||
        htmlText.match(/href="(https:\/\/drive\.usercontent\.google\.com\/download\?[^"]*confirm=[^"]*)"/i);

      if (confirmMatch) {
        const rawUrl = confirmMatch[1];
        const nextUrl = rawUrl.startsWith('http') ? rawUrl : `https://drive.usercontent.google.com${rawUrl}`;
        res = await fetch(nextUrl, {
          method: 'GET',
          headers: fetchHeaders,
          cache: 'no-store',
          signal: AbortSignal.timeout(7000),
        });
        contentType = (res.headers.get('content-type') || '').toLowerCase();
        status = res.status;
      }
    }

    // Try secondary endpoint if primary failed
    if ((!res.ok && status !== 206) || contentType.includes('text/html')) {
      const fallbackUrl = `https://drive.google.com/uc?id=${cleanId}&export=download&confirm=t`;
      res = await fetch(fallbackUrl, {
        method: 'GET',
        headers: fetchHeaders,
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(7000),
      });
      contentType = (res.headers.get('content-type') || '').toLowerCase();
      status = res.status;
    }

    // Evaluate response
    const isSuccess = (status === 200 || status === 206) && !contentType.includes('text/html');

    if (isSuccess) {
      markVideoHealth(cleanId, true, status);
      return {
        isValid: true,
        status: 'READY',
        httpStatus: status,
        sourceType: 'google_drive',
      };
    }

    // Categorize failure: permanent invalid vs temporary network/rate-limit
    const isPermanent =
      status === 404 ||
      status === 403 ||
      status === 416 ||
      status === 410 ||
      status === 500 ||
      contentType.includes('text/html');

    const failStatus: ValidationStatus = isPermanent ? 'INVALID' : 'TEMPORARILY_UNAVAILABLE';
    const reason = `Drive returned HTTP ${status} (Content-Type: ${contentType || 'unknown'})`;

    markVideoHealth(cleanId, false, status, reason);

    return {
      isValid: false,
      status: failStatus,
      httpStatus: status,
      reason,
      sourceType: 'google_drive',
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
    const reason = isTimeout ? 'Drive probe request timed out (7s)' : err?.message || 'Network error';

    markVideoHealth(cleanId, false, 504, reason);

    return {
      isValid: false,
      status: 'TEMPORARILY_UNAVAILABLE',
      httpStatus: 504,
      reason,
      sourceType: 'google_drive',
    };
  }
}

/**
 * 2. Probe CDN or direct video URL
 */
export async function probeCdnVideo(url: string): Promise<ValidationCheckResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Range: 'bytes=0-1024',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const isSuccess = (res.ok || res.status === 206) && !contentType.includes('text/html');

    return {
      isValid: isSuccess,
      status: isSuccess ? 'READY' : 'INVALID',
      httpStatus: res.status,
      reason: isSuccess ? undefined : `CDN returned HTTP ${res.status}`,
      sourceType: url.includes('cloudinary') ? 'cloudinary' : 'direct',
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'TEMPORARILY_UNAVAILABLE',
      httpStatus: 504,
      reason: err?.message || 'CDN probe timeout',
      sourceType: url.includes('cloudinary') ? 'cloudinary' : 'direct',
    };
  }
}

/**
 * 3. Central validator for any Reel Post in the database
 */
export async function validatePostVideoSource(
  postId: string,
  mediaUrl: string,
  providedFileId?: string
): Promise<ValidationCheckResult> {
  const fileId = providedFileId || extractFileId(mediaUrl);
  const isDrive =
    mediaUrl.includes('drive.usercontent.google.com') ||
    mediaUrl.includes('drive.google.com') ||
    mediaUrl.includes('/api/video/drive-stream') ||
    Boolean(fileId && !mediaUrl.includes('cloudinary.com'));

  const result = isDrive && fileId
    ? await probeGoogleDriveVideo(fileId)
    : await probeCdnVideo(mediaUrl.split(',')[0].trim());

  try {
    const now = new Date();
    const nextValidationAt =
      result.status === 'TEMPORARILY_UNAVAILABLE'
        ? new Date(now.getTime() + 15 * 60 * 1000) // 15-minute retry window
        : null;

    await prisma.reelSourceValidation.upsert({
      where: { postId },
      create: {
        postId,
        sourceType: result.sourceType,
        sourceFileId: fileId || null,
        sourceUrl: mediaUrl,
        validationStatus: result.status,
        lastValidatedAt: now,
        lastPlaybackSuccessAt: result.isValid ? now : null,
        consecutiveFailureCount: result.isValid ? 0 : 1,
        lastFailureReason: result.reason || null,
        nextValidationAt,
      },
      update: {
        sourceType: result.sourceType,
        sourceFileId: fileId || null,
        sourceUrl: mediaUrl,
        validationStatus: result.status,
        lastValidatedAt: now,
        lastPlaybackSuccessAt: result.isValid ? now : undefined,
        consecutiveFailureCount: result.isValid ? 0 : { increment: 1 },
        lastFailureReason: result.reason || null,
        nextValidationAt,
      },
    });

    // If permanently INVALID, immediately archive or set status = 'rejected'
    // so it is excluded from ALL feeds at database query level
    if (result.status === 'INVALID') {
      await prisma.post.update({
        where: { id: postId },
        data: {
          isArchived: true,
          status: 'rejected',
        },
      });
    }
  } catch (dbErr: any) {
    console.error(`[ValidationService] DB update error for post ${postId}:`, dbErr?.message || dbErr);
  }

  return result;
}

/**
 * 4. Record real-time playback failure reported by the client or stream proxy
 */
export async function recordPlaybackFailure(postId: string, errorDetail: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, mediaUrls: true, mediaPublicIds: true },
  });

  if (!post) return;

  const fileId = post.mediaPublicIds || extractFileId(post.mediaUrls);
  if (fileId) {
    markVideoHealth(fileId, false, 502, errorDetail);
  }

  const existingValidation = await prisma.reelSourceValidation.findUnique({
    where: { postId },
  });

  const failureCount = (existingValidation?.consecutiveFailureCount || 0) + 1;
  const isPermanent =
    failureCount >= 2 ||
    errorDetail.includes('404') ||
    errorDetail.includes('403') ||
    errorDetail.includes('416') ||
    errorDetail.includes('500') ||
    errorDetail.includes('HTML');

  const newStatus: ValidationStatus = isPermanent ? 'INVALID' : 'TEMPORARILY_UNAVAILABLE';
  const nextRetryMinutes = failureCount === 1 ? 15 : 60;
  const nextValidationAt = isPermanent ? null : new Date(Date.now() + nextRetryMinutes * 60 * 1000);

  await prisma.reelSourceValidation.upsert({
    where: { postId },
    create: {
      postId,
      sourceType: post.mediaUrls?.includes('drive') ? 'google_drive' : 'cloudinary',
      sourceFileId: fileId || null,
      sourceUrl: post.mediaUrls || '',
      validationStatus: newStatus,
      lastValidatedAt: new Date(),
      consecutiveFailureCount: failureCount,
      lastFailureReason: errorDetail,
      nextValidationAt,
    },
    update: {
      validationStatus: newStatus,
      lastValidatedAt: new Date(),
      consecutiveFailureCount: failureCount,
      lastFailureReason: errorDetail,
      nextValidationAt,
    },
  });

  if (isPermanent) {
    await prisma.post.update({
      where: { id: postId },
      data: { isArchived: true, status: 'rejected' },
    });
  }
}

/**
 * 5. Record real-time playback success
 */
export async function recordPlaybackSuccess(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, mediaUrls: true, mediaPublicIds: true },
  });

  const fileId = post?.mediaPublicIds || extractFileId(post?.mediaUrls);
  if (fileId) {
    markVideoHealth(fileId, true, 200);
  }

  await prisma.reelSourceValidation.upsert({
    where: { postId },
    create: {
      postId,
      sourceType: post?.mediaUrls?.includes('drive') ? 'google_drive' : 'cloudinary',
      sourceFileId: fileId || null,
      sourceUrl: post?.mediaUrls || '',
      validationStatus: 'READY',
      lastValidatedAt: new Date(),
      lastPlaybackSuccessAt: new Date(),
      consecutiveFailureCount: 0,
      lastFailureReason: null,
    },
    update: {
      validationStatus: 'READY',
      lastValidatedAt: new Date(),
      lastPlaybackSuccessAt: new Date(),
      consecutiveFailureCount: 0,
      lastFailureReason: null,
    },
  });
}

/**
 * 6. Background Validation Runner: processes pending or temporarily unavailable videos
 */
export async function validateExistingPendingReels(batchLimit = 15): Promise<{
  checked: number;
  ready: number;
  invalid: number;
  temporary: number;
}> {
  const now = new Date();

  // Pick unvalidated or due-for-recheck posts
  const candidates = await prisma.post.findMany({
    where: {
      postType: 'reel',
      isArchived: false,
      OR: [
        { sourceValidation: null },
        {
          sourceValidation: {
            validationStatus: 'TEMPORARILY_UNAVAILABLE',
            nextValidationAt: { lte: now },
          },
        },
      ],
    },
    take: batchLimit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, mediaUrls: true, mediaPublicIds: true },
  });

  let ready = 0;
  let invalid = 0;
  let temporary = 0;

  for (const post of candidates) {
    if (!post.mediaUrls) {
      invalid++;
      continue;
    }
    const res = await validatePostVideoSource(post.id, post.mediaUrls, post.mediaPublicIds || undefined);
    if (res.status === 'READY') ready++;
    else if (res.status === 'INVALID') invalid++;
    else temporary++;
  }

  return {
    checked: candidates.length,
    ready,
    invalid,
    temporary,
  };
}
