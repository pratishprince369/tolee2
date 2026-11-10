'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Play, MessageSquare, ExternalLink, ArrowRight } from 'lucide-react';
import { EXPO_CONTACT } from '../data/listings';

interface ExpoStallCardProps {
  listing: any;
}

export function ExpoStallCard({ listing }: ExpoStallCardProps) {
  const stallSlug = listing.slug || listing.id;
  const image = listing.thumbnailUrl || listing.image || listing.coverUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
  const tierLabel = listing.stallTierLabel || (listing.package?.tier ? `${listing.package.tier} Expo Stall` : 'Verified Expo Stall');
  const cleanPhone = listing.whatsappNumber?.replace(/[^0-9]/g, '') || EXPO_CONTACT.phone;
  const whatsappMsg = listing.whatsappMessage || `Hello ${listing.brandName}, I saw your ${listing.offerLabel || 'special offer'} on Tolee Expo! I want to order.`;

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between hover:border-teal-500/50">
      <div>
        {/* CLICKABLE CARD HEADER & COVER LINKING TO MICROSITE */}
        <Link href={`/expo/${stallSlug}`} className="block relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer">
          <img 
            src={image} 
            alt={listing.productName || listing.brandName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

          {/* Stall Tier Badge (Top Left) */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs ${
              listing.stallTier === 'vip' || listing.package?.tier === 'VIP'
                ? 'bg-amber-400 text-slate-950 font-black' 
                : listing.stallTier === 'gold' || listing.package?.tier === 'GOLD'
                ? 'bg-amber-500 text-white font-bold'
                : 'bg-slate-800 text-white font-bold'
            }`}>
              {tierLabel}
            </span>
          </div>

          {/* Discount / Offer Tag (Top Right) */}
          {listing.offerLabel && (
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                {listing.offerLabel}
              </span>
            </div>
          )}

          {/* Brand & City Overlay (Bottom) */}
          <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm drop-shadow-md group-hover:text-teal-300 transition-colors">
                {listing.brandName}
              </span>
              {listing.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 fill-teal-400 drop-shadow-xs" />
              )}
            </div>
            <p className="text-[11px] text-teal-200 drop-shadow-xs">{listing.city}{listing.state ? `, ${listing.state}` : ''}</p>
          </div>
        </Link>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          <Link href={`/expo/${stallSlug}`} className="block group-hover:opacity-95">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {listing.productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {listing.offerDescription || listing.shortDescription}
            </p>
          </Link>

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
          {listing.features && listing.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.features.slice(0, 3).map((feat: string, idx: number) => (
                <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  ✓ {feat}
                </span>
              ))}
            </div>
          )}

          {/* Price Block */}
          {listing.expoPrice && (
            <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                ₹{Number(listing.expoPrice).toLocaleString('en-IN')}
              </span>
              {listing.originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{Number(listing.originalPrice).toLocaleString('en-IN')}
                </span>
              )}
              {listing.discountPct > 0 && (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 ml-auto">
                  ({listing.discountPct}% OFF)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: Visit Microsite & WhatsApp */}
      <div className="p-4 pt-0 space-y-2">
        <Link
          href={`/expo/${stallSlug}`}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs transition-colors"
        >
          <span>Visit Business Micro-Website</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs transition-colors shadow-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Claim Expo Offer on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
