import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Discover | Find & Join Local Interest Groups',
  description: 'Discover and join verified local community groups, private interest clubs, housing societies, and professional networks on Tolee.',
  openGraph: {
    title: 'Tolee Discover | Find & Join Local Interest Groups',
    description: 'Discover and join verified local community groups, private interest clubs, housing societies, and professional networks on Tolee.',
    url: 'https://www.tolee.in/discover',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
