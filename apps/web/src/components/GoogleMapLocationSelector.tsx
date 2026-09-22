'use client';

import { useState, useEffect, useRef } from 'react';
import type * as React from 'react';
import { 
  MapPin, Search, Loader2, Navigation, 
  RotateCcw, Sliders, ChevronDown, ChevronUp, AlertCircle, Plus, Minus
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

declare global {
  interface Window {
    L?: any;
  }
}

export function GoogleMapLocationSelector({
  initialLocation,
  onLocationChange,
  radiusKm,
  onRadiusChange,
}: GoogleMapLocationSelectorProps) {
  // Search query & suggestion states
  const [query, setQuery] = useState(initialLocation?.name || 'Kalyan West');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Active confirmed location (Default to Kalyan West if none provided)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationData>({
    placeId: initialLocation?.placeId || 'loc_kalyan_west',
    name: initialLocation?.name || 'Kalyan West',
    formattedAddress: initialLocation?.formattedAddress || 'Kalyan West, Maharashtra, India',
    lat: initialLocation?.lat || 19.2437,
    lng: initialLocation?.lng || 73.1355,
    radiusKm: radiusKm || 10,
  });

  const [isMapReady, setIsMapReady] = useState(false);

  // Map DOM and Leaflet instances (matching Tolee Live Map page: /app/map/page.tsx)
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const circleInstanceRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load Leaflet CSS & JS (same as /app/map/page.tsx)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      initGoogleTilesMap();
      return;
    }

    // 1. Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Load Leaflet Script
    if (!document.getElementById('leaflet-script')) {
      const script = document.createElement('script');
      script.id = 'leaflet-script';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        initGoogleTilesMap();
      };
      document.body.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkInterval);
          initGoogleTilesMap();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // Initialize Map with Google Street Tiles (Exact tile layer as Tolee live map page)
  const initGoogleTilesMap = () => {
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const lat = selectedLocation.lat;
      const lng = selectedLocation.lng;

      // Create map container
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      }).setView([lat, lng], 13);

      mapInstanceRef.current = map;

      // Add Official Google Maps Tile Layer (used across Tolee Map page)
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      // Custom Tolee Location Pin
      const customPin = L.divIcon({
        className: 'tolee-custom-map-pin',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #2563eb; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.6); border: 2.5px solid white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(1px); margin-top: 1px;"></div>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 42]
      });

      const marker = L.marker([lat, lng], { icon: customPin }).addTo(map);
      markerInstanceRef.current = marker;

      // Radius Targeting Circle
      const circle = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#2563eb',
        weight: 2.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.22,
      }).addTo(map);
      circleInstanceRef.current = circle;

      // Fit bounds to display circle with nice padding
      map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 15 });

      setIsMapReady(true);
    } catch (err) {
      console.error('Error initializing Google tiles map:', err);
    }
  };

  // Re-center map and update overlays when selectedLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    const circle = circleInstanceRef.current;

    if (!map || !marker || !circle) {
      if (window.L && mapContainerRef.current && !mapInstanceRef.current) {
        initGoogleTilesMap();
      }
      return;
    }

    const latlng = [selectedLocation.lat, selectedLocation.lng];
    marker.setLatLng(latlng);
    circle.setLatLng(latlng);
    circle.setRadius(radiusKm * 1000);
    map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 15 });
  }, [selectedLocation.lat, selectedLocation.lng]);

  // Update circle radius dynamically when slider changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circle = circleInstanceRef.current;

    if (circle) {
      circle.setRadius(radiusKm * 1000);
      if (map) {
        map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 15 });
      }
    }
  }, [radiusKm]);

  // Recenter button click
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    const circle = circleInstanceRef.current;
    if (map && circle) {
      map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 15 });
    }
  };

  // Zoom In / Out handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Debounced search for places (World & Indian cities)
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
    }, 200);
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
      // If item already contains lat/lng from backend autocomplete
      if (item.lat !== undefined && item.lng !== undefined) {
        const newLocation: SelectedLocationData = {
          placeId: item.placeId,
          name: item.mainText,
          formattedAddress: item.secondaryText || item.description || item.mainText,
          lat: item.lat,
          lng: item.lng,
          radiusKm,
        };

        setSelectedLocation(newLocation);
        setQuery(newLocation.name);
        onLocationChange(newLocation);
        setSearching(false);
        return;
      }

      // Fetch place details
      const res = await fetch(`/api/maps/places?action=details&place_id=${encodeURIComponent(item.placeId)}&name=${encodeURIComponent(item.mainText)}&address=${encodeURIComponent(item.description || item.secondaryText || '')}`);
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
                    No matching locations found. Try searching another city or locality.
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

      {/* 2. GOOGLE MAPS PREVIEW (Exact Google Vector Street Tiles from /app/map/page.tsx) */}
      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-950 shadow-xs">
        {/* Leaflet Google Map Container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-56 sm:h-64 z-0"
        />

        {/* Top Header Overlay: Center Location Badge */}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 backdrop-blur-md text-white border border-zinc-700/60 font-semibold shadow-xs flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-blue-400" />
            Center: {selectedLocation.name}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] shadow-xs">
            GOOGLE MAPS
          </span>
        </div>

        {/* Floating Map Zoom & Recenter Controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Recenter Map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GPS Coordinates Overlay */}
        <div className="absolute bottom-2.5 left-2.5 pointer-events-none z-10">
          <span className="px-2 py-1 rounded-md bg-zinc-900/85 backdrop-blur-md text-white text-[10px] font-mono border border-zinc-700/50 shadow-xs">
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
