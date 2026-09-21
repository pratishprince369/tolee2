'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  MapPin,
  LocateFixed,
  Clock,
  Calendar,
  Zap,
  Radio,
  ShieldCheck,
  EyeOff,
  Plus,
  Play,
  ImageIcon,
  Loader2,
  Send,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { createRadarPostAction } from '@/actions/radar';
import { getRadarAccurateGPS } from '@/lib/radar-native-location';

export interface DropAlertWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCity: string;
  subLocation: string;
  coords: { lat: number; lng: number } | null;
  defaultRadius?: number;
  onSuccess: (newPost?: any) => void;
  onStatusMessage?: (msg: string) => void;
  acquireGPS?: (isManualTrigger?: boolean) => Promise<void>;
}

// Categories matching existing Radar schema
export const RADAR_CATEGORIES = [
  {
    id: 'alert',
    label: 'Alert',
    emoji: '🚨',
    desc: 'Hazards & Traffic',
    color: 'border-rose-400 text-rose-600 bg-rose-50/70 dark:bg-rose-950/40',
    activeRing: 'ring-rose-500'
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍔',
    desc: 'Local Specials',
    color: 'border-amber-400 text-amber-600 bg-amber-50/70 dark:bg-amber-950/40',
    activeRing: 'ring-amber-500'
  },
  {
    id: 'news',
    label: 'News',
    emoji: '📰',
    desc: 'Civic & Notices',
    color: 'border-blue-400 text-blue-600 bg-blue-50/70 dark:bg-blue-950/40',
    activeRing: 'ring-blue-500'
  },
  {
    id: 'deal',
    label: 'Deal',
    emoji: '🏷️',
    desc: 'Offers & Discounts',
    color: 'border-purple-400 text-purple-600 bg-purple-50/70 dark:bg-purple-950/40',
    activeRing: 'ring-purple-500'
  },
  {
    id: 'event',
    label: 'Event',
    emoji: '🗓️',
    desc: 'Launch & Openings',
    color: 'border-emerald-400 text-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40',
    activeRing: 'ring-emerald-500'
  }
] as const;

// Incident sub-types when category === 'alert'
export const INCIDENT_CLASSIFICATIONS = [
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
];

