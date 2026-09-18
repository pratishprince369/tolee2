'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Trophy, Search, Flame, Calendar, Clock, MapPin, 
  ChevronRight, ChevronLeft, RefreshCw, Radio, Sparkles, Filter, Award,
  Activity, Shield, CheckCircle2, AlertCircle, Bell, Play, Tv, ExternalLink,
  Share2, Star, Crown, ChevronDown, Check, Volume2, X, SlidersHorizontal
} from 'lucide-react';
import { SportsEventData, SportsCategoryData, TEAM_BADGES } from '@/lib/sports/types';

// Resilient Team Logo component with automatic fallback & error handling
function TeamLogo({ logo, name, className = 'w-full h-full object-contain p-0.5' }: { logo?: string | null; name: string; className?: string }) {
  const [hasError, setHasError] = React.useState(false);
  const resolvedLogo = !hasError ? (logo || TEAM_BADGES[name] || TEAM_BADGES[name?.trim()]) : null;

  if (!resolvedLogo) {
    const initials = (name || '?')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-200 text-[10px] font-black select-none">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={resolvedLogo}
      alt={name}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

// Sports SVG Icons
function SportIcon({ slug, className = 'w-4 h-4' }: { slug: string; className?: string }) {
  switch (slug) {
    case 'all':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
        </svg>
      );
    case 'cricket':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14 10 4.5-4.5a2.121 2.121 0 0 1 3 3L17 13" />
          <path d="M4.5 19.5 12 12" />
          <path d="M3 21l3-3" />
          <circle cx="18" cy="18" r="3" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'football':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m12 7 3 2.5v3.5L12 15l-3-2v-3.5z" fill="currentColor" fillOpacity="0.3" />
          <path d="m12 7-3-2M15 9.5l3.5-1M15 13l3.5 1M12 15l-1.5 3.5M9 13l-3.5 1M9 9.5l-3.5-1" />
        </svg>
      );
    case 'basketball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'tennis':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M5.5 5.5a10 10 0 0 0 13 13M5.5 18.5a10 10 0 0 1 13-13" />
        </svg>
      );
    case 'formula-1':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      );
    case 'badminton':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
          <path d="m9 9 6 6M15 9l-6 6M12 18v4" />
        </svg>
      );
    case 'hockey':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3v13a4 4 0 0 0 4 4h4" />
          <circle cx="16" cy="19" r="2" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    case 'kabaddi':
    case 'rugby':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)" />
          <path d="M7 7l10 10M10 14l2-2M12 12l2-2" />
        </svg>
      );
    case 'mma':
    case 'boxing':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a4 4 0 0 0-4-4H9a4 4 0 0 0-2 4Z" />
          <path d="M7 14h10M10 19v2M14 19v2" />
        </svg>
      );
    case 'volleyball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 0-7 17M12 22a10 10 0 0 0 7-17M2 12a10 10 0 0 0 17 7" />
        </svg>
      );
    case 'golf':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v18M6 3l10 5-10 5" />
          <circle cx="18" cy="19" r="2" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    default:
      return <Activity className={className} />;
  }
}

// Top Leagues Data
const TOP_LEAGUES = [
  { id: 'vcpl', name: 'VCPL T10', sport: 'Cricket', icon: '🏏', slug: 'cricket', query: 'VCPL' },
  { id: 'ipl', name: 'IPL', sport: 'Cricket', icon: '🏏', slug: 'cricket', query: 'IPL' },
  { id: 'pl', name: 'Premier League', sport: 'Football', icon: '⚽', slug: 'football', query: 'Premier League' },
  { id: 'nba', name: 'NBA', sport: 'Basketball', icon: '🏀', slug: 'basketball', query: 'NBA' },
  { id: 'atp', name: 'ATP Tour', sport: 'Tennis', icon: '🎾', slug: 'tennis', query: 'ATP' },
  { id: 'f1', name: 'F1', sport: 'Motorsport', icon: '🏎️', slug: 'formula-1', query: 'Formula 1' },
  { id: 'ufc', name: 'UFC', sport: 'MMA', icon: '🥊', slug: 'mma', query: 'UFC' },
  { id: 'bwf', name: 'BWF', sport: 'Badminton', icon: '🏸', slug: 'badminton', query: 'BWF' },
  { id: 'nhl', name: 'NHL', sport: 'Hockey', icon: '🏒', slug: 'hockey', query: 'NHL' },
  { id: 'pkl', name: 'Pro Kabaddi', sport: 'Kabaddi', icon: '🏆', slug: 'kabaddi', query: 'Pro Kabaddi' },
];

