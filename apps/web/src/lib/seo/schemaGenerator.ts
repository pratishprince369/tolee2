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
 * 4. Group / Community Schema (for Tolee Communities / Groups) - GEO/AEO Enhanced
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
    '@type': ['Organization', 'CommunityGroup'],
    name: `${tolee.name} Community`,
    alternateName: tolee.name,
    url: groupUrl,
    logo: tolee.avatar || bannerImage,
    image: bannerImage,
    description: tolee.description || `Join ${tolee.name} on Tolee to connect with local members, discover discussions, events, and community updates.`,
    inLanguage: 'en-IN',
    areaServed: 'India',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.tolee-name', '.tolee-desc', '.aeo-direct-answer', 'h1', 'p'],
    },
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
 * 5. DiscussionForumPosting / SocialMediaPosting Schema (for UGC Posts) - GEO/AEO Enhanced
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
  location?: string | null;
}) {
  const postUrl = getCanonicalUrl(`/post/${post.id}`);
  const authorProfileUrl = post.authorUsername ? getCanonicalUrl(`/u/${post.authorUsername}`) : SEO_CONFIG.siteUrl;
  const image = post.mediaUrls ? post.mediaUrls.split(',')[0] : SEO_CONFIG.defaultOgImage;
  const headline = (post.caption || 'Community Discussion').slice(0, 110);

  return {
    '@context': 'https://schema.org',
    '@type': ['SocialMediaPosting', 'DiscussionForumPosting'],
    '@id': postUrl,
    headline,
    articleBody: post.caption || '',
    url: postUrl,
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    image: image ? [image] : [SEO_CONFIG.defaultOgImage],
    inLanguage: 'en-IN',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.post-caption', '.aeo-direct-answer', 'article p'],
    },
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
    ...(post.location
      ? {
          contentLocation: {
            '@type': 'Place',
            name: post.location,
          },
        }
      : {}),
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
 * 6. VideoObject Schema (for Reels & Screen Videos) - GEO/AEO & SeekAction Enhanced
 */
export function generateVideoSchema(video: {
  id: string;
  title?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  uploadDate?: Date | string | null;
  duration?: string | number | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  viewsCount?: number;
  likesCount?: number;
  isScreen?: boolean;
}) {
  const watchUrl = video.isScreen
    ? getCanonicalUrl(`/screen/watch/${video.id}`)
    : getCanonicalUrl(`/reel/${video.id}`);
  const creatorUrl = video.creatorUsername ? getCanonicalUrl(`/u/${video.creatorUsername}`) : SEO_CONFIG.siteUrl;

  let formattedDuration: string | undefined;
  if (typeof video.duration === 'number' && video.duration > 0) {
    formattedDuration = `PT${Math.round(video.duration)}S`;
  } else if (typeof video.duration === 'string' && video.duration) {
    formattedDuration = video.duration.startsWith('PT') ? video.duration : `PT${video.duration}S`;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title || (video.isScreen ? 'Tolee Screen Stream' : 'Trending Video Reel on Tolee'),
    description: video.description || (video.isScreen ? 'Watch long-form video streams, tutorials, and masterclasses on Tolee Screen.' : 'Watch short vertical video reels and trending creator moments on Tolee.'),
    thumbnailUrl: [video.thumbnailUrl || SEO_CONFIG.defaultOgImage],
    uploadDate: video.uploadDate ? new Date(video.uploadDate).toISOString() : new Date().toISOString(),
    contentUrl: video.videoUrl || undefined,
    embedUrl: watchUrl,
    inLanguage: 'en-IN',
    isFamilyFriendly: true,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.video-title', '.video-description', '.aeo-direct-answer', 'h1', 'p'],
    },
    potentialAction: {
      '@type': 'SeekToAction',
      target: `${watchUrl}?t={seek_to_second_number}`,
      'startOffset-input': 'required name=seek_to_second_number',
    },
    ...(formattedDuration ? { duration: formattedDuration } : {}),
    author: {
      '@type': 'Person',
      name: video.creatorName || video.creatorUsername || 'Tolee Creator',
      url: creatorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: video.isScreen ? 'Tolee Screen' : 'Tolee Reels',
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
 * 7. NewsArticle / Article Schema (for Editorial and News Posts) - GEO/AEO & E-E-A-T Enhanced
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
  keywords?: string[];
  wordCount?: number;
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
    inLanguage: 'en-IN',
    isAccessibleForFree: true,
    author: {
      '@type': 'Person',
      name: article.authorName || article.authorUsername || 'Tolee Editorial',
      url: authorUrl,
      ...(article.category ? { knowsAbout: [article.category, 'Journalism', 'India News'] } : {}),
      worksFor: {
        '@type': 'Organization',
        name: 'Tolee News',
        url: SEO_CONFIG.siteUrl,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tolee News',
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.news-headline', '.news-summary', '.aeo-direct-answer', 'article p'],
    },
    ...(article.wordCount ? { wordCount: article.wordCount } : {}),
    ...(article.category ? { articleSection: article.category } : {}),
    ...(article.keywords && article.keywords.length > 0 ? { keywords: article.keywords.join(', ') } : {}),
  };
}

/**
 * 8. Product / Offer Schema (for Marketplace Listings) - AEO/GEO Enhanced
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
  condition?: string | null;
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
    brand: {
      '@type': 'Brand',
      name: 'Tolee Marketplace',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.listing-title', '.listing-price', '.listing-description', '.aeo-direct-answer'],
    },
    offers: {
      '@type': 'Offer',
      price: !isNaN(numericPrice) ? numericPrice : 0,
      priceCurrency: listing.currency || 'INR',
      priceValidUntil: '2030-12-31',
      itemCondition: listing.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: listingUrl,
      seller: {
        '@type': 'Person',
        name: listing.sellerName || listing.sellerUsername || 'Tolee Seller',
        url: sellerUrl,
      },
      availableAtOrFrom: {
        '@type': 'Place',
        name: listing.location || 'India',
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

/**
 * 12. Book / Digital Library Collection Schema (for Tolee Book)
 */
export function generateBookCollectionSchema(params: {
  title: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.title,
    description: params.description,
    url: getCanonicalUrl(params.url),
    about: {
      '@type': 'Thing',
      name: 'E-Books & Literature',
      description: 'Free digital classic books, literature, philosophy and science texts with AI reading assistance.'
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
  };
}

/**
 * 13. BlogPosting Schema (for Tolee World Blogs & Articles)
 */
export function generateBlogPostingSchema(blog: {
  slug: string;
  title: string;
  description?: string | null;
  body?: string | null;
  heroImage?: string | null;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  category?: string | null;
  keywords?: string[];
}) {
  const blogUrl = getCanonicalUrl(`/blog/${blog.slug}`);
  const authorUrl = blog.authorUsername ? getCanonicalUrl(`/u/${blog.authorUsername}`) : SEO_CONFIG.siteUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.description || blog.title,
    articleBody: blog.body || blog.description || '',
    image: [blog.heroImage || SEO_CONFIG.defaultOgImage],
    datePublished: blog.datePublished ? new Date(blog.datePublished).toISOString() : new Date().toISOString(),
    dateModified: blog.dateModified ? new Date(blog.dateModified).toISOString() : new Date().toISOString(),
    url: blogUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': blogUrl,
    },
    author: {
      '@type': 'Person',
      name: blog.authorName || blog.authorUsername || 'Tolee Creator',
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
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article p', '.aeo-direct-answer'],
    },
    ...(blog.category ? { articleSection: blog.category } : {}),
    ...(blog.keywords && blog.keywords.length > 0 ? { keywords: blog.keywords } : {}),
  };
}
