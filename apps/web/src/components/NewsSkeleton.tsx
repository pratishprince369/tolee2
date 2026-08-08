'use client';

import React from 'react';

export const NewsSkeleton = () => {
  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto">
      {[1, 2, 3].map((key) => (
        <div 
          key={key} 
          className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-4 w-full"
        >
          {/* News Image Thumbnail */}
          <div className="w-full sm:w-1/3 aspect-video sm:aspect-square bg-gray-200 dark:bg-zinc-800 rounded-lg shrink-0 skeleton-shimmer" />

          {/* News Content */}
          <div className="flex flex-col flex-1 justify-between py-1">
            <div className="flex flex-col gap-3">
              {/* Category Badge */}
              <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full w-20 skeleton-shimmer mb-1" />
              
              {/* Headline */}
              <div className="flex flex-col gap-2">
                <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded-md w-full skeleton-shimmer" />
                <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded-md w-4/5 skeleton-shimmer" />
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-full skeleton-shimmer" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-2/3 skeleton-shimmer" />
              </div>
            </div>

            {/* Footer / Meta */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-800 skeleton-shimmer shrink-0" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-24 skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
