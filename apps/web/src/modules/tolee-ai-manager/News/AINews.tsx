'use client';

import React from 'react';
import { Newspaper, Sparkles } from 'lucide-react';

export function AINews() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-emerald-600" />
            AI Personalized News Feed
          </h2>
          <p className="text-xs text-slate-500">Curated niche updates (Digital Marketing, Tech, Business, Local Community)</p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-emerald-600">TECHNOLOGY</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">AI Automation in Local Business Reaches 45% Adoption in 2026</p>
            <p className="text-xs text-slate-500">AI Personal Assistants are replacing manual data entry for SMBs...</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-blue-600">DIGITAL MARKETING</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Meta & Google Announce New AI Ad Targeting Features for Local Stores</p>
            <p className="text-xs text-slate-500">Hyper-local targeting now allows radius targeting down to 500 meters...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
