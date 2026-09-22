'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type * as React from 'react';
import { 
  MapPin, Search, Loader2, Navigation, 
  RotateCcw, Sliders, ChevronDown, ChevronUp, AlertCircle, Info, Check
} from 'lucide-react';

export interface SelectedLocationData {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

interface GoogleMapLocationSelectorProps {
  initialLocation?: Partial<SelectedLocationData> | null;
  onLocationChange: (location: SelectedLocationData) => void;
  radiusKm: number;
  onRadiusChange: (newRadius: number) => void;
}

declare const process: any;

declare global {
  interface Window {
    google?: any;
    initGoogleMapsCallback?: () => void;
  }
}

export function GoogleMapLocationSelector({
  initialLocation,
  onLocationChange,
  radiusKm,
  onRadiusChange,
}: GoogleMapLocationSelectorProps) {
  // Search query & suggestion states
  const [query, setQuery] = useState(initialLocation?.name || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Active confirmed location (Default to Kalyan West if none provided)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationData>({
    placeId: initialLocation?.placeId || 'default_kalyan_west',
    name: initialLocation?.name || 'Kalyan West',
    formattedAddress: initialLocation?.formattedAddress || 'Kalyan West, Maharashtra, India',
    lat: initialLocation?.lat || 19.2437,
    lng: initialLocation?.lng || 73.1355,
    radiusKm: radiusKm || 10,
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Map DOM and Google Maps instances
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const circleInstanceRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load Google Maps Script
  useEffect(() => {
    const apiKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : undefined;

    if (window.google?.maps) {
      setIsMapLoaded(true);
      return;
    }

    if (!apiKey) {
      // Graceful fallback mode if API key not injected
      setMapError(false);
      setIsMapLoaded(false);
      return;
    }

    const scriptId = 'google-maps-js-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMapsCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setMapError(true);
      };

      window.initGoogleMapsCallback = () => {
        setIsMapLoaded(true);
      };

      document.head.appendChild(script);
    } else {
      setIsMapLoaded(true);
    }
  }, []);

  // Initialize or re-center Google Map
  useEffect(() => {
    if (!isMapLoaded || !window.google?.maps || !mapContainerRef.current) return;

    try {
      const google = window.google;
      const center = { lat: selectedLocation.lat, lng: selectedLocation.lng };

      if (!mapInstanceRef.current) {
        // Create new Map instance
        const map = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: getOptimalZoom(radiusKm),
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });
        mapInstanceRef.current = map;

        // Custom Marker
        const marker = new google.maps.Marker({
          position: center,
          map,
          title: selectedLocation.name,
          animation: google.maps.Animation.DROP,
        });
        markerInstanceRef.current = marker;

        // Radius Circle
        const circle = new google.maps.Circle({
          strokeColor: '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.18,
          map,
          center,
          radius: radiusKm * 1000, // in meters
        });
        circleInstanceRef.current = circle;
      } else {
        // Update existing instances
        const map = mapInstanceRef.current;
        map.setCenter(center);
        map.setZoom(getOptimalZoom(radiusKm));

        if (markerInstanceRef.current) {
          markerInstanceRef.current.setPosition(center);
          markerInstanceRef.current.setTitle(selectedLocation.name);
        }

        if (circleInstanceRef.current) {
          circleInstanceRef.current.setCenter(center);
          circleInstanceRef.current.setRadius(radiusKm * 1000);
        }
      }
    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      setMapError(true);
    }
  }, [isMapLoaded, selectedLocation.lat, selectedLocation.lng]);

  // Update circle radius when radius slider changes
  useEffect(() => {
    if (circleInstanceRef.current) {
      circleInstanceRef.current.setRadius(radiusKm * 1000);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(getOptimalZoom(radiusKm));
    }
  }, [radiusKm]);

  // Optimal zoom level calculation for radius in km
  function getOptimalZoom(km: number): number {
    if (km <= 2) return 14;
    if (km <= 5) return 13;
    if (km <= 10) return 12;
    if (km <= 25) return 11;
    if (km <= 50) return 10;
    return 9;
  }

