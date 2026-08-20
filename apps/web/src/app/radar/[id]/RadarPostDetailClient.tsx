'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Radar, MapPin, ShieldAlert, Utensils, Megaphone, 
  Tag, EyeOff, ThumbsUp, Share2, Compass, ExternalLink, 
  Clock, CheckCircle, Radio, Navigation, LocateFixed
} from 'lucide-react';
import { toggleRadarPostLikeAction } from '@/actions/radar';
import { calculateDistanceKm, formatDistance } from '@/lib/geo-utils';

interface RadarPostDetailClientProps {
  post: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    locationName: string;
    radiusKm: number;
    isAnonymous: boolean;
    author: string;
    authorAvatar: string | null;
    likesCount: number;
    hasLiked: boolean;
    createdAt: Date | string;
    distanceKm: number | null;
  };
}

export function RadarPostDetailClient({ post }: RadarPostDetailClientProps) {
  const [hasLiked, setHasLiked] = useState<boolean>(post.hasLiked);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Read saved user coordinates from localStorage or request location
  useEffect(() => {
    const savedLat = localStorage.getItem('tolee_radar_lat');
    const savedLng = localStorage.getItem('tolee_radar_lng');

    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      setUserCoords({ lat, lng });
      const dist = calculateDistanceKm(lat, lng, post.latitude, post.longitude);
      setCalculatedDistance(formatDistance(dist));
    } else if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          const dist = calculateDistanceKm(lat, lng, post.latitude, post.longitude);
          setCalculatedDistance(formatDistance(dist));
        },
        () => {
          // Fallback if denied
          setCalculatedDistance(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [post.latitude, post.longitude]);

  const handleToggleLike = async () => {
    const nextState = !hasLiked;
    setHasLiked(nextState);
    setLikesCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));

    try {
      await toggleRadarPostLikeAction(post.id);
    } catch (_) {
      // Revert if error
      setHasLiked(!nextState);
      setLikesCount(prev => !nextState ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: `Tolee Radar: ${post.title}`,
          text: `${post.title} near ${post.locationName}`,
          url
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    }
  };

  const isAlert = post.category === 'alert';
  const isFood = post.category === 'food';
  const isNews = post.category === 'news' || post.category === 'event';

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200/80 dark:border-zinc-900 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Category Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-xs ${
            isAlert ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/50' :
            isFood ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-100 dark:border-amber-900/50' :
            isNews ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-100 dark:border-blue-900/50' :
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-100 dark:border-emerald-900/50'
          }`}>
            {isAlert ? '⚠️' : isFood ? '🍔' : isNews ? '📢' : '🏷️'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md ${
                isAlert ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                isFood ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                isNews ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {post.category}
              </span>
              {post.isAnonymous && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Gupt Khabar
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
              Posted {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="text-right">
          {calculatedDistance && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full">
              <LocateFixed className="w-3.5 h-3.5" />
              {calculatedDistance}
            </span>
          )}
        </div>
      </div>

      {/* Main Alert Content */}
      <div className="space-y-3 pt-2">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
          {post.title}
        </h1>

        {post.description && (
          <p className="text-sm font-medium text-slate-600 dark:text-zinc-300 leading-relaxed bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60">
            {post.description}
          </p>
        )}
      </div>

      {/* Location Tag & Radius Banner */}
      <div className="bg-gradient-to-r from-teal-50/70 via-emerald-50/50 to-teal-50/40 dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 border border-teal-200/70 dark:border-teal-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              Target Neighborhood: {post.locationName}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Active Radar Radius: {post.radiusKm} km radius notification zone
            </p>
          </div>
        </div>

        <Link
          href={`/map?lat=${post.latitude}&lng=${post.longitude}&zoom=16`}
          className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
        >
          <span>Open Live Pin On Map</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Author & Privacy Section */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-zinc-300">
            {post.isAnonymous ? '🕵️' : (post.author[0] || 'U')}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {post.author}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              {post.isAnonymous ? 'Gupt Khabar (Anonymous Creator)' : 'Community Contributor'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Like & Share */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-xl text-xs font-bold h-9 px-3.5 border-gray-200 dark:border-zinc-800"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            {isCopied ? 'Copied Link!' : 'Share'}
          </Button>

          <Button
            size="sm"
            onClick={handleToggleLike}
            className={`rounded-xl text-xs font-bold h-9 px-4 transition-all ${
              hasLiked
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 mr-1.5 ${hasLiked ? 'fill-current' : ''}`} />
            Useful ({likesCount})
          </Button>
        </div>
      </div>

    </div>
  );
}
