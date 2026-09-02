import { SEO_CONFIG } from './config';
import { getCanonicalUrl } from './canonical';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * 1. WebSite Schema with potential Sitelinks Searchbox
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    description: SEO_CONFIG.defaultDescription,
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.organization.name,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SEO_CONFIG.siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-IN',
  };
}

/**
 * 2. Organization Schema
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.organization.name,
    legalName: SEO_CONFIG.organization.legalName,
    url: SEO_CONFIG.organization.url,
    logo: SEO_CONFIG.organization.logo,
    foundingDate: SEO_CONFIG.organization.foundingDate,
    sameAs: SEO_CONFIG.organization.sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SEO_CONFIG.organization.contactPoint.telephone,
      contactType: SEO_CONFIG.organization.contactPoint.contactType,
      email: SEO_CONFIG.organization.contactPoint.email,
      areaServed: SEO_CONFIG.organization.contactPoint.areaServed,
      availableLanguage: SEO_CONFIG.organization.contactPoint.availableLanguage,
    },
  };
}

/**
 * 3. ProfilePage Schema (for Public User Profiles)
 */
export function generateProfileSchema(user: {
  username: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
}) {
  const profileUrl = getCanonicalUrl(`/u/${user.username}`);
  const avatarUrl = user.avatar || SEO_CONFIG.defaultOgImage;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: user.name || user.username,
      alternateName: user.username,
      url: profileUrl,
      image: avatarUrl,
      description: user.bio || `View ${user.name || user.username}'s profile, reels, and community updates on Tolee.`,
      ...(user.location ? { homeLocation: { '@type': 'Place', name: user.location } } : {}),
      ...(user.website ? { sameAs: [user.website] } : {}),
      interactionStatistic: [
        ...(typeof user.followersCount === 'number'
          ? [
              {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/FollowAction',
                userInteractionCount: user.followersCount,
              },
            ]
          : []),
      ],
    },
  };
}

/**
 * 4. Group / Community Schema (for Tolee Communities)
 */
export function generateGroupSchema(tolee: {
  slug: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  coverImage?: string | null;
  category?: string | null;
  memberCount?: number;
  postsCount?: number;
  creatorName?: string | null;
  creatorUsername?: string | null;
}) {
  const groupUrl = getCanonicalUrl(`/t/${tolee.slug}`);
  const bannerImage = tolee.coverImage || tolee.avatar || SEO_CONFIG.defaultOgImage;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: `${tolee.name} Community`,
    alternateName: tolee.name,
    url: groupUrl,
    logo: tolee.avatar || bannerImage,
    image: bannerImage,
    description: tolee.description || `Join ${tolee.name} on Tolee to connect with local members, discover discussions, and community updates.`,
    ...(tolee.category ? { knowsAbout: tolee.category } : {}),
    ...(typeof tolee.memberCount === 'number'
      ? {
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/JoinAction',
            userInteractionCount: tolee.memberCount,
          },
        }
      : {}),
  };
}

/**
 * 5. DiscussionForumPosting / SocialMediaPosting Schema (for UGC Posts)
 */
export function generatePostSchema(post: {
  id: string;
  caption?: string | null;
  mediaUrls?: string | null;
  createdAt?: Date | string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  toleeSlug?: string | null;
  toleeName?: string | null;
  likesCount?: number;
  commentsCount?: number;
  shareCount?: number;
}) {
  const postUrl = getCanonicalUrl(`/post/${post.id}`);
  const authorProfileUrl = post.authorUsername ? getCanonicalUrl(`/u/${post.authorUsername}`) : SEO_CONFIG.siteUrl;
  const image = post.mediaUrls ? post.mediaUrls.split(',')[0] : SEO_CONFIG.defaultOgImage;
  const headline = (post.caption || 'Community Discussion').slice(0, 110);

  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': postUrl,
    headline,
    articleBody: post.caption || '',
    url: postUrl,
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    image: image ? [image] : [SEO_CONFIG.defaultOgImage],
    author: {
      '@type': 'Person',
      name: post.authorName || post.authorUsername || 'Tolee Creator',
      url: authorProfileUrl,
      ...(post.authorAvatar ? { image: post.authorAvatar } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    ...(post.toleeName
      ? {
          isPartOf: {
            '@type': 'DiscussionForumPosting',
            name: post.toleeName,
            url: getCanonicalUrl(`/t/${post.toleeSlug}`),
          },
        }
      : {}),
    interactionStatistic: [
      ...(typeof post.likesCount === 'number'
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/LikeAction',
              userInteractionCount: post.likesCount,
            },
          ]
        : []),
      ...(typeof post.commentsCount === 'number'
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/CommentAction',
              userInteractionCount: post.commentsCount,
            },
          ]
        : []),
      ...(typeof post.shareCount === 'number'
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/ShareAction',
              userInteractionCount: post.shareCount,
            },
          ]
        : []),
    ],
  };
}

