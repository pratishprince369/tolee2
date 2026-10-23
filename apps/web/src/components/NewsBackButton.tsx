'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function NewsBackButton() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // If referrer was /feed or history has depth, perform back navigation
      const hasHistory = window.history.length > 1;
      const cameFromFeed = document.referrer && document.referrer.includes('/feed');

      if (hasHistory && (cameFromFeed || !document.referrer)) {
        router.back();
        // Fallback guard: If popstate was discarded or stalled, force route to /feed
        const currentPath = window.location.pathname;
        setTimeout(() => {
          if (window.location.pathname === currentPath) {
            router.push('/feed');
          }
        }, 250);
        return;
      }
    } catch (e) {
      // Fallback
    }

    router.push('/feed');
  }, [router]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-gray-600 hover:text-black dark:text-zinc-400 dark:hover:text-white font-medium cursor-pointer select-none"
    >
      <ArrowLeft className="w-4 h-4" /> Home Feed
    </Button>
  );
}
