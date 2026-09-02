import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateMetadata as generateLocationMetadata } from '@/app/location/[slug]/page';

interface MapLocationPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata(props: MapLocationPageProps): Promise<Metadata> {
  return generateLocationMetadata(props);
}

export default async function MapLocationAliasPage({ params }: MapLocationPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams?.slug || '';
  permanentRedirect(`/location/${slug}`);
}
