import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Live Sports Score, Cricket & Football Updates | Tolee Sports',
  description: "Check live cricket scores, football scores, match results, fixtures, and real-time sports updates across world leagues on Tolee Sports.",
  keywords: [
    'Live Sports Score',
    'Live Cricket Score',
    'Live Cricket Score Today',
    'Football Live Score',
    'Basketball Live Score',
    'Tennis Live Score',
    "Today's Match Score",
    'Match Results',
    'Sports Fixtures',
    'Live Match Updates',
    'Tolee Sports',
    'Live Score Today',
    'Cricket Scores Today',
    'Football Scores Today'
  ],
  alternates: {
    canonical: 'https://www.tolee.in/sports',
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
  openGraph: {
    title: 'Live Sports Score, Cricket & Football Updates | Tolee Sports',
    description: "Check live cricket scores, football scores, match results, fixtures, and sports updates on Tolee Sports.",
    url: 'https://www.tolee.in/sports',
    siteName: 'Tolee Sports',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: 'https://www.tolee.in/sports/vcpl-season-2.jpg',
        width: 1200,
        height: 630,
        alt: 'Tolee Sports - Live Sports Score, Cricket & Football Updates',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Sports Score, Cricket & Football Updates | Tolee Sports',
    description: "Check live cricket scores, football scores, match results, fixtures, and sports updates on Tolee Sports.",
    images: ['https://www.tolee.in/sports/vcpl-season-2.jpg'],
    site: '@tolee',
    creator: '@tolee',
  },
};

const sportsJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.tolee.in/#website',
      url: 'https://www.tolee.in',
      name: 'Tolee',
      description: "India's Leading Local Community, Reels, Marketplace & Live Sports Network",
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.tolee.in/sports?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.tolee.in/#organization',
      name: 'Tolee',
      url: 'https://www.tolee.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.tolee.in/logo.png',
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://play.google.com/store/apps/details?id=in.tolee.app',
      ],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://www.tolee.in/sports#webpage',
      url: 'https://www.tolee.in/sports',
      name: 'Live Sports Score, Cricket & Football Updates | Tolee Sports',
      description: 'Check live cricket scores, football scores, match results, fixtures and sports updates on Tolee Sports.',
      isPartOf: {
        '@id': 'https://www.tolee.in/#website',
      },
      breadcrumb: {
        '@id': 'https://www.tolee.in/sports#breadcrumb',
      },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.tolee.in/sports#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://www.tolee.in',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sports',
          item: 'https://www.tolee.in/sports',
        },
      ],
    },
  ],
};

export default function SportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://r2.thesportsdb.com" />
      <link rel="dns-prefetch" href="https://r2.thesportsdb.com" />
      <link rel="preconnect" href="https://images.unsplash.com" />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(sportsJsonLd),
        }}
      />
      {children}
    </>
  );
}
