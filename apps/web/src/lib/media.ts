/**
 * Media processing and URL helper utilities
 */

/**
 * Checks if a given media URL refers to a video file or stream.
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.m3u8') ||
    lower.includes('/video/upload/') ||
    lower.includes('/video/')
  );
}

/**
 * Transforms any media URL (image or video) into a suitable display thumbnail URL.
 * For Cloudinary video files, this replaces the video format with a JPEG thumbnail format.
 */
export function getMediaThumbnail(url: string | null | undefined): string {
  if (!url) return '/placeholder-ad.png';
  const lower = url.toLowerCase();

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

/**
 * Generates a poster thumbnail image URL for video elements.
 */
export function getPosterUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('/video/upload/')) {
    let thumbUrl = url;
    if (url.includes('/sp_hd/m3u8/')) {
      thumbUrl = url.replace('/sp_hd/m3u8/', '/');
    }
    return thumbUrl.replace(/\.(mp4|m3u8|webm|ogv|flv|mov|avi|wmv|mkv)(?:\?.*)?$/i, '.jpg');
  }
  return '';
}
