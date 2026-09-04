/**
 * Tolee YouTube Helper Utilities
 * Safe Video ID Extraction, Poster URL Generation, Embed Builder, and Fallback Links
 */

/**
 * Cleanly extracts an 11-character YouTube video ID from any YouTube URL, embed, thumbnail, or raw ID.
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // 1. If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // 2. URL extraction matching various YouTube URL patterns
  const match = str.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|vi\/)|(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/)([\w-]{11})/i
  );

  if (match && match[1]) {
    return match[1];
  }

  // 3. Check for comma-separated lists (e.g. mediaUrls containing multiple entries)
  if (str.includes(',')) {
    const parts = str.split(',');
    for (const part of parts) {
      const found = extractYouTubeVideoId(part);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Returns the highest resolution available thumbnail for a YouTube video.
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxres' | 'hq' | 'mq' | 'default' = 'hq'
): string {
  if (!videoId) return '/logo.png';
  if (quality === 'maxres') {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  if (quality === 'mq') {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Generates a clean, privacy-enhanced YouTube embed URL.
 */
export function getYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    playsinline?: boolean;
    rel?: boolean;
  } = {}
): string {
  if (!videoId) return '';
  const {
    autoplay = true,
    muted = false,
    controls = true,
    loop = true,
    playsinline = true,
    rel = false,
  } = options;

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    controls: controls ? '1' : '0',
    modestbranding: '1',
    rel: rel ? '1' : '0',
    playsinline: playsinline ? '1' : '0',
    enablejsapi: '1',
  });

  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Returns direct YouTube watch URL for browser navigation or external fallback.
 */
export function getYouTubeWatchUrl(videoId: string): string {
  if (!videoId) return 'https://www.youtube.com';
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Decodes common HTML entity artifacts (e.g. "NASA&;s" or "&#39;") in video titles.
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&;s/g, "'s")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim();
}
