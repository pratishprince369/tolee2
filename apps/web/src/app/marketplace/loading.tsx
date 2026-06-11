import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function MarketplaceLoading() {
  return (
    <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl pt-24 min-h-screen">
      {/* Marketplace Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-48 rounded-xl" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters Skeleton */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Listings Grid Skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] rounded-2xl flex flex-col">
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="p-4 flex flex-col flex-1 space-y-4">
                  <div className="space-y-2 flex-grow">
                    <Skeleton className="h-5 w-11/12 rounded-md" />
                    <Skeleton className="h-3.5 w-1/2 rounded-md" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Skeleton className="h-5 w-12 rounded" />
                    <Skeleton className="h-5 w-14 rounded" />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-auto">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
