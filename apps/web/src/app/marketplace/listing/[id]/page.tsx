import { ListingDetailView } from '@/components/ListingDetailView';
import { getListingById } from '@/actions/marketplace';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface ListingDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = params instanceof Promise ? await params : params;
  const res = await getListingById(id);
  if (res.success && res.listing) {
    const listing = res.listing;
    const priceStr = listing.price ? ` - ₹${listing.price.toLocaleString()}` : '';
    const title = `${listing.title}${priceStr} | Tolee Marketplace`;
    const description = listing.description?.slice(0, 160) || `Buy ${listing.title} on Tolee Marketplace in ${listing.locationText || 'India'}.`;
    const image = listing.images?.split(',')[0] || 'https://tolee.in/logo.png';

    return {
      title,
      description,
      alternates: {
        canonical: `https://tolee.in/marketplace/listing/${id}`,
      },
      openGraph: {
        title,
        description,
        url: `https://tolee.in/marketplace/listing/${id}`,
        siteName: 'Tolee Marketplace',
        images: [{ url: image, width: 1200, height: 630, alt: listing.title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
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
  }
  return {
    title: 'Listing | Tolee Marketplace',
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = params instanceof Promise ? await params : params;
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : undefined;

  const res = await getListingById(id);
  
  if (!res.success || !res.listing) {
    redirect('/marketplace');
  }

  const listing = res.listing;
  const image = listing.images?.split(',')[0] || 'https://tolee.in/logo.png';

  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "image": [image],
    "description": listing.description || `Listing for ${listing.title} on Tolee Marketplace`,
    "offers": {
      "@type": "Offer",
      "url": `https://tolee.in/marketplace/listing/${id}`,
      "priceCurrency": listing.currency || "INR",
      "price": listing.price || 0,
      "priceValidUntil": "2030-12-31",
      "itemCondition": listing.condition === 'new' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Person",
        "name": listing.seller?.name || "Tolee Seller"
      }
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
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": listing.title,
        "item": `https://tolee.in/marketplace/listing/${id}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <ListingDetailView 
        listing={listing} 
        currentUserId={currentUserId}
      />
    </>
  );
}
