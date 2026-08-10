import React from 'react';
import { Metadata } from 'next';
import { LocalNeighborhoodRadar } from '@/components/LocalNeighborhoodRadar';

export const metadata: Metadata = {
  title: 'Tolee Radar | Neighborhood Local Alerts & Gupt Khabar',
  description: 'Real-time local neighborhood radar, anonymous alerts, secret food spots, and deals within 1km to 10km radius.',
};

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-gray-100 dark:border-zinc-900 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              📡 Tolee Radar
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-1">
              Your hyper-local neighborhood intelligence radar for instant alerts, secret food stalls, and community news.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20">
              ● Live Radar GPS Active
            </span>
          </div>
        </div>

        {/* Radar Widget Component Container */}
        <div className="w-full">
          <LocalNeighborhoodRadar />
        </div>

      </div>
    </div>
  );
}
