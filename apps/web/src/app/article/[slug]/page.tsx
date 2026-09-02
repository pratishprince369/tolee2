import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateMetadata as generateNewsMetadata } from '@/app/news/[slug]/page';

interface ArticlePageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata(props: ArticlePageProps): Promise<Metadata> {
  return generateNewsMetadata(props as any);
}

export default async function ArticleAliasPage({ params }: ArticlePageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams?.slug || '';
  permanentRedirect(`/news/${slug}`);
}
