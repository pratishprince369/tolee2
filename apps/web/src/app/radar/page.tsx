import React from 'react';
import { Metadata } from 'next';
import { LocalNeighborhoodRadar } from '@/components/LocalNeighborhoodRadar';

export const metadata: Metadata = {
  title: 'Tolee Radar | Neighborhood Local Alerts & Gupt Khabar',
  description: 'Real-time local neighborhood radar, anonymous alerts, secret food spots, and deals within 1km to 10km radius.',
};

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-black py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <LocalNeighborhoodRadar />
      </div>
    </div>
  );
}
