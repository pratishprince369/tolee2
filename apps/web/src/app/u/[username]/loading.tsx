import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0a0a0a] pt-14">
      {/* Cover Image Banner Skeleton */}
      <Skeleton className="w-full h-48 sm:h-64 md:h-72 rounded-none" />

      <div className="container mx-auto px-4 max-w-4xl pb-16">
        {/* Profile Info Section */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 mb-8 px-4">
          {/* Avatar circle */}
          <Skeleton className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-[#0a0a0a] shadow-md shrink-0" />
          
          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start">
              <Skeleton className="h-7 w-40 rounded-lg mx-auto sm:mx-0" />
              <div className="flex gap-2 justify-center">
                <Skeleton className="h-9 w-24 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
            
            {/* Stats (Posts, Followers, Following) */}
            <div className="flex gap-6 justify-center sm:justify-start py-1">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            
            {/* Bio line placeholders */}
            <div className="space-y-1.5 max-w-md">
              <Skeleton className="h-4 w-32 rounded mx-auto sm:mx-0" />
              <Skeleton className="h-3.5 w-full rounded mx-auto sm:mx-0" />
              <Skeleton className="h-3.5 w-3/4 rounded mx-auto sm:mx-0" />
            </div>
          </div>
        </div>

        {/* Tab Buttons Skeleton */}
        <div className="flex justify-center border-t border-b border-gray-150 dark:border-zinc-800 py-3 mb-6">
          <div className="flex gap-12">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>

        {/* Grid Skeletons */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
