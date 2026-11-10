'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { EXPO_CATEGORIES } from '../data/listings';

interface ExpoFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ExpoFilterBar({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange
}: ExpoFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {EXPO_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Box */}
      <div className="relative flex-shrink-0 w-full sm:w-64">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search brands, offers, city..."
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}
