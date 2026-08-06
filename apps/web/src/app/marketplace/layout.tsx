import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Marketplace | Buy & Sell Local Products & Services',
  description: 'Explore Tolee Marketplace to buy and sell local products, real estate, services, and digital items with 0% commission.',
  openGraph: {
    title: 'Tolee Marketplace | Buy & Sell Local Products & Services',
    description: 'Explore Tolee Marketplace to buy and sell local products, real estate, services, and digital items with 0% commission.',
    url: 'https://www.tolee.in/marketplace',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
