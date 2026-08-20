'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Radar, Navigation, ShieldAlert, Utensils, Megaphone, 
  Sparkles, EyeOff, Send, Radio, Plus, CheckCircle2, ChevronRight,
  MoreVertical, ThumbsUp, Flame, Tag, SlidersHorizontal, Map, Bell, 
  ExternalLink, X, Search, RefreshCw, AlertTriangle, Check, Compass,
  Layers, Filter, LocateFixed, Globe, Loader2
} from 'lucide-react';
import { 
  createRadarPostAction, 
  getRadarPostsAction, 
  updateUserRadarLocation, 
  toggleRadarPostLikeAction 
} from '@/actions/radar';
import { calculateDistanceKm, formatDistance } from '@/lib/geo-utils';

interface LocalRadarPost {
  id: string;
  category: 'alert' | 'food' | 'news' | 'deal' | 'event' | 'store' | 'group';
  title: string;
  description?: string | null;
  distanceKm: number;
  timeAgo: string;
  isAnonymous: boolean;
  author: string;
  authorAvatar?: string | null;
  likes: number;
  hasLiked?: boolean;
  latitude: number;
  longitude: number;
  locationName: string;
  link?: string;
  isDbPost?: boolean;
}

export function LocalNeighborhoodRadar() {
  // Coords default to Mumbai / Kalyan region or loaded from storage
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.2437,
    lng: 73.1355
  });
  const [userCity, setUserCity] = useState<string>('Detecting Location...');
  const [subLocation, setSubLocation] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'manual' | 'default'>('default');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Manual location search states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Radius & Filtering
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [isCustomRadiusOpen, setIsCustomRadiusOpen] = useState<boolean>(false);
  const [customRadiusValue, setCustomRadiusValue] = useState<number>(5);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');

  // Form states for dropping local secret/alert
  const [isPostingAlert, setIsPostingAlert] = useState<boolean>(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);
  const [alertCategory, setAlertCategory] = useState<'alert' | 'food' | 'news' | 'deal'>('alert');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertDesc, setAlertDesc] = useState<string>('');
  const [isAnon, setIsAnon] = useState<boolean>(true);

  // Community & Live Posts State
  const [dbRadarPosts, setDbRadarPosts] = useState<any[]>([]);
  const [liveMarkers, setLiveMarkers] = useState<any[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});

  // Seed baseline fallback posts
  const baseFallbackPosts = [
    {
      id: 'base-1',
      category: 'alert' as const,
      title: 'Road blockage near MG Road flyover due to repair work. Take side route!',
      timeAgo: '12m ago',
      isAnonymous: true,
      author: 'Anonymous Neighbor',
      likes: 18,
      latitude: 19.2450,
      longitude: 73.1320,
      locationName: 'MG Road Flyover'
    },
    {
      id: 'base-2',
      category: 'food' as const,
      title: 'Secret Midnight Vada Pav Stall open till 2 AM near Station West Gate!',
      timeAgo: '35m ago',
      isAnonymous: false,
      author: '@Foodie_Aman',
      likes: 42,
      latitude: 19.2410,
      longitude: 73.1290,
      locationName: 'Station West Gate'
    },
    {
      id: 'base-3',
      category: 'news' as const,
      title: 'Water supply interruption in your area tomorrow 10 AM – 4 PM for maintenance.',
      timeAgo: '1h ago',
      isAnonymous: false,
      author: 'Tolee News Team',
      likes: 31,
      latitude: 19.2510,
      longitude: 73.1410,
      locationName: 'Municipal Sector 4'
    },
    {
      id: 'base-4',
      category: 'deal' as const,
      title: 'Flat 50% Off Flash Sale on Electronics at City Mall Ground Floor!',
      timeAgo: '2h ago',
      isAnonymous: false,
      author: '@Rohan_Deals',
      likes: 54,
      latitude: 19.2380,
      longitude: 73.1380,
      locationName: 'City Mall Ground Floor'
    }
  ];

  // Fetch human-readable reverse geocode from coordinates
  const reverseGeocode = async (lat: number, lng: number): Promise<{ fullAddress: string; city: string; sub: string }> => {
    // 1. Try BigDataCloud Reverse Geocoding Client
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const locality = data.locality || data.principalSubdivision || '';
        const city = data.city || data.localityInfo?.administrative?.[2]?.name || data.principalSubdivision || 'Local Area';
        const state = data.principalSubdivision || '';
        const sub = locality && locality !== city ? locality : (data.localityInfo?.informative?.[0]?.name || '');

        let fullAddress = city;
        if (sub && sub !== city) {
          fullAddress = `${sub}, ${city}`;
        } else if (state && state !== city) {
          fullAddress = `${city}, ${state}`;
        }

        return { fullAddress, city, sub };
      }
    } catch (_) {}

    // 2. Fallback to OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const sub = address.suburb || address.neighbourhood || address.residential || address.subdistrict || '';
        const city = address.city || address.town || address.village || address.municipality || address.county || address.state || 'My City';
        const state = address.state || '';

        let fullAddress = city;
        if (sub && sub !== city) {
          fullAddress = `${sub}, ${city}`;
        } else if (state && state !== city) {
          fullAddress = `${city}, ${state}`;
        }

        return { fullAddress, city, sub };
      }
    } catch (_) {}

    return {
      fullAddress: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
      city: 'Local Area',
      sub: ''
    };
  };

  // Fallback to IP-based Geolocation when hardware GPS is unavailable/blocked
  const fallbackIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const city = data.city || data.region || 'Local Area';
          const region = data.region || '';
          const full = region ? `${city}, ${region}` : city;

          setCoords({ lat, lng });
          setUserCity(full);
          setSubLocation(data.city || '');
          setLocationSource('ip');
          setStatusMessage(`Synced via Network Location (${city})`);

          localStorage.setItem('tolee_radar_lat', String(lat));
          localStorage.setItem('tolee_radar_lng', String(lng));
          localStorage.setItem('tolee_radar_city', full);
          localStorage.setItem('tolee_radar_source', 'ip');

          try {
            await updateUserRadarLocation({ lat, lng, locationName: full, subLocation: data.city || '' });
          } catch (_) {}

          return true;
        }
      }
    } catch (_) {}

    return false;
  };

  // Fetch real posts from backend
  const fetchDbRadarPosts = useCallback(async (lat: number, lng: number, rad: number) => {
    try {
      const res = await getRadarPostsAction({ lat, lng, radiusKm: rad });
      if (res.success && Array.isArray(res.posts)) {
        setDbRadarPosts(res.posts);
      }
    } catch (e) {
      console.warn('[Radar] Error fetching db posts:', e);
    }
  }, []);

  // Fetch real map markers from backend
  const fetchLiveRadarMarkers = useCallback(async () => {
    try {
      const res = await fetch('/api/map-markers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.markers)) {
          setLiveMarkers(data.markers);
        }
      }
    } catch (e) {
      console.warn('[Radar] Failed to load live markers:', e);
    }
  }, []);

  // Main GPS Sync Handler
  const fetchLocation = useCallback(async (isManualTrigger = false) => {
    setIsGettingLocation(true);
    setStatusMessage('Acquiring GPS Signal...');

    // A. Check Capacitor native Geolocation if running in Android/iOS app
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (perm.location === 'granted' || (perm as any).coarseLocation === 'granted') {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          if (pos?.coords) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const geo = await reverseGeocode(lat, lng);

            setCoords({ lat, lng });
            setUserCity(geo.fullAddress);
            setSubLocation(geo.sub);
            setLocationSource('gps');
            setIsGettingLocation(false);
            setStatusMessage(`Live GPS locked: ${geo.fullAddress}`);

            localStorage.setItem('tolee_radar_lat', String(lat));
            localStorage.setItem('tolee_radar_lng', String(lng));
            localStorage.setItem('tolee_radar_city', geo.fullAddress);
            localStorage.setItem('tolee_radar_source', 'gps');

            try {
              await updateUserRadarLocation({ lat, lng, locationName: geo.fullAddress, subLocation: geo.sub });
            } catch (_) {}

            fetchDbRadarPosts(lat, lng, radiusKm);
            return;
          }
        }
      }
    } catch (_) {}

    // B. Web Browser Geolocation API
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const geo = await reverseGeocode(lat, lng);

          setCoords({ lat, lng });
          setUserCity(geo.fullAddress);
          setSubLocation(geo.sub);
          setLocationSource('gps');
          setIsGettingLocation(false);
          setStatusMessage(`Live GPS locked: ${geo.fullAddress}`);

          localStorage.setItem('tolee_radar_lat', String(lat));
          localStorage.setItem('tolee_radar_lng', String(lng));
          localStorage.setItem('tolee_radar_city', geo.fullAddress);
          localStorage.setItem('tolee_radar_source', 'gps');

          try {
            await updateUserRadarLocation({ lat, lng, locationName: geo.fullAddress, subLocation: geo.sub });
          } catch (_) {}

          fetchDbRadarPosts(lat, lng, radiusKm);
        },
        async (err) => {
          console.warn('[Radar] Browser Geolocation error:', err.message);
          const ipSuccess = await fallbackIpLocation();
          setIsGettingLocation(false);
          if (!ipSuccess) {
            setUserCity(prev => prev === 'Detecting Location...' ? 'Mumbai, Maharashtra, India' : prev);
            setLocationSource('default');
            if (isManualTrigger) {
              setStatusMessage('GPS permission denied. You can search your city manually.');
              setIsSearchModalOpen(true);
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const ipSuccess = await fallbackIpLocation();
      setIsGettingLocation(false);
      if (!ipSuccess) {
        setUserCity('Mumbai, Maharashtra, India');
        setLocationSource('default');
      }
    }
  }, [fetchDbRadarPosts, radiusKm]);

  // Initial load
  useEffect(() => {
    const savedLat = localStorage.getItem('tolee_radar_lat');
    const savedLng = localStorage.getItem('tolee_radar_lng');
    const savedCity = localStorage.getItem('tolee_radar_city');
    const savedSource = localStorage.getItem('tolee_radar_source') as any;

    if (savedLat && savedLng && savedCity) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      setCoords({ lat, lng });
      setUserCity(savedCity);
      setLocationSource(savedSource || 'gps');
      fetchDbRadarPosts(lat, lng, radiusKm);
    }

    fetchLocation(false);
    fetchLiveRadarMarkers();
  }, [fetchLocation, fetchLiveRadarMarkers, fetchDbRadarPosts, radiusKm]);

  // Handle Search Location in Modal
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=6&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (e) {
      console.error('[Radar] Search error:', e);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.address || {};
    const sub = address.suburb || address.neighbourhood || address.residential || '';
    const city = address.city || address.town || address.village || address.county || address.state || result.display_name.split(',')[0];
    const full = sub && sub !== city ? `${sub}, ${city}` : (result.display_name.split(',').slice(0, 2).join(', ') || city);

    setCoords({ lat, lng });
    setUserCity(full);
    setSubLocation(sub);
    setLocationSource('manual');
    setStatusMessage(`Radar relocated to: ${full}`);
    setIsSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    localStorage.setItem('tolee_radar_lat', String(lat));
    localStorage.setItem('tolee_radar_lng', String(lng));
    localStorage.setItem('tolee_radar_city', full);
    localStorage.setItem('tolee_radar_source', 'manual');

    try {
      updateUserRadarLocation({ lat, lng, locationName: full, subLocation: sub });
    } catch (_) {}

    fetchDbRadarPosts(lat, lng, radiusKm);
  };

  // Handle Drop New Alert -> Sends to backend & triggers geo-notifications!
  const handlePostLocalAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || isSubmittingPost) return;

    setIsSubmittingPost(true);
    try {
      const res = await createRadarPostAction({
        category: alertCategory,
        title: alertTitle.trim(),
        description: alertDesc.trim() || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        locationName: subLocation || userCity.split(',')[0] || 'Near you',
        radiusKm,
        isAnonymous: isAnon
      });

      if (res.success && res.post) {
        setStatusMessage('🚨 Your Radar update is live & nearby neighbors are being notified!');
        setAlertTitle('');
        setAlertDesc('');
        setIsPostingAlert(false);
        // Refresh feed with the new post
        fetchDbRadarPosts(coords.lat, coords.lng, radiusKm);
      } else {
        alert(res.error || 'Failed to post alert. Please try again.');
      }
    } catch (err) {
      console.error('[Radar] Post creation error:', err);
      alert('Network error while posting alert.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Toggle Post Like
  const toggleLike = async (id: string, isDbPost?: boolean) => {
    setLikedPostIds(prev => ({ ...prev, [id]: !prev[id] }));
    if (isDbPost) {
      try {
        await toggleRadarPostLikeAction(id);
      } catch (_) {}
    }
  };

  // Combine database posts, baseline posts, and live backend markers with dynamic distance
  const allPosts = useMemo<LocalRadarPost[]>(() => {
    const combined: LocalRadarPost[] = [];

    // 1. Real Database Radar Posts
    dbRadarPosts.forEach((post) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, post.latitude, post.longitude);
      combined.push({
        id: post.id,
        category: post.category,
        title: post.title,
        description: post.description,
        distanceKm: dist,
        timeAgo: 'Just now',
        isAnonymous: post.isAnonymous,
        author: post.author,
        authorAvatar: post.authorAvatar,
        likes: post.likesCount || 0,
        hasLiked: post.hasLiked || !!likedPostIds[post.id],
        latitude: post.latitude,
        longitude: post.longitude,
        locationName: post.locationName,
        link: `/radar/${post.id}`,
        isDbPost: true
      });
    });

    // 2. Base Fallback local alerts
    baseFallbackPosts.forEach((post) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, post.latitude, post.longitude);
      combined.push({
        ...post,
        distanceKm: dist,
        hasLiked: !!likedPostIds[post.id],
        isDbPost: false
      });
    });

    // 3. Real live markers from DB (Events, Places, Listings)
    liveMarkers.forEach((marker) => {
      if (!marker.latitude || !marker.longitude) return;
      const dist = calculateDistanceKm(coords.lat, coords.lng, marker.latitude, marker.longitude);
      
      let cat: LocalRadarPost['category'] = 'deal';
      if (marker.type === 'event' || marker.type === 'meetup') cat = 'news';
      else if (marker.type === 'restaurant') cat = 'food';
      else if (marker.type === 'store' || marker.type === 'marketplace') cat = 'deal';
      else if (marker.type === 'group') cat = 'news';

      combined.push({
        id: `marker-${marker.id}`,
        category: cat,
        title: marker.name || marker.title || 'Local Place',
        description: marker.description,
        distanceKm: dist,
        timeAgo: 'Active on map',
        isAnonymous: false,
        author: marker.locationText || marker.city || 'Verified Spot',
        likes: 10 + Math.floor(dist * 5),
        hasLiked: !!likedPostIds[`marker-${marker.id}`],
        latitude: marker.latitude,
        longitude: marker.longitude,
        locationName: marker.locationText || marker.area || marker.city || 'Local Site',
        link: marker.link || (marker.type === 'event' ? `/map?eventId=${marker.id}` : `/map?lat=${marker.latitude}&lng=${marker.longitude}`),
        isDbPost: false
      });
    });

    return combined;
  }, [coords, dbRadarPosts, liveMarkers, likedPostIds]);

  // Filter & Sort Posts
  const filteredPosts = useMemo(() => {
    return allPosts
      .filter((p) => {
        // Radius filter
        if (p.distanceKm > radiusKm) return false;
        // Category filter
        if (selectedFilter === 'all') return true;
        return p.category === selectedFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
        if (sortBy === 'top') return b.likes - a.likes;
        return 0; // Default latest
      });
  }, [allPosts, radiusKm, selectedFilter, sortBy]);

  // Counts for insights widget
  const counts = useMemo(() => {
    const withinRadius = allPosts.filter(p => p.distanceKm <= radiusKm);
    return {
      alerts: withinRadius.filter(p => p.category === 'alert').length,
      food: withinRadius.filter(p => p.category === 'food').length,
      news: withinRadius.filter(p => p.category === 'news' || p.category === 'event').length,
      deals: withinRadius.filter(p => p.category === 'deal' || p.category === 'store').length,
      total: withinRadius.length
    };
  }, [allPosts, radiusKm]);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. HERO HEADER CARD WITH LIVE GPS STATUS */}
      <div className="bg-white dark:bg-zinc-950 p-6 sm:p-7 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Ambient radial glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center relative shadow-sm flex-shrink-0">
            <Radar className={`w-7 h-7 ${isGettingLocation ? 'animate-spin text-amber-500' : 'animate-spin'}`} style={{ animationDuration: isGettingLocation ? '2s' : '8s' }} />
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${isGettingLocation ? 'bg-amber-500 animate-ping' : 'bg-teal-500 animate-ping'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tolee Radar
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
                Hyper-Local Intelligence
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
              Real-time neighborhood intelligence radar. Instant geo-targeted notifications for alerts, secret food spots, and community news.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-colors ${
              locationSource === 'gps'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : locationSource === 'ip'
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                locationSource === 'gps' ? 'bg-emerald-500 animate-pulse' :
                locationSource === 'ip' ? 'bg-sky-500' : 'bg-indigo-500'
              }`} />
              {isGettingLocation ? 'Acquiring GPS Signal...' :
               locationSource === 'gps' ? 'Live Radar GPS Active' :
               locationSource === 'ip' ? 'Network Location Active' : 'Manual Location Active'}
            </span>
          </div>

          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}° • Radius: {radiusKm} km
          </span>
        </div>
      </div>

      {/* STATUS BANNER ALERT IF ACTIVE */}
      {statusMessage && (
        <div className="bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold text-teal-800 dark:text-teal-300 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-teal-600 hover:text-teal-900 dark:text-teal-400 p-0.5 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main Neighborhood Radar Controls & Feed (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* NEIGHBORHOOD RADAR CONTROL CARD */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm space-y-5">
            
            {/* Location & GPS Sync Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center flex-shrink-0">
                  <Radio className={`w-5 h-5 ${isGettingLocation ? 'animate-pulse text-teal-500' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Tolee Neighborhood Radar
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase">
                      LIVE RADAR
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <span>{userCity}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Sync GPS + Change City */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="rounded-full h-9 px-3.5 text-xs font-bold border-gray-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 shadow-xs"
                >
                  <Search className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Change Area
                </Button>

                <Button
                  size="sm"
                  onClick={() => fetchLocation(true)}
                  disabled={isGettingLocation}
                  className="rounded-full h-9 px-4 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
                >
                  <Navigation className={`w-3.5 h-3.5 mr-1.5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                  {isGettingLocation ? 'Syncing...' : 'Sync GPS'}
                </Button>
              </div>
            </div>

            {/* Radar Radius Controls */}
            <div className="pt-3 border-t border-gray-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-teal-500" />
                RADAR RADIUS ({radiusKm} km)
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 10, 25].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => {
                      setRadiusKm(km);
                      setIsCustomRadiusOpen(false);
                      fetchDbRadarPosts(coords.lat, coords.lng, km);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      radiusKm === km && !isCustomRadiusOpen
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {km} km
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCustomRadiusOpen(!isCustomRadiusOpen)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                    isCustomRadiusOpen
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Range
                </button>
              </div>
            </div>

            {/* Custom Range Slider Drawer */}
            {isCustomRadiusOpen && (
              <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <span>Custom Radar Radius:</span>
                  <span className="text-teal-600 dark:text-teal-400 font-extrabold">{customRadiusValue} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={customRadiusValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCustomRadiusValue(val);
                    setRadiusKm(val);
                  }}
                  onMouseUp={() => fetchDbRadarPosts(coords.lat, coords.lng, customRadiusValue)}
                  onTouchEnd={() => fetchDbRadarPosts(coords.lat, coords.lng, customRadiusValue)}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>1 km (Ultra local)</span>
                  <span>25 km</span>
                  <span>50 km (City-wide)</span>
                </div>
              </div>
            )}

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
                      Help your neighborhood near {userCity.split(',')[0]} by sharing real-time alerts. Neighbors within {radiusKm} km will be notified!
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
                    <EyeOff className="w-4 h-4" /> Drop Alert / Gupt Khabar ({userCity.split(',')[0]})
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

                <input
                  type="text"
                  placeholder={`Alert headline (e.g. Aaj Kalyan me bohot baarish ho rahi hai)`}
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  required
                />

                <textarea
                  rows={2}
                  placeholder="Optional details or instructions for neighbors..."
                  value={alertDesc}
                  onChange={(e) => setAlertDesc(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnon}
                      onChange={(e) => setIsAnon(e.target.checked)}
                      className="rounded bg-white border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> Post Anonymously (Gupt Khabar)
                  </label>

                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isSubmittingPost || !alertTitle.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 h-9 shadow-md flex items-center gap-1.5"
                  >
                    {isSubmittingPost ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Notifying Neighbors...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Post & Notify Radius
                      </>
                    )}
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
                { id: 'all', label: `All Updates (${counts.total})` },
                { id: 'alert', label: `⚠️ Alerts (${counts.alerts})` },
                { id: 'food', label: `🍔 Secret Food (${counts.food})` },
                { id: 'news', label: `📰 Local News (${counts.news})` },
                { id: 'deal', label: `🏷️ Deals (${counts.deals})` },
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
                <option value="distance">Nearest Distance</option>
                <option value="top">Most Useful</option>
              </select>
            </div>
          </div>

          {/* RADAR FEED STREAM CARDS */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-950 border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
                  <Radar className="w-6 h-6 animate-spin" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No radar updates within {radiusKm} km radius
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Try expanding your radar radius (e.g. 10 km or 25 km) or be the first to drop an anonymous local alert in your area!
                </p>
                <Button
                  onClick={() => {
                    setRadiusKm(10);
                    fetchDbRadarPosts(coords.lat, coords.lng, 10);
                  }}
                  size="sm"
                  className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                >
                  Expand Radar to 10 km
                </Button>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isAlert = post.category === 'alert';
                const isFood = post.category === 'food';
                const isNews = post.category === 'news' || post.category === 'event';
                const hasLiked = !!likedPostIds[post.id] || post.hasLiked;
                const likeCount = post.likes + (hasLiked && !post.hasLiked ? 1 : 0);

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
                          {isAlert ? '⚠️' : isFood ? '🍔' : isNews ? '📢' : '🏷️'}
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
                            
                            <span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                              <LocateFixed className="w-3 h-3" />
                              {formatDistance(post.distanceKm)} ({post.locationName})
                            </span>
                          </div>

                          <Link href={post.link || `/radar/${post.id}`} className="block group">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed group-hover:text-teal-600 transition-colors">
                              {post.title}
                            </h3>
                          </Link>

                          {post.description && (
                            <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                              {post.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 pt-1">
                            <span className="font-semibold text-slate-600 dark:text-zinc-400">
                              {post.author}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side Timestamp */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                          {post.timeAgo}
                        </span>
                      </div>
                    </div>

                    {/* Card Bottom Bar: Useful Button & Map Navigation */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-900">
                      {post.link ? (
                        <Link
                          href={post.link}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          View Full Alert <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/map?lat=${post.latitude}&lng=${post.longitude}&zoom=16`}
                          className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          Locate on Map <MapPin className="w-3 h-3" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleLike(post.id, post.isDbPost)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          hasLiked
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                            : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                        Useful ({likeCount})
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Live Radar Widget & Insights (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. INTERACTIVE LIVE RADAR SCANNER WIDGET */}
          <div className="bg-white dark:bg-zinc-950 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm overflow-hidden p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Radar className="w-4 h-4 text-teal-500" /> LIVE SCANNER
              </span>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                {counts.total} items in {radiusKm}km
              </span>
            </div>

            <div className="relative w-full h-64 rounded-[22px] overflow-hidden bg-slate-950 flex items-center justify-center border border-teal-900/30 shadow-inner">
              
              {/* Radial Radar Grid */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 rounded-full border border-teal-500/20 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border border-teal-500/30 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-teal-500/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border border-teal-500/60 bg-teal-500/20 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-teal-400 shadow-lg shadow-teal-400 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crosshairs */}
                <div className="absolute w-full h-px bg-teal-500/15" />
                <div className="absolute h-full w-px bg-teal-500/15" />
              </div>

              {/* Rotating Radar Sweep Cone */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(20, 184, 166, 0.35) 0deg, rgba(20, 184, 166, 0.05) 60deg, transparent 90deg)',
                  animation: 'spin 4s linear infinite'
                }}
              />

              {/* Blip dots representing nearby points around user center */}
              <div className="absolute top-1/4 left-1/3 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              <div className="absolute top-1/4 left-1/3 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-md shadow-rose-500" />
              <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-md shadow-amber-500" />
              <div className="absolute top-1/3 right-1/3 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-md shadow-blue-500" />
              <div className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-md shadow-emerald-500" />

              {/* Floating Center Location Tag */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-400" />
                <span className="truncate max-w-[150px]">{userCity.split(',')[0]}</span>
              </div>

              {/* Floating "View Full Map" Button */}
              <Link
                href={`/map?lat=${coords.lat}&lng=${coords.lng}&zoom=14`}
                className="absolute bottom-3 bg-white/95 dark:bg-zinc-900/95 hover:bg-teal-500 hover:text-white dark:hover:bg-teal-500 dark:hover:text-white text-slate-900 dark:text-white backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 border border-gray-200/80 dark:border-zinc-800 transition-all"
              >
                Open Full Interactive Map <ExternalLink className="w-3 h-3 text-teal-500 hover:text-white" />
              </Link>
            </div>
          </div>

          {/* 2. RADAR INSIGHTS STATS WIDGET */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-[28px] border border-gray-200/80 dark:border-zinc-900 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Radar Insights ({radiusKm} km)
              </h3>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                {counts.total} active spots
              </span>
            </div>

            <div className="space-y-2 text-xs font-bold">
              {[
                { label: 'Active Alerts', count: counts.alerts, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: '⚠️', filterKey: 'alert' },
                { label: 'Secret Food Spots', count: counts.food, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: '🍔', filterKey: 'food' },
                { label: 'Local News Updates', count: counts.news, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: '📢', filterKey: 'news' },
                { label: 'Deals Near You', count: counts.deals, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: '🏷️', filterKey: 'deal' },
              ].map((insight) => (
                <button
                  key={insight.label}
                  type="button"
                  onClick={() => setSelectedFilter(insight.filterKey)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors text-left ${
                    selectedFilter === insight.filterKey
                      ? 'bg-slate-100 dark:bg-zinc-900 ring-1 ring-teal-500/50'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                    <span>{insight.icon}</span> {insight.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${insight.color}`}>
                    {insight.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. GPS SYNC ACTION BANNER */}
          <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-teal-100/40 dark:from-teal-950/40 dark:via-zinc-950 dark:to-zinc-900 p-5 rounded-[28px] border border-teal-200/80 dark:border-teal-900/40 shadow-sm relative overflow-hidden flex flex-col items-start gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Real-Time GPS Sync
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
                Keep your neighborhood radar pinned to your exact real-time street and locality coordinates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => fetchLocation(true)}
                disabled={isGettingLocation}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 h-9 shadow-md border-none flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                {isGettingLocation ? 'Refreshing GPS...' : 'Refresh GPS Now'}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsSearchModalOpen(true)}
                className="rounded-xl border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs px-3 h-9"
              >
                Search Area
              </Button>
            </div>

            {/* Radar Antenna Graphic */}
            <div className="absolute right-2 bottom-1 opacity-20 dark:opacity-30 pointer-events-none">
              <Radar className="w-20 h-20 text-teal-600 dark:text-teal-400" />
            </div>
          </div>

        </div>

      </div>

      {/* 3. MODAL: SEARCH & CHANGE RADAR AREA MANUALLY */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Change Radar Neighborhood
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Search any city, locality, landmark or PIN code
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleSearchLocation} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Kalyan West, Andheri Mumbai, Connaught Place Delhi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSearchingLocation || !searchQuery.trim()}
                  className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 h-10"
                >
                  {isSearchingLocation ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </form>

              {/* Quick Popular Cities */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Quick Jump:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { name: 'Kalyan West', lat: 19.2437, lng: 73.1355 },
                    { name: 'Thane', lat: 19.2183, lng: 72.9781 },
                    { name: 'Mumbai (Andheri)', lat: 19.1136, lng: 72.8697 },
                    { name: 'Navi Mumbai', lat: 19.0330, lng: 73.0297 },
                    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
                    { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
                    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 }
                  ].map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => {
                        setCoords({ lat: city.lat, lng: city.lng });
                        setUserCity(city.name);
                        setLocationSource('manual');
                        setStatusMessage(`Radar relocated to ${city.name}`);
                        setIsSearchModalOpen(false);
                        localStorage.setItem('tolee_radar_lat', String(city.lat));
                        localStorage.setItem('tolee_radar_lng', String(city.lng));
                        localStorage.setItem('tolee_radar_city', city.name);
                        localStorage.setItem('tolee_radar_source', 'manual');
                        try {
                          updateUserRadarLocation({ lat: city.lat, lng: city.lng, locationName: city.name });
                        } catch (_) {}
                        fetchDbRadarPosts(city.lat, city.lng, radiusKm);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-900 hover:bg-teal-500/10 hover:text-teal-600 text-slate-600 dark:text-zinc-400 transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2 border-t border-gray-100 dark:border-zinc-900">
                  <span className="text-[11px] font-bold text-slate-400">Search Results:</span>
                  {searchResults.map((res: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-start gap-2.5 group"
                    >
                      <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                          {res.display_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {parseFloat(res.lat).toFixed(4)}°, {parseFloat(res.lon).toFixed(4)}°
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
