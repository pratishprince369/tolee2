'use client';

import React from 'react';
import { Tent, Flame, PhoneCall } from 'lucide-react';
import { EXPO_CONTACT } from '../data/listings';

export function ExpoHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#115E59] to-[#0D9488] p-6 sm:p-8 text-white shadow-xl">
      {/* Decorative Background Elements */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-20 top-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
            <Tent className="w-3.5 h-3.5" />
            <span>TOLEE EXPO 2026 • SMALL BUSINESS BRANDS ZONE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            India&apos;s Sovereign Virtual Trade Fair &amp; Brand Offers 🇮🇳
          </h1>
          <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
            Discover factory-direct discounts, creator-reviewed boutique products, and local business offers. Direct WhatsApp ordering with zero middleman markups!
          </p>
        </div>

        {/* VENDOR PITCH CARD */}
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/25 rounded-xl p-4 sm:p-5 text-center md:text-left space-y-2.5 max-w-sm">
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Join Tolee Expo Stalls</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            Starting {EXPO_CONTACT.slotPriceFormatted}
          </div>
          <p className="text-xs text-teal-100">
            1 Influencer Reel + PR News + YouTube Boost + 3 Mo Free Tolee Feed Ads!
          </p>
          <a 
            href={`https://wa.me/${EXPO_CONTACT.phone}?text=Hello%20Tolee%20Team,%20I%20am%20interested%20in%20booking%20a%20stall%20in%20Tolee%20Expo.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs transition-colors shadow-md"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Book Expo Slot ({EXPO_CONTACT.displayPhone})</span>
          </a>
        </div>
      </div>
    </div>
  );
}
