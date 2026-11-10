'use client';

import React from 'react';
import { CheckCircle2, Play, MessageSquare } from 'lucide-react';
import { ExpoListing } from '../types';
import { EXPO_CONTACT } from '../data/listings';

interface ExpoStallCardProps {
  listing: ExpoListing;
}

export function ExpoStallCard({ listing }: ExpoStallCardProps) {
  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between">
      <div>
        {/* Product Image & Offer Badge Header */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
          <img 
            src={listing.image} 
            alt={listing.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Stall Tier Badge (Top Left) */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs ${
              listing.stallTier === 'vip' 
                ? 'bg-amber-400 text-slate-950 font-black' 
                : listing.stallTier === 'gold'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {listing.stallTierLabel}
            </span>
          </div>

          {/* Discount / Offer Tag (Top Right) */}
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
              {listing.offerLabel}
            </span>
          </div>

          {/* Brand & City Overlay (Bottom) */}
          <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm drop-shadow-md">{listing.brandName}</span>
              {listing.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 fill-teal-400 drop-shadow-xs" />
              )}
            </div>
            <p className="text-[11px] text-teal-200 drop-shadow-xs">{listing.city}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-600 transition-colors">
              {listing.productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {listing.offerDescription}
            </p>
          </div>

          {/* Creator Review Badge */}
          {listing.creatorReview && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-[11px] text-teal-900 dark:text-teal-200">
              <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                <Play className="w-2.5 h-2.5 fill-white" />
              </div>
              <div className="truncate">
                <span className="font-bold">{listing.creatorReview.creatorName}</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 ml-1.5">
                  {listing.creatorReview.rating}
                </span>
              </div>
            </div>
          )}

          {/* Feature Bullets */}
          <div className="flex flex-wrap gap-1">
            {listing.features.map((feat, idx) => (
              <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                ✓ {feat}
              </span>
            ))}
          </div>

          {/* Price Block */}
          <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              ₹{listing.expoPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 line-through">
              ₹{listing.originalPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 ml-auto">
              ({listing.discountPct}% OFF)
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 pt-0">
        <a
          href={`https://wa.me/${EXPO_CONTACT.phone}?text=${encodeURIComponent(listing.whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs transition-colors shadow-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Claim Expo Offer on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
