import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function NotificationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pt-24 min-h-screen">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-lg" />
        </div>
      </div>

      {/* Cards List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <Card key={n} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] rounded-xl">
            <CardContent className="p-4 flex items-start gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-11/12 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
