'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Map, MapPin, Compass, ArrowLeft, RefreshCw, ShoppingBag, Globe, Video, Users, HelpCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MapMarker {
  id: string;
  type: string; // 'marketplace' | 'website' | 'restaurant' | 'store' | 'blog' | 'meetup' | 'live_chat' | 'trending_reel';
  name: string;
  description: string;
  image: string | null;
  latitude: number;
  longitude: number;
  locationText: string;
  link: string;
}

export default function InteractiveMapPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  // 1. Fetch map markers from API
  const fetchMarkers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/map-markers');
      const data = await res.json();
      if (data.success && data.markers) {
        setMarkers(data.markers);
        return data.markers;
      }
    } catch (error) {
      console.error('Failed to fetch map markers:', error);
    } finally {
      setLoading(false);
    }
    return [];
  };

  useEffect(() => {
    // 2. Load Leaflet script and stylesheet from CDN dynamically
    if (leafletLoadedRef.current) return;

    // Check if stylesheet is already added
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Append script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      leafletLoadedRef.current = true;
      initMap();
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initMap = async () => {
    const freshMarkers = await fetchMarkers();
    const L = (window as any).L;
    if (!L) return;

    // Default focus: Mumbai BKC region (where our mock markers cluster)
    const defaultLat = 19.0760;
    const defaultLng = 72.8777;

    // Initialize map
    const map = L.map('tolee-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 12);

    mapInstanceRef.current = map;

    // Add Dark Mode Map Tiles (CartoDB Voyager Dark)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // Render Zoom Control at bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Render markers on map
    renderMarkers(L, map, freshMarkers);
  };

  const renderMarkers = (L: any, map: any, markerList: MapMarker[]) => {
    markerList.forEach((marker) => {
      // Define colors and icons based on type
      let markerColor = '#ec4899'; // default pink
      let iconHtml = '📍';

      if (marker.type === 'marketplace') {
        markerColor = '#f97316'; // Orange
        iconHtml = '🛍️';
      } else if (['store', 'restaurant', 'website'].includes(marker.type)) {
        markerColor = '#06b6d4'; // Teal/Blue
        iconHtml = '🌐';
      } else if (marker.type === 'meetup') {
        markerColor = '#10b981'; // Green
        iconHtml = '👥';
      } else if (marker.type === 'live_chat') {
        markerColor = '#ef4444'; // Pulsing Red
        iconHtml = '📞';
      } else if (marker.type === 'trending_reel') {
        markerColor = '#d946ef'; // Purple
        iconHtml = '🎥';
      }

      // Premium glowing HTML marker template
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            position: relative;
            width: 42px;
            height: 42px;
            background-color: #18181b;
            border: 2px solid ${markerColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px ${markerColor}66, inset 0 0 6px ${markerColor}33;
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="marker-bubble">
            <span style="font-size: 18px;">${iconHtml}</span>
            ${marker.type === 'live_chat' ? `
              <div style="
                position: absolute;
                top: -3px;
                right: -3px;
                width: 12px;
                height: 12px;
                background-color: #ef4444;
                border-radius: 50%;
                border: 2px solid #18181b;
                animation: pulse-ring 1.5s infinite;
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
      });

      const mapMarker = L.marker([marker.latitude, marker.longitude], { icon: customIcon }).addTo(map);

      // Trigger card popup on marker click
      mapMarker.on('click', () => {
        setActiveMarker(marker);
        map.panTo([marker.latitude, marker.longitude]);
      });
    });
  };

  const flyToMarker = (marker: MapMarker) => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;
    setActiveMarker(marker);
    mapInstanceRef.current.setView([marker.latitude, marker.longitude], 14, {
      animate: true,
      duration: 1.2
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09090b] text-white font-sans select-none">
      {/* Map Container Element */}
      <div id="tolee-map" className="w-full h-full z-0"></div>

      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-50 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-black/60 border border-white/10 backdrop-blur-md rounded-xl shadow-lg flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">Tolee World Map</h1>
              <p className="text-[10px] text-gray-400">Hyperlocal Social Discovery</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={fetchMarkers}
            className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors shadow-lg active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {session?.user && (
            <Avatar className="w-10 h-10 border border-white/10 shadow-lg">
              <AvatarImage src={(session.user as any).avatar || session.user.image} />
              <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">ME</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {/* Sidebar - Hotspots & Discovery List (Hidden on narrow mobile unless toggled, elegant list) */}
      <div className="absolute left-4 top-20 bottom-4 w-80 bg-black/60 border border-white/10 backdrop-blur-lg rounded-2xl p-4 flex flex-col gap-4 z-10 shadow-2xl pointer-events-auto overflow-hidden hidden md:flex">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-emerald-400" /> Near You
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
            {markers.length} spots
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            Locating nearby hotspots...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin">
            {markers.map((marker) => {
              // Icon mapping
              let markerIcon = <Globe className="w-4 h-4 text-cyan-400" />;
              if (marker.type === 'marketplace') markerIcon = <ShoppingBag className="w-4 h-4 text-orange-400" />;
              else if (marker.type === 'meetup') markerIcon = <Users className="w-4 h-4 text-emerald-400" />;
              else if (marker.type === 'live_chat') markerIcon = <Video className="w-4 h-4 text-red-500" />;
              else if (marker.type === 'trending_reel') markerIcon = <Video className="w-4 h-4 text-fuchsia-400" />;

              return (
                <div
                  key={marker.id}
                  onClick={() => flyToMarker(marker)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    activeMarker?.id === marker.id
                      ? 'bg-white/10 border-white/20 shadow-lg'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                    {markerIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{marker.name}</h3>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{marker.locationText}</p>
                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-1">{marker.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Card Details (Shows when a marker is clicked/active) */}
      {activeMarker && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] sm:w-[420px] bg-zinc-950/80 border border-white/10 backdrop-blur-xl rounded-2xl p-4 z-50 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in animate-slide-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                {activeMarker.type.replace('_', ' ')}
              </span>
              <h2 className="text-sm font-black text-white mt-1.5 truncate">{activeMarker.name}</h2>
              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{activeMarker.locationText}</span>
              </p>
            </div>
            {activeMarker.image && (
              <img 
                src={activeMarker.image} 
                alt={activeMarker.name}
                className="w-16 h-16 rounded-xl object-cover border border-white/15 bg-zinc-900 shrink-0 shadow-md"
              />
            )}
          </div>

          <p className="text-[11px] text-zinc-350 leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/5">
            {activeMarker.description}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => setActiveMarker(null)}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors text-xs font-bold"
            >
              Close Map Info
            </button>
            <Link href={activeMarker.link} className="flex-1">
              <button 
                className="w-full py-2 rounded-xl text-white text-xs font-extrabold shadow-md hover:brightness-105 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                Enter Spot 🚀
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Global CSS for pulsing keys & Leaflet marker overrides */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .marker-bubble:hover {
          transform: scale(1.1);
        }
        .leaflet-container {
          background-color: #09090b !important;
        }
        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
