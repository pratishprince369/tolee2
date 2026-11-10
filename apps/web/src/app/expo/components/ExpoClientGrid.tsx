'use client';

import React, { useState, useMemo } from 'react';
import { ExpoFilterBar } from './ExpoFilterBar';
import { ExpoStallCard } from './ExpoStallCard';

interface ExpoClientGridProps {
  initialListings: any[];
}

export function ExpoClientGrid({ initialListings }: ExpoClientGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredListings = useMemo(() => {
    return initialListings.filter(item => {
      const itemCat = (item.category || '').toLowerCase();
      const matchCat = selectedCategory === 'all' || itemCat === selectedCategory.toLowerCase();
      
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = q === '' ||
        (item.brandName && item.brandName.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.offerLabel && item.offerLabel.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.tags && Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(q)));
      
      return matchCat && matchQuery;
    });
  }, [initialListings, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* FILTER BAR: CATEGORIES & SEARCH */}
      <ExpoFilterBar 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* LISTINGS GRID */}
      {filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredListings.map(listing => (
            <ExpoStallCard key={listing.id || listing.slug} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">
            No stalls found matching &quot;{searchQuery}&quot; in this category.
          </p>
        </div>
      )}
    </div>
  );
}
