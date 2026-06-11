import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ToleeLoading() {
  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0a0a0a] pt-14">
      {/* Group Banner Cover */}
      <Skeleton className="w-full h-44 sm:h-56 md:h-64 rounded-none" />

      <div className="container mx-auto px-4 max-w-6xl pb-16">
        {/* Group Header Info */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 sm:-mt-16 mb-8 px-4 text-center sm:text-left">
          {/* Group avatar circular frame */}
          <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white dark:border-[#0a0a0a] shadow-md shrink-0" />
          
          <div className="flex-1 space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-7 w-52 rounded-lg mx-auto sm:mx-0" />
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-full mx-auto sm:mx-0 shrink-0" />
            </div>
          </div>
        </div>

        {/* Two Column Layout (Feed left, info/members right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Feed Skeletons */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-grow space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                </div>
                <Skeleton className="w-full aspect-[16/9] rounded-2xl" />
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Description & About Skeleton */}
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-2/3 rounded" />
              </div>
            </div>

            {/* Members Widget Skeleton */}
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-24 rounded" />
                      <Skeleton className="h-2.5 w-12 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
