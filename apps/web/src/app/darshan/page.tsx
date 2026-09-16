import LiveDarshanClient from './LiveDarshanClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Darshan – Watch Major Indian Temple Broadcasts Online | Tolee',
  description: 'Experience official live stream darshan from major temples across India: Shirdi Sai Baba, Tirupati Balaji, Siddhivinayak, Kashi Vishwanath, Mahakaleshwar, Ayodhya Ram Mandir & more.',
  keywords: [
    'Live Darshan',
    'Indian Temples Live',
    'Shirdi Sai Baba Live Darshan',
    'Tirupati Balaji Live',
    'Siddhivinayak Live Stream',
    'Kashi Vishwanath Aarti',
    'Ayodhya Ram Mandir Live',
    'Tolee Live Darshan'
  ],
  alternates: {
    canonical: 'https://tolee.in/darshan',
  },
  openGraph: {
    title: 'Live Darshan – Watch Major Indian Temple Broadcasts Online | Tolee',
    description: 'Experience real-time official live darshan, daily aartis, and sacred rituals from major temples across India.',
    url: 'https://tolee.in/darshan',
    siteName: 'Tolee',
    images: [{ url: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=1200', width: 1200, height: 630, alt: 'Tolee Live Darshan' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Darshan – Major Indian Temple Broadcasts | Tolee',
    description: 'Watch official live darshan of Shirdi Sai Baba, Tirupati Balaji, Siddhivinayak, Mahakaleshwar, Ayodhya and more on Tolee.',
    images: ['https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=1200'],
  }
};

export default function DarshanPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Tolee Live Darshan",
    "description": "Stream official live temple broadcasts and sacred daily aartis from major Indian shrines.",
    "url": "https://tolee.in/darshan",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tolee",
      "url": "https://tolee.in"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LiveDarshanClient />
    </>
  );
}
