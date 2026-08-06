import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Reels | Watch Trending Short Video Reels',
  description: 'Watch trending vertical video reels, discover viral short videos, and share your moments on Tolee Reels.',
  openGraph: {
    title: 'Tolee Reels | Watch Trending Short Video Reels',
    description: 'Watch trending vertical video reels, discover viral short videos, and share your moments on Tolee Reels.',
    url: 'https://www.tolee.in/reels',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
