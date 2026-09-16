'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Radio, Sparkles, RefreshCw, Eye, ExternalLink, Play, Filter, Flame } from 'lucide-react';
import { LiveDarshanPlayerModal } from '@/components/LiveDarshanPlayerModal';
import { NamasteIcon } from '@/components/NamasteIcon';

export interface TempleItem {
  id: string;
  name: string;
  slug: string;
  deity?: string | null;
  city: string;
  state: string;
  country: string;
  thumbnail: string;
  youtubeChannelId?: string | null;
  youtubeVideoId?: string | null;
  liveStatus: string;
  officialUrl?: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

export default function LiveDarshanClient() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get('temple');

  const [temples, setTemples] = useState<TempleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | string>('all');
  const [selectedTemple, setSelectedTemple] = useState<TempleItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch temples
  const fetchTemples = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/darshan', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.temples)) {
          setTemples(data.temples);

          // If URL had a temple query parameter on load, open it
          if (initialSlug && !isBackground) {
            const found = data.temples.find((t: TempleItem) => t.slug === initialSlug);
            if (found) {
              setSelectedTemple(found);
              setIsPlayerOpen(true);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching temples:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemples();

    // Auto-refresh live statuses every 60 seconds
    const interval = setInterval(() => {
      fetchTemples(true);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [initialSlug]);

  // Extract unique states for filters
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    temples.forEach(t => {
      if (t.state) states.add(t.state);
    });
    return Array.from(states);
  }, [temples]);

  // Filtered temples
  const filteredTemples = useMemo(() => {
    return temples.filter(temple => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        temple.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        temple.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        temple.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (temple.deity && temple.deity.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'live') {
        return temple.liveStatus === 'live';
      }

      if (activeFilter !== 'all') {
        return temple.state.toLowerCase() === activeFilter.toLowerCase();
      }

      return true;
    });
  }, [temples, searchQuery, activeFilter]);

  const liveCount = useMemo(() => {
    return temples.filter(t => t.liveStatus === 'live').length;
  }, [temples]);

  const handleCardClick = (temple: TempleItem) => {
    setSelectedTemple(temple);
    setIsPlayerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 pb-24 font-sans">
      {/* Devotional Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-600/15 via-orange-600/5 to-transparent border-b border-amber-500/10 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sacred Broadcasts • Holy Shrines</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <NamasteIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 shrink-0" />
            <span>Live Darshan</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Experience real-time divine darshan, daily aartis, and sacred rituals from major temples across India.
          </p>

          {/* Quick Stats Bar */}
          <div className="flex items-center justify-center gap-4 pt-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-red-600 dark:text-red-400 font-extrabold">{liveCount} Live Now</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 shadow-xs">
              <span>🛕 {temples.length} Major Temples</span>
            </div>
            <button
              onClick={() => fetchTemples(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-500 dark:text-zinc-400 transition-colors"
              title="Refresh Live Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search temple, city, or deity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all shadow-xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                activeFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
              }`}
            >
              All Temples ({temples.length})
            </button>

            <button
              onClick={() => setActiveFilter('live')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                activeFilter === 'live'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 hover:border-red-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              🔴 Live Now ({liveCount})
            </button>

            {uniqueStates.map(state => (
              <button
                key={state}
                onClick={() => setActiveFilter(state)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  activeFilter === state
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Temple Grid */}
        {loading ? (
          /* Skeleton Loader */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTemples.length === 0 ? (
          /* Empty Search State */
          <div className="text-center py-16 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-3">
            <div className="text-4xl">🕉️</div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No temples found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No shrines matched your search or active filter. Try resetting your search query or filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
            >
              Show All Temples
            </button>
          </div>
        ) : (
          /* Active Temple Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemples.map(temple => {
              const isLive = temple.liveStatus === 'live';

              return (
                <div
                  key={temple.id}
                  onClick={() => handleCardClick(temple)}
                  className="group relative rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
                >
                  {/* Card Thumbnail & Live Pill */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                    <img
                      src={temple.thumbnail}
                      alt={temple.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-lg animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                          {temple.liveStatus === 'offline' ? 'Offline' : 'Latest Video'}
                        </span>
                      )}
                    </div>

                    {temple.isFeatured && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/90 text-black shadow-md flex items-center gap-1">
                          ★ Featured
                        </span>
                      </div>
                    )}

                    {/* Center Play Button Overlay on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      </div>
                    </div>

                    {/* Bottom overlay inside thumbnail */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1 text-zinc-200 drop-shadow-sm font-medium">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {temple.city}, {temple.state}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                          {temple.name}
                        </h3>
                      </div>
                      {temple.deity && (
                        <p className="text-xs font-semibold text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                          {temple.deity}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <span>Click to watch darshan</span>
                      </span>
                      <button className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        <span>Watch</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Darshan Player Modal */}
      <LiveDarshanPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        temple={selectedTemple}
        onSelectTemple={t => setSelectedTemple(t)}
        allTemples={temples}
      />
    </div>
  );
}
