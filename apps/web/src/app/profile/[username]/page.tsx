import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateMetadata as generateUserMetadata } from '@/app/u/[username]/page';

interface PageProps {
  params: Promise<{ username: string }> | { username: string };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateUserMetadata(props);
}

export default async function ProfileAliasPage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const username = resolvedParams?.username || '';
  permanentRedirect(`/u/${username}`);
}
