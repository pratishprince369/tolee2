import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewsEditor } from '@/components/NewsEditor';

export default async function EditNewsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    redirect(`/login?callbackUrl=/news/edit/${params.id}`);
  }
  const userId = (session.user as any).id;

  // Retrieve the existing news article by post ID
  const newsItem = await prisma.newsPost.findUnique({
    where: { postId: params.id },
    include: { post: true }
  });

  if (!newsItem) {
    notFound();
  }

  // Ensure only the author (or an admin) can edit the draft
  if (newsItem.post.authorId !== userId && (session.user as any).role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <NewsEditor initialData={newsItem} />
    </div>
  );
}
