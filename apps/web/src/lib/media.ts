/**
 * Media processing and URL helper utilities
 */

/**
 * Safely parses comma-separated media URLs without breaking URLs containing internal commas (e.g. Cloudinary transformations like q_auto,f_auto).
 */
export function parseMediaUrls(urlsString?: string | null): string[] {
  if (!urlsString) return [];
  return urlsString
    .split(/,(?=https?:\/\/|\/uploads\/|blob:)/i)
    .map(u => u.trim())
    .filter(Boolean);
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('drive.usercontent.google.com') || url.includes('drive.google.com');
}

export function isCdnVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('videos.pexels.com') ||
    lower.includes('cloudinary.com') ||
    lower.includes('mux.com') ||
    lower.includes('cloudfront.net') ||
    lower.includes('r2.cloudflarestorage.com') ||
    lower.includes('b-cdn.net')
  );
}

export function getStreamableVideoUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.usercontent.google.com') || trimmed.includes('drive.google.com')) {
    const match = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) || trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      // Use drive-stream proxy to bypass Google Drive's 'cross-origin-resource-policy: same-site' restriction
      return `/api/video/drive-stream?id=${match[1]}`;
    }
  }
  // Cloudinary automatic video streaming compression & fast-load optimization
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/video/upload/') && !trimmed.includes('q_auto')) {
    return trimmed.replace('/video/upload/', '/video/upload/q_auto:good,vc_h264,w_720/');
  }
  return trimmed;
}

/**
 * Checks if a given media URL refers to a video file or stream.
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.includes('.mp4') ||
    lower.endsWith('.m3u8') ||
    lower.includes('/video/upload/') ||
    lower.includes('/video/') ||
    lower.includes('drive.usercontent.google.com') ||
    lower.includes('drive.google.com') ||
    lower.includes('/api/video/drive-stream')
  );
}

/**
 * Transforms any media URL (image or video) into a suitable display thumbnail URL.
 * For Cloudinary video files, this replaces the video format with a JPEG thumbnail format.
 */
export function getMediaThumbnail(url: string | null | undefined): string {
  if (!url) return '/placeholder-ad.png';
  const lower = url.toLowerCase();

  // If it's a Google Drive video/image URL or stream proxy, return the direct LH3 thumbnail
  if (lower.includes('drive.usercontent.google.com') || lower.includes('drive.google.com') || lower.includes('/api/video/drive-stream')) {
    const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  // If it's already a standard image extension, return it directly
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif')
  ) {
    return url;
  }

  // Handle Cloudinary video thumbnail transformations
  if (url.includes('/video/upload/')) {
    let thumbUrl = url;
    // Strip HLS profile path if present (e.g. sp_hd/m3u8) to access the raw asset
    if (url.includes('/sp_hd/m3u8/')) {
      thumbUrl = url.replace('/sp_hd/m3u8/', '/');
    }
    // Replace video extensions with .jpg
    return thumbUrl.replace(/\.(mp4|m3u8|webm|ogv|flv|mov|avi|wmv|mkv)(?:\?.*)?$/i, '.jpg');
  }

  return url;
}

export function getPosterUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('drive.usercontent.google.com') || url.includes('drive.google.com') || url.includes('/api/video/drive-stream')) {
    const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  if (url.includes('/video/upload/')) {
    let thumbUrl = url;
    if (url.includes('/sp_hd/m3u8/')) {
      thumbUrl = url.replace('/sp_hd/m3u8/', '/');
    }
    return thumbUrl.replace(/\.(mp4|m3u8|webm|ogv|flv|mov|avi|wmv|mkv)(?:\?.*)?$/i, '.jpg');
  }
  
  if (url.includes('pexels.com')) {
    const match = url.match(/\/video-files\/(\d+)\//i) || url.match(/\/videos\/(\d+)\//i) || url.match(/\/(\d+)-/i);
    if (match && match[1]) {
      const id = match[1];
      return `https://images.pexels.com/videos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=1000`;
    }
  }
  return '';
}
