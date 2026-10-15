'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateNewsButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();

  return (
    <Button 
      onClick={() => router.push('/news/create')}
      className="bg-gradient-to-r from-teal-600 to-[#087A76] hover:from-teal-700 hover:to-[#06615e] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-teal-600/20 cursor-pointer text-xs sm:text-sm px-4 py-2"
    >
      <PenLine className="w-4 h-4" /> Write Article
    </Button>
  );
}
