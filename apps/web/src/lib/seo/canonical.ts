import { SEO_CONFIG } from './config';

/**
 * Normalizes a path or URL into a clean canonical URL on tolee.in
 * - Removes query strings
 * - Removes hashes
 * - Removes trailing slashes (except root '/')
 * - Prepends base URL if relative
 */
export function getCanonicalUrl(pathOrUrl: string = ''): string {
  if (!pathOrUrl || pathOrUrl === '/') {
    return SEO_CONFIG.siteUrl;
  }

  // If already an absolute URL
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(pathOrUrl);
      const cleanPath = parsed.pathname.replace(/\/+$/, '') || '';
      return `${SEO_CONFIG.siteUrl}${cleanPath}`;
    } catch {
      return SEO_CONFIG.siteUrl;
    }
  }

  // Relative path cleanup
  const cleanPath = pathOrUrl
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+/, '/')
    .replace(/\/+$/, '');

  return `${SEO_CONFIG.siteUrl}${cleanPath}`;
}
