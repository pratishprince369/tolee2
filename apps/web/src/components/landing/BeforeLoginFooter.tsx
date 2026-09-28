'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const REGIONAL_LANGUAGES = [
  { code: 'en', label: 'English (UK)' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'اردو' },
];

const DIRECTORY_LINKS = [
  { label: 'Sign up', href: '/signup' },
  { label: 'Log in', href: '/login' },
  { label: 'Communities', href: '/discover' },
  { label: 'Reels', href: '/reels' },
  { label: 'Radar', href: '/radar' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'News', href: '/news' },
  { label: 'Songs & Music', href: '/songs' },
  { label: 'Screen Video', href: '/screen' },
  { label: 'Live Darshan', href: '/darshan' },
  { label: 'Sports', href: '/sports' },
  { label: 'Tolee World', href: '/world' },
  { label: 'Ads Manager', href: '/ads-manager' },
  { label: 'Creator Program', href: '/creator-program' },
  { label: 'Franchise', href: '/franchise' },
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Child Safety', href: '/child-safety' },
  { label: 'Help & Support', href: '/contact' },
  { label: 'Contact Us', href: '/contact' },
];

export function BeforeLoginFooter() {
  const [activeLang, setActiveLang] = useState('en');
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  return (
    <footer className="w-full bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-zinc-500 border-t border-slate-200 dark:border-zinc-900 py-6 px-4 sm:px-8 mt-auto select-none">
      <div className="max-w-5xl mx-auto text-[11px] leading-relaxed">
        
        {/* Row 1: Languages Switcher Bar */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-slate-500 dark:text-zinc-400">
          {REGIONAL_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`transition-colors cursor-pointer ${
                activeLang === lang.code
                  ? 'font-bold text-slate-800 dark:text-zinc-200'
                  : 'hover:underline text-slate-500 dark:text-zinc-400'
              }`}
            >
              {lang.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAllLanguages((prev) => !prev)}
            className="flex items-center justify-center w-5 h-5 rounded border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer ml-1"
            title="More languages"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Optional Expanded Languages Modal/Row */}
        {showAllLanguages && (
          <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] flex flex-wrap gap-x-3 gap-y-1 text-slate-600 dark:text-zinc-400">
            <span>More languages:</span>
            {['অসমীয়া', 'ଓଡ଼ିଆ', 'मैथिली', 'संस्कृतम्', 'नेपाली', 'Español', 'Français', 'Deutsch', 'العربية', 'Português', 'Italiano'].map((extra) => (
              <button
                key={extra}
                type="button"
                onClick={() => {
                  setShowAllLanguages(false);
                }}
                className="hover:underline text-teal-600 dark:text-teal-400 cursor-pointer"
              >
                {extra}
              </button>
            ))}
          </div>
        )}

        {/* Thin Divider Line */}
        <div className="w-full border-t border-slate-200 dark:border-zinc-800 my-2.5" />

        {/* Row 2: Comprehensive Directory Links */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-zinc-400">
          {DIRECTORY_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:underline transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Row 3: Copyright */}
        <div className="mt-4 text-slate-400 dark:text-zinc-500 font-normal">
          <span>Tolee © {new Date().getFullYear()}</span>
        </div>

      </div>
    </footer>
  );
}
