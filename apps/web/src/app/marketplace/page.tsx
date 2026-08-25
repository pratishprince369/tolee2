import { MarketplaceView } from '@/components/MarketplaceView';
import { getListings } from '@/actions/marketplace';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Marketplace – Buy & Sell Locally with 0% Commission',
  description: 'Explore local classifieds, properties, vehicles, electronics, jobs, and services on Tolee Marketplace. Direct buyer-seller connections with zero platform commission.',
  keywords: ['Tolee Marketplace', 'buy and sell local', 'India classifieds', 'local real estate', 'used cars', 'electronics', 'local services'],
  alternates: {
    canonical: 'https://tolee.in/marketplace',
  },
  openGraph: {
    title: 'Tolee Marketplace – Buy & Sell Locally with 0% Commission',
    description: 'Explore local classifieds, properties, vehicles, electronics, jobs, and services on Tolee Marketplace. Direct buyer-seller connections.',
    url: 'https://tolee.in/marketplace',
    siteName: 'Tolee Marketplace',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee Marketplace' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee Marketplace – Buy & Sell Locally with 0% Commission',
    description: 'Explore local classifieds, properties, vehicles, electronics, jobs, and services on Tolee Marketplace.',
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

export default async function MarketplacePage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || null;

  const res = await getListings();
  const dbListings = res.success ? res.listings : [];

  let initialListings = dbListings;

  if (initialListings.length === 0) {
    initialListings = [
      {
        id: 'mock-1',
        title: '1 BHK Apartment for Sale in Kalyan',
        price: 3500000,
        currency: 'INR',
        locationText: 'Kalyan, Maharashtra',
        category: 'Property',
        condition: 'new',
        images: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
        description: 'Premium 1 BHK apartment for sale in Kalyan. Excellent condition, premium fittings.',
        seller: { name: 'Lok Times' }
      },
      {
        id: 'mock-2',
        title: 'Honda City 2020 Top Model',
        price: 850000,
        currency: 'INR',
        locationText: 'Andheri West, Mumbai',
        category: 'Vehicles',
        condition: 'used',
        images: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=600&q=80',
        description: 'Single owner, well maintained, fully insured.',
        seller: { name: 'Amit Kumar' }
      },
      {
        id: 'mock-3',
        title: 'Premium Office Chair',
        price: 4500,
        currency: 'INR',
        locationText: 'Bandra, Mumbai',
        category: 'Electronics',
        condition: 'new',
        images: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=600&q=80',
        description: 'Ergonomic office chair with lumbar support. Brand new in box.',
        seller: { name: 'Priya Desai' }
      }
    ];
  }

  const jsonLdMarketplace = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Tolee Marketplace",
    "description": "Explore local classifieds, properties, vehicles, electronics, jobs, and services on Tolee Marketplace.",
    "url": "https://tolee.in/marketplace",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tolee",
      "url": "https://tolee.in"
    }
  };

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
        "name": "Marketplace",
        "item": "https://tolee.in/marketplace"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMarketplace) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <MarketplaceView initialListings={initialListings} />
    </>
  );
}
