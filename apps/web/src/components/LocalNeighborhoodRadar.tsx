'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  MapPin, Radar, Navigation, EyeOff, Send, Radio, Plus, CheckCircle2, ChevronRight,
  MoreVertical, ThumbsUp, SlidersHorizontal, X, Search, RefreshCw,
  LocateFixed, Globe, Loader2, Sun, Heart, Users, Share2, Maximize2,
  Minimize2, ZoomIn, ZoomOut, AlertCircle, Tag, Utensils, Newspaper, ChevronDown
} from 'lucide-react';
import { 
  createRadarPostAction, 
  getRadarPostsAction, 
  updateUserRadarLocation, 
  toggleRadarPostLikeAction 
} from '@/actions/radar';
import { calculateDistanceKm, formatDistance } from '@/lib/geo-utils';

export interface LocalRadarPost {
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
  imageUrl?: string;
  isDbPost?: boolean;
}

export function LocalNeighborhoodRadar() {
  // Coordinates default to Kalyan/Mumbai region or restored from storage
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.2565,
    lng: 73.1329
  });
  const [userCity, setUserCity] = useState<string>('Asia, Kalyan');
  const [subLocation, setSubLocation] = useState<string>('Kalyan');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'manual' | 'default'>('gps');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Manual location search modal states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Radius & Filtering
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [isCustomRadiusOpen, setIsCustomRadiusOpen] = useState<boolean>(false);
  const [customRadiusValue, setCustomRadiusValue] = useState<number>(5);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'latest' | 'top'>('nearest');

  // Map settings and layers
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const [mapSearchInput, setMapSearchInput] = useState<string>('');
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);
  const [mapLayers, setMapLayers] = useState({
    userLocation: true,
    alerts: true,
    food: true,
    news: true,
    deals: true
  });

  // Post Alert Modal states
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

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const circlesLayerGroupRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const markerLookupRef = useRef<Record<string, any>>({});

  // Fallback realistic neighborhood updates matching reference image
  const baseFallbackPosts = useMemo<LocalRadarPost[]>(() => [
    {
      id: 'base-1',
      category: 'alert',
      title: 'Road blockage near MG Road flyover due to repair work. Take side route!',
      description: 'Heavy traffic. Diversion is active. Use Kalyan-Shilphata road instead.',
      timeAgo: '12 min ago',
      isAnonymous: true,
      author: 'Anonymous Neighbor',
      likes: 18,
      latitude: 19.2590,
      longitude: 73.1360,
      locationName: 'MG Road Flyover',
      distanceKm: 1.3,
      imageUrl: 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=600&q=80',
      isDbPost: false
    },
    {
      id: 'base-2',
      category: 'food',
      title: "Best Pav Bhaji at Sharma's Tapri",
      description: 'Hidden gem near Kalyan station. Must try their butter pav bhaji!',
      timeAgo: '28 min ago',
      isAnonymous: false,
      author: 'Foodie Neighbor',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      likes: 24,
      latitude: 19.2520,
      longitude: 73.1290,
      locationName: 'Station West Gate',
      distanceKm: 0.8,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      isDbPost: false
    },
    {
      id: 'base-3',
      category: 'news',
      title: 'New park opening this weekend in Kalyan East',
      description: 'Family-friendly park with kids play area and walking track.',
      timeAgo: '1 hour ago',
      isAnonymous: false,
      author: 'Local Resident',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      likes: 16,
      latitude: 19.2680,
      longitude: 73.1410,
      locationName: 'Kalyan East Community Sector',
      distanceKm: 2.1,
      imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80',
      isDbPost: false
    },
    {
      id: 'base-4',
      category: 'deal',
      title: 'Flat 50% Off on Branded Shoes',
      description: 'At Kalyan Metro Mall. Limited period offer!',
      timeAgo: '2 hours ago',
      isAnonymous: false,
      author: 'Shopper',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      likes: 9,
      latitude: 19.2480,
      longitude: 73.1480,
      locationName: 'Kalyan Metro Mall',
      distanceKm: 1.9,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
      isDbPost: false
    }
  ], []);

  // Reverse geocoding helper
  const reverseGeocode = async (lat: number, lng: number): Promise<{ fullAddress: string; city: string; sub: string }> => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const locality = data.locality || data.principalSubdivision || '';
        const city = data.city || data.localityInfo?.administrative?.[2]?.name || data.principalSubdivision || 'Kalyan';
        const state = data.principalSubdivision || '';
        const sub = locality && locality !== city ? locality : (data.localityInfo?.informative?.[0]?.name || '');

        let fullAddress = `Asia, ${city}`;
        if (sub && sub !== city) {
          fullAddress = `${sub}, ${city}`;
        } else if (state && state !== city) {
          fullAddress = `${city}, ${state}`;
        }
        return { fullAddress, city, sub };
      }
    } catch (_) {}

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const sub = address.suburb || address.neighbourhood || address.residential || '';
        const city = address.city || address.town || address.village || address.municipality || 'Kalyan';
        const state = address.state || '';
        const fullAddress = sub ? `${sub}, ${city}` : (state ? `${city}, ${state}` : `Asia, ${city}`);
        return { fullAddress, city, sub };
      }
    } catch (_) {}

    return {
      fullAddress: 'Asia, Kalyan',
      city: 'Kalyan',
      sub: ''
    };
  };

  // Fallback to network IP geolocation
  const fallbackIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const city = data.city || data.region || 'Kalyan';
          const full = `Asia, ${city}`;

          setCoords({ lat, lng });
          setUserCity(full);
          setSubLocation(data.city || '');
          setLocationSource('ip');
          setStatusMessage(`Network location synced: ${full}`);

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

  // Fetch db radar posts from backend
  const fetchDbRadarPosts = useCallback(async (lat: number, lng: number, rad: number) => {
    try {
      const res = await getRadarPostsAction({ lat, lng, radiusKm: rad });
      if (res.success && Array.isArray(res.posts)) {
        setDbRadarPosts(res.posts);
      }
    } catch (e) {
      console.warn('[Radar] Error loading db posts:', e);
    }
  }, []);

  // Fetch live radar markers
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
      console.warn('[Radar] Error loading markers:', e);
    }
  }, []);

  // Geolocation locking handler
  const fetchLocation = useCallback(async (isManualTrigger = false) => {
    setIsGettingLocation(true);
    setStatusMessage('Acquiring real-time GPS signal...');

    // Try Capacitor Geolocation if on mobile
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
            setSubLocation(geo.sub || geo.city);
            setLocationSource('gps');
            setIsGettingLocation(false);
            setStatusMessage(`GPS locked: ${geo.fullAddress}`);

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

    // Web Geolocation
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const geo = await reverseGeocode(lat, lng);

          setCoords({ lat, lng });
          setUserCity(geo.fullAddress);
          setSubLocation(geo.sub || geo.city);
          setLocationSource('gps');
          setIsGettingLocation(false);
          setStatusMessage(`GPS active: ${geo.fullAddress}`);

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
            setUserCity('Asia, Kalyan');
            setLocationSource('default');
            if (isManualTrigger) {
              setStatusMessage('GPS signal unavailable. You can search your city manually.');
              setIsSearchModalOpen(true);
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const ipSuccess = await fallbackIpLocation();
      setIsGettingLocation(false);
      if (!ipSuccess) {
        setUserCity('Asia, Kalyan');
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

  // Combine database posts, baseline posts, and live markers
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
        imageUrl: post.imageUrl || (
          post.category === 'alert' ? 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=600&q=80' :
          post.category === 'food' ? 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' :
          post.category === 'news' ? 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80' :
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
        ),
        isDbPost: true
      });
    });

    // 2. Base Fallback Posts (matching reference design)
    baseFallbackPosts.forEach((post) => {
      const dist = calculateDistanceKm(coords.lat, coords.lng, post.latitude, post.longitude);
      combined.push({
        ...post,
        distanceKm: dist > 0.1 ? dist : post.distanceKm,
        hasLiked: !!likedPostIds[post.id],
        isDbPost: false
      });
    });

    // 3. Live Markers from Backend (Events, Places)
    liveMarkers.forEach((marker) => {
      if (!marker.latitude || !marker.longitude) return;
      const dist = calculateDistanceKm(coords.lat, coords.lng, marker.latitude, marker.longitude);
      let cat: LocalRadarPost['category'] = 'deal';
      if (marker.type === 'event' || marker.type === 'meetup') cat = 'news';
      else if (marker.type === 'restaurant') cat = 'food';
      else if (marker.type === 'store' || marker.type === 'marketplace') cat = 'deal';

      combined.push({
        id: `marker-${marker.id}`,
        category: cat,
        title: marker.name || marker.title || 'Local Spot',
        description: marker.description,
        distanceKm: dist,
        timeAgo: 'Active on map',
        isAnonymous: false,
        author: marker.locationText || marker.city || 'Verified Spot',
        likes: 12 + Math.floor(dist * 4),
        hasLiked: !!likedPostIds[`marker-${marker.id}`],
        latitude: marker.latitude,
        longitude: marker.longitude,
        locationName: marker.locationText || marker.city || 'Near you',
        link: marker.link || `/map?lat=${marker.latitude}&lng=${marker.longitude}`,
        imageUrl: marker.image || (
          cat === 'food' ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' :
          cat === 'news' ? 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80' :
          'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80'
        ),
        isDbPost: false
      });
    });

    return combined;
  }, [coords, dbRadarPosts, baseFallbackPosts, liveMarkers, likedPostIds]);

  // Filter & Sort Posts
  const filteredPosts = useMemo(() => {
    return allPosts
      .filter((p) => {
        if (p.distanceKm > radiusKm) return false;
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'alert') return p.category === 'alert';
        if (selectedFilter === 'food') return p.category === 'food';
        if (selectedFilter === 'news') return p.category === 'news' || p.category === 'event';
        if (selectedFilter === 'deal') return p.category === 'deal' || p.category === 'store';
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest') return a.distanceKm - b.distanceKm;
        if (sortBy === 'top') return b.likes - a.likes;
        return 0; // latest
      });
  }, [allPosts, radiusKm, selectedFilter, sortBy]);

  // Counts for widgets
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

  // Toggle Post Like
  const toggleLike = async (id: string, isDbPost?: boolean) => {
    setLikedPostIds(prev => ({ ...prev, [id]: !prev[id] }));
    if (isDbPost) {
      try {
        await toggleRadarPostLikeAction(id);
      } catch (_) {}
    }
  };

  // Pan map to post and open popup
  const panToPostOnMap = (post: LocalRadarPost) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([post.latitude, post.longitude], 15, { animate: true });
      const marker = markerLookupRef.current[post.id];
      if (marker) {
        setTimeout(() => marker.openPopup(), 300);
      }
    }
    // Smooth scroll to map if on mobile
    if (window.innerWidth < 1024 && mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupLeaflet = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      // 1. Initialize map if not yet created
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([coords.lat, coords.lng], 14);

        mapInstanceRef.current = map;
        circlesLayerGroupRef.current = L.layerGroup().addTo(map);
        markersLayerGroupRef.current = L.layerGroup().addTo(map);

        // Tile layer
        const tileUrl = mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      } else {
        // Update tile layer if changed
        const currentTileUrl = mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        if (tileLayerRef.current) {
          tileLayerRef.current.setUrl(currentTileUrl);
        }
      }

      const map = mapInstanceRef.current;
      const circlesGroup = circlesLayerGroupRef.current;
      const markersGroup = markersLayerGroupRef.current;

      if (!map || !circlesGroup || !markersGroup) return;

      // Clear existing layers
      circlesGroup.clearLayers();
      markersGroup.clearLayers();
      markerLookupRef.current = {};

      // 2. Draw Translucent Radar Concentric Rings & Distance Badges
      if (mapLayers.userLocation) {
        const rings = [
          { radius: 1000, label: '1 km', opacity: 0.12 },
          { radius: 3000, label: '3 km', opacity: 0.08 },
          { radius: Math.max(5000, radiusKm * 1000), label: `${radiusKm} km`, opacity: 0.05 }
        ];

        rings.forEach((ring) => {
          L.circle([coords.lat, coords.lng], {
            radius: ring.radius,
            color: '#0E9F9A',
            weight: 1.5,
            dashArray: '5, 5',
            fillColor: '#0E9F9A',
            fillOpacity: ring.opacity
          }).addTo(circlesGroup);

          // Add clean distance label tag on the ring
          const labelLat = coords.lat - (ring.radius / 111320);
          const labelIcon = L.divIcon({
            className: 'radar-ring-label',
            html: `
              <div style="background: rgba(14, 159, 154, 0.9); color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; text-align: center; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                ${ring.label}
              </div>
            `,
            iconSize: [40, 18],
            iconAnchor: [20, 9]
          });
          L.marker([labelLat, coords.lng], { icon: labelIcon, interactive: false }).addTo(circlesGroup);
        });

        // 3. User Location Center Pulsing Beacon
        const userBeaconIcon = L.divIcon({
          className: 'radar-user-beacon',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(14, 159, 154, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 18px; height: 18px; border-radius: 9999px; background: #0E9F9A; border: 3.5px solid white; box-shadow: 0 0 12px rgba(14, 159, 154, 0.8);"></div>
              <div style="position: absolute; top: -20px; background: #0F172A; color: white; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                ◎ YOU
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        L.marker([coords.lat, coords.lng], { icon: userBeaconIcon, zIndexOffset: 1000 })
          .bindPopup(`
            <div style="padding: 4px; font-family: system-ui, sans-serif;">
              <div style="font-weight: 800; font-size: 13px; color: #0E9F9A;">Your Current Radar Center</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${userCity}</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">Scanning radius: ${radiusKm} km</div>
            </div>
          `)
          .addTo(circlesGroup);
      }

      // 4. Place Category Markers onto Map based on mapLayers
      allPosts.forEach((post) => {
        if (post.distanceKm > radiusKm) return;
        if (post.category === 'alert' && !mapLayers.alerts) return;
        if (post.category === 'food' && !mapLayers.food) return;
        if (post.category === 'news' && !mapLayers.news) return;
        if (post.category === 'deal' && !mapLayers.deals) return;

        // Custom styling per category
        const pinStyles = {
          alert: { bg: '#EF4444', icon: '🚨', label: 'ALERT' },
          food: { bg: '#F97316', icon: '🍔', label: 'FOOD' },
          news: { bg: '#3B82F6', icon: '📰', label: 'NEWS' },
          deal: { bg: '#8B5CF6', icon: '🏷️', label: 'DEAL' },
          event: { bg: '#3B82F6', icon: '📰', label: 'EVENT' },
          store: { bg: '#8B5CF6', icon: '🏷️', label: 'STORE' },
          group: { bg: '#3B82F6', icon: '👥', label: 'COMMUNITY' }
        }[post.category] || { bg: '#0E9F9A', icon: '📍', label: 'RADAR' };

        const markerHtml = `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 32px; height: 32px; border-radius: 9999px; background: ${pinStyles.bg}; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); transition: transform 0.2s;">
              ${pinStyles.icon}
            </div>
            <div style="position: absolute; bottom: -3px; width: 6px; height: 6px; background: ${pinStyles.bg}; transform: rotate(45deg);"></div>
          </div>
        `;

        const pinIcon = L.divIcon({
          className: `radar-pin-${post.category}`,
          html: markerHtml,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -32]
        });

        const popupHtml = `
          <div style="width: 220px; font-family: system-ui, sans-serif; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 9px; font-weight: 900; background: ${pinStyles.bg}15; color: ${pinStyles.bg}; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${pinStyles.label}
              </span>
              <span style="font-size: 10px; font-weight: 700; color: #0E9F9A;">
                📍 ${formatDistance(post.distanceKm)}
              </span>
            </div>
            <h4 style="font-size: 12px; font-weight: 800; color: #0F172A; margin: 0 0 4px 0; line-height: 1.3;">
              ${post.title}
            </h4>
            ${post.description ? `<p style="font-size: 11px; color: #64748B; margin: 0 0 6px 0; line-height: 1.3;">${post.description.substring(0, 75)}...</p>` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #F1F5F9; padding-top: 6px; font-size: 10px; color: #94A3B8;">
              <span>${post.author}</span>
              <span style="color: #0E9F9A; font-weight: 800;">👍 ${post.likes}</span>
            </div>
          </div>
        `;

        const markerInstance = L.marker([post.latitude, post.longitude], { icon: pinIcon })
          .bindPopup(popupHtml)
          .addTo(markersGroup);

        markerLookupRef.current[post.id] = markerInstance;
      });
    };

    // Load Leaflet assets dynamically if not present
    if ((window as any).L) {
      setupLeaflet();
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
        script.async = true;
        script.onload = () => setupLeaflet();
        document.body.appendChild(script);
      }
    }
  }, [coords, allPosts, radiusKm, mapLayers, mapType, userCity]);

  // Handle map search input
  const handleMapSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchInput.trim()) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchInput.trim())}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lon], 15, { animate: true });
          }
        }
      }
    } catch (_) {}
  };

  // Handle Drop New Alert Form Submission
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

  // Handle City Search Modal Selection
  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.address || {};
    const sub = address.suburb || address.neighbourhood || address.residential || '';
    const city = address.city || address.town || address.village || result.display_name.split(',')[0];
    const full = `Asia, ${city}`;

    setCoords({ lat, lng });
    setUserCity(full);
    setSubLocation(sub || city);
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
      updateUserRadarLocation({ lat, lng, locationName: full, subLocation: sub || city });
    } catch (_) {}

    fetchDbRadarPosts(lat, lng, radiusKm);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14, { animate: true });
    }
  };

  // Today's formatted date string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, []);

  return (
    <div className="w-full space-y-5">
      
      {/* 1. TOP HEADER ROW MATCHING REFERENCE DESIGN */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        
        {/* Left Section: Icon, Title & Badge */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#0E9F9A] dark:text-teal-400 flex items-center justify-center flex-shrink-0 relative shadow-xs">
            <Radio className="w-7 h-7 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#0E9F9A] ring-2 ring-white dark:ring-zinc-900" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tolee Radar
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-[#E0E7FF] dark:border-indigo-900/50 shadow-2xs">
                HYPER-LOCAL INTELLIGENCE
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
              Real-time neighborhood intelligence. Get instant geo-targeted updates about alerts, secret food spots, deals and community news around you.
            </p>
          </div>
        </div>

        {/* Right Section: GPS Active Card & Weather Card */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto flex-wrap justify-between xl:justify-end flex-shrink-0">
          
          {/* GPS Status Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                  GPS ACTIVE
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[130px]">
                {userCity}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E • ± 8 m accuracy
              </p>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => fetchLocation(true)}
                disabled={isGettingLocation}
                title="Sync GPS Location"
                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <span>Change Area</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Weather Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white leading-none">
                28° C
              </div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                Clear Sky
              </div>
              <div className="text-[9px] font-medium text-slate-400 dark:text-zinc-500">
                {todayFormatted}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* STATUS BANNER ALERT IF ACTIVE */}
      {statusMessage && (
        <div className="bg-teal-50/90 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 px-4 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0E9F9A] flex-shrink-0" />
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

      {/* 2. MAIN 12-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT/CENTER COLUMN (8 Cols): Hero Map, Filter Tabs & Feed Cards */}
        <div className="lg:col-span-8 space-y-5">

          {/* HERO INTERACTIVE LEAFLET RADAR MAP CANVAS */}
          <div
            className={`bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden relative ${
              isFullscreenMap ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[390px] sm:h-[420px]'
            }`}
          >
            {/* The Actual Leaflet Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* FLOATING OVERLAYS ON TOP OF THE MAP */}

            {/* 1. Top-Left: Search this area input */}
            <div className="absolute top-3.5 left-3.5 z-20">
              <form onSubmit={handleMapSearchSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search this area (landmark, locality...)"
                  value={mapSearchInput}
                  onChange={(e) => setMapSearchInput(e.target.value)}
                  className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-10 pr-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 shadow-md focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] w-64 sm:w-72 max-w-[calc(100vw-120px)] transition-all"
                />
              </form>
            </div>

            {/* 2. Top-Right: Map Control Icons Stack */}
            <div className="absolute top-3.5 right-3.5 z-20 flex flex-col gap-1.5">
              {/* Target / Re-center Location */}
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([coords.lat, coords.lng], 14, { animate: true });
                  }
                }}
                title="Center on my location"
                className="w-9 h-9 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 shadow-md text-slate-700 dark:text-zinc-300 hover:text-[#0E9F9A] dark:hover:text-teal-400 flex items-center justify-center transition-colors"
              >
                <LocateFixed className="w-4 h-4" />
              </button>

              {/* Zoom In & Out */}
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 rounded-xl shadow-md flex flex-col overflow-hidden">
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  title="Zoom In"
                  className="w-9 h-8 text-slate-700 dark:text-zinc-300 hover:text-[#0E9F9A] flex items-center justify-center transition-colors border-b border-slate-100 dark:border-zinc-800 font-bold"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  title="Zoom Out"
                  className="w-9 h-8 text-slate-700 dark:text-zinc-300 hover:text-[#0E9F9A] flex items-center justify-center transition-colors font-bold"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                title="Toggle Fullscreen"
                className="w-9 h-9 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 shadow-md text-slate-700 dark:text-zinc-300 hover:text-[#0E9F9A] dark:hover:text-teal-400 flex items-center justify-center transition-colors"
              >
                {isFullscreenMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* 3. Bottom-Left: "Show on Map" Filter Layer Card */}
            <div className="absolute bottom-3.5 left-3.5 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 rounded-2xl p-3 shadow-lg w-48 text-xs font-semibold">
              <div className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider mb-2">
                Show on Map
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mapLayers.userLocation}
                    onChange={(e) => setMapLayers(prev => ({ ...prev, userLocation: e.target.checked }))}
                    className="rounded text-[#0E9F9A] focus:ring-[#0E9F9A] w-3.5 h-3.5 accent-[#0E9F9A]"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Your Location</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mapLayers.alerts}
                    onChange={(e) => setMapLayers(prev => ({ ...prev, alerts: e.target.checked }))}
                    className="rounded text-rose-500 focus:ring-rose-500 w-3.5 h-3.5 accent-rose-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Alerts</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mapLayers.food}
                    onChange={(e) => setMapLayers(prev => ({ ...prev, food: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 accent-amber-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Secret Food</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mapLayers.news}
                    onChange={(e) => setMapLayers(prev => ({ ...prev, news: e.target.checked }))}
                    className="rounded text-sky-500 focus:ring-sky-500 w-3.5 h-3.5 accent-sky-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Local News</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mapLayers.deals}
                    onChange={(e) => setMapLayers(prev => ({ ...prev, deals: e.target.checked }))}
                    className="rounded text-purple-500 focus:ring-purple-500 w-3.5 h-3.5 accent-purple-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Deals & Offers</span>
                </label>
              </div>
            </div>

            {/* 4. Bottom-Right: Map / Satellite Segmented Toggle */}
            <div className="absolute bottom-3.5 right-3.5 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 rounded-xl p-1 shadow-md flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMapType('map')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                  mapType === 'map'
                    ? 'bg-[#0E9F9A] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                  mapType === 'satellite'
                    ? 'bg-[#0E9F9A] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>

          </div>

          {/* CATEGORY FILTER TABS & SORT ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            
            {/* Filter Pills matching reference layout */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {[
                { id: 'all', label: `All Updates (${counts.total})`, icon: null },
                { id: 'alert', label: `Alerts (${counts.alerts})`, icon: '🚨' },
                { id: 'food', label: `Secret Food (${counts.food})`, icon: '🍔' },
                { id: 'news', label: `Local News (${counts.news})`, icon: '📰' },
                { id: 'deal', label: `Deals & Offers (${counts.deals})`, icon: '🏷️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedFilter === tab.id
                      ? 'bg-[#0E9F9A] text-white shadow-xs'
                      : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0 px-2">
              <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#0E9F9A]"
              >
                <option value="nearest">Nearest</option>
                <option value="latest">Latest</option>
                <option value="top">Most Useful</option>
              </select>
            </div>
          </div>

          {/* RADAR FEED STREAM CARDS */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] mx-auto flex items-center justify-center">
                  <Radar className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No radar updates within {radiusKm} km radius
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Try expanding your radar radius or drop an anonymous local alert in your area!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRadiusKm(10);
                    fetchDbRadarPosts(coords.lat, coords.lng, 10);
                  }}
                  className="rounded-full bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-bold px-4 py-2"
                >
                  Expand Radar to 10 km
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isAlert = post.category === 'alert';
                const isFood = post.category === 'food';
                const isNews = post.category === 'news' || post.category === 'event';
                const isDeal = post.category === 'deal' || post.category === 'store';
                const hasLiked = !!likedPostIds[post.id] || post.hasLiked;
                const likeCount = post.likes + (hasLiked && !post.hasLiked ? 1 : 0);

                return (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start gap-4 group"
                  >
                    {/* Left Thumbnail Image */}
                    <div className="w-full sm:w-28 sm:h-24 h-44 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 flex-shrink-0 relative border border-slate-200/60 dark:border-zinc-800">
                      <img
                        src={post.imageUrl || 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=300&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      
                      {/* Badge & Distance Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isAlert ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                          isFood ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          isNews ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                          'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {post.category === 'alert' ? 'ALERT' :
                           post.category === 'food' ? 'SECRET FOOD' :
                           post.category === 'news' ? 'LOCAL NEWS' : 'DEAL'}
                        </span>

                        <span className="text-xs font-bold text-[#0E9F9A] dark:text-teal-400 flex items-center gap-1">
                          <LocateFixed className="w-3 h-3" />
                          {formatDistance(post.distanceKm)} away
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={post.link || `/radar/${post.id}`} className="block">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug hover:text-[#0E9F9A] transition-colors">
                          {post.title}
                        </h3>
                      </Link>

                      {/* Description */}
                      {post.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {post.description}
                        </p>
                      )}

                      {/* Author & Timestamp Row */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 pt-0.5">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.author} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-slate-600">
                            👤
                          </div>
                        )}
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">{post.author}</span>
                        <span>•</span>
                        <span>{post.timeAgo}</span>
                      </div>

                    </div>

                    {/* Right Side Buttons: View on Map, Useful & Share */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 self-stretch sm:self-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                      
                      {/* Top Action: View on Map */}
                      <button
                        type="button"
                        onClick={() => panToPostOnMap(post)}
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[#0E9F9A] dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>

                      {/* Bottom Actions: Useful & Share */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleLike(post.id, post.isDbPost)}
                          className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                            hasLiked ? 'text-[#0E9F9A]' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                          <span>Useful ({likeCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(`${window.location.origin}/radar/${post.id}`);
                              setStatusMessage('Post link copied to clipboard! 🔗');
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (4 Cols): Radar Insights & Controls */}
        <div className="lg:col-span-4 space-y-4">

          {/* 1. RADAR RANGE CARD */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Radar Range
              </h3>
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                Scanning within {radiusKm} km
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {[1, 3, 5, 10, 25].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    setRadiusKm(km);
                    setIsCustomRadiusOpen(false);
                    fetchDbRadarPosts(coords.lat, coords.lng, km);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-extrabold transition-all text-center ${
                    radiusKm === km && !isCustomRadiusOpen
                      ? 'bg-[#0E9F9A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {km} km
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomRadiusOpen(!isCustomRadiusOpen)}
                className={`py-1.5 rounded-lg text-xs font-extrabold transition-all text-center ${
                  isCustomRadiusOpen
                    ? 'bg-[#0E9F9A] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Range Slider Drawer */}
            {isCustomRadiusOpen && (
              <div className="bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <span>Custom Radius:</span>
                  <span className="text-[#0E9F9A] font-extrabold">{customRadiusValue} km</span>
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
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#0E9F9A]"
                />
              </div>
            )}
          </div>

          {/* 2. ACTIVE UPDATES CARD WITH 4-ITEM GRID */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-2xs space-y-3.5">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0E9F9A] flex items-center justify-center flex-shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none">
                    {counts.total} Active Updates
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 mt-0.5">
                    Live in your neighborhood
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Scanning...
              </span>
            </div>

            {/* 4-Item Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              
              {/* Alert */}
              <button
                type="button"
                onClick={() => setSelectedFilter('alert')}
                className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl p-2.5 flex flex-col items-center justify-center hover:bg-rose-100/60 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs mb-1">
                  🚨
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {counts.alerts}
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                  Alert
                </span>
                <span className="text-[8px] font-medium text-slate-400">
                  Safety first
                </span>
              </button>

              {/* Food */}
              <button
                type="button"
                onClick={() => setSelectedFilter('food')}
                className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-2.5 flex flex-col items-center justify-center hover:bg-amber-100/60 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs mb-1">
                  🍴
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {counts.food}
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                  Secret Food
                </span>
                <span className="text-[8px] font-medium text-slate-400">
                  Hidden gems
                </span>
              </button>

              {/* News */}
              <button
                type="button"
                onClick={() => setSelectedFilter('news')}
                className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-2.5 flex flex-col items-center justify-center hover:bg-blue-100/60 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs mb-1">
                  📰
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {counts.news}
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                  Local News
                </span>
                <span className="text-[8px] font-medium text-slate-400">
                  Stay informed
                </span>
              </button>

              {/* Deals */}
              <button
                type="button"
                onClick={() => setSelectedFilter('deal')}
                className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl p-2.5 flex flex-col items-center justify-center hover:bg-purple-100/60 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xs mb-1">
                  🏷️
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {counts.deals}
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                  Deals & Offers
                </span>
                <span className="text-[8px] font-medium text-slate-400">
                  Save nearby
                </span>
              </button>

            </div>

          </div>

          {/* 3. PRIMARY CTA: DROP ALERT BUTTON */}
          <button
            type="button"
            onClick={() => setIsPostingAlert(true)}
            className="w-full bg-gradient-to-r from-[#0E9F9A] to-[#087A76] hover:from-[#087A76] hover:to-[#065A57] text-white p-3.5 rounded-2xl shadow-md flex items-center gap-3.5 text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="text-base font-black text-white leading-tight">
                Drop Alert
              </div>
              <div className="text-xs text-white/80 font-medium">
                Share what's happening around you
              </div>
            </div>
          </button>

          {/* 4. RECENT ACTIVITY CARD */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Recent Activity
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                3 new updates in the last hour
              </p>
            </div>

            {/* Sparkline / Activity Bars */}
            <div className="flex items-end gap-1 h-8">
              <span className="w-1.5 h-3 bg-teal-200 dark:bg-teal-900 rounded-full" />
              <span className="w-1.5 h-5 bg-teal-300 dark:bg-teal-800 rounded-full" />
              <span className="w-1.5 h-4 bg-teal-400 dark:bg-teal-700 rounded-full" />
              <span className="w-1.5 h-7 bg-[#0E9F9A] rounded-full" />
              <span className="w-1.5 h-6 bg-teal-500 rounded-full" />
              <span className="w-1.5 h-8 bg-[#0E9F9A] rounded-full animate-pulse" />
            </div>
          </div>

          {/* 5. COMMUNITY IMPACT CARD */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#0E9F9A] fill-[#0E9F9A]" />
                Community Impact
              </h3>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-white leading-none">
                    128
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                    Helpful reactions
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-white leading-none">
                    1.2K
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                    Active neighbors
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. LOCAL PEOPLE STRONGER COMMUNITIES BANNER */}
          <div className="bg-gradient-to-b from-sky-50 to-teal-50/60 dark:from-zinc-900 dark:to-zinc-900/80 rounded-2xl border border-sky-100 dark:border-zinc-800 p-4 shadow-2xs space-y-2 relative overflow-hidden">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Local People
              </h4>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Stronger Communities
              </h4>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                See it. Share it. Make it safer.
              </p>
            </div>

            {/* Illustrated community graphic banner */}
            <div className="w-full h-20 rounded-xl overflow-hidden relative flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80"
                alt="Stronger Communities"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm shadow-md animate-bounce">
                  📍
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. MODAL: DROP ALERT (GUPT KHABAR / REAL-TIME UPDATE) */}
      {isPostingAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Drop Neighborhood Alert
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Notifying neighbors within {radiusKm} km radius
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPostingAlert(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostLocalAlert} className="p-5 space-y-4">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'alert', label: '🚨 Alert', color: 'border-rose-300 text-rose-600 bg-rose-50/50' },
                    { id: 'food', label: '🍔 Food', color: 'border-amber-300 text-amber-600 bg-amber-50/50' },
                    { id: 'news', label: '📰 News', color: 'border-blue-300 text-blue-600 bg-blue-50/50' },
                    { id: 'deal', label: '🏷️ Deal', color: 'border-purple-300 text-purple-600 bg-purple-50/50' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAlertCategory(c.id as any)}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        alertCategory === c.id
                          ? `${c.color} ring-2 ring-current`
                          : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Road blockage near MG Road flyover due to repair work"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                  required
                />
              </div>

              {/* Description textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Provide additional details or helpful directions for neighbors..."
                  value={alertDesc}
                  onChange={(e) => setAlertDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                />
              </div>

              {/* Anonymous switch & Submit */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnon}
                    onChange={(e) => setIsAnon(e.target.checked)}
                    className="rounded text-[#0E9F9A] focus:ring-[#0E9F9A] w-4 h-4 accent-[#0E9F9A]"
                  />
                  <EyeOff className="w-3.5 h-3.5 text-[#0E9F9A]" />
                  <span>Post Anonymously (Gupt Khabar)</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingPost || !alertTitle.trim()}
                  className="rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white font-extrabold text-xs px-5 py-2.5 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Notifying Radius...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: CHANGE AREA MANUALLY */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Change Radar Area
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
              <form
                onSubmit={async (e) => {
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
                  } catch (_) {}
                  finally {
                    setIsSearchingLocation(false);
                  }
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Kalyan West, Thane, Andheri Mumbai, Pune, Connaught Place Delhi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingLocation || !searchQuery.trim()}
                  className="rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-bold px-4 h-10 transition-colors"
                >
                  {isSearchingLocation ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </form>

              {/* Quick Jump Popular Localities */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                  Quick Jump:
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { name: 'Kalyan West', lat: 19.2565, lng: 73.1329 },
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
                        const full = `Asia, ${city.name}`;
                        setCoords({ lat: city.lat, lng: city.lng });
                        setUserCity(full);
                        setLocationSource('manual');
                        setStatusMessage(`Radar relocated to ${city.name}`);
                        setIsSearchModalOpen(false);
                        localStorage.setItem('tolee_radar_lat', String(city.lat));
                        localStorage.setItem('tolee_radar_lng', String(city.lng));
                        localStorage.setItem('tolee_radar_city', full);
                        localStorage.setItem('tolee_radar_source', 'manual');
                        try {
                          updateUserRadarLocation({ lat: city.lat, lng: city.lng, locationName: full });
                        } catch (_) {}
                        fetchDbRadarPosts(city.lat, city.lng, radiusKm);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([city.lat, city.lng], 14, { animate: true });
                        }
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-teal-50 hover:text-[#0E9F9A] text-slate-600 dark:text-zinc-300 transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase text-slate-400">Search Results:</span>
                  {searchResults.map((res: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-start gap-2.5 group"
                    >
                      <MapPin className="w-4 h-4 text-[#0E9F9A] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0E9F9A] transition-colors">
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
