import type { Metadata } from 'next';
import { SEO_CONFIG } from './config';
import { getCanonicalUrl } from './canonical';

export interface PageMetadataOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string | null;
  ogType?: 'website' | 'article' | 'profile' | 'video.other';
  publishedTime?: string | Date | null;
  modifiedTime?: string | Date | null;
  authors?: string[];
  keywords?: string[];
  isIndexable?: boolean;
  noindexReason?: string;
}

/**
 * Builds a standardized, production-ready Next.js Metadata object
 */
export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description = SEO_CONFIG.defaultDescription,
    canonicalPath = '',
    ogImage = SEO_CONFIG.defaultOgImage,
    ogType = 'website',
    publishedTime,
    modifiedTime,
    authors = ['Tolee'],
    keywords = [],
    isIndexable = true,
  } = options;

  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const finalImage = ogImage || SEO_CONFIG.defaultOgImage;

  // Strict robots directive for private / unindexed content
  if (!isIndexable) {
    return {
      title,
      description,
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
    };
  }

  return {
    title,
    description,
    keywords: Array.from(new Set(['Tolee', 'Tolee India', 'Tolee Communities', ...keywords])),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      type: ogType,
      locale: SEO_CONFIG.locale,
      images: [
        {
          url: finalImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime
        ? {
            publishedTime:
              typeof publishedTime === 'string'
                ? publishedTime
                : publishedTime.toISOString(),
          }
        : {}),
      ...(modifiedTime
        ? {
            modifiedTime:
              typeof modifiedTime === 'string'
                ? modifiedTime
                : modifiedTime.toISOString(),
          }
        : {}),
      ...(authors && authors.length > 0 ? { authors } : {}),
    },
    twitter: {
      card: ogType === 'video.other' ? 'player' : 'summary_large_image',
      title,
      description,
      images: [finalImage],
      creator: SEO_CONFIG.social.twitter,
      site: SEO_CONFIG.social.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
