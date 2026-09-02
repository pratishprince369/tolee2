import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateMetadata as generateToleeMetadata } from '@/app/t/[slug]/page';

interface GroupPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata(props: GroupPageProps): Promise<Metadata> {
  return generateToleeMetadata(props);
}

export default async function SingleGroupAliasPage({ params }: GroupPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams?.slug || '';
  permanentRedirect(`/t/${slug}`);
}
