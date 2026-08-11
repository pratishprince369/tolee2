'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Radar, Navigation, ShieldAlert, Utensils, Megaphone, 
  Sparkles, EyeOff, Send, Radio, Plus, CheckCircle2, ChevronRight,
  MoreVertical, ThumbsUp, Flame, Tag, SlidersHorizontal, Map, Bell, ExternalLink, X
} from 'lucide-react';

interface LocalRadarPost {
  id: string;
  category: 'alert' | 'food' | 'news' | 'deal';
  title: string;
  distance: string;
  timeAgo: string;
  isAnonymous: boolean;
  author: string;
  likes: number;
  hasLiked?: boolean;
}

export function LocalNeighborhoodRadar() {
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [userCity, setUserCity] = useState<string>('Mumbai, Maharashtra, India');
  const [isPostingAlert, setIsPostingAlert] = useState<boolean>(false);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);

  // Form states for dropping local secret/alert
  const [alertCategory, setAlertCategory] = useState<'alert' | 'food' | 'news' | 'deal'>('alert');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [isAnon, setIsAnon] = useState<boolean>(true);

  const [radarPosts, setRadarPosts] = useState<LocalRadarPost[]>([
    {
      id: 'r1',
      category: 'alert',
      title: 'Road blockage near MG Road flyover due to repair work. Take side route!',
      distance: '0.6 km away',
      timeAgo: '12m ago',
      isAnonymous: true,
      author: 'Anonymous Neighbor',
      likes: 18
    },
    {
      id: 'r2',
      category: 'food',
      title: 'Secret Midnight Vada Pav Stall open till 2 AM near Station West Gate!',
      distance: '1.2 km away',
      timeAgo: '35m ago',
      isAnonymous: false,
      author: '@Foodie_Aman',
      likes: 42
    },
    {
      id: 'r3',
      category: 'news',
      title: 'Water supply interruption in your area tomorrow 10 AM – 4 PM.',
      distance: '2.1 km away',
      timeAgo: '1h ago',
      isAnonymous: false,
      author: 'Tolee News Team',
      likes: 31
    },
    {
      id: 'r4',
      category: 'deal',
      title: 'Flat 50% Off Flash Sale on Electronics at City Mall Ground Floor!',
      distance: '2.8 km away',
      timeAgo: '2h ago',
      isAnonymous: false,
      author: '@Rohan_Deals',
      likes: 54
    }
  ]);

  const fetchLocation = () => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          setGpsEnabled(true);
          setUserCity(`GPS: ${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°`);
        },
        () => {
          setIsGettingLocation(false);
          setUserCity('Mumbai, Maharashtra, India');
        }
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  const handlePostLocalAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim()) return;

    const newPost: LocalRadarPost = {
      id: `r-${Date.now()}`,
      category: alertCategory,
      title: alertTitle.trim(),
      distance: '0.1 km away',
      timeAgo: 'Just now',
      isAnonymous: isAnon,
      author: isAnon ? 'Anonymous Neighbor' : '@You',
      likes: 1
    };

    setRadarPosts([newPost, ...radarPosts]);
    setAlertTitle('');
    setIsPostingAlert(false);
  };

  const toggleLike = (id: string) => {
    setRadarPosts(prev => prev.map(p => {
      if (p.id === id) {
        const hasLiked = p.hasLiked;
        return {
          ...p,
          likes: hasLiked ? p.likes - 1 : p.likes + 1,
          hasLiked: !hasLiked
        };
      }
      return p;
    }));
  };

  const filteredPosts = radarPosts
    .filter(p => {
      if (selectedFilter === 'all') return true;
      return p.category === selectedFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'top') return b.likes - a.likes;
      return 0; // default latest
    });

  return (
    <div className="w-full space-y-6">
      
      {/* 1. HERO HEADER CARD */}
      <div className="bg-white dark:bg-zinc-950 p-6 sm:p-7 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Soft background pulse radial glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center relative shadow-sm flex-shrink-0">
            <Radar className="w-7 h-7 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tolee Radar
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
                AI Powered
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
              Your hyper-local neighborhood intelligence radar for instant alerts, secret food stalls, and community news.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Radar GPS Active
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
            Last updated: Just now
          </span>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID LAYOUT (Google & Facebook & ChatGPT UI/UX Polish) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main Neighborhood Radar Controls & Feed (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* NEIGHBORHOOD RADAR CONTROL CARD */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm space-y-5">
            
            {/* Location & GPS Sync Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Tolee Neighborhood Radar
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase">
                      IDEA #1
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    {userCity}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={fetchLocation}
                disabled={isGettingLocation}
                className="rounded-full h-9 px-4 text-xs font-bold border-gray-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 shadow-sm transition-all"
              >
                <Navigation className={`w-3.5 h-3.5 mr-1.5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                Sync GPS
              </Button>
            </div>

            {/* Radar Radius Controls */}
            <div className="pt-2 border-t border-gray-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                RADAR RADIUS
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 10].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRadiusKm(km)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      radiusKm === km
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {km} km
                  </button>
                ))}

                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Custom Range
                </button>
              </div>
            </div>

            {/* Drop Gupt Khabar CTA Banner */}
            {!isPostingAlert ? (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                      Drop Gupt Khabar / Anonymous Local Alert
                    </h3>
                    <p className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-300/70">
                      Help your neighborhood by sharing real-time alerts anonymously.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setIsPostingAlert(true)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 h-9 shadow-md flex items-center justify-center gap-1.5 flex-shrink-0 border-none"
                >
                  <Send className="w-3.5 h-3.5" /> Drop Alert
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePostLocalAlert} className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4" /> Drop Anonymous Alert / Gupt Khabar
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPostingAlert(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'alert', label: '🚨 Alert', color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
                    { id: 'food', label: '🍔 Secret Food', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
                    { id: 'news', label: '📢 Local News', color: 'bg-teal-500/10 text-teal-600 border-teal-200' },
                    { id: 'deal', label: '🎉 Deal', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAlertCategory(c.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                        alertCategory === c.id
                          ? `${c.color} ring-2 ring-current`
                          : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="What's happening nearby? (eg: Road blockage, secret midnight vada pav stall, flash sale...)"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnon}
                      onChange={(e) => setIsAnon(e.target.checked)}
                      className="rounded bg-white border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> Post Anonymously (Gupt Khabar)
                  </label>

                  <Button type="submit" size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4">
                    <Send className="w-3.5 h-3.5 mr-1" /> Post Alert
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* FILTER TABS & SORT ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-900 shadow-sm">
            
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {[
                { id: 'all', label: 'All Updates' },
                { id: 'alert', label: '⚠️ Alerts' },
                { id: 'food', label: '🍔 Secret Food' },
                { id: 'news', label: '📰 Local News' },
                { id: 'deal', label: '🏷️ Deals' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedFilter === f.id
                      ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="latest">Latest</option>
                <option value="top">Most Useful</option>
              </select>
            </div>
          </div>

          {/* RADAR FEED STREAM CARDS */}
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const isAlert = post.category === 'alert';
              const isFood = post.category === 'food';
              const isNews = post.category === 'news';

              return (
                <div
                  key={post.id}
                  className="bg-white dark:bg-zinc-950 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-900 rounded-2xl p-5 shadow-sm transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    
                    {/* Left Icon Circle */}
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-xs ${
                        isAlert ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/50' :
                        isFood ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-100 dark:border-amber-900/50' :
                        isNews ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-100 dark:border-blue-900/50' :
                        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-100 dark:border-emerald-900/50'
                      }`}>
                        {isAlert ? '⚠️' : isFood ? '🍔' : isNews ? '📰' : '🏷️'}
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isAlert ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                            isFood ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            isNews ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {post.category}
                          </span>
                          
                          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                            {post.distance}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                          {post.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 pt-1">
                          <span className="font-semibold text-slate-600 dark:text-zinc-400">
                            {post.author}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side Timestamp & Action Menu */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                        {post.timeAgo}
                      </span>
                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom Bar: Useful Button */}
                  <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-zinc-900">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        post.hasLiked
                          ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                          : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-current' : ''}`} />
                      Useful ({post.likes})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Map & Insights & Callout Widgets (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. INTERACTIVE LIVE MAP CARD WIDGET */}
          <div className="bg-white dark:bg-zinc-950 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm overflow-hidden p-2">
            <div className="relative w-full h-56 rounded-[22px] overflow-hidden bg-slate-100 dark:bg-zinc-900 flex items-center justify-center group cursor-pointer">
              {/* Map Vector Mock Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: `url('https://maps.googleapis.com/maps/api/staticmap?center=Mumbai&zoom=11&size=600x300&sensor=false&key=')`
                }}
              />
              
              {/* Concentric Radar Rings Graphic */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-44 rounded-full border border-teal-500/40 bg-teal-500/5 flex items-center justify-center animate-pulse">
                  <div className="w-28 h-28 rounded-full border border-teal-500/50 bg-teal-500/10 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-teal-500/60 bg-teal-500/20 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-teal-500 shadow-lg shadow-teal-500/80" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating "View Full Map" Button */}
              <div className="absolute bottom-3 bg-white/90 dark:bg-zinc-950/90 text-slate-900 dark:text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 border border-gray-200/80 dark:border-zinc-800">
                View Full Map <ExternalLink className="w-3 h-3 text-teal-500" />
              </div>
            </div>
          </div>

          {/* 2. RADAR INSIGHTS STATS WIDGET */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Radar Insights
            </h3>

            <div className="space-y-2 text-xs font-bold">
              {[
                { label: 'Active Alerts', count: 8, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: '⚠️' },
                { label: 'Secret Food Spots', count: 12, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: '🍔' },
                { label: 'Local News Updates', count: 5, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: '📢' },
                { label: 'Deals Near You', count: 7, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: '🏷️' },
              ].map((insight) => (
                <div key={insight.label} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                  <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                    <span>{insight.icon}</span> {insight.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${insight.color}`}>
                    {insight.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. GPS & NOTIFICATION ENABLE BANNER WIDGET */}
          <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-teal-100/40 dark:from-teal-950/40 dark:via-zinc-950 dark:to-zinc-900 p-5 rounded-[28px] border border-teal-200/80 dark:border-teal-900/40 shadow-sm relative overflow-hidden flex flex-col items-start gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Want better local updates?
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
                Enable GPS & notifications
              </p>
            </div>

            <Button
              onClick={fetchLocation}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 h-9 shadow-md border-none"
            >
              Enable Now
            </Button>

            {/* Radar Antenna Graphic */}
            <div className="absolute right-2 bottom-1 opacity-20 dark:opacity-30 pointer-events-none">
              <Radar className="w-20 h-20 text-teal-600 dark:text-teal-400" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
