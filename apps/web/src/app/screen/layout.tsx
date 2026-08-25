import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Screen – Watch Long-Form Videos, Masterclasses & Streams',
  description: 'Watch high-quality long form videos, live stages, masterclasses, and entertainment shows on Tolee Screen.',
  alternates: {
    canonical: 'https://tolee.in/screen',
  },
  openGraph: {
    title: 'Tolee Screen – Watch Long-Form Videos, Masterclasses & Streams',
    description: 'Watch high-quality long form videos, live stages, masterclasses, and entertainment shows on Tolee Screen.',
    url: 'https://tolee.in/screen',
    siteName: 'Tolee Screen',
    type: 'website',
  },
};

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