export function DropAlertWizardModal({
  isOpen,
  onClose,
  userCity,
  subLocation,
  coords,
  defaultRadius = 5,
  onSuccess,
  onStatusMessage,
  acquireGPS
}: DropAlertWizardModalProps) {
  // Wizard Step Management
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // Form Fields
  const [alertCategory, setAlertCategory] = useState<'alert' | 'food' | 'news' | 'deal' | 'event'>('alert');
  const [alertType, setAlertType] = useState<string>('ROAD_BLOCK');
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertDesc, setAlertDesc] = useState<string>('');

  // Media (up to 5)
  const [alertMedia, setAlertMedia] = useState<Array<{ url: string; isVideo: boolean; duration?: string; publicId?: string }>>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location & Map Pin
  const [alertPinCoords, setAlertPinCoords] = useState<{ lat: number; lng: number }>({
    lat: coords?.lat || 19.2565,
    lng: coords?.lng || 73.1329
  });
  const [alertLocationName, setAlertLocationName] = useState<string>(subLocation || userCity || 'Asia, Kalyan');
  const [alertSubLocation, setAlertSubLocation] = useState<string>(subLocation || 'Kalyan');
  const [alertRadius, setAlertRadius] = useState<number>(defaultRadius || 5);
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);

  // Leaflet Map Refs
  const pinMapContainerRef = useRef<HTMLDivElement>(null);
  const pinMapInstanceRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const pinCircleRef = useRef<any>(null);

  // Conditional Scheduling (for Events / Launch)
  const [alertScheduledDate, setAlertScheduledDate] = useState<string>('');
  const [alertScheduledTime, setAlertScheduledTime] = useState<string>('');

  // Additional Options
  const [isLiveNow, setIsLiveNow] = useState<boolean>(true);
  const [expectedUntilDuration, setExpectedUntilDuration] = useState<string>('unknown'); // '1h' | '3h' | '6h' | '12h' | '24h' | 'unknown'
  const [isAnon, setIsAnon] = useState<boolean>(true);
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [hasConfirmedAccuracy, setHasConfirmedAccuracy] = useState<boolean>(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset or Sync ONLY when modal transitions from closed to open
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCurrentStepIndex(0);
      setStepError(null);
      const initialLat = coords?.lat || 19.2565;
      const initialLng = coords?.lng || 73.1329;
      setAlertPinCoords({ lat: initialLat, lng: initialLng });
      setAlertLocationName(subLocation || (userCity ? userCity.split(',')[0] : 'Current Location'));
      setAlertSubLocation(subLocation || 'Local Area');
      setAlertRadius(defaultRadius || 5);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Compute dynamic steps based on alertCategory
  // Live alerts / Incidents do not require scheduling. Events do.
  const isScheduledCategory = alertCategory === 'event';

  const wizardSteps = useMemo(() => {
    const steps = [
      { key: 'category', title: 'Alert Category', subtitle: 'Choose the incident or update type' },
      { key: 'headline', title: 'Alert Headline', subtitle: 'Short, clear and catchy title' },
      { key: 'description', title: 'Add Details', subtitle: 'Context, landmarks, instructions' },
      { key: 'media', title: 'Photos & Videos', subtitle: 'Add visual evidence (optional)' },
      { key: 'location', title: 'Incident Location', subtitle: 'Pinpoint exact scene on the map' },
      { key: 'radius', title: 'Notification Radius', subtitle: 'Select neighbor broadcast zone' }
    ];

    if (isScheduledCategory) {
      steps.push({
        key: 'schedule',
        title: 'Alert Schedule',
        subtitle: 'Select opening date and start time'
      });
    }

    steps.push({
      key: 'options',
      title: 'Additional Options',
      subtitle: 'Live status, privacy and confirmation'
    });

    steps.push({
      key: 'review',
      title: 'Review & Publish',
      subtitle: 'Verify information before broadcast'
    });

    return steps;
  }, [isScheduledCategory]);

  const activeStep = wizardSteps[currentStepIndex] || wizardSteps[0];
  const isLastStep = currentStepIndex === wizardSteps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Reverse Geocoding Helper
  const reverseGeocodePin = useCallback(async (lat: number, lng: number) => {
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
        setAlertLocationName(fullAddress);
        setAlertSubLocation(sub || city);
      }
    } catch (_) {}
  }, []);

  // Leaflet Map Initialization on Location Step
  useEffect(() => {
    if (!isOpen || activeStep.key !== 'location' || typeof window === 'undefined') return;

    let timer: NodeJS.Timeout;

    const initMap = () => {
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
        attributionControl: false,
        maxZoom: 20
      }).setView([initialLat, initialLng], 15);

      pinMapInstanceRef.current = map;

      // Google Maps Tile Layer
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      // Custom Draggable Pin Icon
      const customPin = L.divIcon({
        className: 'drop-alert-pin',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: grab;">
            <div style="width: 36px; height: 36px; border-radius: 9999px; background: #EF4444; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);">
              📍
            </div>
            <div style="position: absolute; bottom: -3px; width: 8px; height: 8px; background: #EF4444; transform: rotate(45deg);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 38]
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
        fillOpacity: 0.12
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

      // Crucial: Invalidate size after modal render
      timer = setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);
    };

    // Load leaflet scripts if window.L is not available yet
    if (!(window as any).L) {
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
        document.body.appendChild(script);
      }
    } else {
      initMap();
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pinMapInstanceRef.current) {
        pinMapInstanceRef.current.remove();
        pinMapInstanceRef.current = null;
      }
    };
  }, [isOpen, activeStep.key]);

  // Sync radius circle on radius step or change
  useEffect(() => {
    if (pinCircleRef.current) {
      pinCircleRef.current.setRadius(alertRadius * 1000);
    }
  }, [alertRadius]);

  // Center pin on current GPS
  const handleUseCurrentGPS = async () => {
    setIsLocatingGPS(true);
    try {
      let targetLat = coords?.lat;
      let targetLng = coords?.lng;

      try {
        const gps = await getRadarAccurateGPS(8000);
        if (gps && gps.lat && gps.lng) {
          targetLat = gps.lat;
          targetLng = gps.lng;
        }
      } catch (_) {}

      if (acquireGPS) {
        acquireGPS(true).catch(() => {});
      }

      if (targetLat && targetLng) {
        setAlertPinCoords({ lat: targetLat, lng: targetLng });
        if (pinMapInstanceRef.current) {
          pinMapInstanceRef.current.setView([targetLat, targetLng], 15, { animate: true });
        }
        if (pinMarkerRef.current) {
          pinMarkerRef.current.setLatLng([targetLat, targetLng]);
        }
        if (pinCircleRef.current) {
          pinCircleRef.current.setLatLng([targetLat, targetLng]);
        }
        await reverseGeocodePin(targetLat, targetLng);
      }
    } catch (_) {
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Upload Media Files
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (alertMedia.length + files.length > 5) {
      setStepError('You can upload up to 5 photos or videos maximum.');
      return;
    }

    setStepError(null);
    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          setStepError(`File "${file.name}" exceeds the 25MB limit.`);
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
            setAlertMedia((prev) => [
              ...prev,
              {
                url: data.url,
                isVideo: file.type.startsWith('video/'),
                publicId: data.publicId
              }
            ]);
          } else {
            setStepError(data.error || `Failed to upload ${file.name}`);
          }
        } else {
          setStepError(`Upload error for ${file.name}`);
        }
      }
    } catch (err) {
      console.error('[DropAlert] Upload error:', err);
      setStepError('An error occurred while uploading media.');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setAlertMedia((prev) => prev.filter((_, i) => i !== index));
  };

  // Step Validation before progressing
  const validateCurrentStep = (): boolean => {
    setStepError(null);

    switch (activeStep.key) {
      case 'category':
        if (!alertCategory) {
          setStepError('Please select an alert category to continue.');
          return false;
        }
        return true;

      case 'headline':
        if (!alertTitle.trim()) {
          setStepError('Please enter a clear headline for your alert.');
          return false;
        }
        if (alertTitle.trim().length > 100) {
          setStepError('Headline must be 100 characters or less.');
          return false;
        }
        return true;

      case 'description':
        if (!alertDesc.trim()) {
          setStepError('Please enter details or instructions for this alert.');
          return false;
        }
        if (alertDesc.trim().length > 500) {
          setStepError('Description must be 500 characters or less.');
          return false;
        }
        return true;

      case 'media':
        // Media is optional, always valid
        return true;

      case 'location':
        if (!alertPinCoords.lat || !alertPinCoords.lng) {
          setStepError('Please choose an exact physical location on the map.');
          return false;
        }
        return true;

      case 'radius':
        if (!alertRadius || alertRadius <= 0) {
          setStepError('Please select a valid notification radius.');
          return false;
        }
        return true;

      case 'schedule':
        if (isScheduledCategory && !alertScheduledDate) {
          setStepError('Please select the date for this upcoming event or launch.');
          return false;
        }
        return true;

      case 'options':
        if (!hasConfirmedAccuracy) {
          setStepError('You must confirm that this alert is accurate and verified at this location.');
          return false;
        }
        return true;

      case 'review':
        return true;

      default:
        return true;
    }
  };

  // Step Navigation
  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStepError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const jumpToStepByKey = (stepKey: string) => {
    const idx = wizardSteps.findIndex((s) => s.key === stepKey);
    if (idx !== -1) {
      setStepError(null);
      setCurrentStepIndex(idx);
    }
  };

  // Final Publish Handler
  const handlePublishAlert = async () => {
    if (!validateCurrentStep()) return;
    if (!hasConfirmedAccuracy) {
      setStepError('Please confirm the accuracy verification checkbox.');
      return;
    }

    setIsSubmitting(true);
    setStepError(null);

    try {
      let expectedUntilDate: Date | undefined = undefined;
      const now = Date.now();
      if (expectedUntilDuration === '1h') expectedUntilDate = new Date(now + 1 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '3h') expectedUntilDate = new Date(now + 3 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '6h') expectedUntilDate = new Date(now + 6 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '12h') expectedUntilDate = new Date(now + 12 * 60 * 60 * 1000);
      else if (expectedUntilDuration === '24h') expectedUntilDate = new Date(now + 24 * 60 * 60 * 1000);

      // Scheduled date & time composite
      let scheduledForDate: Date | undefined = undefined;
      if (alertScheduledDate) {
        if (alertScheduledTime) {
          scheduledForDate = new Date(`${alertScheduledDate}T${alertScheduledTime}:00`);
        } else {
          scheduledForDate = new Date(alertScheduledDate);
        }
      }

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
        isLocationConfirmed: true,
        mediaUrls: alertMedia.map((m) => m.url),
        isLive: isLiveNow,
        startedAt: isLiveNow ? new Date() : undefined,
        expectedUntil: expectedUntilDate,
        alertType: alertCategory === 'alert' ? alertType : undefined,
        urgency: isUrgent ? 'CRITICAL' : 'NORMAL',
        isUrgent,
        scheduledFor: scheduledForDate
      });

      if (res.success && res.post) {
        if (onStatusMessage) {
          onStatusMessage(`🚨 Alert published! Nearby verified neighbors within ${alertRadius} km are being notified.`);
        }
        onSuccess(res.post);
        onClose();
      } else {
        setStepError(res.error || 'Failed to publish alert. Please try again.');
      }
    } catch (err) {
      console.error('[DropAlert] Publish error:', err);
      setStepError('Network error while publishing alert. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategoryConfig = RADAR_CATEGORIES.find((c) => c.id === alertCategory) || RADAR_CATEGORIES[0];
  const progressPercent = Math.round(((currentStepIndex + 1) / wizardSteps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-hidden select-none">
      <div className="bg-white dark:bg-[#121212] rounded-none sm:rounded-3xl border-none sm:border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Ambient Pastel Mint / Teal Accent */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-teal-50 dark:bg-teal-950/20 blur-3xl pointer-events-none -z-10" />

        {/* Modal Header Bar with Step Progress */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/80 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isFirstStep ? onClose : handleBack}
              className="p-1.5 -ml-1 rounded-full text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isFirstStep ? 'Close' : 'Back'}
            >
              {isFirstStep ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5 stroke-[2.5]" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {activeStep.title}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-[#0E9F9A] border border-teal-200/50 dark:border-teal-800/50">
                  Step {currentStepIndex + 1} of {wizardSteps.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {activeStep.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Visual Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-zinc-800/60 h-1 shrink-0">
          <div
            className="bg-gradient-to-r from-[#0E9F9A] to-teal-400 h-1 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col justify-start">
          
          {/* Validation Error Alert Banner */}
          {stepError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{stepError}</span>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION */}
          {activeStep.key === 'category' && (
            <div className="space-y-4 max-w-2xl mx-auto w-full">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {RADAR_CATEGORIES.map((c) => {
                  const isSelected = alertCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setAlertCategory(c.id as any);
                        setStepError(null);
                      }}
                      className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? `${c.color} ${c.activeRing} ring-2 ring-offset-1 dark:ring-offset-zinc-900 shadow-sm`
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl mb-2">{c.emoji}</span>
                      <div>
                        <div className="text-sm font-black">{c.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">
                          {c.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Classification when Category === 'alert' */}
              {alertCategory === 'alert' && (
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-2.5 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Incident Classification
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INCIDENT_CLASSIFICATIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAlertType(t.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border cursor-pointer ${
                          alertType === t.id
                            ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: HEADLINE */}
          {activeStep.key === 'headline' && (
            <div className="space-y-3 max-w-xl mx-auto w-full my-auto py-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Enter Alert Headline <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-bold ${alertTitle.length > 90 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {alertTitle.length}/100
                </span>
              </div>
              <input
                type="text"
                autoFocus
                maxLength={100}
                placeholder="e.g. Heavy water logging near station subway, vehicles being diverted"
                value={alertTitle}
                onChange={(e) => {
                  setAlertTitle(e.target.value);
                  if (stepError) setStepError(null);
                }}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] shadow-2xs"
              />
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Be specific and concise so nearby residents instantly understand what happened.
              </p>
            </div>
          )}

          {/* STEP 3: DESCRIPTION */}
          {activeStep.key === 'description' && (
            <div className="space-y-3 max-w-xl mx-auto w-full my-auto py-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Details & Instructions <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-bold ${alertDesc.length > 450 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {alertDesc.length}/500
                </span>
              </div>
              <textarea
                autoFocus
                rows={5}
                maxLength={500}
                placeholder="Provide specific details, landmark references, recommended detour, or instructions..."
                value={alertDesc}
                onChange={(e) => {
                  setAlertDesc(e.target.value);
                  if (stepError) setStepError(null);
                }}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] leading-relaxed resize-none shadow-2xs"
              />
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Landmarks, expected delays, alternative routes, or helpline numbers are highly helpful.
              </p>
            </div>
          )}

          {/* STEP 4: PHOTOS & VIDEOS */}
          {activeStep.key === 'media' && (
            <div className="space-y-4 max-w-xl mx-auto w-full my-auto py-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0E9F9A]" />
                  Photos & Videos ({alertMedia.length}/5)
                </label>
                <span className="text-[11px] text-slate-400">Optional • Max 25MB each</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleMediaUpload}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {alertMedia.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 shadow-2xs group"
                  >
                    {m.isVideo ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                        <Play className="w-7 h-7 text-teal-400" />
                        <span className="text-[9px] font-bold mt-1">Video</span>
                      </div>
                    ) : (
                      <img src={m.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="Remove"
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
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#0E9F9A] dark:hover:border-teal-500 bg-slate-50 dark:bg-zinc-800/40 flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-zinc-400 hover:text-[#0E9F9A] transition-colors cursor-pointer"
                  >
                    {isUploadingMedia ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#0E9F9A]" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6" />
                        <span className="text-[11px] font-bold">Add Media</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl text-center">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Visual proof increases community trust and speeds up verification.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: INCIDENT LOCATION & GPS */}
          {activeStep.key === 'location' && (
            <div className="space-y-3 max-w-2xl mx-auto w-full">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    Incident Location <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Drag the red pin or tap on the map to pinpoint exact scene
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  disabled={isLocatingGPS}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E9F9A] hover:text-[#087A76] bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200/50 dark:border-teal-800/50 transition-colors active:scale-95 cursor-pointer"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGPS ? 'Detecting GPS...' : 'Use My Current GPS'}</span>
                </button>
              </div>

              {/* Interactive Leaflet Map Container */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-2xs">
                <div ref={pinMapContainerRef} className="w-full h-64 sm:h-72 relative z-0" />
                <div className="absolute top-2.5 left-2.5 z-10 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Move pin to exact location
                </div>
              </div>

              {/* Pinned Address Bar */}
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
            </div>
          )}

          {/* STEP 6: NOTIFICATION RADIUS */}
          {activeStep.key === 'radius' && (
            <div className="space-y-4 max-w-xl mx-auto w-full my-auto py-4">
              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block mb-1">
                  Notification Broadcast Radius
                </label>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Choose how far around this incident neighbors should receive real-time push alerts.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { r: 1, label: '1 km', desc: 'Immediate Street' },
                  { r: 3, label: '3 km', desc: 'Neighborhood' },
                  { r: 5, label: '5 km', desc: 'Town / Sector (Default)' },
                  { r: 10, label: '10 km', desc: 'Wider City' }
                ].map(({ r, label, desc }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAlertRadius(r)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] cursor-pointer ${
                      alertRadius === r
                        ? 'border-[#0E9F9A] bg-teal-50/60 dark:bg-teal-950/40 text-[#0E9F9A] shadow-xs'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-base font-black">{label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200/50 dark:border-teal-800/40 flex items-center gap-3">
                <Radio className="w-5 h-5 text-[#0E9F9A] flex-shrink-0" />
                <p className="text-xs text-[#0E9F9A] font-medium leading-relaxed">
                  Verified neighbors residing within <strong>{alertRadius} km</strong> will get this alert in their live radar and notifications.
                </p>
              </div>
            </div>
          )}

          {/* STEP 7 (CONDITIONAL): SCHEDULE DATE & TIME (FOR EVENTS / LAUNCH) */}
          {activeStep.key === 'schedule' && isScheduledCategory && (
            <div className="space-y-4 max-w-xl mx-auto w-full my-auto py-4">
              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block mb-1">
                  Event / Launch Date & Time
                </label>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Neighbors will see this under "Upcoming Events" on Radar so they can plan ahead.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Select Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={alertScheduledDate}
                    onChange={(e) => {
                      setAlertScheduledDate(e.target.value);
                      if (stepError) setStepError(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={alertScheduledTime}
                    onChange={(e) => setAlertScheduledTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-900/40">
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  🗓️ Scheduled alerts are highlighted in the Radar calendar and automatically pinned when the event date arrives.
                </p>
              </div>
            </div>
          )}

          {/* STEP 8: ADDITIONAL OPTIONS */}
          {activeStep.key === 'options' && (
            <div className="space-y-4 max-w-xl mx-auto w-full my-auto py-2">
              {/* Live Now & Strict Expiry */}
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

                {/* Expiry Duration */}
                <div className="space-y-1.5 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
                  <label className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                    <span>Expected Duration (Auto-archives at expiry)</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400">Rule: Max 24h</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: '1h', label: '1 Hour' },
                      { id: '3h', label: '3 Hours' },
                      { id: '6h', label: '6 Hours' },
                      { id: '12h', label: '12 Hours' },
                      { id: '24h', label: '24h (Max)' }
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setExpectedUntilDuration(d.id)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          expectedUntilDuration === d.id
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-rose-200/60 dark:border-zinc-700 hover:border-rose-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gupt Khabar & Urgent Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 cursor-pointer">
                  <div className="flex items-center gap-2.5">
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

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 cursor-pointer">
                  <div className="flex items-center gap-2.5">
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

              {/* Accuracy Confirmation Checkbox */}
              <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4">
                <label className="flex items-start gap-3 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConfirmedAccuracy}
                    onChange={(e) => {
                      setHasConfirmedAccuracy(e.target.checked);
                      if (stepError) setStepError(null);
                    }}
                    className="mt-0.5 rounded text-[#0E9F9A] focus:ring-[#0E9F9A] w-4 h-4 accent-[#0E9F9A] flex-shrink-0"
                  />
                  <span className="leading-relaxed">
                    I confirm this information is accurate and verified at this location. False or panic-inducing alerts may result in account strikes.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 9: FINAL REVIEW */}
          {activeStep.key === 'review' && (
            <div className="space-y-4 max-w-xl mx-auto w-full my-auto py-2">
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-900 shadow-xs space-y-3.5">
                {/* Header Pills */}
                <div className="flex items-center gap-2 flex-wrap justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-500 text-white flex items-center gap-1">
                      {currentCategoryConfig.emoji} {currentCategoryConfig.label.toUpperCase()}
                    </span>
                    {alertCategory === 'alert' && alertType && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {alertType}
                      </span>
                    )}
                    {isLiveNow && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                        🔴 LIVE
                      </span>
                    )}
                    {isUrgent && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-600 text-white flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> URGENT
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => jumpToStepByKey('category')}
                    className="text-[11px] font-bold text-[#0E9F9A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                </div>

                {/* Headline & Description */}
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {alertTitle}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {alertDesc}
                  </p>
                </div>

                {/* Media Thumbnails if any */}
                {alertMedia.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {alertMedia.map((m, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 flex-shrink-0 bg-black">
                        {m.isVideo ? (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs">
                            <Play className="w-5 h-5 text-teal-400" />
                          </div>
                        ) : (
                          <img src={m.url} alt="Media" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Location & Radius Details */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold block">Incident Scene</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 truncate block mt-0.5">
                      {alertLocationName}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold block">Broadcast Radius</span>
                    <span className="font-bold text-[#0E9F9A] block mt-0.5">
                      {alertRadius} km radius
                    </span>
                  </div>
                </div>

                {/* Scheduled Info if applicable */}
                {isScheduledCategory && alertScheduledDate && (
                  <div className="bg-blue-50/60 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/50 dark:border-blue-900/40 text-xs flex items-center justify-between">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold">
                      🗓️ Scheduled for: <strong>{alertScheduledDate}</strong> {alertScheduledTime ? `at ${alertScheduledTime}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => jumpToStepByKey('schedule')}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Identity Note */}
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0E9F9A]" />
                  <span>
                    {isAnon ? 'Posting anonymously as Gupt Khabar' : 'Posting with verified profile identity'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Sticky Navigation Bar */}
        <div className="p-4 sm:p-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-20">
          <button
            type="button"
            onClick={isFirstStep ? onClose : handleBack}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-full border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isFirstStep ? 'Cancel' : 'Back'}
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handlePublishAlert}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-8 py-3.5 rounded-full bg-gradient-to-r from-[#0E9F9A] to-teal-500 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Broadcasting Alert...</span>
                </>
              ) : (
                <>
                  <span>Publish Now</span>
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={isUploadingMedia}
              className="flex-1 sm:flex-initial px-8 py-3 rounded-full bg-[#0E9F9A] hover:bg-[#087A76] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
