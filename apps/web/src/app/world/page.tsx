import WorldDashboardClient from './WorldDashboardClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee World – Digital Books, AI Apps & Creator Tools',
  description: 'Discover the suite of Tolee World tools: read free classic books on Tolee Book with multi-language support, create AI resumes, publish micro-websites, and launch digital storefronts.',
  keywords: ['Tolee World', 'Tolee Book', 'AI tools', 'free books online', 'AI resume builder', 'micro-websites', 'creator economy'],
  alternates: {
    canonical: 'https://tolee.in/world',
  },
  openGraph: {
    title: 'Tolee World – Digital Books, AI Apps & Creator Tools',
    description: 'Discover the suite of Tolee World tools: read free books on Tolee Book, create AI resumes, publish micro-websites, and launch digital storefronts.',
    url: 'https://tolee.in/world',
    siteName: 'Tolee World',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee World' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee World – Digital Books, AI Apps & Creator Tools',
    description: 'Discover the suite of Tolee World tools and digital libraries on Tolee.',
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

export default function WorldPage() {
  const jsonLdWorld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Tolee World",
    "description": "Discover curated AI tools, digital libraries, and creator productivity applications on Tolee World.",
    "url": "https://tolee.in/world",
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
        "name": "Tolee World",
        "item": "https://tolee.in/world"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWorld) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <WorldDashboardClient />
    </>
  );
}
