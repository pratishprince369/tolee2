import React from 'react';
import { prisma } from '@/lib/prisma';
import { EXPO_LISTINGS } from './data/listings';
import { ExpoClientGrid } from './components/ExpoClientGrid';
import Link from 'next/link';
import { PlusCircle, LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ToleeExpoPage() {
  // Fetch all approved listings ordered by Super Admin display priority
  let dbListings: any[] = [];
  try {
    dbListings = await prisma.expoListing.findMany({
      where: {
        status: 'APPROVED',
      },
      orderBy: [
        { isPinned: 'desc' },
        { displayOrder: 'asc' },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        package: true,
        microsite: true,
      },
    });
  } catch (err) {
    console.error('Failed to fetch expo listings from database:', err);
  }

  // Combine database listings with fallback seed listings if DB is empty
  const initialListings = dbListings.length > 0 ? dbListings : EXPO_LISTINGS;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* BUSINESS OWNER QUICK ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Virtual Trade Fair is Live • Showcase your business to 100k+ shoppers
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/expo/my-listings"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-teal-600" />
              <span>My Expo Listings</span>
            </Link>

            <Link
              href="/expo/my-listings/create"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Create My Expo Listing</span>
            </Link>
          </div>
        </div>

        {/* DYNAMIC CLIENT GRID WITH SEARCH & FILTER */}
        <ExpoClientGrid initialListings={initialListings} />
      </div>
    </div>
  );
}
