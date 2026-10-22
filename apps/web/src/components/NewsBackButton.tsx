'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function NewsBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/feed');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-gray-600 hover:text-black dark:text-zinc-400 dark:hover:text-white font-medium cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" /> Home Feed
    </Button>
  );
}
