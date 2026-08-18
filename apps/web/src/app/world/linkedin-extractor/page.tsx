'use client';

import dynamic from 'next/dynamic';

const LinkedInExtractorClient = dynamic(
  () => import('./LinkedInExtractorClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    )
  }
);

export default function LinkedInExtractorPage() {
  return <LinkedInExtractorClient />;
}
