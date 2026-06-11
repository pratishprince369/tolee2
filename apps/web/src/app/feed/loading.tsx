import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl pt-24 min-h-screen space-y-6">
      {/* Create Post Skeleton Box */}
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex gap-4 items-center">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="h-10 rounded-2xl flex-1" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800/50">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
      </div>

      {/* 2 Feed Post Skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
          {/* Post Header */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          </div>

          {/* Post Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-11/12 rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>

          {/* Media (Image/Video) Placeholder */}
          <Skeleton className="w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl" />

          {/* Actions Bar */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