// Trending Sports Topics
const TRENDING_TOPICS = [
  {
    id: '1',
    rank: 1,
    title: 'India vs Australia',
    subtitle: 'Thrilling Finish in Mumbai!',
    views: '124K views',
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150&auto=format&fit=crop&q=80',
    query: 'India',
  },
  {
    id: '2',
    rank: 2,
    title: 'Arsenal Take Lead',
    subtitle: "Saka Scores in 74'",
    views: '98K views',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80',
    query: 'Arsenal',
  },
  {
    id: '3',
    rank: 3,
    title: 'Lakers Dominate Q3',
    subtitle: 'LeBron on Fire',
    views: '76K views',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    query: 'Lakers',
  },
  {
    id: '4',
    rank: 4,
    title: 'Djokovic into Semi Final',
    subtitle: 'US Open 2026',
    views: '65K views',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=150&auto=format&fit=crop&q=80',
    query: 'Djokovic',
  },
  {
    id: '5',
    rank: 5,
    title: 'F1 Singapore GP',
    subtitle: 'Practice Results',
    views: '48K views',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=150&auto=format&fit=crop&q=80',
    query: 'F1',
  },
];

export default function SportsPage() {
  const { data: session } = useSession();

  const [categories, setCategories] = useState<SportsCategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'LIVE' | 'today' | 'UPCOMING' | 'COMPLETED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<SportsEventData[]>([]);
  const [counts, setCounts] = useState({ live: 0, today: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Interactive UI States
  const [activeReminders, setActiveReminders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [watchLiveModal, setWatchLiveModal] = useState<SportsEventData | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const mobileCategoryScrollRef = useRef<HTMLDivElement>(null);
  const leaguesScrollRef = useRef<HTMLDivElement>(null);
  const mobileLeaguesScrollRef = useRef<HTMLDivElement>(null);

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
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  // Live Auto-Refresh every 25 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchEvents(true);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Reminder toggle
  const toggleReminder = (matchId: string, matchTitle: string) => {
    const newState = !activeReminders[matchId];
    setActiveReminders(prev => ({ ...prev, [matchId]: newState }));
    setToastMessage(newState ? `Reminder set for ${matchTitle}!` : `Reminder removed`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Scroll helpers
  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Live and Upcoming Events partition
  const liveEvents = events.filter(e => e.status === 'LIVE');
  const upcomingEvents = events.filter(e => e.status === 'UPCOMING');

  // Format today's date pill e.g. "Thu, 18 Sep 2026"
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#070b13] text-zinc-100 font-sans pb-24 selection:bg-emerald-500 selection:text-black">

      {/* ── Toast Feedback Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          1. HEADER SECTION
          - Desktop (md: and up): Horizontal sub-header with brand, search, filter, notifications & user
          - Mobile (< md): Title bar with Trophy icon + LIVE pill, followed by full-width search input
         ══════════════════════════════════════════════════════════════════════════ */}
      
      {/* ── Desktop Sub-Header (md: and up) ── */}
      <div className="hidden md:block border-b border-[#141d2d] bg-[#070b14]/95 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          
          {/* Brand & LIVE Badge */}
          <Link href="/sports" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-zinc-950 font-bold" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Tolee Sports
              </span>
              <span className="bg-[#e62525] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teams, players, leagues, or matches..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c1424] border border-[#1a263c] hover:border-[#273957] focus:border-emerald-500/80 rounded-xl pl-10 pr-8 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Controls: Category Dropdown + Notifications + Profile */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-[#0c1424] border border-[#1a263c] hover:border-[#2a3c5d] text-zinc-300 text-xs font-semibold rounded-xl px-3.5 py-2 pr-7 appearance-none cursor-pointer outline-none transition-all"
              >
                <option value="all">All Sports</option>
                {categories.map(c => (
                  <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => fetchEvents(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#0c1424] border border-[#1a263c] hover:border-[#2a3c5d] text-zinc-400 hover:text-white transition-all disabled:opacity-50"
              title="Refresh scores"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button className="relative p-2 rounded-xl bg-[#0c1424] border border-[#1a263c] hover:border-[#2a3c5d] text-zinc-400 hover:text-white transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-md shadow-red-500/50">
                3
              </span>
            </button>

            {session?.user ? (
              <Link href={`/u/${session.user.username || session.user.id || 'profile'}`} className="flex items-center gap-2 pl-1 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-zinc-950 overflow-hidden ring-1 ring-emerald-500/40">
                  {session.user.image ? (
                    <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    session.user.name?.[0]?.toUpperCase() || 'P'
                  )}
                </div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors max-w-[90px] truncate">
                  {session.user.name?.split(' ')[0] || 'Pratish'}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* ── Mobile Title Row & Search Bar (< md, directly matching mobile reference) ── */}
      <div className="block md:hidden px-4 pt-3 pb-2 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Trophy className="w-4 h-4 text-zinc-950 font-black" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Tolee Sports
            </h1>
            <span className="bg-[#e62525] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>

          <button
            onClick={() => fetchEvents(true)}
            className="p-1.5 rounded-lg bg-[#0e1626] border border-[#1b273d] text-zinc-300"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Mobile Full-Width Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teams, players, leagues, or matches..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c1424] border border-[#1a263c] rounded-xl pl-10 pr-8 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 mt-2 md:mt-5">

        {/* ══════════════════════════════════════════════════════════════════════════
            2. HERO BANNER: "LIVE SPORTS ALWAYS WITH YOU"
            - Desktop: Widescreen banner with side-by-side headline & star athlete circles
            - Mobile: Compact responsive card with athlete montage and carousel dots at bottom
           ══════════════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-[#1b263b] bg-gradient-to-r from-[#070e1c] via-[#09152b] to-[#040812] shadow-2xl mb-5 sm:mb-6 flex flex-col justify-center">
          {/* Subtle Stadium Light Flare Backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,229,153,0.12),transparent_50%)] pointer-events-none" />
          <div className="absolute -top-24 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Banner Content */}
          <div className="relative z-10 w-full px-4 sm:px-6 py-4 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            
            {/* Left Headline */}
            <div className="w-full md:max-w-xl text-left">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-none">
                <span className="text-white">LIVE </span>
                <span className="text-[#00e599] drop-shadow-[0_0_20px_rgba(0,229,153,0.6)]">
                  SPORTS
                </span>
                <div className="text-white text-base sm:text-3xl lg:text-4xl mt-1 tracking-wider">
                  ALWAYS WITH YOU
                </div>
              </div>
              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-sm text-zinc-400 font-medium tracking-wide">
                Scores • Schedules • News • Highlights • More
              </p>
            </div>

            {/* Right: Slogan & Sports Visuals */}
            <div className="w-full md:w-auto flex flex-col items-start md:items-end justify-center">
              <div className="text-base sm:text-2xl font-serif italic text-white/90 tracking-wide mb-2 text-left md:text-right drop-shadow-md">
                One Community Many Passions
              </div>
              
              {/* Composite sport star badges */}
              <div className="flex items-center -space-x-2.5 sm:-space-x-3 mt-1">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-emerald-500/60 overflow-hidden shadow-lg shadow-emerald-500/20 bg-zinc-800">
                  <img src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=100&auto=format&fit=crop&q=80" alt="Cricket" className="w-full h-full object-cover" />
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-red-500/60 overflow-hidden shadow-lg shadow-red-500/20 bg-zinc-800">
                  <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=80" alt="Football" className="w-full h-full object-cover" />
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-amber-500/60 overflow-hidden shadow-lg shadow-amber-500/20 bg-zinc-800">
                  <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=80" alt="Basketball" className="w-full h-full object-cover" />
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-cyan-500/60 overflow-hidden shadow-lg shadow-cyan-500/20 bg-zinc-800">
                  <img src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=100&auto=format&fit=crop&q=80" alt="Tennis" className="w-full h-full object-cover" />
                </div>
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-purple-500/60 overflow-hidden shadow-lg shadow-purple-500/20 bg-zinc-800">
                  <img src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=100&auto=format&fit=crop&q=80" alt="F1" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

          </div>

          {/* Carousel Indicator Dots (Shown prominently on mobile as per reference) */}
          <div className="flex items-center justify-center gap-1.5 pb-3">
            <span className="w-5 h-1 rounded-full bg-[#00e599]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            3. SPORTS CATEGORY NAVIGATION
            - Mobile: Compact rounded square cards (icon on top, label below) with "More" button
            - Desktop: Horizontal pill row with scroll buttons
           ══════════════════════════════════════════════════════════════════════════ */}
        
        {/* Mobile Category Grid Row (< md) */}
        <div className="block md:hidden mb-5">
          <div
            ref={mobileCategoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar -mx-4 px-4"
          >
            {/* All Sports Card */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-2xl text-center transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#00e599] text-zinc-950 shadow-lg shadow-[#00e599]/25 font-black'
                  : 'bg-[#0d1525] border border-[#19253a] text-zinc-300'
              }`}
            >
              <SportIcon slug="all" className={`w-5 h-5 mb-1 ${selectedCategory === 'all' ? 'text-zinc-950' : 'text-[#00e599]'}`} />
              <span className="text-[11px] font-bold leading-tight">All Sports</span>
            </button>

            {/* Individual Sport Cards */}
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-2xl text-center transition-all border ${
                    isSelected
                      ? 'bg-[#00e599] text-zinc-950 border-[#00e599] shadow-lg shadow-[#00e599]/25 font-black'
                      : 'bg-[#0d1525] border-[#19253a] text-zinc-300'
                  }`}
                >
                  <SportIcon slug={cat.slug} className={`w-5 h-5 mb-1 ${isSelected ? 'text-zinc-950' : 'text-zinc-300'}`} />
                  <span className="text-[11px] font-semibold leading-tight truncate max-w-[62px]">
                    {cat.name}
                  </span>
                </button>
              );
            })}

            {/* More Button */}
            <button
              onClick={() => scrollContainer(mobileCategoryScrollRef, 'right')}
              className="flex-shrink-0 flex flex-col items-center justify-center w-[70px] h-[70px] rounded-2xl bg-[#0d1525] border border-[#19253a] text-zinc-400 hover:text-white text-center transition-all"
            >
              <div className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center mb-1">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold leading-tight">More</span>
            </button>
          </div>
        </div>

        {/* Desktop Category Navigation (md: and up) */}
        <div className="hidden md:block relative mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollContainer(categoryScrollRef, 'left')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0d1524] border border-[#1b273d] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0 shadow-md"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar scroll-smooth flex-1"
            >
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#00e599] text-zinc-950 shadow-lg shadow-[#00e599]/25 font-black'
                    : 'bg-[#0d1525] hover:bg-[#121c30] text-zinc-300 border border-[#19253a] hover:border-[#273854]'
                }`}
              >
                <SportIcon slug="all" className="w-4 h-4" />
                <span>All Sports</span>
              </button>

              {categories.map(cat => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all border ${
                      isSelected
                        ? 'bg-[#00e599] text-zinc-950 border-[#00e599] shadow-lg shadow-[#00e599]/25 font-black'
                        : 'bg-[#0d1525] hover:bg-[#121c30] text-zinc-300 border-[#19253a] hover:border-[#273854]'
                    }`}
                  >
                    <SportIcon slug={cat.slug} className={`w-4 h-4 ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`} />
                    <span>{cat.name}</span>
                    {cat.eventsCount ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {cat.eventsCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => scrollContainer(categoryScrollRef, 'right')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0d1524] border border-[#1b273d] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0 shadow-md"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            4. MATCH FILTER TABS & DATE/FILTER BAR
            - Mobile: Filter tabs scroll, with a dedicated Date + Filters bar row below
            - Desktop: Horizontal row with tabs on left and Date pill on right
           ══════════════════════════════════════════════════════════════════════════ */}
        <div className="mb-5">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'All Matches' },
              { id: 'LIVE', label: 'Live Now', badge: counts.live, isLive: true },
              { id: 'today', label: "Today's", badge: counts.today || 5 },
              { id: 'UPCOMING', label: 'Upcoming', badge: counts.upcoming },
              { id: 'COMPLETED', label: 'Results' },
            ].map(tab => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                    active
                      ? 'bg-[#00e599] text-zinc-950 border-[#00e599] shadow-md shadow-[#00e599]/20 font-black'
                      : 'bg-[#0c1424] hover:bg-[#111a2d] text-zinc-300 border-[#19263c] hover:border-[#273854]'
                  }`}
                >
                  {tab.isLive && counts.live > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Date & Filter Controls Row (Split on mobile as per reference) */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0c1424] border border-[#19263c] text-zinc-300 text-xs font-semibold shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formattedToday}</span>
            </div>

            <button
              onClick={() => setShowFilterModal(!showFilterModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#121c32] border border-[#19263c] text-zinc-300 text-xs font-semibold shadow-sm transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            5. MAIN CONTENT GRID + RIGHT SIDEBAR
            - Mobile (< lg): Single column with horizontal scroll carousels for Live, Upcoming, Leagues & bottom promo banner
            - Desktop (lg: and up): 2-column layout (8/9 cols left + 3/4 cols sidebar with Favourite teams, Trending now & partner promo)
           ══════════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════ LEFT MAIN CONTENT (Col 1-8 / 9 on Desktop, 100% on Mobile) ════ */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-7 sm:space-y-8">
            
            {/* ── A. LIVE MATCHES SECTION ── */}
            {(statusFilter === 'all' || statusFilter === 'LIVE') && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                        Live Matches
                      </h2>
                      <p className="text-[11px] sm:text-xs text-zinc-400">
                        Real-time scores and match updates
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStatusFilter('LIVE')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                  >
                    View All Live <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {liveEvents.length === 0 ? (
                  <div className="bg-[#0b1220]/80 border border-[#162237] rounded-2xl p-6 sm:p-8 text-center">
                    <p className="text-xs sm:text-sm text-zinc-400">
                      No live matches in play right now. Check upcoming schedules below!
                    </p>
                  </div>
                ) : (
                  /* 
                    Mobile: Horizontal scroll-snap carousel with right peek (overflow-x-auto, -mx-4 px-4, snap-x)
                    Desktop: Multi-column grid (md:grid-cols-2 xl:grid-cols-3)
                  */
                  <div className="flex md:grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-none no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
                    {liveEvents.map(match => {
                      const team1Logo = match.team1Logo || TEAM_BADGES[match.team1Name];
                      const team2Logo = match.team2Logo || TEAM_BADGES[match.team2Name];

                      return (
                        <div
                          key={match.id}
                          className="w-[84vw] max-w-[340px] md:w-auto flex-shrink-0 snap-start bg-[#0b1222] border border-[#17253b] hover:border-[#2a3f63] rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all group"
                        >
                          {/* Top Row: Live badge & Tournament / Overs */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="bg-[#e62525] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-red-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                LIVE
                              </span>
                              <span className="text-zinc-400 text-[11px] font-medium truncate max-w-[170px]">
                                {match.tournament?.name || match.category?.name || 'Live Match'} {match.startTime ? `• ${match.startTime}` : ''}
                              </span>
                            </div>

                            {/* Team 1 */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                  <TeamLogo logo={team1Logo} name={match.team1Name} className="w-full h-full object-contain p-0.5" />
                                </div>
                                <span className="font-extrabold text-sm text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                                  {match.team1Name}
                                </span>
                              </div>
                              <span className="font-mono font-black text-lg text-white">
                                {match.homeScore || '0'}
                              </span>
                            </div>

                            {/* Team 2 */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                  <TeamLogo logo={team2Logo} name={match.team2Name} className="w-full h-full object-contain p-0.5" />
                                </div>
                                <span className="font-extrabold text-sm text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                                  {match.team2Name}
                                </span>
                              </div>
                              <span className="font-mono font-black text-lg text-white">
                                {match.awayScore || '0'}
                              </span>
                            </div>

                            {/* Situation Summary Text */}
                            <div className="text-xs font-semibold mb-2 truncate">
                              {match.category?.slug === 'cricket' ? (
                                <span className="text-amber-400">
                                  {match.currentStatusText || 'Match in progress'}
                                </span>
                              ) : (
                                <span className="text-emerald-400">
                                  {match.currentStatusText || 'Live in play'}
                                </span>
                              )}
                            </div>

                            {/* Venue */}
                            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-3 truncate">
                              <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                              <span className="truncate">{match.venue || match.city || 'Stadium'}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="border-t border-[#162338] pt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                            <Link
                              href={`/sports/match/${match.id}`}
                              className="text-center py-1.5 px-1.5 sm:px-2 rounded-lg bg-[#0e1728] hover:bg-[#15223c] border border-[#1b2a44] text-[11px] font-bold text-zinc-300 hover:text-white transition-all truncate"
                            >
                              Live Score
                            </Link>

                            <Link
                              href={`/sports/match/${match.id}?tab=timeline`}
                              className="text-center py-1.5 px-1.5 sm:px-2 rounded-lg bg-[#0e1728] hover:bg-[#15223c] border border-[#1b2a44] text-[11px] font-bold text-zinc-300 hover:text-white transition-all truncate"
                            >
                              Scorecard
                            </Link>

                            <button
                              onClick={() => setWatchLiveModal(match)}
                              className="flex items-center justify-center gap-1 py-1.5 px-1.5 sm:px-2 rounded-lg bg-[#e62525] hover:bg-[#c91d1d] text-white text-[11px] font-black tracking-wide shadow-md shadow-red-600/30 transition-all truncate"
                            >
                              <Play className="w-3 h-3 fill-white flex-shrink-0" />
                              <span>Watch</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── B. UPCOMING MATCHES SECTION ── */}
            {(statusFilter === 'all' || statusFilter === 'UPCOMING' || statusFilter === 'today') && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                        Upcoming Matches
                      </h2>
                      <p className="text-[11px] sm:text-xs text-zinc-400">
                        Next big matches across all sports
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStatusFilter('UPCOMING')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                  >
                    View All Upcoming <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="bg-[#0b1220]/80 border border-[#162237] rounded-2xl p-6 sm:p-8 text-center">
                    <p className="text-xs sm:text-sm text-zinc-400">
                      No upcoming fixtures scheduled for this filter.
                    </p>
                  </div>
                ) : (
                  /* 
                    Mobile: Horizontal scroll-snap carousel with peek (overflow-x-auto, snap-x)
                    Desktop: Multi-column grid (sm:grid-cols-2 xl:grid-cols-4)
                  */
                  <div className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-none no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
                    {upcomingEvents.map(match => {
                      const team1Logo = match.team1Logo || TEAM_BADGES[match.team1Name];
                      const team2Logo = match.team2Logo || TEAM_BADGES[match.team2Name];
                      const hasReminder = !!activeReminders[match.id];
                      const details = match.scoreDetails as any;
                      const posterUrl = details?.posterUrl || (match.team1Logo?.includes('vcpl') ? match.team1Logo : null);
                      const isMultiDay = !!details?.startDate && !!details?.endDate;

                      return (
                        <div
                          key={match.id}
                          className="w-[74vw] max-w-[280px] md:w-auto flex-shrink-0 snap-start bg-[#0b1222] border border-[#17253b] hover:border-[#2a3f63] rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all group overflow-hidden"
                        >
                          <div>
                            {/* League / Format */}
                            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {match.category?.name || 'Tournament'} {match.tournament?.name ? `• ${match.tournament.name}` : ''}
                            </div>

                            {posterUrl ? (
                              /* Poster Presentation */
                              <Link href={`/sports/match/${match.id}`} className="block group/poster mb-2.5">
                                <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-zinc-950 border border-amber-500/30 shadow-md">
                                  <img
                                    src={posterUrl}
                                    alt={match.title}
                                    className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black shadow-sm">
                                      {details?.format || 'T10'} • {details?.season || 'Season 2'}
                                    </span>
                                  </div>
                                </div>
                                <h3 className="font-extrabold text-xs text-white group-hover/poster:text-emerald-300 transition-colors mt-2 line-clamp-2 leading-tight">
                                  {match.title}
                                </h3>
                              </Link>
                            ) : (
                              /* Standard Teams Faceoff */
                              <div className="flex items-center justify-between mb-3 px-1 sm:px-2">
                                <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center overflow-hidden shadow-sm">
                                    <TeamLogo logo={team1Logo} name={match.team1Name} className="w-full h-full object-contain p-1" />
                                  </div>
                                  <span className="font-bold text-xs text-zinc-200 truncate max-w-[85px]">
                                    {match.team1Name}
                                  </span>
                                </div>

                                <span className="text-xs font-black text-zinc-500 font-mono px-2">
                                  VS
                                </span>

                                <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center overflow-hidden shadow-sm">
                                    <TeamLogo logo={team2Logo} name={match.team2Name} className="w-full h-full object-contain p-1" />
                                  </div>
                                  <span className="font-bold text-xs text-zinc-200 truncate max-w-[85px]">
                                    {match.team2Name}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Schedule & Venue */}
                            <div className="text-center mb-3">
                              <div className="text-xs font-bold text-emerald-400">
                                {isMultiDay
                                  ? `${details.startDate} - ${details.endDate}`
                                  : new Date(match.eventDate).toDateString() === new Date().toDateString()
                                  ? `Today, ${match.startTime || '7:00 PM'}`
                                  : `${new Date(match.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${match.startTime || '6:30 AM'}`}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                <span className="truncate">{match.venue || match.city || 'Stadium'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Reminder Button */}
                          <button
                            onClick={() => toggleReminder(match.id, match.title)}
                            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                              hasReminder
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#0e1728] hover:bg-[#15223c] text-zinc-300 border-[#1a2942]'
                            }`}
                          >
                            <Bell className={`w-3.5 h-3.5 ${hasReminder ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                            <span>{hasReminder ? 'Reminder Set' : 'Reminder'}</span>
                          </button>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── C. TOP LEAGUES ── */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Top Leagues
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-400">
                      Explore all major leagues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollContainer(leaguesScrollRef, 'left')}
                    className="hidden sm:flex w-7 h-7 rounded-full bg-[#0d1525] border border-[#19253a] items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => scrollContainer(leaguesScrollRef, 'right')}
                    className="w-7 h-7 rounded-full bg-[#0d1525] border border-[#19253a] flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={leaguesScrollRef}
                className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {TOP_LEAGUES.map(league => (
                  <button
                    key={league.id}
                    onClick={() => {
                      setSelectedCategory(league.slug);
                      setSearchQuery(league.query);
                    }}
                    className="flex-shrink-0 flex flex-col items-center justify-center w-24 sm:w-32 py-2.5 sm:py-3 px-2 rounded-2xl bg-[#0b1222] border border-[#17253b] hover:border-emerald-500/50 hover:bg-[#101a2e] transition-all group shadow-sm"
                  >
                    <span className="text-xl sm:text-2xl mb-1 group-hover:scale-110 transition-transform">
                      {league.icon}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors text-center truncate w-full">
                      {league.name}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 font-medium truncate">
                      {league.sport}
                    </span>
                  </button>
                ))}

                {/* Mobile scroll forward button */}
                <button
                  onClick={() => scrollContainer(leaguesScrollRef, 'right')}
                  className="flex-shrink-0 sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-[#0d1525] border border-[#19253a] text-zinc-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── D. MOBILE-ONLY BOTTOM APP PROMO BANNER (< lg) ── */}
            <div className="block lg:hidden pt-2">
              <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0a1e38] via-[#071526] to-[#040b15] border border-cyan-800/40 shadow-2xl relative overflow-hidden flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase text-cyan-400 tracking-wider mb-0.5">
                    Live Score Partner
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight mb-1 flex items-center gap-1.5">
                    <span>tolee</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                  <p className="text-[11px] text-zinc-300 mb-3">
                    Download App from Playstore <span className="text-cyan-400 underline font-semibold">www.tolee.in</span>
                  </p>
                  <a
                    href="https://play.google.com/store/apps/details?id=in.tolee.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-cyan-500/40 text-white text-[11px] font-bold shadow-md"
                  >
                    <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.793 12 3.61 22.186c-.198-.182-.31-.44-.31-.722V2.536c0-.282.112-.54.31-.722zM15.207 13.414l2.678 2.678-12.793 7.385 10.115-10.063zm2.678-5.492L15.207 10.59 5.092.523l12.793 7.4zm1.096 1.096l3.52 2.03c.8.463.8 1.218 0 1.68l-3.52 2.03-2.316-2.316 2.316-2.324z" />
                    </svg>
                    <span>Google Play</span>
                  </a>
                </div>

                {/* Right: Phone mockup + Slogan */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-14 h-20 rounded-xl bg-zinc-950 border-2 border-zinc-700 p-1 flex items-center justify-center shadow-lg">
                    <div className="w-full h-full rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-black text-black">
                      t
                    </div>
                  </div>
                  <span className="text-[10px] font-serif italic text-white/90 mt-1 text-center leading-tight">
                    Sports<br />Brings Us<br />Together
                  </span>
                </div>
              </div>
            </div>

            {/* ── E. ALL MATCHES LIST (For non-default filters) ── */}
            {statusFilter !== 'all' && statusFilter !== 'LIVE' && statusFilter !== 'UPCOMING' && (
              <div>
                <h2 className="text-base font-bold text-zinc-200 mb-4">
                  Match Schedules & Results
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {events.map(event => (
                    <Link
                      key={event.id}
                      href={`/sports/match/${event.id}`}
                      className="bg-[#0b1222] border border-[#17253b] hover:border-zinc-600 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all block"
                    >
                      <div className="flex items-center justify-between text-xs mb-3 text-zinc-400">
                        <span className="font-bold text-zinc-300">{event.category?.name}</span>
                        <span className="font-mono text-[11px]">{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-zinc-100">{event.team1Name}</span>
                        <span className="font-mono font-bold text-base text-zinc-200">{event.homeScore || '-'}</span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-zinc-100">{event.team2Name}</span>
                        <span className="font-mono font-bold text-base text-zinc-200">{event.awayScore || '-'}</span>
                      </div>

                      <div className="border-t border-[#162338] pt-2 flex items-center justify-between text-xs text-zinc-400">
                        <span className="truncate">{event.venue || 'Stadium'}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ════ RIGHT SIDEBAR (Desktop lg: and up - Col 9-12 / 3 cols) ════ */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6">
            
            {/* 1. Follow Your Favourite Teams Widget */}
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1d163d] via-[#15132d] to-[#0c101d] border border-purple-800/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Follow Your Favourite Teams
                </h3>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                Get notifications, match alerts and personalized updates.
              </p>

              {session?.user ? (
                <button
                  onClick={() => setToastMessage('Alert preferences updated!')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black tracking-wide shadow-lg shadow-purple-600/30 transition-all text-center block"
                >
                  Personalize Alerts
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black tracking-wide shadow-lg shadow-purple-600/30 transition-all text-center block"
                >
                  Log In / Sign Up
                </Link>
              )}
            </div>

            {/* 2. Trending Now Widget */}
            <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#0b1222] border border-[#17253b] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                    Trending Now
                  </h3>
                </div>
                <button
                  onClick={() => setSearchQuery('India')}
                  className="text-xs font-bold text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  View All &gt;
                </button>
              </div>

              <div className="space-y-3.5">
                {TRENDING_TOPICS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSearchQuery(item.query)}
                    className="w-full flex items-center gap-3 text-left group hover:bg-[#101a2f] p-1.5 -mx-1.5 rounded-xl transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#16233a] text-zinc-300 font-black text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                      {item.rank}
                    </div>

                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/60 shadow-sm">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {item.subtitle} • <span className="text-zinc-500">{item.views}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Tolee Live Score Partner Promo Banner */}
            <div className="rounded-2xl sm:rounded-3xl p-5 bg-gradient-to-br from-[#0a1e38] via-[#071526] to-[#040b15] border border-cyan-800/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="text-[10px] font-black uppercase text-cyan-400 tracking-wider mb-1">
                Live Score Partner
              </div>

              <div className="text-2xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
                <span>tolee</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>

              <p className="text-xs text-zinc-300 mb-4">
                Download App from Playstore <span className="text-cyan-400 underline font-semibold">www.tolee.in</span>
              </p>

              <div className="flex items-center justify-between gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=in.tolee.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 hover:bg-black border border-cyan-500/40 text-white text-xs font-bold transition-all shadow-md"
                >
                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.793 12 3.61 22.186c-.198-.182-.31-.44-.31-.722V2.536c0-.282.112-.54.31-.722zM15.207 13.414l2.678 2.678-12.793 7.385 10.115-10.063zm2.678-5.492L15.207 10.59 5.092.523l12.793 7.4zm1.096 1.096l3.52 2.03c.8.463.8 1.218 0 1.68l-3.52 2.03-2.316-2.316 2.316-2.324z" />
                  </svg>
                  <span>Google Play</span>
                </a>

                {/* Mini Smartphone badge */}
                <div className="w-12 h-16 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center p-1 shadow-inner">
                  <div className="w-full h-full rounded bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-black">
                    t
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 6. WATCH LIVE STREAM MODAL ── */}
      {watchLiveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-[#1b2a44] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setWatchLiveModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE STREAM
              </span>
              <span className="text-xs text-zinc-400 font-semibold truncate">
                {watchLiveModal.title}
              </span>
            </div>

            {/* Video preview container */}
            <div className="w-full aspect-video rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden mb-4 shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,37,37,0.15),transparent_70%)]" />
              <Play className="w-12 h-12 text-red-500 fill-red-500 mb-2 drop-shadow-lg" />
              <div className="text-sm font-bold text-white z-10 text-center px-4">
                {watchLiveModal.team1Name} vs {watchLiveModal.team2Name}
              </div>
              <div className="text-xs text-zinc-400 z-10 mt-1">
                Official Broadcast Partner: Star Sports / JioCinema / Sky Sports
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 mb-5">
              <span>Score: <strong className="text-white">{watchLiveModal.homeScore || '0'} - {watchLiveModal.awayScore || '0'}</strong></span>
              <span>Status: <strong className="text-emerald-400">{watchLiveModal.currentStatusText || 'Live'}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/sports/match/${watchLiveModal.id}`}
                onClick={() => setWatchLiveModal(null)}
                className="py-2.5 rounded-xl bg-[#121c30] hover:bg-[#182642] text-zinc-200 text-xs font-bold text-center border border-[#1e2f4e]"
              >
                Full Scorecard
              </Link>
              <button
                onClick={() => {
                  setWatchLiveModal(null);
                  setToastMessage('Redirecting to live broadcast stream...');
                }}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30"
              >
                Launch Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. FILTER MODAL (For mobile/desktop) ── */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-[#1b2a44] rounded-3xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                Filter Sports
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">
                  Sport Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSelectedCategory('all'); setShowFilterModal(false); }}
                    className={`p-2 rounded-xl text-xs font-bold border text-left ${selectedCategory === 'all' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#0e1728] border-[#1a2942] text-zinc-300'}`}
                  >
                    All Sports
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id || c.slug}
                      onClick={() => { setSelectedCategory(c.slug); setShowFilterModal(false); }}
                      className={`p-2 rounded-xl text-xs font-bold border text-left truncate ${selectedCategory === c.slug ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#0e1728] border-[#1a2942] text-zinc-300'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">
                  Match Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'All Matches' },
                    { id: 'LIVE', label: 'Live In Play' },
                    { id: 'today', label: "Today's Fixtures" },
                    { id: 'UPCOMING', label: 'Upcoming' },
                    { id: 'COMPLETED', label: 'Results' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => { setStatusFilter(st.id as any); setShowFilterModal(false); }}
                      className={`p-2 rounded-xl text-xs font-bold border text-left ${statusFilter === st.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#0e1728] border-[#1a2942] text-zinc-300'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
