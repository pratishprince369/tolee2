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
  let newsItem: any = null;
  try {
    newsItem = await prisma.newsPost.findUnique({
      where: { postId: params.id },
      include: { post: true }
    });
  } catch (e) {
    // NewsPost table may not exist yet
  }

  if (!newsItem) {
    notFound();
  }

  // Ensure only the actual author can edit the news post
  if (!userId || newsItem.post.authorId !== userId) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <NewsEditor initialData={newsItem} />
    </div>
  );
}
