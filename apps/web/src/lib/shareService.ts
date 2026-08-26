/**
 * Central Share Service for Tolee
 * Ensures permanent, stable URL generation and clipboard actions across the entire platform.
 */

export interface ShareableItem {
  id: string;
  postType?: string | null;
  contentType?: string | null;
  slug?: string | null;
  author?: string | null;
  toleeSlug?: string | null;
  [key: string]: any;
}

/**
 * Get base origin URL safely (SSR compatible)
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://tolee.in';
}

/**
 * Generates permanent, unique URL for any content item
 */
export function getContentPermanentUrl(item: ShareableItem | string): string {
  const baseUrl = getBaseUrl();
  
  if (typeof item === 'string') {
    return `${baseUrl}/post/${item}`;
  }

  if (!item || !item.id) {
    return baseUrl;
  }

  const type = (item.contentType || item.postType || '').toLowerCase();
  const isVideo = type === 'reel' || item.video || (typeof item.mediaTypes === 'string' && item.mediaTypes.includes('video'));

  if (isVideo) {
    return `${baseUrl}/reel/${item.id}`;
  }
  if (type === 'screen') {
    return `${baseUrl}/screen/watch/${item.id}`;
  }
  if (type === 'news') {
    return `${baseUrl}/news/${item.slug || item.id}`;
  }
  if (type === 'marketplace') {
    return `${baseUrl}/marketplace/listing/${item.id}`;
  }

  // Default Feed Post, Regular, Win, Poll, Requirement, Event
  return `${baseUrl}/post/${item.id}`;
}

/**
 * Copies permanent content URL directly to clipboard
 */
export async function copyContentUrl(item: ShareableItem | string): Promise<boolean> {
  const url = getContentPermanentUrl(item);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy content URL:', err);
  }
  return false;
}

/**
 * Share content using Native Web Share API if available, else copy URL
 */
export async function shareContentNative(
  item: ShareableItem | string,
  title?: string,
  text?: string
): Promise<boolean> {
  const url = getContentPermanentUrl(item);
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: title || 'Check out this post on Tolee',
        text: text || 'Check out this post on Tolee!',
        url: url,
      });
      return true;
    } catch (e) {
      console.log('Native share cancelled or failed, falling back to copy:', e);
    }
  }
  return await copyContentUrl(item);
}
