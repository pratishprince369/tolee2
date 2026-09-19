'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Radar, MapPin, ShieldAlert, Utensils, Megaphone, 
  Tag, EyeOff, ThumbsUp, Share2, Compass, ExternalLink, 
  Clock, CheckCircle, Radio, Navigation, LocateFixed,
  Zap, ShieldCheck, MessageCircle, Repeat2, Eye,
  Maximize2, ChevronLeft, ChevronRight, Layers, ArrowUpRight
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
    mediaUrls?: string[];
    imageUrl?: string;
    expiresAt?: Date | string | null;
    status?: string;
    isLive?: boolean;
    isUrgent?: boolean;
    alertType?: string | null;
    isVerified?: boolean;
    confirmationsCount?: number;
    commentsCount?: number;
    viewsCount?: number;
    resharesCount?: number;
  };
}

export function RadarPostDetailClient({ post }: RadarPostDetailClientProps) {
  const [hasLiked, setHasLiked] = useState<boolean>(post.hasLiked);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || 0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // High quality images list with category defaults
  const images = useMemo(() => {
    if (post.mediaUrls && post.mediaUrls.length > 0) return post.mediaUrls;
    if (post.imageUrl) return [post.imageUrl];
    if (post.category === 'food') return ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'];
    if (post.category === 'alert') return ['https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=1200&q=80'];
    if (post.category === 'news') return ['https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1200&q=80'];
    return ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'];
  }, [post.mediaUrls, post.imageUrl, post.category]);

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
          setCalculatedDistance(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [post.latitude, post.longitude]);

  // Dynamic Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [post.latitude, post.longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        maxZoom: 20,
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);

      // Radar coverage circle
      L.circle([post.latitude, post.longitude], {
        radius: (post.radiusKm || 2) * 1000,
        color: '#0E9F9A',
        fillColor: '#0E9F9A',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);

      // Custom Glowing Pulsing Marker
      const customIcon = L.divIcon({
        className: 'custom-radar-pin',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(14, 159, 154, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #0E9F9A; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
              📍
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([post.latitude, post.longitude], { icon: customIcon }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    };

    if ((window as any).L) {
      initMap();
    } else {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if ((window as any).L) {
            clearInterval(check);
            initMap();
          }
        }, 100);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [post.latitude, post.longitude, post.radiusKm]);

  const handleToggleLike = async () => {
    const nextState = !hasLiked;
    setHasLiked(nextState);
    setLikesCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));

    try {
      await toggleRadarPostLikeAction(post.id);
    } catch (_) {
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

  const handleGetDirections = () => {
    const destination = `${post.latitude},${post.longitude}`;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    if (userCoords) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${destination}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isAlert = post.category === 'alert';
  const isFood = post.category === 'food';
  const isNews = post.category === 'news' || post.category === 'event';
  const isDeal = post.category === 'deal' || post.category === 'store';

  // Expiry calculation
  const expiryDisplay = useMemo(() => {
    if (!post.expiresAt) return null;
    const now = new Date().getTime();
    const exp = new Date(post.expiresAt).getTime();
    const diffHours = Math.round((exp - now) / (1000 * 60 * 60));
    if (diffHours <= 0) return 'Expired';
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return `Expiring in ${days} day${days > 1 ? 's' : ''}`;
    }
    return `Expiring in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }, [post.expiresAt]);

  return (
    <div className="space-y-6">
      
      {/* 1. HERO PHOTO GALLERY BANNER */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200/80 dark:border-zinc-900 shadow-sm overflow-hidden">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-slate-900 overflow-hidden group">
          <img
            src={images[activeImageIndex]}
            alt={post.title}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Floating Badges Over Image */}
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black uppercase px-3 py-1 rounded-full shadow-md backdrop-blur-md ${
              isAlert ? 'bg-rose-500 text-white' :
              isFood ? 'bg-amber-500 text-white' :
              isNews ? 'bg-blue-600 text-white' :
              'bg-purple-600 text-white'
            }`}>
              {isAlert ? '⚠️ ALERT' : isFood ? '🍔 FOOD SPOT' : isNews ? '📢 LOCAL NEWS' : '🏷️ DEAL / SPOT'}
            </span>

            {post.isLive && (
              <span className="bg-rose-600/90 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                Live Now
              </span>
            )}

            {post.isUrgent && (
              <span className="bg-red-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> Critical
              </span>
            )}

            {post.isVerified && (
              <span className="bg-emerald-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>

          {/* Top Right: Fullscreen / Distance Tag */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {calculatedDistance && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-white bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-md">
                <LocateFixed className="w-3.5 h-3.5 text-[#0E9F9A]" />
                {calculatedDistance} away
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition-colors shadow-md"
              title="View full photo"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Overlay Title & Subtitle */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight drop-shadow-md">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-200 mt-1.5 flex-wrap drop-shadow-sm">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                {post.locationName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Posted {new Date(post.createdAt).toLocaleDateString()}
              </span>
              {expiryDisplay && (
                <>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">
                    ⏳ {expiryDisplay}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Multiple Photo Thumbnails Strip (if > 1 image) */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-900 flex items-center gap-2.5 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative border-2 transition-all ${
                  activeImageIndex === idx
                    ? 'border-[#0E9F9A] ring-2 ring-[#0E9F9A]/30 scale-105'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. IN-DEPTH DETAILS CARD */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200/80 dark:border-zinc-900 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Author / Community Info */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg font-bold flex-shrink-0 border border-teal-500/20 shadow-xs">
              {post.isAnonymous ? '🕵️' : (post.authorAvatar ? <img src={post.authorAvatar} alt={post.author} className="w-full h-full rounded-2xl object-cover" /> : (post.author[0] || 'U'))}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{post.author}</span>
                {post.isAnonymous && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    Gupt Khabar
                  </span>
                )}
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                {post.isAnonymous ? 'Anonymous Community Contributor' : 'Verified Local Contributor'}
              </p>
            </div>
          </div>

          {/* Social Action Buttons: Useful / Like & Share */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleToggleLike}
              className={`rounded-xl text-xs font-bold h-9 px-4 transition-all ${
                hasLiked
                  ? 'bg-[#0E9F9A] text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 mr-1.5 ${hasLiked ? 'fill-current' : ''}`} />
              Useful ({likesCount})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-xl text-xs font-bold h-9 px-3.5 border-gray-200 dark:border-zinc-800"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              {isCopied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Listing Details & Information
          </h2>
          <div className="text-sm font-medium text-slate-700 dark:text-zinc-200 leading-relaxed bg-slate-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/70 whitespace-pre-line">
            {post.description || 'No additional details provided for this listing.'}
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Area</span>
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{post.locationName}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Radar Radius</span>
            <p className="text-xs font-black text-slate-900 dark:text-white">{post.radiusKm || 5} km Alert Zone</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Distance From You</span>
            <p className="text-xs font-black text-[#0E9F9A] dark:text-teal-400">{calculatedDistance || 'Nearby'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              {post.status === 'RESOLVED' ? 'Resolved' : 'Active on Radar'}
            </p>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE MAP BOX WITH DIRECTIONS (MAIN REQUIREMENT) */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200/80 dark:border-zinc-900 shadow-sm overflow-hidden p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-[#0E9F9A] dark:text-teal-400 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Live Location & Map Directions
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Check exact spot on map and navigate directly
              </p>
            </div>
          </div>

          {calculatedDistance && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0E9F9A] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full">
              <LocateFixed className="w-3.5 h-3.5" />
              {calculatedDistance} away
            </span>
          )}
        </div>

        {/* Map Canvas Container */}
        <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Map Floating Location Pill */}
          <div className="absolute top-3 left-3 z-[500] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F9A] animate-ping" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
              {post.locationName}
            </span>
          </div>
        </div>

        {/* Directions Action Row */}
        <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 flex items-center justify-center sm:justify-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0E9F9A]" />
              <span>{post.locationName}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              GPS Coordinates: {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* 1. Primary "Get Directions / दिशा निर्देश" Button */}
            <Button
              onClick={handleGetDirections}
              className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs h-11 px-5 shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Get Directions (दिशा देखें)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>

            {/* 2. Secondary "View on Tolee Map" Button */}
            <Link
              href={`/map?lat=${post.latitude}&lng=${post.longitude}&zoom=16`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <Layers className="w-4 h-4 text-[#0E9F9A]" />
              <span>Tolee Map</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={images[activeImageIndex]}
              alt={post.title}
              className="w-full h-full object-contain max-h-[85vh]"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold backdrop-blur-md"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
