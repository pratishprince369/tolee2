import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewsEditor } from '@/components/NewsEditor';

export default async function CreateNewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/news/create');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <NewsEditor />
    </div>
  );
}
