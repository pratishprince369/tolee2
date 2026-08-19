import React from 'react';
import dynamic from 'next/dynamic';

const WhatsAppShootClient = dynamic(
  () => import('./WhatsAppShootClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-emerald-400 font-medium animate-pulse">Launching WhatsApp Shoot Studio...</p>
      </div>
    )
  }
);

export default function WhatsAppShootPage() {
  return <WhatsAppShootClient />;
}
