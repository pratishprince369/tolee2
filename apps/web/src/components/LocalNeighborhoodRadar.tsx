'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  MapPin, Radar, Navigation, EyeOff, Send, Radio, Plus, CheckCircle2, ChevronRight,
  MoreVertical, ThumbsUp, SlidersHorizontal, X, Search, RefreshCw,
  LocateFixed, Globe, Loader2, Sun, Heart, Users, Share2, Maximize2,
  Minimize2, ZoomIn, ZoomOut, AlertCircle, Tag, Utensils, Newspaper, ChevronDown,
  AlertTriangle, Flag, ShieldCheck, Check, Clock, Image as ImageIcon, Video, Play, Zap, Info, ShieldAlert,
  MapPinOff, Settings, MessageCircle, Repeat, Eye, CornerDownRight
} from 'lucide-react';
import { 
  createRadarPostAction, 
  getRadarPostsAction, 
  updateUserRadarLocation, 
  toggleRadarPostLikeAction,
  confirmRadarPostAction,
  reportRadarPostAction,
  addRadarCommentAction,
  getRadarCommentsAction,
  toggleRadarReshareAction,
  recordRadarShareAction,
  recordRadarViewAction
} from '@/actions/radar';
import { calculateDistanceKm, formatDistance } from '@/lib/geo-utils';
import { formatViewCount } from '@/lib/utils';
import {
  RadarPermissionState,
  checkRadarLocationPermission,
  requestRadarLocationPermission,
  openDeviceLocationSettings,
  openDeviceAppSettings,
  getRadarAccurateGPS
} from '@/lib/radar-native-location';

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
  authorId?: string | null;
  likes: number;
  hasLiked?: boolean;
  commentsCount?: number;
  resharesCount?: number;
  shareCount?: number;
  viewsCount?: number;
  hasReshared?: boolean;
  latitude: number;
  longitude: number;
  locationName: string;
  link?: string;
  imageUrl?: string;
  isDbPost?: boolean;
  expiresAt?: Date | string | null;
  createdAt?: Date | string | null;
  status?: string;
  confirmationsCount?: number;
  resolvedVotesCount?: number;
  reportsCount?: number;
  isVerified?: boolean;
  hasConfirmedStillHappening?: boolean;
  hasConfirmedResolved?: boolean;
  mediaUrls?: string[];
  isLive?: boolean;
  startedAt?: Date | string | null;
  expectedUntil?: Date | string | null;
  alertType?: string | null;
  urgency?: string;
  isUrgent?: boolean;
}

