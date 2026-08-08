'use client';

import React from 'react';

export const FeedSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {[1, 2, 3].map((key) => (
        <div 
          key={key} 
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-4 w-full"
        >
          {/* Header: Avatar and User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 skeleton-shimmer shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded-md w-1/3 skeleton-shimmer" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-1/4 skeleton-shimmer" />
            </div>
          </div>

          {/* Body: Text Content Skeleton */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded-md w-full skeleton-shimmer" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded-md w-5/6 skeleton-shimmer" />
          </div>

          {/* Media Skeleton */}
          <div className="w-full aspect-video bg-gray-200 dark:bg-zinc-800 rounded-lg mb-4 skeleton-shimmer" />

          {/* Footer: Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
            {[1, 2, 3].map((btn) => (
              <div 
                key={btn}
                className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-md w-1/4 skeleton-shimmer" 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
