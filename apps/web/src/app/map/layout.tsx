import React from 'react';
import type { Metadata } from 'next';
import { generateBreadcrumbSchema } from '@/lib/seo/schemaGenerator';

export const metadata: Metadata = {
  title: 'Tolee Live Map – Explore Hyperlocal Communities & Local Events',
  description: 'Explore live neighbourhood hubs, local communities, marketplace listings, events, and trending reels in your city on Tolee Interactive Map.',
  keywords: ['Tolee Map', 'hyperlocal map', 'local communities India', 'find events near me', 'city groups', 'neighborhood map'],
  alternates: {
    canonical: 'https://tolee.in/map',
  },
  openGraph: {
    title: 'Tolee Live Map – Explore Hyperlocal Communities & Local Events',
    description: 'Explore live neighbourhood hubs, local communities, marketplace listings, and events on Tolee Interactive Map.',
    url: 'https://tolee.in/map',
    siteName: 'Tolee Map',
    type: 'website',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Map' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Live Map – Explore Hyperlocal Communities',
    description: 'Explore live neighbourhood hubs and local communities on Tolee Interactive Map.',
    images: ['https://tolee.in/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  const jsonLdMap = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Tolee Live Map',
    description: 'Explore live neighbourhood hubs, local communities, marketplace listings, events, and trending reels in your city on Tolee Interactive Map.',
    url: 'https://tolee.in/map',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Tolee',
      url: 'https://tolee.in',
    },
  };

  const jsonLdBreadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Live Map', url: '/map' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMap) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      {children}
    </>
  );
}