export function LocalNeighborhoodRadar() {
  const { data: session } = useSession();

  // Radar Comments & Social States
  const [activeCommentRadarPost, setActiveCommentRadarPost] = useState<LocalRadarPost | null>(null);
  const [radarComments, setRadarComments] = useState<any[]>([]);
  const [isLoadingRadarComments, setIsLoadingRadarComments] = useState<boolean>(false);
  const [newRadarComment, setNewRadarComment] = useState<string>('');
  const [isSubmittingRadarComment, setIsSubmittingRadarComment] = useState<boolean>(false);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToAuthorName, setReplyToAuthorName] = useState<string | null>(null);

  // Coordinates default to null until GPS permission & lock or manual area is set
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [userCity, setUserCity] = useState<string>('Detecting Location...');
  const [subLocation, setSubLocation] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(true);
  const [locationSource, setLocationSource] = useState<'gps' | 'manual' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<RadarPermissionState>('LOADING');
  const [showExplanationPrompt, setShowExplanationPrompt] = useState<boolean>(false);
  const [locationTimeout, setLocationTimeout] = useState<boolean>(false);

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
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapPost, setSelectedMapPost] = useState<LocalRadarPost | null>(null);
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
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [hasConfirmedAccuracy, setHasConfirmedAccuracy] = useState<boolean>(false);
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState<boolean>(true);

  // Photos & Videos (up to 5)
  const [alertMedia, setAlertMedia] = useState<Array<{ url: string; isVideo: boolean; duration?: string; publicId?: string }>>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location & Interactive Map Pin
  const [alertPinCoords, setAlertPinCoords] = useState<{ lat: number; lng: number }>({ lat: 19.2565, lng: 73.1329 });
  const [alertLocationName, setAlertLocationName] = useState<string>('Asia, Kalyan');
  const [alertSubLocation, setAlertSubLocation] = useState<string>('Kalyan');
  const [alertRadius, setAlertRadius] = useState<number>(5);

  // Live Status & Expiry Context
  const [isLiveNow, setIsLiveNow] = useState<boolean>(true);
  const [startedAtTime, setStartedAtTime] = useState<string>('Now');
  const [expectedUntilDuration, setExpectedUntilDuration] = useState<string>('unknown'); // '1h' | '3h' | '6h' | '12h' | '24h' | 'unknown'
  const [alertType, setAlertType] = useState<string>('ROAD_BLOCK');

  // Interactive Pin Map refs
  const pinMapContainerRef = useRef<HTMLDivElement>(null);
  const pinMapInstanceRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const pinCircleRef = useRef<any>(null);

  // Community Verification & Expiry States
  const [confirmingPostId, setConfirmingPostId] = useState<string | null>(null);

  // Reporting States
  const [reportingPost, setReportingPost] = useState<LocalRadarPost | null>(null);
  const [reportReason, setReportReason] = useState<string>('INACCURATE');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

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

  // Real data only — no mock posts
  const baseFallbackPosts = useMemo<LocalRadarPost[]>(() => [], []);

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

  // High-accuracy real-time GPS acquisition
  const acquireGPS = useCallback(async (isManualTrigger = false) => {
    setIsGettingLocation(true);
    setLocationTimeout(false);
    setStatusMessage('📍 Detecting your location...');

    // 10-second warning timeout
    const timer = setTimeout(() => {
      setLocationTimeout(true);
    }, 10000);

    try {
      const gps = await getRadarAccurateGPS(12000);
      clearTimeout(timer);
      setLocationTimeout(false);

      const lat = gps.lat;
      const lng = gps.lng;
      const accuracy = gps.accuracy;

      setCoords({ lat, lng });
      setLocationAccuracy(accuracy);
      setLocationSource('gps');
      setPermissionState('GRANTED');
      setShowExplanationPrompt(false);

      const geo = await reverseGeocode(lat, lng);
      setUserCity(geo.fullAddress);
      setSubLocation(geo.sub || geo.city);
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
    } catch (err: any) {
      clearTimeout(timer);
      setIsGettingLocation(false);
      const perm = await checkRadarLocationPermission();
      setPermissionState(perm);
      if (perm === 'GRANTED') {
        setLocationTimeout(true);
        setStatusMessage('GPS signal unavailable. You can retry or choose your area manually.');
      } else if (perm === 'NOT_DETERMINED') {
        setShowExplanationPrompt(true);
      }
    }
  }, [fetchDbRadarPosts, radiusKm]);

  // Alias for backwards compatibility
  const fetchLocation = acquireGPS;

  // Handle User clicking "Allow Location" in Explanation or Permission Card
  const handleAllowLocationClick = async () => {
    setIsGettingLocation(true);
    setShowExplanationPrompt(false);
    try {
      const res = await requestRadarLocationPermission();
      if (res === 'GRANTED') {
        setPermissionState('GRANTED');
        acquireGPS(true);
      } else {
        acquireGPS(true);
      }
    } catch (_) {
      acquireGPS(true);
    }
  };

  // Initial Permission Check & Location Flow + App Resume Listeners
  useEffect(() => {
    let isMounted = true;

    const initLocation = async () => {
      const perm = await checkRadarLocationPermission();
      if (!isMounted) return;
      setPermissionState(perm);

      if (perm === 'GRANTED') {
        acquireGPS(false);
      } else if (perm === 'NOT_DETERMINED') {
        setIsGettingLocation(false);
        setShowExplanationPrompt(true);
      } else {
        // If user already saved a manual area preference, restore it
        const savedLat = localStorage.getItem('tolee_radar_lat');
        const savedLng = localStorage.getItem('tolee_radar_lng');
        const savedCity = localStorage.getItem('tolee_radar_city');
        const savedSource = localStorage.getItem('tolee_radar_source');

        if (savedLat && savedLng && savedCity && savedSource === 'manual') {
          const lat = parseFloat(savedLat);
          const lng = parseFloat(savedLng);
          setCoords({ lat, lng });
          setUserCity(savedCity);
          setLocationSource('manual');
          setIsGettingLocation(false);
          fetchDbRadarPosts(lat, lng, radiusKm);
        } else {
          setIsGettingLocation(false);
        }
      }
    };

    initLocation();
    fetchLiveRadarMarkers();

    // Re-check when app resumes from device settings
    const handleAppResume = async () => {
      const currentPerm = await checkRadarLocationPermission();
      if (!isMounted) return;
      if (currentPerm === 'GRANTED') {
        setPermissionState('GRANTED');
        setShowExplanationPrompt(false);
        acquireGPS(false);
      } else {
        setPermissionState(currentPerm);
      }
    };

    (window as any).onAppResume = handleAppResume;
    window.addEventListener('focus', handleAppResume);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      delete (window as any).onAppResume;
      window.removeEventListener('focus', handleAppResume);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [acquireGPS, fetchLiveRadarMarkers, fetchDbRadarPosts, radiusKm]);

  // Helper to format dynamic post time
  const formatPostedTime = (dateStr?: Date | string | null): string => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 60000) return 'Just now';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Helper to calculate dynamic alert expiry countdown (Rule 1 & Rule 21)
  const formatExpiryCountdown = (
    expiresAt?: Date | string | null,
    createdAt?: Date | string | null,
    category?: string
  ): { text: string; isNearing: boolean; isExpired: boolean } => {
    let expDate = expiresAt ? new Date(expiresAt) : null;
    if (!expDate || isNaN(expDate.getTime())) {
      const created = createdAt ? new Date(createdAt).getTime() : Date.now();
      const defaultDuration = (category === 'food' || category === 'deal' || category === 'news' || category === 'event') ? 72 * 3600 * 1000 : 24 * 3600 * 1000;
      expDate = new Date(created + defaultDuration);
    }

    const diffMs = expDate.getTime() - Date.now();
    if (diffMs <= 0) return { text: 'Expired', isNearing: false, isExpired: true };
    
    const totalMin = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMin / 60);
    const days = Math.floor(totalHours / 24);

    // Nearing expiry if < 6 hours remaining
    const isNearing = totalHours < 6;

    let text = '';
    if (days >= 1) {
      text = `Expiring in ${days} day${days > 1 ? 's' : ''}`;
    } else if (totalHours >= 1) {
      text = `Expiring in ${totalHours} hour${totalHours > 1 ? 's' : ''}`;
    } else {
      const mins = Math.max(1, totalMin % 60);
      text = `Expiring in ${mins} min${mins > 1 ? 's' : ''}`;
    }

    return {
      text,
      isNearing,
      isExpired: false
    };
  };

  // Combine database posts, baseline posts, and live markers
  const allPosts = useMemo<LocalRadarPost[]>(() => {
    if (!coords) return [];
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
        timeAgo: formatPostedTime(post.createdAt),
        isAnonymous: post.isAnonymous,
        author: post.author,
        authorAvatar: post.authorAvatar,
        authorId: post.authorId,
        likes: post.likesCount || 0,
        hasLiked: post.hasLiked || !!likedPostIds[post.id],
        commentsCount: post.commentsCount || 0,
        resharesCount: post.resharesCount || 0,
        shareCount: post.shareCount || 0,
        viewsCount: post.viewsCount || 0,
        hasReshared: post.hasReshared || false,
        latitude: post.latitude,
        longitude: post.longitude,
        locationName: post.locationName,
        link: `/radar/${post.id}`,
        imageUrl: (post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.imageUrl) || (
          post.category === 'alert' ? 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=600&q=80' :
          post.category === 'food' ? 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' :
          post.category === 'news' ? 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80' :
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
        ),
        isDbPost: true,
        expiresAt: post.expiresAt,
        createdAt: post.createdAt,
        status: post.status,
        confirmationsCount: post.confirmationsCount || 0,
        resolvedVotesCount: post.resolvedVotesCount || 0,
        reportsCount: post.reportsCount || 0,
        isVerified: post.isVerified,
        hasConfirmedStillHappening: post.hasConfirmedStillHappening,
        hasConfirmedResolved: post.hasConfirmedResolved,
        mediaUrls: post.mediaUrls || [],
        isLive: post.isLive,
        startedAt: post.startedAt,
        expectedUntil: post.expectedUntil,
        alertType: post.alertType,
        urgency: post.urgency,
        isUrgent: post.isUrgent
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
        link: `/radar/marker-${marker.id}`,
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

  // Open Radar Comments Modal
  const handleOpenComments = async (post: LocalRadarPost) => {
    setActiveCommentRadarPost(post);
    setIsLoadingRadarComments(true);
    setNewRadarComment('');
    setReplyToCommentId(null);
    setReplyToAuthorName(null);
    try {
      const res = await getRadarCommentsAction(post.id);
      if (res.success && Array.isArray(res.comments)) {
        setRadarComments(res.comments);
      } else {
        setRadarComments([]);
      }
    } catch (_) {
      setRadarComments([]);
    } finally {
      setIsLoadingRadarComments(false);
    }
  };

  // Submit Radar Comment
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCommentRadarPost || !newRadarComment.trim() || isSubmittingRadarComment) return;

    if (!session?.user) {
      alert('Please log in to post comments.');
      return;
    }

    setIsSubmittingRadarComment(true);
    try {
      const res = await addRadarCommentAction(
        activeCommentRadarPost.id, 
        newRadarComment.trim(), 
        replyToCommentId || undefined
      );

      if (res.success && res.comment) {
        setNewRadarComment('');
        setReplyToCommentId(null);
        setReplyToAuthorName(null);

        // Refresh comments list
        const updated = await getRadarCommentsAction(activeCommentRadarPost.id);
        if (updated.success && Array.isArray(updated.comments)) {
          setRadarComments(updated.comments);
        }

        // Increment local post commentsCount
        setDbRadarPosts(prev => prev.map(p => {
          if (p.id === activeCommentRadarPost.id) {
            return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
          }
          return p;
        }));
        setActiveCommentRadarPost(prev => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null);
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('[Radar] Error adding comment:', err);
    } finally {
      setIsSubmittingRadarComment(false);
    }
  };

  // Toggle Radar Post Reshare
  const handleToggleReshare = async (post: LocalRadarPost) => {
    if (!session?.user) {
      alert('Please log in to reshare.');
      return;
    }

    try {
      const res = await toggleRadarReshareAction(post.id);
      if (res.success) {
        setDbRadarPosts(prev => prev.map(p => {
          if (p.id !== post.id) return p;
          return {
            ...p,
            hasReshared: res.hasReshared,
            resharesCount: res.resharesCount
          };
        }));
        setStatusMessage(res.hasReshared ? '🔁 Alert reshared to your network!' : 'Reshare removed.');
      } else if (res.error) {
        setStatusMessage(res.error);
      }
    } catch (_) {}
  };

  // Share Radar Post (Native Share or Clipboard)
  const handleShareRadarPost = async (post: LocalRadarPost) => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/radar/${post.id}` : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Tolee Radar: ${post.title}`,
          text: `${post.title} — ${post.locationName}`,
          url: shareUrl
        });
        await recordRadarShareAction(post.id);
        setDbRadarPosts(prev => prev.map(p => p.id === post.id ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p));
        return;
      } catch (_) {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      await recordRadarShareAction(post.id);
      setDbRadarPosts(prev => prev.map(p => p.id === post.id ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p));
      setStatusMessage('Alert link copied to clipboard! 🔗');
    }
  };

  // Handle Community Verification: Still Happening or Resolved (Rule 3, 4, 5)
  const handleConfirmPost = async (post: LocalRadarPost, type: 'STILL_HAPPENING' | 'RESOLVED') => {
    if (confirmingPostId) return;
    setConfirmingPostId(post.id);
    try {
      const res = await confirmRadarPostAction({ postId: post.id, type });
      if (res.success) {
        setStatusMessage(res.message || (type === 'STILL_HAPPENING' ? '✓ Alert confirmed as still happening!' : '✓ Alert marked as resolved.'));
        setDbRadarPosts(prev => prev.map(p => {
          if (p.id !== post.id) return p;
          if (type === 'STILL_HAPPENING') {
            return {
              ...p,
              confirmationsCount: (p.confirmationsCount || 0) + 1,
              hasConfirmedStillHappening: true
            };
          } else {
            return {
              ...p,
              resolvedVotesCount: (p.resolvedVotesCount || 0) + 1,
              hasConfirmedResolved: true,
              status: (res as any).isResolvedNow ? 'RESOLVED' : p.status
            };
          }
        }));
      } else {
        setStatusMessage(res.error || 'Failed to record confirmation.');
      }
    } catch (_) {
      setStatusMessage('Network error while confirming alert.');
    } finally {
      setConfirmingPostId(null);
    }
  };

  // Handle Report Submission (Rule 6, 7, 8)
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPost || isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportRadarPostAction({
        postId: reportingPost.id,
        reason: reportReason,
        details: reportDetails
      });
      if (res.success) {
        setStatusMessage(res.message || 'Report submitted for moderation review.');
        setReportingPost(null);
        setReportDetails('');
      } else {
        alert(res.error || 'Failed to submit report.');
      }
    } catch (_) {
      alert('Network error while reporting alert.');
    } finally {
      setIsSubmittingReport(false);
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

  // Switch to mobile map view, center on post, and highlight it
  const handleViewPostOnMap = (post: LocalRadarPost) => {
    setSelectedMapPost(post);
    setMobileViewMode('map');
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([post.latitude, post.longitude], 15, { animate: true });
        const marker = markerLookupRef.current[post.id];
        if (marker) {
          setTimeout(() => marker.openPopup(), 200);
        }
      }
    }, 150);
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupLeaflet = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || !coords) return;

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

        markerInstance.on('click', () => {
          setSelectedMapPost(post);
        });

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
  }, [coords, allPosts, radiusKm, mapLayers, mapType, userCity, mobileViewMode]);

  // Invalidate and refresh Leaflet map size when switching to map view on mobile
  useEffect(() => {
    if (mobileViewMode === 'map') {
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mobileViewMode]);

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

  // Reverse Geocoding for Interactive Pin Map
  const reverseGeocodePin = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const sub = addr.suburb || addr.neighbourhood || addr.road || addr.residential || '';
        const city = addr.city || addr.town || addr.village || addr.county || 'Local Area';
        const state = addr.state || '';
        const display = [sub, city, state].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAlertLocationName(display);
        setAlertSubLocation(sub || city);
      }
    } catch (_) {
      setAlertLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // Open Drop Alert Modal and sync coordinates & defaults
  const openDropAlertModal = () => {
    const currentLat = coords?.lat || 19.2565;
    const currentLng = coords?.lng || 73.1329;
    setAlertPinCoords({ lat: currentLat, lng: currentLng });
    setAlertLocationName(subLocation || (userCity ? userCity.split(',')[0] : 'Current Location'));
    setAlertSubLocation(subLocation || (userCity ? userCity.split(',')[0] : 'Local Area'));
    setAlertRadius(radiusKm || 5);
    setIsPostingAlert(true);
  };

  // Center pin on current GPS location
  const handleUseCurrentLocationForPin = () => {
    if (!coords) {
      acquireGPS(true);
      return;
    }
    const currentLat = coords.lat;
    const currentLng = coords.lng;
    setAlertPinCoords({ lat: currentLat, lng: currentLng });
    setAlertLocationName(subLocation || (userCity ? userCity.split(',')[0] : 'Current Location'));
    if (pinMapInstanceRef.current) {
      pinMapInstanceRef.current.setView([currentLat, currentLng], 15, { animate: true });
    }
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLatLng([currentLat, currentLng]);
    }
    if (pinCircleRef.current) {
      pinCircleRef.current.setLatLng([currentLat, currentLng]);
    }
    reverseGeocodePin(currentLat, currentLng);
  };

  // Media Upload Handler (Images & Videos up to 5)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (alertMedia.length + files.length > 5) {
      alert('You can upload up to 5 photos or videos maximum.');
      return;
    }

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds the 25MB limit.`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            setAlertMedia(prev => [
              ...prev,
              {
                url: data.url,
                isVideo: file.type.startsWith('video/'),
                publicId: data.publicId
              }
            ]);
          } else {
            alert(data.error || `Failed to upload ${file.name}`);
          }
        } else {
          alert(`Upload error for ${file.name}`);
        }
      }
    } catch (err) {
      console.error('[DropAlert] Upload error:', err);
      alert('An error occurred while uploading media.');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setAlertMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Modal Interactive Pin Map Lifecycle
  useEffect(() => {
    if (!isPostingAlert || typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      const L = (window as any).L;
      if (!L || !pinMapContainerRef.current) return;

      if (pinMapInstanceRef.current) {
        pinMapInstanceRef.current.remove();
        pinMapInstanceRef.current = null;
      }

      const initialLat = alertPinCoords.lat || coords?.lat || 19.2565;
      const initialLng = alertPinCoords.lng || coords?.lng || 73.1329;

      const map = L.map(pinMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([initialLat, initialLng], 15);

      pinMapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom Draggable Pin Icon
      const customPin = L.divIcon({
        className: 'drop-alert-pin',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: grab;">
            <div style="width: 34px; height: 34px; border-radius: 9999px; background: #EF4444; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);">
              📍
            </div>
            <div style="position: absolute; bottom: -3px; width: 7px; height: 7px; background: #EF4444; transform: rotate(45deg);"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 36]
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customPin
      }).addTo(map);
      pinMarkerRef.current = marker;

      const circle = L.circle([initialLat, initialLng], {
        radius: alertRadius * 1000,
        color: '#0E9F9A',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#0E9F9A',
        fillOpacity: 0.1
      }).addTo(map);
      pinCircleRef.current = circle;

      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        setAlertPinCoords({ lat: pos.lat, lng: pos.lng });
        if (circle) circle.setLatLng(pos);
        reverseGeocodePin(pos.lat, pos.lng);
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setAlertPinCoords({ lat, lng });
        marker.setLatLng([lat, lng]);
        if (circle) circle.setLatLng([lat, lng]);
        reverseGeocodePin(lat, lng);
      });

      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (pinMapInstanceRef.current) {
        pinMapInstanceRef.current.remove();
        pinMapInstanceRef.current = null;
      }
    };
  }, [isPostingAlert]);

  // Sync radius circle when user changes alertRadius
  useEffect(() => {
    if (pinCircleRef.current) {
      pinCircleRef.current.setRadius(alertRadius * 1000);
    }
  }, [alertRadius]);

  // Handle Drop New Alert Form Submission
  const handlePostLocalAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertDesc.trim() || !hasConfirmedAccuracy || isSubmittingPost) return;

    setIsSubmittingPost(true);
    try {
      let expectedUntilDate: Date | undefined = undefined;
      const now = Date.now();
      if (expectedUntilDuration === '1h') expectedUntilDate = new Date(now + 1 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '3h') expectedUntilDate = new Date(now + 3 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '6h') expectedUntilDate = new Date(now + 6 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '12h') expectedUntilDate = new Date(now + 12 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '24h') expectedUntilDate = new Date(now + 24 * 60 * 60 * 1000);

      const res = await createRadarPostAction({
        category: alertCategory,
        title: alertTitle.trim(),
        description: alertDesc.trim(),
        latitude: alertPinCoords.lat,
        longitude: alertPinCoords.lng,
        locationName: alertLocationName || alertSubLocation || 'Local Area',
        radiusKm: alertRadius,
        isAnonymous: isAnon,
        isAccurateConfirmed: hasConfirmedAccuracy,
        isLocationConfirmed: hasConfirmedLocation,
        mediaUrls: alertMedia.map(m => m.url),
        isLive: isLiveNow,
        startedAt: isLiveNow ? new Date() : undefined,
        expectedUntil: expectedUntilDate,
        alertType: alertCategory === 'alert' ? alertType : undefined,
        urgency: isUrgent ? 'CRITICAL' : 'NORMAL',
        isUrgent
      });

      if (res.success && res.post) {
        setStatusMessage('🚨 Your Radar alert is live & nearby neighbors are being notified!');
        setAlertTitle('');
        setAlertDesc('');
        setAlertMedia([]);
        setHasConfirmedAccuracy(false);
        setIsPostingAlert(false);
        if (coords) fetchDbRadarPosts(coords.lat, coords.lng, radiusKm);
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
    <div className="w-full space-y-3.5 sm:space-y-5 pb-44 lg:pb-0">
      
      {/* 0. MOBILE-ONLY COMPACT RADAR HEADER (< lg) FIXED ABOVE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-[calc(4.2rem+env(safe-area-inset-bottom)+8px)] left-2.5 right-2.5 sm:left-4 sm:right-4 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Icon + Title + Inline Location & Weather */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-[#0E9F9A] dark:text-teal-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Tolee Radar
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-2xs flex-shrink-0">
                  LIVE
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                <span className="truncate">{subLocation || userCity.split(',')[0] || 'Asia, Kalyan'}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-amber-500 font-semibold flex-shrink-0">
                  <Sun className="w-2.5 h-2.5 text-amber-500" /> 28° C
                </span>
              </div>
            </div>
          </div>

          {/* Right: + Drop Alert & Map / List Toggle (Baju Baju me / Side-by-Side) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => openDropAlertModal()}
              className="bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Drop Alert</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMode = mobileViewMode === 'list' ? 'map' : 'list';
                setMobileViewMode(nextMode);
                if (nextMode === 'map') {
                  setTimeout(() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.invalidateSize();
                    }
                  }, 150);
                }
              }}
              className="bg-white dark:bg-zinc-800 hover:bg-slate-50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1 transition-all active:scale-95"
            >
              {mobileViewMode === 'list' ? (
                <>
                  <span className="text-xs">🗺</span>
                  <span>Map</span>
                </>
              ) : (
                <>
                  <span className="text-xs">☷</span>
                  <span>List</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Compact GPS Row on Mobile */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 truncate">
            {isGettingLocation ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-extrabold uppercase text-[10px]">
                  Detecting Location...
                </span>
              </>
            ) : locationSource === 'gps' && coords ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase text-[10px]">
                  GPS Active
                </span>
                <span>•</span>
                <span className="truncate">{userCity}</span>
                {locationAccuracy && (
                  <span className="text-[9px] text-slate-400 font-semibold flex-shrink-0">
                    (±{Math.round(locationAccuracy)}m)
                  </span>
                )}
              </>
            ) : locationSource === 'manual' && coords ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-blue-600 dark:text-blue-400 font-extrabold uppercase text-[10px]">
                  Manual Area
                </span>
                <span>•</span>
                <span className="truncate">{userCity}</span>
              </>
            ) : permissionState === 'LOCATION_SERVICES_DISABLED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                <span className="text-rose-600 dark:text-rose-400 font-extrabold uppercase text-[10px]">
                  Location Services Off
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-extrabold uppercase text-[10px]">
                  Location Required
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => acquireGPS(true)}
              disabled={isGettingLocation}
              title="Sync GPS Location"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGettingLocation ? 'animate-spin text-[#0E9F9A]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="text-[#0E9F9A] text-[11px] font-bold hover:underline"
            >
              Change Area
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE-ONLY HORIZONTAL CATEGORY BAR (< lg) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'all', label: `All (${counts.total})`, icon: null },
          { id: 'alert', label: 'Alerts', count: counts.alerts, icon: '🚨' },
          { id: 'food', label: 'Food', count: counts.food, icon: '🍔' },
          { id: 'news', label: 'News', count: counts.news, icon: '📰' },
          { id: 'deal', label: 'Deals', count: counts.deals, icon: '🏷️' }
        ].map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                isActive
                  ? 'bg-[#0E9F9A] text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MOBILE-ONLY SORT & FILTER ROW (LIST VIEW ONLY) */}
      {mobileViewMode === 'list' && (
        <div className="lg:hidden flex items-center justify-between gap-2 px-1">
          {/* Sort Selector */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0E9F9A] appearance-none pr-7 cursor-pointer"
            >
              <option value="latest">Sort: Latest</option>
              <option value="nearest">Sort: Nearest</option>
              <option value="top">Sort: Most Useful</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Quick Radius Selector */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = radiusKm === 5 ? 10 : radiusKm === 10 ? 25 : 5;
                setRadiusKm(next);
                if (coords) {
                  fetchDbRadarPosts(coords.lat, coords.lng, next);
                }
              }}
              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 shadow-2xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0E9F9A]" />
              <span>{radiusKm} km</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE-ONLY MAP SEARCH BAR (MAP VIEW ONLY) */}
      {mobileViewMode === 'map' && (
        <div className="lg:hidden flex items-center gap-2">
          <form onSubmit={handleMapSearchSubmit} className="relative flex items-center flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search this area (landmark, locality...)"
              value={mapSearchInput}
              onChange={(e) => setMapSearchInput(e.target.value)}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-3.5 py-2 text-xs font-bold text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0E9F9A]"
            />
          </form>

          <button
            type="button"
            onClick={() => {
              if (coords && mapInstanceRef.current) {
                mapInstanceRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
              }
            }}
            title="Locate Me"
            className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 shadow-2xs flex items-center justify-center flex-shrink-0 hover:text-[#0E9F9A] transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER ROW MATCHING REFERENCE DESIGN (DESKTOP ONLY lg:) */}
      <div className="hidden lg:flex bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        
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
                <span className={`w-2 h-2 rounded-full ${
                  isGettingLocation ? 'bg-amber-500 animate-ping' :
                  locationSource === 'gps' && coords ? 'bg-emerald-500 animate-pulse' :
                  locationSource === 'manual' && coords ? 'bg-blue-500' :
                  permissionState === 'LOCATION_SERVICES_DISABLED' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <span className={`text-[10px] font-black tracking-wider uppercase ${
                  isGettingLocation ? 'text-amber-600 dark:text-amber-400' :
                  locationSource === 'gps' && coords ? 'text-emerald-600 dark:text-emerald-400' :
                  locationSource === 'manual' && coords ? 'text-blue-600 dark:text-blue-400' :
                  permissionState === 'LOCATION_SERVICES_DISABLED' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isGettingLocation ? 'DETECTING LOCATION' :
                   locationSource === 'gps' && coords ? 'GPS ACTIVE' :
                   locationSource === 'manual' && coords ? 'MANUAL AREA' :
                   permissionState === 'LOCATION_SERVICES_DISABLED' ? 'SERVICES OFF' : 'LOCATION REQUIRED'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[130px]">
                {userCity}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                {coords ? `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E${locationAccuracy ? ` • ± ${Math.round(locationAccuracy)} m accuracy` : ''}` : 'Location pending'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => acquireGPS(true)}
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
              isFullscreenMap
                ? 'fixed inset-0 z-50 rounded-none h-screen'
                : mobileViewMode === 'map'
                ? 'block h-[420px] sm:h-[460px] lg:h-[420px]'
                : 'hidden lg:block h-[390px] sm:h-[420px]'
            }`}
          >
            {/* The Actual Leaflet Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Overlay if Location is pending/required */}
            {!coords && (
              <div className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl max-w-sm text-center space-y-3 border border-slate-200 dark:border-zinc-800">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0E9F9A] mx-auto flex items-center justify-center">
                    <LocateFixed className={`w-6 h-6 ${isGettingLocation ? 'animate-spin' : ''}`} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {isGettingLocation ? 'Detecting Location...' : 'Location Required for Map'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {isGettingLocation
                      ? 'Acquiring GPS coordinates to display nearby alerts and radar rings on the map.'
                      : 'Please allow location access or select an area manually to view the radar map.'}
                  </p>
                  {!isGettingLocation && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAllowLocationClick}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0E9F9A] text-white text-xs font-bold shadow-xs hover:bg-[#087A76] transition-colors"
                      >
                        Allow Location
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSearchModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Choose Area
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  if (coords && mapInstanceRef.current) {
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

          {/* MOBILE-ONLY SELECTED POST PREVIEW CARD (MAP VIEW ONLY) */}
          {mobileViewMode === 'map' && (
            <div className="lg:hidden">
              {(() => {
                const activePost = selectedMapPost || filteredPosts[0];
                if (!activePost) return null;
                const isAlert = activePost.category === 'alert';
                const isFood = activePost.category === 'food';
                const isNews = activePost.category === 'news' || activePost.category === 'event';
                return (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3 shadow-2xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="w-18 h-18 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 flex-shrink-0 relative border border-slate-200/60 dark:border-zinc-800">
                      <img
                        src={activePost.imageUrl || 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=300&q=80'}
                        alt={activePost.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isAlert ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                          isFood ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          isNews ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                          'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {activePost.category === 'alert' ? 'ALERT' :
                           activePost.category === 'food' ? 'FOOD' :
                           activePost.category === 'news' ? 'NEWS' : 'DEAL'}
                        </span>
                        {activePost.isLive && (
                          <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            🔴 LIVE
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-[#0E9F9A] ml-auto">
                          📍 {formatDistance(activePost.distanceKm)}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 leading-snug">
                        {activePost.title}
                      </h4>
                      {activePost.description && (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          {activePost.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                        <span>{activePost.timeAgo}</span>
                        <Link
                          href={activePost.link || `/radar/${activePost.id}`}
                          className="text-[#0E9F9A] font-extrabold hover:underline"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* CATEGORY FILTER TABS & SORT ROW (DESKTOP ONLY lg:) */}
          <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            
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
          <div className={`space-y-3 ${mobileViewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
            {/* Informative Manual Area Banner if active */}
            {locationSource === 'manual' && coords && (
              <div className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 shadow-2xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>Live GPS is off. Radar is using your selected area: <strong>{userCity}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => acquireGPS(true)}
                  className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:no-underline flex-shrink-0 ml-2"
                >
                  Turn on Live GPS
                </button>
              </div>
            )}

            {!coords ? (
              // LOCATION INITIALIZATION & PERMISSION STATE CARDS
              isGettingLocation && !locationTimeout ? (
                // 1. Loading state (Requirement 7)
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0E9F9A] mx-auto flex items-center justify-center relative shadow-xs">
                    <div className="absolute inset-0 rounded-2xl border-2 border-[#0E9F9A] border-t-transparent animate-spin" />
                    <LocateFixed className="w-8 h-8 text-[#0E9F9A]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      📍 Detecting your location...
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Scanning for real-time GPS signal to discover live local alerts, food spots, and neighborhood updates around you.
                    </p>
                  </div>
                </div>
              ) : locationTimeout ? (
                // 2. GPS Timeout state (Requirement 19)
                <div className="bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center">
                    <Clock className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Still trying to get your location...
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                      GPS acquisition is taking longer than usual. You can retry or choose your area manually.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => acquireGPS(true)}
                      className="px-4 py-2 rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors"
                    >
                      Choose Area Manually
                    </button>
                  </div>
                </div>
              ) : showExplanationPrompt || permissionState === 'NOT_DETERMINED' ? (
                // 3. First Visit Explanation (Requirement 4 & 25)
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 text-center space-y-5 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0E9F9A] mx-auto flex items-center justify-center shadow-xs">
                    <MapPin className="w-8 h-8 text-[#0E9F9A] animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                      📍 Enable Location for Tolee Radar
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Tolee Radar uses your current location to show:
                    </p>
                    <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 max-w-sm mx-auto text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 space-y-2">
                      <div className="flex items-center gap-2"><span>🚨</span><span>Nearby alerts</span></div>
                      <div className="flex items-center gap-2"><span>📰</span><span>Local news</span></div>
                      <div className="flex items-center gap-2"><span>🍔</span><span>Secret food spots</span></div>
                      <div className="flex items-center gap-2"><span>🏷️</span><span>Nearby deals</span></div>
                      <div className="flex items-center gap-2"><span>👥</span><span>Hyper-local community updates</span></div>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto pt-1">
                      Your location is used to calculate nearby Radar results.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAllowLocationClick}
                      className="px-5 py-2.5 rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black shadow-sm transition-all flex items-center gap-2"
                    >
                      <LocateFixed className="w-4 h-4" />
                      <span>Allow Location</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExplanationPrompt(false);
                        setPermissionState('DENIED');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 text-xs font-bold transition-colors"
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              ) : permissionState === 'LOCATION_SERVICES_DISABLED' ? (
                // 4. Location Services Off (Requirement 10)
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-2xs">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      📍 Location Services Are Off
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                      Turn on Location Services on your device to use Live Radar.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openDeviceLocationSettings()}
                      className="px-5 py-2.5 rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Open Location Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors"
                    >
                      Choose Area Manually
                    </button>
                  </div>
                </div>
              ) : permissionState === 'BLOCKED' ? (
                // 5. Permission Permanently Blocked (Requirement 11)
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-2xs">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      📍 Location Access Is Blocked
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                      Please enable location access for Tolee from your device settings.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openDeviceAppSettings()}
                      className="px-5 py-2.5 rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Open App Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors"
                    >
                      Choose Area Manually
                    </button>
                  </div>
                </div>
              ) : (
                // 6. Permission Denied (Requirement 9)
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-2xs">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center">
                    <MapPinOff className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      📍 Location Permission Required
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                      Tolee Radar needs your location to show updates happening around you.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAllowLocationClick}
                      className="px-5 py-2.5 rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <LocateFixed className="w-4 h-4" />
                      <span>Allow Location</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors"
                    >
                      Choose Area Manually
                    </button>
                  </div>
                </div>
              )
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] mx-auto flex items-center justify-center">
                  <Radar className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                    NO RADAR ACTIVITY NEARBY
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                    There are currently no active updates within your selected radius.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = radiusKm < 10 ? 10 : radiusKm < 25 ? 25 : 50;
                      setRadiusKm(next);
                      if (coords) fetchDbRadarPosts(coords.lat, coords.lng, next);
                    }}
                    className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold px-4 py-2.5 transition-colors shadow-2xs"
                  >
                    Expand Radius ({radiusKm < 10 ? '10 km' : radiusKm < 25 ? '25 km' : '50 km'})
                  </button>
                  <button
                    type="button"
                    onClick={() => openDropAlertModal()}
                    className="rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white text-xs font-extrabold px-4 py-2.5 shadow-sm transition-colors"
                  >
                    Drop Alert
                  </button>
                </div>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isAlert = post.category === 'alert';
                const isFood = post.category === 'food';
                const isNews = post.category === 'news' || post.category === 'event';
                const isDeal = post.category === 'deal' || post.category === 'store';
                const hasLiked = !!likedPostIds[post.id] || post.hasLiked;
                const likeCount = post.likes + (hasLiked && !post.hasLiked ? 1 : 0);
                const expiryInfo = formatExpiryCountdown(post.expiresAt, post.createdAt, post.category);
                const isNearingExpiry = isAlert && expiryInfo.isNearing && !expiryInfo.isExpired;

                return (
                  <React.Fragment key={post.id}>
                    {/* MOBILE COMPACT RADAR CARD (< lg) MATCHING REFERENCE DESIGN */}
                    <div className="lg:hidden bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition-all flex items-start gap-3 group">
                      
                      {/* Left Thumbnail Image */}
                      <Link
                        href={post.link || `/radar/${post.id}`}
                        className="block w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 flex-shrink-0 relative border border-slate-200/60 dark:border-zinc-800 cursor-pointer"
                      >
                        <img
                          src={post.imageUrl || 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=300&q=80'}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {post.mediaUrls && post.mediaUrls.length > 1 && (
                          <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
                            <ImageIcon className="w-2 h-2" />
                            +{post.mediaUrls.length - 1}
                          </div>
                        )}
                      </Link>

                      {/* Right Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        
                        {/* Top: Category Pill + Live Status + Options Menu */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isAlert ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                              isFood ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              isNews ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                              'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}>
                              {post.category === 'alert' ? 'ALERT' :
                               post.category === 'food' ? 'FOOD' :
                               post.category === 'news' ? 'NEWS' : 'DEAL'}
                            </span>

                            {post.isLive && (
                              <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                LIVE NOW
                              </span>
                            )}

                            {post.isUrgent && (
                              <span className="text-[9px] font-black uppercase bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Zap className="w-2 h-2" /> URGENT
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setReportingPost(post)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Post Timing & Expiry Header Row (Above Headline) */}
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 pt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            {post.timeAgo}
                          </span>
                          <span>•</span>
                          <span className={`inline-flex items-center gap-0.5 font-bold ${
                            expiryInfo.isExpired
                              ? 'text-rose-600 dark:text-rose-400'
                              : expiryInfo.isNearing
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#0E9F9A] dark:text-teal-400'
                          }`}>
                            ⏳ {expiryInfo.text}
                          </span>
                        </div>

                        {/* Title */}
                        <Link href={post.link || `/radar/${post.id}`} className="block">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug hover:text-[#0E9F9A] transition-colors line-clamp-2">
                            {post.title}
                          </h4>
                        </Link>

                        {/* Description */}
                        {post.description && (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {post.description}
                          </p>
                        )}

                        {/* Metadata Row */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 pt-0.5 flex-wrap">
                          <span className="font-bold text-[#0E9F9A] dark:text-teal-400 flex items-center gap-0.5">
                            <LocateFixed className="w-2.5 h-2.5" />
                            {formatDistance(post.distanceKm)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            Active on map
                          </span>
                        </div>

                        {/* Social Action Bar (Like, Comment, Reshare, Share, Views) */}
                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5 sm:gap-4">
                              {/* Like */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleLike(post.id, post.isDbPost); }}
                                className={`flex items-center gap-1 text-[11px] font-semibold transition-transform active:scale-125 ${
                                  hasLiked ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-rose-500'
                                }`}
                              >
                                <Heart className={`w-[17px] h-[17px] transition-colors ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                <span>{formatViewCount(likeCount)}</span>
                              </button>

                              {/* Comment */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenComments(post); }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-teal-400 transition-transform active:scale-110"
                              >
                                <MessageCircle className="w-[17px] h-[17px]" />
                                <span>{formatViewCount(post.commentsCount || 0)}</span>
                              </button>

                              {/* Reshare */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleReshare(post); }}
                                className={`flex items-center gap-1 text-[11px] font-semibold transition-transform active:scale-110 ${
                                  post.hasReshared ? 'text-emerald-500 font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-emerald-500'
                                }`}
                              >
                                <Repeat className={`w-[17px] h-[17px] ${post.hasReshared ? 'text-emerald-500' : ''}`} />
                                <span>{formatViewCount(post.resharesCount || 0)}</span>
                              </button>

                              {/* Share (Paper Airplane) */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleShareRadarPost(post); }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-sky-500 transition-transform active:scale-110"
                              >
                                <Send className="w-[17px] h-[17px]" />
                                <span>{formatViewCount(post.shareCount || 0)}</span>
                              </button>
                            </div>

                            {/* Right side: Views + View on Map */}
                            <div className="flex items-center gap-2.5">
                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                                <Eye className="w-3.5 h-3.5" />
                                <span>{formatViewCount(post.viewsCount || 0)}</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleViewPostOnMap(post); }}
                                className="text-[#0E9F9A] dark:text-teal-400 font-bold flex items-center gap-0.5 text-[11px] hover:underline ml-1"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Map</span>
                              </button>
                            </div>
                          </div>

                          {/* View all comments link */}
                          <div
                            className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium hover:underline cursor-pointer pt-1"
                            onClick={(e) => { e.stopPropagation(); handleOpenComments(post); }}
                          >
                            {(post.commentsCount || 0) > 0 
                              ? `View all ${(post.commentsCount || 0).toLocaleString()} comments` 
                              : 'Add a comment...'}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* DESKTOP RADAR CARD (lg:flex) UNCHANGED */}
                    <div
                      className="hidden lg:flex bg-white dark:bg-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex-col sm:flex-row items-start gap-4 group"
                    >
                    {/* Left Thumbnail Image */}
                    <Link
                      href={post.link || `/radar/${post.id}`}
                      className="block w-full sm:w-28 sm:h-28 h-44 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 flex-shrink-0 relative border border-slate-200/60 dark:border-zinc-800 cursor-pointer"
                    >
                      <img
                        src={post.imageUrl || 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?auto=format&fit=crop&w=300&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {post.mediaUrls && post.mediaUrls.length > 1 && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                          <ImageIcon className="w-2.5 h-2.5" />
                          +{post.mediaUrls.length - 1}
                        </div>
                      )}
                    </Link>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0 space-y-1.5 w-full">
                      
                      {/* Badge, Distance & Verification Row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {post.isLive && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            LIVE NOW
                          </span>
                        )}

                        {post.isUrgent && (
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            CRITICAL
                          </span>
                        )}

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

                        {post.alertType && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold">
                            {post.alertType.replace('_', ' ')}
                          </span>
                        )}

                        <span className="text-xs font-bold text-[#0E9F9A] dark:text-teal-400 flex items-center gap-1">
                          <LocateFixed className="w-3 h-3" />
                          {formatDistance(post.distanceKm)} away
                        </span>

                        {/* Verified badge or Community Confirmed badge */}
                        {post.isVerified ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Alert
                          </span>
                        ) : (post.confirmationsCount && post.confirmationsCount >= 3) ? (
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-[#0E9F9A] dark:text-teal-400 text-[10px] font-black uppercase flex items-center gap-1 border border-teal-500/20">
                            ⚡ Community Confirmed ({post.confirmationsCount} neighbors)
                          </span>
                        ) : null}

                        {post.status === 'RESOLVED' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-black uppercase">
                            ✓ Resolved
                          </span>
                        )}
                      </div>

                      {/* Post Timing & Expiry Header Row (Above Headline) */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 pt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {post.timeAgo}
                        </span>
                        <span>•</span>
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          expiryInfo.isExpired
                            ? 'text-rose-600 dark:text-rose-400'
                            : expiryInfo.isNearing
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#0E9F9A] dark:text-teal-400'
                        }`}>
                          ⏳ {expiryInfo.text}
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

                      {/* Author & Timestamp & Expiry Row */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 pt-0.5 flex-wrap">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.author} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-slate-600">
                            👤
                          </div>
                        )}
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">{post.author}</span>
                        <span>•</span>
                        <span>Posted {post.timeAgo}</span>
                        {post.expiresAt && (
                          <>
                            <span>•</span>
                            <span className={`inline-flex items-center gap-1 font-semibold ${expiryInfo.isNearing ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                              <Clock className="w-3 h-3" />
                              {expiryInfo.text}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Age warning prompt banner if alert is nearing expiry */}
                      {isNearingExpiry && post.status !== 'RESOLVED' && (
                        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>This alert is getting old. Is this still happening?</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmPost(post, 'STILL_HAPPENING')}
                              disabled={confirmingPostId === post.id || post.hasConfirmedStillHappening}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                post.hasConfirmedStillHappening 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                              }`}
                            >
                              ✓ Still Happening
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmPost(post, 'RESOLVED')}
                              disabled={confirmingPostId === post.id || post.hasConfirmedResolved}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                post.hasConfirmedResolved 
                                  ? 'bg-slate-700 text-white' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              ✓ Resolved
                            </button>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right Side Buttons: View on Map, Useful, Confirmation & Report */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 self-stretch sm:self-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                      
                      {/* Top Action: View on Map */}
                      <button
                        type="button"
                        onClick={() => panToPostOnMap(post)}
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[#0E9F9A] dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>

                      {/* Community verification buttons on Alert cards */}
                      {isAlert && post.status !== 'RESOLVED' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmPost(post, 'STILL_HAPPENING')}
                            disabled={confirmingPostId === post.id || post.hasConfirmedStillHappening}
                            title="Confirm this alert is still active"
                            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              post.hasConfirmedStillHappening
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Still Happening ({post.confirmationsCount || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmPost(post, 'RESOLVED')}
                            disabled={confirmingPostId === post.id || post.hasConfirmedResolved}
                            title="Vote that this alert has been cleared"
                            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              post.hasConfirmedResolved
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            <span>Resolved ({post.resolvedVotesCount || 0})</span>
                          </button>
                        </div>
                      )}

                      {/* Social Action Bar (Like, Comment, Reshare, Share, Views) */}
                      <div className="pt-2 mt-auto border-t border-slate-100 dark:border-zinc-800/80 w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            {/* Like */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleLike(post.id, post.isDbPost); }}
                              className={`flex items-center gap-1.5 text-xs font-semibold transition-transform active:scale-125 ${
                                hasLiked ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-rose-500'
                              }`}
                            >
                              <Heart className={`w-4 h-4 transition-colors ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span>{formatViewCount(likeCount)}</span>
                            </button>

                            {/* Comment */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenComments(post); }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-teal-400 transition-transform active:scale-110"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{formatViewCount(post.commentsCount || 0)}</span>
                            </button>

                            {/* Reshare */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleReshare(post); }}
                              className={`flex items-center gap-1.5 text-xs font-semibold transition-transform active:scale-110 ${
                                post.hasReshared ? 'text-emerald-500 font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-emerald-500'
                              }`}
                            >
                              <Repeat className={`w-4 h-4 ${post.hasReshared ? 'text-emerald-500' : ''}`} />
                              <span>{formatViewCount(post.resharesCount || 0)}</span>
                            </button>

                            {/* Share */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleShareRadarPost(post); }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-sky-500 transition-transform active:scale-110"
                            >
                              <Send className="w-4 h-4" />
                              <span>{formatViewCount(post.shareCount || 0)}</span>
                            </button>
                          </div>

                          {/* Right: Views & View on Map & Report */}
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-zinc-500">
                              <Eye className="w-4 h-4" />
                              <span>{formatViewCount(post.viewsCount || 0)}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleViewPostOnMap(post); }}
                              className="text-[#0E9F9A] dark:text-teal-400 font-bold flex items-center gap-1 text-xs hover:underline"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>View on Map</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportingPost(post);
                                setReportReason('INACCURATE');
                                setReportDetails('');
                              }}
                              title="Report inaccurate or inappropriate alert"
                              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Report</span>
                            </button>
                          </div>
                        </div>

                        {/* View all comments link */}
                        <div
                          className="text-xs text-slate-400 dark:text-zinc-500 font-medium hover:underline cursor-pointer pt-1.5"
                          onClick={(e) => { e.stopPropagation(); handleOpenComments(post); }}
                        >
                          {(post.commentsCount || 0) > 0 
                            ? `View all ${(post.commentsCount || 0).toLocaleString()} comments` 
                            : 'Add a comment...'}
                        </div>
                      </div>

                    </div>
                  </div>
                </React.Fragment>
              );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (4 Cols): Radar Insights & Controls (DESKTOP ONLY lg:) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">

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
                    if (coords) fetchDbRadarPosts(coords.lat, coords.lng, km);
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
                  onMouseUp={() => { if (coords) fetchDbRadarPosts(coords.lat, coords.lng, customRadiusValue); }}
                  onTouchEnd={() => { if (coords) fetchDbRadarPosts(coords.lat, coords.lng, customRadiusValue); }}
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
            onClick={() => openDropAlertModal()}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0E9F9A] flex items-center justify-center shadow-2xs">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Drop Neighborhood Alert
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] border border-teal-200/50 dark:border-teal-800/50">
                      Live Radar
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Notifying verified neighbors within {alertRadius} km radius • Location-verified alert
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPostingAlert(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Desktop Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
              
              {/* Left Column: Interactive Form */}
              <form onSubmit={handlePostLocalAlert} className="lg:col-span-8 p-5 sm:p-6 space-y-5">
                
                {/* 1. Category Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Select Category
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Choose incident type</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'alert', label: 'Alert', emoji: '🚨', desc: 'Hazards & Traffic', color: 'border-rose-400 text-rose-600 bg-rose-50/70 dark:bg-rose-950/40' },
                      { id: 'food', label: 'Food', emoji: '🍔', desc: 'Local Specials', color: 'border-amber-400 text-amber-600 bg-amber-50/70 dark:bg-amber-950/40' },
                      { id: 'news', label: 'News', emoji: '📰', desc: 'Civic & Notices', color: 'border-blue-400 text-blue-600 bg-blue-50/70 dark:bg-blue-950/40' },
                      { id: 'deal', label: 'Deal', emoji: '🏷️', desc: 'Offers & Discounts', color: 'border-purple-400 text-purple-600 bg-purple-50/70 dark:bg-purple-950/40' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAlertCategory(c.id as any)}
                        className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                          alertCategory === c.id
                            ? `${c.color} ring-2 ring-current shadow-xs`
                            : 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xl mb-1">{c.emoji}</span>
                        <div>
                          <div className="text-xs font-black">{c.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400">{c.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Specific Alert Type Pills (When Category === 'alert') */}
                {alertCategory === 'alert' && (
                  <div className="space-y-1.5 bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80">
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Incident Classification
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { id: 'ROAD_BLOCK', label: '🚧 Road Block' },
                        { id: 'TRAFFIC', label: '🚗 Traffic Jam' },
                        { id: 'ACCIDENT', label: '💥 Accident' },
                        { id: 'WATER_LOGGING', label: '🌊 Water Logging' },
                        { id: 'POWER', label: '⚡ Power Cut' },
                        { id: 'WATER', label: '💧 Water Supply' },
                        { id: 'FIRE', label: '🔥 Fire Hazard' },
                        { id: 'SAFETY', label: '🛡️ Safety/Crime' },
                        { id: 'TRANSPORT', label: '🚌 Transit Delay' },
                        { id: 'ROAD_WORK', label: '🛠️ Road Work' },
                        { id: 'OTHER', label: '📍 General Alert' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAlertType(t.id)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all border ${
                            alertType === t.id
                              ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Headline Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Headline <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">{alertTitle.length}/100</span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Heavy water logging near station subway, vehicles being diverted"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                    required
                  />
                </div>

                {/* 4. Description Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Description / Details <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">{alertDesc.length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Provide specific details, landmark references, recommended detour, or instructions..."
                    value={alertDesc}
                    onChange={(e) => setAlertDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] leading-relaxed"
                    required
                  />
                </div>

                {/* 5. Photos & Videos (Up to 5) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0E9F9A]" />
                      Photos & Videos ({alertMedia.length}/5)
                    </label>
                    <span className="text-[10px] text-slate-400">Optional • Max 25MB each</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaUpload}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    {alertMedia.map((m, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 group flex-shrink-0">
                        {m.isVideo ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                            <Play className="w-6 h-6 text-teal-400" />
                            <span className="text-[9px] font-bold mt-1">Video</span>
                          </div>
                        ) : (
                          <img src={m.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {alertMedia.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#0E9F9A] dark:hover:border-teal-500 bg-slate-50 dark:bg-zinc-800/40 flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-zinc-400 hover:text-[#0E9F9A] transition-colors"
                      >
                        {isUploadingMedia ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#0E9F9A]" />
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Add Media</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 6. Exact Pinned Location (LOCATION MANDATORY) */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Incident Location <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Drag the red pin or tap on the map to pinpoint exact scene
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocationForPin}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E9F9A] hover:text-[#087A76] bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200/50 dark:border-teal-800/50 transition-colors"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      Use My Current GPS
                    </button>
                  </div>

                  {/* Leaflet Pin Map Container */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-2xs">
                    <div ref={pinMapContainerRef} className="w-full h-52 relative z-0" />
                    <div className="absolute top-2.5 left-2.5 z-10 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      Move pin to exact location
                    </div>
                  </div>

                  {/* Location Address & Coordinates Bar */}
                  <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                        {alertLocationName || 'Locating pinned coordinates...'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono font-bold bg-white dark:bg-zinc-700 px-2 py-1 rounded-lg text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-600 flex-shrink-0">
                      {alertPinCoords.lat.toFixed(4)}° N, {alertPinCoords.lng.toFixed(4)}° E
                    </div>
                  </div>

                  {/* Broadcast Radius Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Notification Radius
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 5, 10].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAlertRadius(r)}
                          className={`py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                            alertRadius === r
                              ? 'bg-[#0E9F9A] text-white border-[#0E9F9A] shadow-xs'
                              : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                          }`}
                        >
                          {r} km {r === 5 ? '(Default)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7. Live Status & Strict Expiry Context */}
                <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        Live Now Status
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300">
                        Is this incident actively unfolding right now?
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLiveNow}
                        onChange={(e) => setIsLiveNow(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {/* Expiry Duration Options */}
                  <div className="space-y-1.5 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
                    <label className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                      <span>Expected Duration (Strict Expiry Boundary)</span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">Auto-archives at expiry</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: '1h', label: '1 Hour' },
                        { id: '3h', label: '3 Hours' },
                        { id: '6h', label: '6 Hours' },
                        { id: '12h', label: '12 Hours' },
                        { id: '24h', label: '24h (Max)' },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setExpectedUntilDuration(d.id)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                            expectedUntilDuration === d.id
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-rose-200/60 dark:border-zinc-700 hover:border-rose-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 pt-1">
                      Rule: Live Now ≠ Active Forever. Alerts strictly expire after 24 hours max to eliminate stale rumors.
                    </p>
                  </div>
                </div>

                {/* 8. Anonymous & Urgent Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-[#0E9F9A]" />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Gupt Khabar</div>
                        <div className="text-[10px] text-slate-500">Post anonymously</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAnon}
                      onChange={(e) => setIsAnon(e.target.checked)}
                      className="rounded text-[#0E9F9A] focus:ring-[#0E9F9A] w-4 h-4 accent-[#0E9F9A]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-rose-500" />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Urgent Alert</div>
                        <div className="text-[10px] text-slate-500">High priority push</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 accent-rose-600"
                    />
                  </label>
                </div>

                {/* 9. Accuracy Confirmation Checkbox (Rule 10) */}
                <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-3.5">
                  <label className="flex items-start gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasConfirmedAccuracy}
                      onChange={(e) => setHasConfirmedAccuracy(e.target.checked)}
                      className="mt-0.5 rounded text-[#0E9F9A] focus:ring-[#0E9F9A] w-4 h-4 accent-[#0E9F9A] flex-shrink-0"
                      required
                    />
                    <span className="leading-snug">
                      I confirm this information is accurate and verified at this location. False or panic-inducing alerts may result in immediate account strikes and posting restrictions.
                    </span>
                  </label>
                </div>

                {/* 10. Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPostingAlert(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingPost || !alertTitle.trim() || !alertDesc.trim() || !hasConfirmedAccuracy}
                    className="rounded-xl bg-[#0E9F9A] hover:bg-[#087A76] text-white font-black text-xs px-6 py-2.5 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Notifying {alertRadius} km Radius...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Drop Alert to Radar</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

              {/* Right Column: Key Features & Rules (Desktop Only) */}
              <div className="hidden lg:block lg:col-span-4 bg-slate-50 dark:bg-zinc-800/40 p-6 border-l border-slate-200 dark:border-zinc-800 space-y-5">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                  <ShieldAlert className="w-4 h-4 text-[#0E9F9A]" />
                  <span>Drop Alert Key Features & Rules</span>
                </div>

                <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  <div className="flex items-start gap-2.5 bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs">
                    <div className="p-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Location Mandatory</span>
                      Every alert requires an exact physical pin. Physical alerts without location are rejected.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs">
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Live Now ≠ Active Forever</span>
                      Alerts auto-expire within max 24 hours to prevent stale rumors and keep feed real-time.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs">
                    <div className="p-1 rounded-md bg-teal-500/10 text-[#0E9F9A] dark:text-teal-400 mt-0.5 flex-shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Community Verification</span>
                      Neighbors confirm "Still Happening" or "Resolved" to keep live status 100% verified.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs">
                    <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0">
                      <EyeOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Gupt Khabar (Anonymous)</span>
                      Report civic issues or hazards with your identity completely protected.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs">
                    <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                      <Radio className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Hyper-Local Broadcast</span>
                      Dispatched directly to devices located within your chosen {alertRadius} km radius.
                    </div>
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2">
                    Live Feed Preview
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-500 text-white flex items-center gap-1">
                        {alertCategory.toUpperCase()}
                      </span>
                      {isLiveNow && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          🔴 LIVE
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-600 text-white flex items-center gap-0.5">
                          <Zap className="w-2 h-2" /> URGENT
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-[#0E9F9A] ml-auto">
                        {alertRadius} km radius
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {alertTitle || 'Your alert headline preview...'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                      {alertDesc || 'Alert description and details will appear here...'}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#0E9F9A]" />
                      <span className="truncate">{alertLocationName}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

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

      {/* 5. MODAL: REPORT RADAR ALERT (Rules 6, 7, 8) */}
      {reportingPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Report Radar Alert
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[240px]">
                    {reportingPost.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReportingPost(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Reason for reporting
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'INACCURATE', label: 'Inaccurate or Outdated Information' },
                    { id: 'SPAM', label: 'Spam, Advertising or Promotion' },
                    { id: 'HARASSMENT', label: 'Abusive or Inappropriate Content' },
                    { id: 'MISLEADING', label: 'Fake or Fabricated Alert' },
                    { id: 'OTHER', label: 'Other Issue' },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        reportReason === r.id
                          ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                          : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.id}
                        checked={reportReason === r.id}
                        onChange={() => setReportReason(r.id)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context to help moderators verify this..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReportingPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: RADAR COMMENTS */}
      {activeCommentRadarPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#0E9F9A] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Comments
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[260px] sm:max-w-[340px]">
                    {activeCommentRadarPost.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCommentRadarPost(null);
                  setRadarComments([]);
                  setReplyToCommentId(null);
                  setReplyToAuthorName(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {isLoadingRadarComments ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E9F9A]" />
                  <span className="text-xs">Loading comments...</span>
                </div>
              ) : radarComments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-zinc-500 space-y-2">
                  <MessageCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-700 stroke-1" />
                  <p className="text-xs font-semibold">No comments yet</p>
                  <p className="text-[11px]">Be the first to share an update or question about this alert!</p>
                </div>
              ) : (
                radarComments.map((c: any) => (
                  <div key={c.id} className="space-y-2 group">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 mt-0.5 border border-slate-200 dark:border-zinc-700">
                        <img
                          src={c.author?.avatar || '/default-user-avatar.svg'}
                          alt={c.author?.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-2.5 border border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {c.author?.username ? `@${c.author.username}` : c.author?.name || 'Neighbor'}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatPostedTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 ml-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToCommentId(c.id);
                              setReplyToAuthorName(c.author?.username || c.author?.name || 'Neighbor');
                            }}
                            className="font-bold text-slate-500 dark:text-zinc-400 hover:text-[#0E9F9A] dark:hover:text-teal-400 transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="pl-9 space-y-2 border-l-2 border-slate-100 dark:border-zinc-800 ml-3.5">
                        {c.replies.map((reply: any) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 mt-0.5 border border-slate-200 dark:border-zinc-700">
                              <img
                                src={reply.author?.avatar || '/default-user-avatar.svg'}
                                alt={reply.author?.name || 'User'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 bg-slate-50 dark:bg-zinc-800/40 rounded-xl p-2 border border-slate-100 dark:border-zinc-800/60">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                  {reply.author?.username ? `@${reply.author.username}` : reply.author?.name || 'Neighbor'}
                                </span>
                                <span className="text-[9px] text-slate-400 shrink-0">
                                  {formatPostedTime(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Comment Input */}
            <div className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              {replyToCommentId && (
                <div className="flex items-center justify-between text-[11px] bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-lg mb-2 text-slate-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1">
                    <CornerDownRight className="w-3 h-3 text-[#0E9F9A]" />
                    <span>Replying to <span className="font-bold text-[#0E9F9A]">@{replyToAuthorName}</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToCommentId(null);
                      setReplyToAuthorName(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={replyToCommentId ? `Reply to @${replyToAuthorName}...` : "Write a comment..."}
                  value={newRadarComment}
                  onChange={(e) => setNewRadarComment(e.target.value)}
                  className="flex-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                />
                <button
                  type="submit"
                  disabled={!newRadarComment.trim() || isSubmittingRadarComment}
                  className="p-2.5 rounded-2xl bg-[#0E9F9A] hover:bg-[#0c8a86] text-white disabled:opacity-40 transition-colors shrink-0 shadow-sm"
                >
                  {isSubmittingRadarComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
