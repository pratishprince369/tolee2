'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Rocket, 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Download,
  Star
} from 'lucide-react';
import { BeforeLoginFooter } from '@/components/landing/BeforeLoginFooter';

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=in.tolee.app";

export function DownloadLandingPage() {
  const handleDownloadClick = () => {
    // Open Google Play directly in same or new tab for highest conversion
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FAFAF9] dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors">
      
      {/* Top Clean Header */}
      <header className="w-full border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="inline-block group">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#0E9F9A] group-hover:opacity-90 transition-opacity">
                tolee
              </span>
            </Link>
            <span className="hidden xs:inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-[#0E9F9A] border border-teal-200/60 dark:border-teal-800/60">
              Official App
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/login">
              <button 
                type="button"
                className="rounded-full border border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-extrabold px-3.5 sm:px-5 py-1.5 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Log In
              </button>
            </Link>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0E9F9A] hover:bg-[#0b827e] text-white font-extrabold rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install App</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Hero & Ad Section */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Headline, Highlights & Creative Poster Artwork               */}
          {/* ========================================================================= */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            
            {/* Tag badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-xs font-black text-red-600 dark:text-red-400 mb-4 animate-bounce">
              <Rocket className="w-3.5 h-3.5" />
              <span>LIMITED PROMO: FREE BOOSTING FOR 6 MONTHS</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight max-w-xl">
              Supercharge Your Reach with{' '}
              <span className="bg-gradient-to-r from-[#0E9F9A] via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Tolee Mobile App
              </span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-lg font-medium">
              Boost your product, grow your business, and get maximum organic audience reach right across your local neighborhood.
            </p>

            {/* 4 Core Benefit Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg mt-5 mb-6 text-left">
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                  Boost Products
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                  Grow Business
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                  Content Reach
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                  Local Groups
                </div>
              </div>
            </div>

            {/* Poster Graphic Showcase */}
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl group">
              <div className="absolute -inset-2 bg-gradient-to-r from-red-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition duration-500 pointer-events-none" />
              
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl bg-white dark:bg-zinc-950 aspect-square flex items-center justify-center">
                <Image
                  src="/tolee-boost-poster.jpg"
                  alt="Get Free Boosting For 6 Month - Download Tolee Now"
                  width={640}
                  height={640}
                  priority
                  className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-[1.02]"
                />

                {/* Floating Verified Google Play Badge */}
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/40 dark:border-zinc-800 shadow-lg flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-100">
                    Verified on Google Play
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Direct Download / CTA Action Box (First on mobile)           */}
          {/* ========================================================================= */}
          <div className="order-1 lg:order-2 lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-[#121212] rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 sm:p-8">
              
              <div className="text-center sm:text-left mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#0E9F9A]/10 border border-[#0E9F9A]/20 flex items-center justify-center mb-4 mx-auto sm:mx-0">
                  <span className="text-3xl font-black text-[#0E9F9A]">t</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  Download Tolee App Now
                </h2>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-xs sm:text-sm">
                  <span>🎉 Get 6 Month Boosting on Tolee Free!</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 font-medium">
                  Connect. Create. Belong. Claim your 6-month free boost directly inside the app.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 mb-6 bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Free 6 months product & business promotion</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Target local customers in your neighborhood</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Ultra-fast reels, community posts & local radar</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>100% Secure & official Google Play Store release</span>
                </div>
              </div>

              {/* Primary High-Converting CTA Button: Download Tolee Now */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="w-full group py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-700 hover:to-rose-700 text-white font-black text-base sm:text-lg shadow-xl shadow-red-500/25 active:scale-95 transition-all flex items-center justify-center gap-3 select-none mb-3"
              >
                <Download className="w-6 h-6 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
                <span>Download Tolee Now</span>
              </a>

              {/* Google Play Store Official Badge Button */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 rounded-2xl bg-black hover:bg-zinc-900 border border-zinc-800 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-3 select-none"
              >
                {/* Official Google Play Vector Icon */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186c-.198-.182-.31-.44-.31-.722V2.536c0-.282.112-.54.31-.722zM15.207 13.414l2.678 2.678-12.793 7.385 10.115-10.063zm2.678-5.492L15.207 10.59 5.092.523l12.793 7.4zm1.096 1.096l3.52 2.03c.8.463.8 1.218 0 1.68l-3.52 2.03-2.316-2.316 2.316-2.324z" />
                </svg>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[9px] font-semibold tracking-wider uppercase text-zinc-400">GET IT ON</span>
                  <span className="text-sm font-extrabold text-white mt-0.5">Google Play</span>
                </div>
              </a>

              {/* Direct Web Fallback link */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/80 text-center">
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  Already using Tolee on Web?{' '}
                  <Link href="/login" className="text-[#0E9F9A] hover:underline font-bold inline-flex items-center gap-0.5">
                    Log in here <ArrowRight className="w-3 h-3" />
                  </Link>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <BeforeLoginFooter />

    </div>
  );
}