/**
 * 6. VideoObject Schema (for Reels & Screen Videos)
 */
export function generateVideoSchema(video: {
  id: string;
  title?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  uploadDate?: Date | string | null;
  duration?: string | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  viewsCount?: number;
  likesCount?: number;
}) {
  const reelUrl = getCanonicalUrl(`/reel/${video.id}`);
  const creatorUrl = video.creatorUsername ? getCanonicalUrl(`/u/${video.creatorUsername}`) : SEO_CONFIG.siteUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title || 'Trending Video Reel on Tolee',
    description: video.description || 'Watch short vertical video reels and trending creator moments on Tolee.',
    thumbnailUrl: [video.thumbnailUrl || SEO_CONFIG.defaultOgImage],
    uploadDate: video.uploadDate ? new Date(video.uploadDate).toISOString() : new Date().toISOString(),
    contentUrl: video.videoUrl || undefined,
    embedUrl: reelUrl,
    ...(video.duration ? { duration: video.duration } : {}),
    author: {
      '@type': 'Person',
      name: video.creatorName || video.creatorUsername || 'Tolee Creator',
      url: creatorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    interactionStatistic: [
      ...(typeof video.viewsCount === 'number'
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/WatchAction',
              userInteractionCount: video.viewsCount,
            },
          ]
        : []),
      ...(typeof video.likesCount === 'number'
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/LikeAction',
              userInteractionCount: video.likesCount,
            },
          ]
        : []),
    ],
  };
}

/**
 * 7. NewsArticle / Article Schema (for Editorial and News Posts)
 */
export function generateNewsArticleSchema(article: {
  slug: string;
  headline: string;
  summary?: string | null;
  body?: string | null;
  heroImage?: string | null;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  category?: string | null;
}) {
  const articleUrl = getCanonicalUrl(`/news/${article.slug}`);
  const authorUrl = article.authorUsername ? getCanonicalUrl(`/u/${article.authorUsername}`) : SEO_CONFIG.siteUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description: article.summary || article.headline,
    articleBody: article.body || article.summary || '',
    image: [article.heroImage || SEO_CONFIG.defaultOgImage],
    datePublished: article.datePublished ? new Date(article.datePublished).toISOString() : new Date().toISOString(),
    dateModified: article.dateModified ? new Date(article.dateModified).toISOString() : new Date().toISOString(),
    url: articleUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    author: {
      '@type': 'Person',
      name: article.authorName || article.authorUsername || 'Tolee Editorial',
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    ...(article.category ? { articleSection: article.category } : {}),
  };
}

/**
 * 8. Product / Offer Schema (for Marketplace Listings)
 */
export function generateListingSchema(listing: {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  images?: string[] | string | null;
  location?: string | null;
  sellerName?: string | null;
  sellerUsername?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
}) {
  const listingUrl = getCanonicalUrl(`/marketplace/listing/${listing.id}`);
  const sellerUrl = listing.sellerUsername ? getCanonicalUrl(`/u/${listing.sellerUsername}`) : SEO_CONFIG.siteUrl;
  
  let imageList: string[] = [SEO_CONFIG.defaultOgImage];
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    imageList = listing.images;
  } else if (typeof listing.images === 'string' && listing.images) {
    imageList = listing.images.split(',').map((img) => img.trim());
  }

  const numericPrice = typeof listing.price === 'number' ? listing.price : parseFloat(String(listing.price || '0'));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || listing.title,
    image: imageList,
    url: listingUrl,
    offers: {
      '@type': 'Offer',
      price: !isNaN(numericPrice) ? numericPrice : 0,
      priceCurrency: listing.currency || 'INR',
      availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: listingUrl,
      seller: {
        '@type': 'Person',
        name: listing.sellerName || listing.sellerUsername || 'Tolee Seller',
        url: sellerUrl,
      },
      ...(listing.location ? { areaServed: listing.location } : {}),
    },
  };
}

/**
 * 9. BreadcrumbList Schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url),
    })),
  };
}

/**
 * 10. CollectionPage / ItemList Schema (for Categories, Topics, and Locations)
 */
export function generateCollectionSchema(params: {
  title: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string; description?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.title,
    description: params.description,
    url: getCanonicalUrl(params.url),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: params.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: getCanonicalUrl(item.url),
        ...(item.description ? { description: item.description } : {}),
      })),
    },
  };
}

/**
 * 11. FAQPage Schema (for Answer Engine Optimization / AEO)
 */
export function generateFaqSchema(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
