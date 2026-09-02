import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateMetadata as generateListingMetadata } from '@/app/marketplace/listing/[id]/page';

interface ListingPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata(props: ListingPageProps): Promise<Metadata> {
  return generateListingMetadata(props as any);
}

export default async function ListingAliasPage({ params }: ListingPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams?.id || '';
  permanentRedirect(`/marketplace/listing/${id}`);
}
