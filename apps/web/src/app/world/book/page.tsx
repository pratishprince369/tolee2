import React from 'react';
import { Metadata } from 'next';
import { ToleeBookClient } from '@/tools/tolee-book/components/ToleeBookClient';
import { generateBookCollectionSchema, generateBreadcrumbSchema } from '@/lib/seo/schemaGenerator';

export const metadata: Metadata = {
  title: 'Tolee Book & Smart Reader | Free Digital Library & AI Reader',
  description: 'Explore thousands of free classic books, philosophy, and science literature with AI summaries, personalized bookmarks, and multi-language reading on Tolee Book.',
  keywords: ['Tolee Book', 'free books online', 'digital library India', 'classic literature', 'AI book reader', 'ebooks'],
  alternates: {
    canonical: 'https://tolee.in/world/book',
  },
  openGraph: {
    title: 'Tolee Book & Smart Reader | Free Digital Library',
    description: 'Explore thousands of free classic books, philosophy, and science literature with AI summaries on Tolee Book.',
    url: 'https://tolee.in/world/book',
    siteName: 'Tolee World',
    type: 'website',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Book' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Book & Smart Reader',
    description: 'Explore thousands of free books with AI summaries on Tolee Book.',
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

export default function ToleeBookPage() {
  const jsonLdBook = generateBookCollectionSchema({
    title: 'Tolee Book & Smart Reader',
    description: 'Explore thousands of free classic books, philosophy, and science literature with AI reading assistance on Tolee Book.',
    url: '/world/book',
  });

  const jsonLdBreadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tolee World', url: '/world' },
    { name: 'Tolee Book', url: '/world/book' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBook) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <ToleeBookClient />
    </>
  );
}
