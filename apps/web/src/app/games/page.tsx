import type { Metadata } from 'next';
import { ToleeGamesStream } from '@/components/ToleeGamesStream';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Games – Free Instant Online Games, 3D Racing & Action',
  description: 'Play 200+ free online HTML5 & WebGL games directly on Tolee Games. Instant play without downloads – 3D racing, chess, fighting, arcade, and puzzle games.',
  keywords: [
    'Tolee Games',
    'free online games',
    'instant web games',
    'HTML5 games',
    'WebGL 3D games',
    'browser chess',
    'Claude games',
    'free gaming portal',
  ],
  alternates: {
    canonical: 'https://tolee.in/games',
  },
  openGraph: {
    title: 'Tolee Games – Free Instant Online Games & 3D Play',
    description: 'Play 200+ free online HTML5 & WebGL games directly on Tolee Games. Instant play without downloads.',
    url: 'https://tolee.in/games',
    siteName: 'Tolee Games',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Games' }],
    type: 'website',
  },
};

export default function GamesPage() {
  return <ToleeGamesStream />;
}
