import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ArticlePublisherStudio } from '@/components/ArticlePublisherStudio';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Write & Publish News Article | Tolee',
  description: 'Write, format and publish your full-length news story, press release or article on Tolee with images, formatting and backlinks.',
};

export default async function CreateNewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/news/create');
  }

  return <ArticlePublisherStudio user={session.user} />;
}
