import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { ExpoMicrositeView } from '../components/ExpoMicrositeView';

interface PageProps {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const listing = await prisma.expoListing.findUnique({
    where: { slug: params.slug },
    include: { microsite: true }
  });

  if (!listing || listing.status !== 'APPROVED') {
    return {
      title: 'Business Not Found | Tolee Expo',
    };
  }

  return {
    title: `${listing.brandName} | Official Virtual Stall | Tolee Expo`,
    description: listing.shortDescription || listing.offerDescription,
    openGraph: {
      title: `${listing.brandName} - ${listing.productName}`,
      description: listing.offerDescription,
      images: [listing.coverUrl || listing.thumbnailUrl || 'https://tolee.in/logo.png'],
    },
  };
}

export default async function ExpoBusinessMicrositePage({ params }: PageProps) {
  const listing = await prisma.expoListing.findUnique({
    where: { slug: params.slug },
    include: {
      microsite: {
        include: {
          products: { orderBy: { sortOrder: 'asc' } },
          gallery: { orderBy: { sortOrder: 'asc' } },
          sections: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }
        }
      },
      package: true
    }
  });

  // Strict approval & active state check
  if (!listing || listing.status !== 'APPROVED' || (listing.microsite && !listing.microsite.isActive)) {
    notFound();
  }

  // Increment views count asynchronously in background
  if (listing.microsite) {
    prisma.expoMicrosite.update({
      where: { id: listing.microsite.id },
      data: { viewsCount: { increment: 1 } }
    }).catch(() => {});
  }

  return <ExpoMicrositeView listing={listing} />;
}
