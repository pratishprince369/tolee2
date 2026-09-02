export const SEO_CONFIG = {
  siteName: 'Tolee',
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tolee.in',
  defaultTitle: 'Tolee | Discover Local Communities, Reels & Marketplace',
  titleTemplate: '%s | Tolee',
  defaultDescription: "Tolee is India's leading community social network. Connect with local Tolee groups, watch vertical video reels, discover breaking local news, shop on Tolee Marketplace, stream videos, and explore AI tools.",
  defaultOgImage: 'https://tolee.in/logo.png',
  locale: 'en_IN',
  social: {
    twitter: '@tolee_in',
    instagram: 'tolee.in',
    youtube: 'tolee_official',
  },
  organization: {
    name: 'Tolee India',
    legalName: 'Tolee Social Network Private Limited',
    url: 'https://tolee.in',
    logo: 'https://tolee.in/logo.png',
    foundingDate: '2024',
    contactPoint: {
      telephone: '+91-9876543210',
      contactType: 'customer service',
      email: 'support@tolee.in',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    sameAs: [
      'https://www.instagram.com/tolee.in',
      'https://twitter.com/tolee_in',
      'https://www.linkedin.com/company/tolee',
    ],
  },
} as const;
