'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  Search,
  Sparkles, 
  ArrowRight, 
  Database,
  ShieldCheck,
  Zap,
  Lock,
  Clock,
  CheckCircle2,
  RefreshCw,
  Gift
} from 'lucide-react';
import { getPublicWorldTools, WorldToolItem } from '@/actions/worldTools';

export default function WorldDashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tools, setTools] = useState<WorldToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoading(true);
    const res = await getPublicWorldTools();
    if (res.success && res.tools) {
      setTools(res.tools);
    }
    setLoading(false);
  };

  const categories = ['ALL', ...Array.from(new Set(tools.map(t => t.category).filter(Boolean)))];

  const filteredTools = tools.filter(t => {
    if (selectedCategory === 'ALL') return true;
    return t.category === selectedCategory;
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">Loading Tolee World...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-4 sm:px-6 lg:px-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      <div className="max-w-6xl mx-auto">

        {/* ═══════════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-[#141e33]">
          
          <div className="flex items-center gap-5">
            {/* Circular Gradient Logo Badge */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2px]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #10b981)' }}
              >
                <div className="w-full h-full rounded-2xl bg-[#0a0f1d] flex flex-col items-center justify-center shadow-inner">
                  <Globe className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Tolee World
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                Explore curated AI apps and productivity tools published by Tolee.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadTools}
              className="p-2.5 rounded-xl bg-[#0d1526] border border-[#1b2b48] hover:border-cyan-500/50 text-gray-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Refresh Apps"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

        </div>

        {/* Category Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                    : 'bg-[#0d1628] border border-[#16253f] text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TOOLS GRID
        ════════════════════════════════════════════ */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-gray-400">Loading Tolee World tools...</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="py-16 text-center bg-[#0a101d] border border-[#142036] rounded-2xl p-8">
            <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No AI Tools Available</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              The Super Admin has not published any tools in this category yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              const isPaid = tool.accessType === 'PAID';
              const isTimedFree = tool.accessType === 'TIMED_FREE';
              const isFree = tool.accessType === 'FREE';

              return (
                <div
                  key={tool.id}
                  className="bg-[#0b1220] border border-[#182842] hover:border-cyan-500/50 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-black/40 relative overflow-hidden"
                >
                  {/* Subtle Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

                  <div>
                    {/* Top Row: Icon + Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0e1b30] border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-inner">
                        <Sparkles className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {/* Custom Badge */}
                        {tool.badge && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                            {tool.badge}
                          </span>
                        )}

                        {/* Access Pricing Badge */}
                        {isFree && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> 100% FREE
                          </span>
                        )}

                        {isTimedFree && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/50 flex items-center gap-1">
                            <Gift className="w-2.5 h-2.5 text-amber-400" /> 
                            {tool.daysRemaining !== undefined && tool.daysRemaining > 0 
                              ? `FREE TRIAL (${tool.daysRemaining}d left)`
                              : 'FREE TRIAL'}
                          </span>
                        )}

                        {isPaid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/50 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> PRO (${tool.priceMonthly || 19.99}/mo)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      {tool.category}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                      {tool.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-4">
                      {tool.description}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-[#142036] flex items-center justify-between">
                    <div className="text-[11px] text-gray-500 font-medium">
                      {tool.category}
                    </div>

                    <Link
                      href={tool.routeUrl}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        isPaid
                          ? 'bg-[#182338] hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/50'
                      }`}
                    >
                      <span>{isPaid ? 'View & Unlock' : 'Launch Tool'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
