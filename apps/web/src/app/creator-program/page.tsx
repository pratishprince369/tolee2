import CreatorProgramClient from './CreatorProgramClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Creator Program – Monetize Your Audience & Viral Content',
  description: 'Join the Tolee Creator Program: get lifetime VIP creator cards, blue verification ticks, ₹20,000 Ads Wallet credit, priority viral boosts, and pan-India reach.',
  keywords: ['Tolee Creator Program', 'creator monetization', 'reels creators India', 'verified blue tick', 'creator rewards', 'monetize social media'],
  alternates: {
    canonical: 'https://tolee.in/creator-program',
  },
  openGraph: {
    title: 'Tolee Creator Program – Monetize Your Audience & Viral Content',
    description: 'Join the Tolee Creator Program: get lifetime VIP creator cards, verified badges, Ads Wallet credits, and priority viral boosts.',
    url: 'https://tolee.in/creator-program',
    siteName: 'Tolee Creator Program',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Creator Program' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Creator Program – Monetize Your Audience & Viral Content',
    description: 'Join the Tolee Creator Program: get lifetime VIP creator cards and priority boosts.',
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

export default function CreatorProgramPage() {
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
        "name": "Creator Program",
        "item": "https://tolee.in/creator-program"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <CreatorProgramClient />
    </>
  );
}
