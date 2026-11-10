'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { EXPO_CONTACT } from '../data/listings';

export function ExpoFooterVendorCta() {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-teal-600 p-0.5 shadow-lg">
      <div className="rounded-2xl bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
            For Retailers, Boutiques, Clinics &amp; Cafes
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Want Your Brand Stall Featured on Tolee Expo?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
            Get an Influencer Reel shoot, Instagram collaborative promotion, national digital PR release, YouTube ad boost, and 3 full months of free ad rotation on Tolee Feed Page!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="text-center md:text-right">
            <div className="text-xs text-slate-500">Starter Package</div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
              {EXPO_CONTACT.slotPriceFormatted}
            </div>
          </div>
          <a
            href={`https://wa.me/${EXPO_CONTACT.phone}?text=Hello%20Tolee%20Team,%20I%20want%20to%20register%20my%20brand%20for%20a%20Tolee%20Expo%20Stall.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs transition-all shadow-md"
          >
            <span>Book Expo Stall Today</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
