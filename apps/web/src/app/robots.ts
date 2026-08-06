import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.tolee.in';

  const publicRoutes = [
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
  ];

  const disallowedRoutes = [
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
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: publicRoutes,
        disallow: disallowedRoutes,
      },
      // Search Engine & AI Crawler rules (AEO / GEO Optimization)
      {
        userAgent: ['Googlebot', 'Bingbot', 'GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'],
        allow: publicRoutes,
        disallow: disallowedRoutes,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
