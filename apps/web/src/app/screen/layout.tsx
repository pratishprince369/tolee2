import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Screen | Stream Videos & Live Masterclasses',
  description: 'Watch high-quality long form videos, live stages, masterclasses, and entertainment shows on Tolee Screen.',
  openGraph: {
    title: 'Tolee Screen | Stream Videos & Live Masterclasses',
    description: 'Watch high-quality long form videos, live stages, masterclasses, and entertainment shows on Tolee Screen.',
    url: 'https://www.tolee.in/screen',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
