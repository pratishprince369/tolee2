import React, { Suspense } from 'react';
import { AIDashboard } from '@/modules/tolee-ai-manager';
import { Bot } from 'lucide-react';

export default function AIManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#09090b]">
          <div className="text-center space-y-4">
            <Bot className="w-12 h-12 text-violet-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">Loading Tolee AI Personal Manager...</p>
          </div>
        </div>
      }
    >
      <AIDashboard />
    </Suspense>
  );
}
