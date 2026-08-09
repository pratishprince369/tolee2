'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Radar, Navigation, ShieldAlert, Utensils, Megaphone, 
  Sparkles, EyeOff, Send, Radio, Plus, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

interface LocalRadarPost {
  id: string;
  category: 'alert' | 'food' | 'news' | 'event';
  title: string;
  distance: string;
  timeAgo: string;
  isAnonymous: boolean;
  author: string;
  likes: number;
}

export function LocalNeighborhoodRadar() {
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [userCity, setUserCity] = useState<string>('Mumbai / Local Area');
  const [isPostingAlert, setIsPostingAlert] = useState<boolean>(false);

  // Form states for dropping local secret/alert
  const [alertCategory, setAlertCategory] = useState<'alert' | 'food' | 'news' | 'event'>('alert');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [isAnon, setIsAnon] = useState<boolean>(true);

  const [radarPosts, setRadarPosts] = useState<LocalRadarPost[]>([
    {
      id: 'r1',
      category: 'alert',
      title: '🚨 Road blockage near MG Road flyover due to repair work. Take side route!',
      distance: '0.6 km away',
      timeAgo: '12m ago',
      isAnonymous: true,
      author: 'Anonymous Neighbor',
      likes: 18
    },
    {
      id: 'r2',
      category: 'food',
      title: '🍔 Secret Midnight Vada Pav Stall open till 2 AM near Station West Gate!',
      distance: '1.2 km away',
      timeAgo: '35m ago',
      isAnonymous: false,
      author: 'Foodie_Aman',
      likes: 42
    },
    {
      id: 'r3',
      category: 'news',
      title: '📢 Local Electricity Maintenance scheduled tomorrow 10 AM to 2 PM.',
      distance: '2.1 km away',
      timeAgo: '1h ago',
      isAnonymous: true,
      author: 'Gupt Khabar',
      likes: 29
    },
    {
      id: 'r4',
      category: 'event',
      title: '🎉 Flat 50% Off Flash Sale on Electronics at City Mall Ground Floor!',
      distance: '2.8 km away',
      timeAgo: '2h ago',
      isAnonymous: false,
      author: 'Rohan_Deals',
      likes: 54
    }
  ]);

  const fetchLocation = () => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          setUserCity(`GPS Lat: ${position.coords.latitude.toFixed(2)}, Lng: ${position.coords.longitude.toFixed(2)}`);
          toast.success("📍 GPS Location Synced! Radar updated to your 3km radius.");
        },
        () => {
          setIsGettingLocation(false);
          setUserCity('Near You (Local)');
          toast.info("📍 Location set to your current neighborhood.");
        }
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  const handlePostLocalAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim()) {
      toast.error("Please enter alert details!");
      return;
    }

    const newPost: LocalRadarPost = {
      id: `r-${Date.now()}`,
      category: alertCategory,
      title: alertTitle.trim(),
      distance: '0.1 km away',
      timeAgo: 'Just now',
      isAnonymous: isAnon,
      author: isAnon ? 'Gupt Khabar (Anonymous)' : 'You',
      likes: 1
    };

    setRadarPosts([newPost, ...radarPosts]);
    setAlertTitle('');
    setIsPostingAlert(false);
    toast.success("📍 Gupt Khabar / Local Update Dropped on Radar!");
  };

  const filteredPosts = radarPosts.filter(p => {
    if (selectedFilter === 'all') return true;
    return p.category === selectedFilter;
  });

  return (
    <Card className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950/40 text-white border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Background Radar Pulse Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="p-4 pb-2 border-b border-zinc-800/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center relative">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 rounded-full animate-ping" />
          </div>
          <div>
            <CardTitle className="text-base font-black text-white flex items-center gap-2">
              Tolee Neighborhood Radar <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[9px] uppercase">Idea #1</Badge>
            </CardTitle>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-400" /> {userCity}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchLocation}
          disabled={isGettingLocation}
          className="rounded-full h-8 px-3 text-[11px] font-bold border-zinc-700 hover:bg-zinc-800 text-zinc-200"
        >
          <Navigation className={`w-3.5 h-3.5 mr-1 ${isGettingLocation ? 'animate-spin' : ''}`} />
          Sync GPS
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Distance Radius Selector */}
        <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded-2xl border border-zinc-800">
          <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider pl-1">
            Radar Radius:
          </span>
          <div className="flex gap-1">
            {[1, 3, 5, 10].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadiusKm(km)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  radiusKm === km
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Drop Gupt Khabar / Local Secret */}
        {!isPostingAlert ? (
          <Button
            onClick={() => setIsPostingAlert(true)}
            className="w-full h-10 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 border-none"
          >
            <Plus className="w-4 h-4" /> Drop Gupt Khabar / Anonymous Local Alert 📍
          </Button>
        ) : (
          <form onSubmit={handlePostLocalAlert} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-400 flex items-center gap-1.5">
                <EyeOff className="w-4 h-4" /> Post Local Update
              </span>
              <button
                type="button"
                onClick={() => setIsPostingAlert(false)}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Category Selector */}
            <div className="flex gap-1.5">
              {[
                { id: 'alert', label: '🚨 Alert', color: 'bg-rose-500/20 text-rose-300' },
                { id: 'food', label: '🍔 Food Secret', color: 'bg-amber-500/20 text-amber-300' },
                { id: 'news', label: '📢 News', color: 'bg-teal-500/20 text-teal-300' },
                { id: 'event', label: '🎉 Deal', color: 'bg-indigo-500/20 text-indigo-300' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAlertCategory(c.id as any)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                    alertCategory === c.id
                      ? `${c.color} border-current ring-1 ring-current`
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="What's happening nearby? (eg: Traffic blockage, secret food stall, flash sale...)"
              value={alertTitle}
              onChange={(e) => setAlertTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnon}
                  onChange={(e) => setIsAnon(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-teal-500"
                />
                <EyeOff className="w-3.5 h-3.5 text-zinc-400" /> Post Anonymously (Gupt Khabar)
              </label>

              <Button type="submit" size="sm" className="rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-4">
                <Send className="w-3.5 h-3.5 mr-1" /> Post
              </Button>
            </div>
          </form>
        )}

        {/* Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Updates' },
            { id: 'alert', label: '🚨 Alerts' },
            { id: 'food', label: '🍔 Secret Food' },
            { id: 'news', label: '📢 Local News' },
            { id: 'event', label: '🎉 Deals' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all ${
                selectedFilter === f.id
                  ? 'bg-zinc-200 text-zinc-950 border-white shadow-md'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Radar Post Feed Stream */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3 space-y-1.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border-none ${
                    post.category === 'alert' ? 'bg-rose-500/20 text-rose-400' :
                    post.category === 'food' ? 'bg-amber-500/20 text-amber-400' :
                    post.category === 'news' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {post.category}
                  </Badge>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-teal-400" /> {post.distance}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">{post.timeAgo}</span>
              </div>

              <p className="text-xs font-semibold text-zinc-100 leading-relaxed">
                {post.title}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-medium">
                  {post.isAnonymous ? (
                    <>
                      <EyeOff className="w-3 h-3 text-teal-400" /> {post.author}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-indigo-400" /> @{post.author}
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    post.likes += 1;
                    setRadarPosts([...radarPosts]);
                    toast.success("👍 Upvoted local alert!");
                  }}
                  className="hover:text-teal-400 flex items-center gap-1 font-bold"
                >
                  👍 Useful ({post.likes})
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
