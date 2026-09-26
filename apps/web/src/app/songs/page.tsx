import type { Metadata } from 'next';
import { ToleeSongsStream } from '@/components/ToleeSongsStream';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Songs – Stream Music, Trending Albums & Reels Audio',
  description: 'Explore trending albums, stream free music, discover viral Bollywood, Punjabi, and Lo-Fi tracks, and trim audio clips for your Reels on Tolee Songs.',
  keywords: ['Tolee Songs', 'music streaming', 'free songs', 'reels audio', 'albums', 'spotify alternative', 'nuclear music', 'audio trimmer'],
  alternates: {
    canonical: 'https://tolee.in/songs',
  },
  openGraph: {
    title: 'Tolee Songs – Stream Music, Trending Albums & Reels Audio',
    description: 'Explore trending albums, stream free music, and trim clips for your Reels.',
    url: 'https://tolee.in/songs',
    siteName: 'Tolee Songs',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Songs' }],
    type: 'website',
  },
};

export default function SongsPage() {
  return <ToleeSongsStream />;
}
