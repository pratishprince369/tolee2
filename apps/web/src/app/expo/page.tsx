'use client';

import React, { useState, useMemo } from 'react';
import { EXPO_LISTINGS } from './data/listings';
import { ExpoHeroBanner } from './components/ExpoHeroBanner';
import { ExpoFilterBar } from './components/ExpoFilterBar';
import { ExpoStallCard } from './components/ExpoStallCard';
import { ExpoFooterVendorCta } from './components/ExpoFooterVendorCta';

export default function ToleeExpoPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredListings = useMemo(() => {
    return EXPO_LISTINGS.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchQuery = searchQuery.trim() === '' || 
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.offerLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* HERO BANNER & PACKAGES */}
        <ExpoHeroBanner />

        {/* CONTROLS: CATEGORIES & SEARCH */}
        <ExpoFilterBar 
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* LISTINGS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredListings.map(listing => (
            <ExpoStallCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* FOOTER VENDOR BANNER: BOOK YOUR EXPO STALL */}
        <ExpoFooterVendorCta />
      </div>
    </div>
  );
}
