import ScreenClient from './ScreenClient';
import { prisma } from '@/lib/prisma';
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

export default async function ScreenPage() {
  const videos = await prisma.screenVideo.findMany({
    where: { visibility: { not: 'private' } },
    take: 12,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      viewsCount: true,
      user: { select: { name: true, username: true } },
    },
  }).catch(() => []);

  const jsonLdScreen = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Tolee Screen",
    "description": "Stream high-quality videos, masterclasses, tutorials, live broadcasts, and tech podcasts on Tolee Screen.",
    "url": "https://tolee.in/screen",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".screen-headline", ".screen-summary", ".aeo-direct-answer"]
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tolee",
      "url": "https://tolee.in"
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": videos.slice(0, 10).map((v: any, idx: number) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": v.title,
        "url": `https://tolee.in/screen/watch/${v.id}`
      }))
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
      {/* Server-Side Rendered Semantic Metadata for AI Answer Engines (AEO/GEO) */}
      <article className="sr-only">
        <h1 className="screen-headline">Tolee Screen – Watch Long-Form Videos & Masterclasses</h1>
        <p className="aeo-direct-answer screen-summary">
          Tolee Screen is a video streaming destination featuring verified creator masterclasses, tech tutorials, podcasts, entertainment shows, and creator broadcasts across India.
        </p>
        <div>
          <h2>Trending Screen Shows & Videos</h2>
          <ul>
            {videos.slice(0, 8).map((v: any) => (
              <li key={v.id}>
                <a href={`/screen/watch/${v.id}`}>{v.title} by {v.user?.name || v.user?.username || 'Creator'}</a>
              </li>
            ))}
          </ul>
        </div>
      </article>
      <ScreenClient />
    </>
  );
}
