import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.tolee.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/discover',
          '/reels',
          '/marketplace',
          '/world',
          '/creator-program',
          '/about',
          '/privacy',
          '/terms',
          '/contact',
          '/t/*',
          '/micro-website/*',
          '/blog/*',
          '/restaurant/*',
          '/store/*',
          '/marketplace/listing/*',
          '/u/*',
          '/news',
          '/news/*',
          '/screen',
          '/screen/watch/*',
          '/post/*',
        ],
        disallow: [
          '/api/',
          '/api/*',
          '/graphql/',
          '/rest/',
          '/rpc/',
          '/server/',
          '/backend/',
          '/internal/',
          '/functions/',
          '/webhook/',
          '/auth/',
          '/socket/',
          '/admin/',
          '/super-admin/',
          '/dashboard/',
          '/settings/',
          '/chat/',
          '/messages/',
          '/ads/',
          '/ai-manager/',
          '/login/',
          '/signup/',
          '/forgot-password/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
