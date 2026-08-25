import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Newspaper } from 'lucide-react';
import { getNewsFeedPosts } from '@/actions/news';
import { NewsFeedStream } from '@/components/NewsFeedStream';
import { CreateNewsButton } from '@/components/CreateNewsButton';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Tolee News – Latest Breaking Local News, Stories & Daily Updates',
  description: 'Stay informed with verified breaking news, local updates, technology, science, business, entertainment, and community journalism on Tolee News.',
  keywords: ['Tolee News', 'breaking news', 'local news India', 'community journalism', 'science news', 'business updates', 'daily headlines'],
  alternates: {
    canonical: 'https://tolee.in/news',
  },
  openGraph: {
    title: 'Tolee News – Latest Breaking Local News, Stories & Daily Updates',
    description: 'Stay informed with verified breaking news, local updates, technology, science, and community journalism on Tolee News.',
    url: 'https://tolee.in/news',
    siteName: 'Tolee News',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Tolee News' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolee News – Latest Breaking Local News, Stories & Daily Updates',
    description: 'Stay informed with verified breaking news and local updates on Tolee News.',
    images: ['https://tolee.in/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function NewsHubPage({ searchParams }: { searchParams?: { cat?: string; create?: string; openModal?: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;
  const isSuperAdmin = session?.user?.email === process.env.SUPER_ADMIN_EMAIL;
  const currentCategory = searchParams?.cat || 'All';

  // Load initial news posts server-side (page 1, limit 10)
  const res = await getNewsFeedPosts({
    category: currentCategory,
    page: 1,
    limit: 10,
  });

  const initialNews = res.success && res.news ? res.news : [];

  const categories = [
    'All', 'NASA', 'Discovery', 'Science', 'National Geographic', 'Technology', 
    'Business', 'Education', 'Documentary', 'Space', 'History', 'Animals',
    'Local News', 'Politics', 'Sports', 'Lifestyle', 'Real Estate', 'Crime & Safety'
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-200 p-3 sm:p-6 lg:px-8 pt-16 sm:pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* News Hub Premium Header */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0E9F9A] via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 ring-4 ring-teal-500/10 shrink-0">
              <Newspaper className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" /> Real-Time News Stream
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tolee News Hub</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5 max-w-md">Discover verified breaking stories, local updates & community insights curated 24/7 by AI Managers</p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <CreateNewsButton defaultOpen={Boolean(searchParams?.create === 'true' || searchParams?.openModal === 'news')} />
          </div>
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
