import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee News | Latest Local Community News & Updates',
  description: 'Read breaking news, local community updates, and viral articles on Tolee News.',
  openGraph: {
    title: 'Tolee News | Latest Local Community News & Updates',
    description: 'Read breaking news, local community updates, and viral articles on Tolee News.',
    url: 'https://www.tolee.in/news',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