  // Debounced search for places
  const handleSearchInput = (val: string) => {
    setQuery(val);
    setErrorMsg(null);
    setSelectedIndex(-1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length === 0) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setDropdownOpen(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/maps/places?action=autocomplete&input=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.predictions)) {
          setSuggestions(data.predictions);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to fetch location suggestions:', err);
        setErrorMsg('Location search is temporarily unavailable. Please try again.');
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  // Keyboard navigation inside suggestions list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  // Handle selection of a confirmed suggestion
  const handleSelectSuggestion = async (item: any) => {
    setDropdownOpen(false);
    setSearching(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/maps/places?action=details&place_id=${encodeURIComponent(item.placeId)}`);
      const data = await res.json();

      if (data.success && data.place) {
        const p = data.place;
        const newLocation: SelectedLocationData = {
          placeId: p.placeId,
          name: p.name || item.mainText,
          formattedAddress: p.formattedAddress || item.description,
          lat: p.lat,
          lng: p.lng,
          radiusKm,
        };

        setSelectedLocation(newLocation);
        setQuery(newLocation.name);
        onLocationChange(newLocation);
      } else {
        setErrorMsg('Unable to retrieve location details. Please choose another location.');
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      setErrorMsg('Network error while retrieving location details.');
    } finally {
      setSearching(false);
    }
  };

  // Clear or refocus to change location
  const handleChangeLocationClick = () => {
    setQuery('');
    setSuggestions([]);
    setDropdownOpen(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* 1. LOCATION SEARCH BOX */}
      <div>
        <label className="text-xs font-bold text-zinc-900 dark:text-white block mb-1">
          Where do you want to show your ads?
        </label>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
          Target customers in your specific city, neighborhood, or around your store.
        </p>

        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search city, area, locality, or address"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
            />
            {searching && (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 pointer-events-none" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in duration-100">
              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => (
                  <div
                    key={item.placeId || idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`p-3 cursor-pointer flex items-start gap-2.5 text-xs transition-colors ${
                      selectedIndex === idx
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{item.mainText}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.secondaryText || item.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                !searching && (
                  <div className="p-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No matching locations found. Try typing a major city or district.
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 2. GOOGLE MAP / INTERACTIVE MAP PREVIEW */}
      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-950 shadow-xs">
        {/* Real Google Maps Container */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-52 sm:h-60 transition-opacity duration-300 ${
            isMapLoaded && !mapError ? 'opacity-100' : 'hidden'
          }`} 
        />

        {/* High-Fidelity Interactive Map Fallback (Active when Google Maps API key is not present or offline) */}
        {(!isMapLoaded || mapError) && (
          <div className="relative w-full h-52 sm:h-60 bg-gradient-to-br from-blue-950/20 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
            {/* Map Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Simulated Geographic Road Network Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <path d="M -50 40 Q 150 120 400 90 T 800 150" stroke="#60a5fa" strokeWidth="2" fill="none" />
              <path d="M 120 -20 Q 160 140 240 300" stroke="#93c5fd" strokeWidth="1.5" fill="none" />
              <path d="M 0 180 Q 220 160 450 250" stroke="#60a5fa" strokeWidth="1" fill="none" />
            </svg>

            {/* Dynamic Targeting Radius Circle */}
            <div 
              className="relative flex items-center justify-center transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(220, Math.max(70, radiusKm * 2.2))}px`,
                height: `${Math.min(220, Math.max(70, radiusKm * 2.2))}px`,
              }}
            >
              {/* Outer Pulse */}
              <div className="absolute inset-0 rounded-full bg-blue-500/15 border-2 border-blue-500/80 animate-pulse" />
              
              {/* Radius Distance Badge on Circle Rim */}
              <span className="absolute -top-3 px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white shadow-md">
                {radiusKm} km radius
              </span>

              {/* Center Pin Marker */}
              <div className="relative z-10 flex flex-col items-center -mt-4">
                <div className="p-2 rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-500/30 animate-bounce">
                  <MapPin className="w-4 h-4 fill-white" />
                </div>
                <div className="w-2 h-1 bg-black/40 rounded-full blur-[1px] mt-0.5" />
              </div>
            </div>

            {/* Map Header Status Overlay */}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 backdrop-blur-md text-zinc-300 border border-zinc-700/60 font-semibold shadow-xs flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-blue-400" />
                Targeting Center: {selectedLocation.name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-600/90 text-white font-bold text-[10px]">
                LIVE RADAR
              </span>
            </div>
          </div>
        )}

        {/* Quick Map Controls Badge */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <span className="px-2 py-1 rounded-md bg-zinc-900/80 backdrop-blur-md text-white text-[10px] font-mono border border-zinc-700/50 shadow-xs">
            {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
          </span>
        </div>
      </div>

      {/* 3. SELECTED LOCATION INFORMATION */}
      <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 shrink-0">
            <MapPin className="w-4 h-4 fill-blue-600/20" />
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              {selectedLocation.name}
            </h5>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {selectedLocation.formattedAddress}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleChangeLocationClick}
          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
        >
          Change
        </button>
      </div>

      {/* Optional Technical Details Toggle */}
      <div className="text-right">
        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 inline-flex items-center gap-1"
        >
          <span>{showTechDetails ? 'Hide GPS Coordinates' : 'Show GPS Coordinates'}</span>
          {showTechDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showTechDetails && (
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <div><span className="font-bold text-zinc-500">Latitude:</span> {selectedLocation.lat}</div>
          <div><span className="font-bold text-zinc-500">Longitude:</span> {selectedLocation.lng}</div>
          <div className="col-span-2 truncate"><span className="font-bold text-zinc-500">Place ID:</span> {selectedLocation.placeId}</div>
        </div>
      )}

      {/* 4. RADIUS SLIDER */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            How far from this location should your ads reach?
          </label>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-2xs">
            {radiusKm} km
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={radiusKm}
          onChange={(e) => {
            const val = Number(e.target.value);
            onRadiusChange(val);
            setSelectedLocation((prev) => ({ ...prev, radiusKm: val }));
          }}
          className="w-full accent-blue-600 cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
          <span>1 km (Local Street)</span>
          <span>25 km (City Wide)</span>
          <span>100 km (Regional Hub)</span>
        </div>
      </div>

      {/* 5. TARGETING COVERAGE SUMMARY */}
      <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Target Area:
          </span>
          <span className="font-extrabold text-zinc-900 dark:text-white truncate max-w-[200px]">
            {selectedLocation.name} (+{radiusKm} km radius)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            Est. Geographic Coverage:
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            ~{Math.round(Math.PI * radiusKm * radiusKm).toLocaleString('en-IN')} km²
          </span>
        </div>
      </div>
    </div>
  );
}
