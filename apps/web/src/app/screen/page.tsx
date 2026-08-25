import ScreenClient from './ScreenClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Screen – Watch Long-Form Videos, Masterclasses & Streams',
  description: 'Stream high-quality videos, masterclasses, tutorials, live broadcasts, and tech podcasts from verified creators across India on Tolee Screen.',
  keywords: ['Tolee Screen', 'video streaming', 'masterclasses', 'tech podcasts', 'live broadcasts', 'video platform India'],
  alternates: {
    canonical: 'https://tolee.in/screen',
  },
  openGraph: {
    title: 'Tolee Screen – Watch Long-Form Videos, Masterclasses & Streams',
    description: 'Stream high-quality videos, masterclasses, tutorials, live broadcasts, and tech podcasts on Tolee Screen.',
    url: 'https://tolee.in/screen',
    siteName: 'Tolee Screen',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Screen' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Screen – Watch Long-Form Videos, Masterclasses & Streams',
    description: 'Stream high-quality videos, masterclasses, tutorials, and live broadcasts on Tolee Screen.',
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

export default function ScreenPage() {
  const jsonLdScreen = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Tolee Screen",
    "description": "Stream high-quality videos, masterclasses, tutorials, live broadcasts, and tech podcasts on Tolee Screen.",
    "url": "https://tolee.in/screen",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tolee",
      "url": "https://tolee.in"
    }
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tolee.in"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Screen",
        "item": "https://tolee.in/screen"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdScreen) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <ScreenClient />
    </>
  );
}
