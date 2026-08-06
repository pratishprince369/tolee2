import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Newspaper } from 'lucide-react';
import { getNewsFeedPosts } from '@/actions/news';
import { NewsFeedStream } from '@/components/NewsFeedStream';
import { CreateNewsButton } from '@/components/CreateNewsButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewsHubPage({ searchParams }: { searchParams: { cat?: string; create?: string; openModal?: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;
  const isSuperAdmin = session?.user?.email === process.env.SUPER_ADMIN_EMAIL;
  const currentCategory = searchParams.cat || 'All';

  // Load initial news posts server-side (page 1, limit 10)
  const res = await getNewsFeedPosts({
    category: currentCategory,
    page: 1,
    limit: 10,
  });

  const initialNews = res.success && res.news ? res.news : [];

  const categories = [
    'All', 'Local News', 'Business', 'Technology', 'Real Estate', 
    'Politics', 'Sports', 'Lifestyle', 'Opinion', 'Press Releases'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-200 p-4 sm:p-6 lg:px-8 pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* News Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-6 rounded-3xl border border-gray-100 dark:border-zinc-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Tolee News Hub</h1>
              <p className="text-xs text-gray-400">Discover premium blogs, local updates, and stories written by the community</p>
            </div>
          </div>

          <CreateNewsButton defaultOpen={searchParams.create === 'true' || searchParams.openModal === 'news'} />
        </div>

        {/* Paginated Category Filtered Stream */}
        <NewsFeedStream
          initialNews={initialNews}
          categories={categories}
          initialCategory={currentCategory}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
        />

      </div>
    </div>
  );
}
