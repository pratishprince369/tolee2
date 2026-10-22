import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, ArrowLeft } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl font-bold border border-teal-100 dark:border-teal-900/50">
          <Compass className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Page Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
            The page or content you are looking for doesn't exist, has been moved, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/feed">
            <Button className="w-full py-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Feed
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
