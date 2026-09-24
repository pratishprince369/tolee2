'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();
  React.useEffect(() => {
    try {
      router.replace(to);
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.location.replace(to);
    }
  }, [router, to]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-xs font-bold text-zinc-400">Loading Tolee...</div>
    </div>
  );
}
