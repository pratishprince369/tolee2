'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Trophy, Search, Flame, Calendar, Clock, MapPin, 
  ChevronRight, RefreshCw, Radio, Sparkles, Filter, Award,
  Activity, Shield, CheckCircle2, AlertCircle
} from 'lucide-react';
import { SportsEventData, SportsCategoryData } from '@/lib/sports/types';

export default function SportsPage() {
  const [categories, setCategories] = useState<SportsCategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'LIVE' | 'today' | 'UPCOMING' | 'COMPLETED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<SportsEventData[]>([]);
  const [counts, setCounts] = useState({ live: 0, today: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Categories
  useEffect(() => {
    fetch('/api/sports/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      
      if (statusFilter === 'today') {
        params.set('date', 'today');
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/sports/events?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
        if (data.meta?.counts) {
          setCounts(data.meta.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching sports events:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  // Live Auto-Refresh every 25 seconds for real-time scores
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchEvents(true);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const liveEvents = events.filter(e => e.status === 'LIVE');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      
      {/* ── Top Header & Hero Banner ── */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-b border-zinc-900 px-4 py-6 sm:py-8 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Trophy className="w-5 h-5 text-zinc-950 font-bold" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                    Tolee Sports
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      LIVE
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Live scores, match schedules, tournaments, and instant sports updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Live Status Pill & Refresh */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              {counts.live > 0 && (
                <button
                  onClick={() => setStatusFilter('LIVE')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-800/60 text-red-400 text-xs font-bold animate-pulse hover:bg-red-900/50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {counts.live} Match{counts.live > 1 ? 'es' : ''} Live Now
                </button>
              )}
              <button
                onClick={() => fetchEvents(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-all disabled:opacity-50"
                title="Refresh scores"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="mt-5 relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search teams (e.g. India, Arsenal, CSK), tournaments, or venue..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">

        {/* ── Horizontal Sports Categories Navigation ── */}
        <div className="relative mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              All Sports
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                  selectedCategory === cat.slug
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span>{cat.name}</span>
                {cat.eventsCount ? (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.slug ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {cat.eventsCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* ── Match Status Tabs ── */}
        <div className="flex items-center gap-1.5 border-b border-zinc-800/80 mb-6 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold scrollbar-none">
          {[
            { id: 'all', label: 'All Matches' },
            { id: 'LIVE', label: 'Live Now', badge: counts.live, isLive: true },
            { id: 'today', label: "Today's Matches", badge: counts.today },
            { id: 'UPCOMING', label: 'Upcoming', badge: counts.upcoming },
            { id: 'COMPLETED', label: 'Recent Results' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors relative whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'text-emerald-400 font-bold bg-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {tab.isLive && counts.live > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  statusFilter === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Section: Highlighted Live Matches Carousel/Grid ── */}
        {statusFilter === 'all' && liveEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-base font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                Live In Play
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/sports/match/${event.id}`}
                  className="group block bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-red-900/40 hover:border-red-600/60 rounded-2xl p-4 transition-all shadow-lg hover:shadow-red-900/10"
                >
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-black tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-zinc-400 text-[11px] truncate max-w-[150px]">
                      {event.category?.name} {event.tournament?.name ? `• ${event.tournament.name}` : ''}
                    </span>
                  </div>

                  {/* Team 1 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {event.team1Logo ? (
                          <img src={event.team1Logo} alt={event.team1Name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                        {event.team1Name}
                      </span>
                    </div>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {event.homeScore || '0'}
                    </span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {event.team2Logo ? (
                          <img src={event.team2Logo} alt={event.team2Name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                        {event.team2Name}
                      </span>
                    </div>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {event.awayScore || '0'}
                    </span>
                  </div>

                  {/* Status commentary line */}
                  <div className="border-t border-zinc-800/80 pt-2.5 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-semibold truncate max-w-[220px]">
                      {event.currentStatusText || 'Match in progress'}
                    </span>
                    <span className="text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px] font-bold">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Matches Listing Grid ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-zinc-200">
              {statusFilter === 'LIVE' ? 'Live Matches' :
               statusFilter === 'today' ? "Today's Fixtures" :
               statusFilter === 'UPCOMING' ? 'Upcoming Schedules' :
               statusFilter === 'COMPLETED' ? 'Match Results' :
               'All Sports Matches'}
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              Showing {events.length} match{events.length === 1 ? '' : 'es'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4" />
                  <div className="h-5 bg-zinc-800 rounded w-3/4 mb-3" />
                  <div className="h-5 bg-zinc-800 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            /* Friendly Empty State */
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-10 text-center max-w-md mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-850 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-200 mb-1">No Matches Found</h3>
              <p className="text-xs text-zinc-400 mb-4">
                {searchQuery
                  ? `No sporting events found matching "${searchQuery}". Try searching for another team or league.`
                  : 'There are no matches scheduled for the selected category or filter.'}
              </p>
              {(selectedCategory !== 'all' || statusFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold transition-all"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => {
                const isLive = event.status === 'LIVE';
                const isCompleted = event.status === 'COMPLETED';
                const dateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <Link
                    key={event.id}
                    href={`/sports/match/${event.id}`}
                    className="group block bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                  >
                    {/* Top match bar */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isLive ? 'bg-red-500/20 text-red-400' :
                          isCompleted ? 'bg-zinc-800 text-zinc-400' :
                          'bg-sky-500/20 text-sky-400'
                        }`}>
                          {isLive ? '• LIVE' : event.status}
                        </span>
                        <span className="text-zinc-400 text-[11px] truncate max-w-[120px]">
                          {event.category?.name}
                        </span>
                      </div>

                      <span className="text-zinc-500 text-[11px] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {dateFormatted} {event.startTime ? `• ${event.startTime}` : ''}
                      </span>
                    </div>

                    {/* Team 1 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {event.team1Logo ? (
                            <img src={event.team1Logo} alt={event.team1Name} className="w-full h-full object-cover" />
                          ) : (
                            <Shield className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <span className="font-bold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                          {event.team1Name}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-base ${isLive ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {event.homeScore ?? (isCompleted ? '0' : '-')}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {event.team2Logo ? (
                            <img src={event.team2Logo} alt={event.team2Name} className="w-full h-full object-cover" />
                          ) : (
                            <Shield className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <span className="font-bold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                          {event.team2Name}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-base ${isLive ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {event.awayScore ?? (isCompleted ? '0' : '-')}
                      </span>
                    </div>

                    {/* Bottom Venue & Details link */}
                    <div className="border-t border-zinc-800/60 pt-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-zinc-500 truncate max-w-[190px]">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{event.venue || event.city || 'Stadium'}</span>
                      </div>

                      <span className="text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px] font-bold">
                        Scorecard <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
