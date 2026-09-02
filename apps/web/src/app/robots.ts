import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tolee.in';

  const publicRoutes = [
    '/',
    '/discover',
    '/reels',
    '/reel/*',
    '/news',
    '/news/*',
    '/article/*',
    '/marketplace',
    '/marketplace/*',
    '/listing/*',
    '/category/*',
    '/topic/*',
    '/location/*',
    '/screen',
    '/screen/watch/*',
    '/world',
    '/world/*',
    '/radar',
    '/radar/*',
    '/map',
    '/creator-program',
    '/about',
    '/privacy',
    '/terms',
    '/contact',
    '/t/*',
    '/groups/*',
    '/micro-website/*',
    '/blog/*',
    '/restaurant/*',
    '/store/*',
    '/u/*',
    '/profile/*',
    '/post/*',
  ];

  const disallowedRoutes = [
    '/api/',
    '/api/*',
    '/auth/',
    '/login/',
    '/signup/',
    '/forgot-password/',
    '/admin/',
    '/super-admin/',
    '/dashboard/',
    '/creator-dashboard/',
    '/ads-manager/',
    '/settings/',
    '/chat/',
    '/messages/',
    '/notifications/',
    '/ai-manager/',
    '/feed',
    '/feed/*',
    '/my-tolees',
    '/my-tolees/*',
    '/ads/',
    '/internal/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: publicRoutes,
        disallow: disallowedRoutes,
      },
      // Search Engine & AI Crawler rules (AEO / GEO / Search Engine Optimization)
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'Slurp',
          'DuckDuckBot',
          'Baiduspider',
          'YandexBot',
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
          'Applebot'
        ],
        allow: publicRoutes,
        disallow: disallowedRoutes,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

