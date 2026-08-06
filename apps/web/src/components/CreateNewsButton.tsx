'use client';

import React from 'react';
import { CreatePostModal } from '@/components/CreatePostModal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateNewsButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();

  return (
    <CreatePostModal 
      defaultTab="news" 
      defaultOpen={defaultOpen}
      onPost={() => {
        router.refresh();
      }}
    >
      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer">
        <PlusCircle className="w-4 h-4" /> Create Article
      </Button>
    </CreatePostModal>
  );
}
