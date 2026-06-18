'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Map, MapPin, Compass, ArrowLeft, RefreshCw, ShoppingBag, Globe, Video, Users } from 'lucide-react';
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
    if (leafletLoadedRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet Script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      leafletLoadedRef.current = true;
      initMap();
    };
    document.body.appendChild(script);

    // Global listener for Leaflet popup routing clicks (Fast Next.js client-side navigation)
    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('.popup-link') as HTMLAnchorElement;
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          router.push(href);
        }
      }
    };
    document.addEventListener('click', handlePopupClick);

    return () => {
      document.removeEventListener('click', handlePopupClick);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Custom styled popup content markup string generator
  const getPopupContent = (marker: MapMarker) => {
    const typeLabel = marker.type.replace('_', ' ');
    const imageHtml = marker.image 
      ? `<img src="${marker.image}" style="width: 50px; height: 50px; border-radius: 10px; object-cover; border: 1px solid #e4e4e7; margin-top: 4px;" />` 
      : '';
      
    return `
      <div class="p-1" style="font-family: inherit; width: 230px;">
        <div style="display: flex; justify-content: space-between; gap: 8px; align-items: start;">
          <div style="flex: 1; min-width: 0;">
            <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #065f46; background-color: #d1fae5; padding: 2px 8px; border-radius: 9999px; display: inline-block;">
              ${typeLabel}
            </span>
            <h3 style="font-size: 13px; font-weight: 800; color: #09090b; margin: 6px 0 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${marker.name}
            </h3>
            <p style="font-size: 10px; color: #71717a; margin: 0; display: flex; align-items: center; gap: 4px;">
              📍 <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; width: 130px;">${marker.locationText}</span>
            </p>
          </div>
          ${imageHtml}
        </div>
        
        <p style="font-size: 11px; color: #3f3f46; line-height: 1.4; background-color: #f4f4f5; padding: 8px; border-radius: 8px; border: 1px solid #e4e4e7; margin: 10px 0 8px 0; max-height: 80px; overflow-y: auto;">
          ${marker.description}
        </p>
        
        <div style="margin-top: 8px;">
          <a href="${marker.link}" class="popup-link" style="display: block; text-align: center; padding: 8px 0; border-radius: 10px; background: linear-gradient(135deg, #059669, #10b981); color: white; font-size: 11px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); transition: all 0.2s;">
            Enter Spot 🚀
          </a>
        </div>
      </div>
    `;
  };

  const initMap = async () => {
    const freshMarkers = await fetchMarkers();
    const L = (window as any).L;
    if (!L) return;

    // Exact coordinates & zoom from reference image: Kalyan, Khadakpada (19.2579124, 73.1231582)
    const defaultLat = 19.2579124;
    const defaultLng = 73.1231582;
    const defaultZoom = 15;

    // Initialize map
    const map = L.map('tolee-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], defaultZoom);

    mapInstanceRef.current = map;

    // Add Light Theme Map Tiles matching Google Maps vector aesthetic (CartoDB Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Listen to popup events to highlight sidebar items dynamically
    map.on('popupopen', (e: any) => {
      const latlng = e.popup.getLatLng();
      if (latlng) {
        const matched = freshMarkers.find(
          (m: MapMarker) =>
            Math.abs(m.latitude - latlng.lat) < 0.0001 &&
            Math.abs(m.longitude - latlng.lng) < 0.0001
        );
        if (matched) {
          setActiveMarker(matched);
        }
      }
    });

    map.on('popupclose', () => {
      setActiveMarker(null);
    });

    // Render markers on map
    renderMarkers(L, map, freshMarkers);
  };

  const renderMarkers = (L: any, map: any, markerList: MapMarker[]) => {
    markerList.forEach((marker) => {
      let markerColor = '#ec4899'; // Pink
      let iconHtml = '📍';

      if (marker.type === 'marketplace') {
        markerColor = '#f97316'; // Orange
        iconHtml = '🛍️';
      } else if (['store', 'restaurant', 'website'].includes(marker.type)) {
        markerColor = '#06b6d4'; // Teal
        iconHtml = '🌐';
      } else if (marker.type === 'meetup') {
        markerColor = '#10b981'; // Green
        iconHtml = '👥';
      } else if (marker.type === 'live_chat') {
        markerColor = '#ef4444'; // Red
        iconHtml = '📞';
      } else if (marker.type === 'trending_reel') {
        markerColor = '#d946ef'; // Purple
        iconHtml = '🎥';
      }

      // Premium glowing light HTML marker bubble
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            position: relative;
            width: 42px;
            height: 42px;
            background-color: #ffffff;
            border: 2px solid ${markerColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 0 8px ${markerColor}44;
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
                border: 2px solid #ffffff;
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

      // Bind the custom premium glassmorphic popup
      mapMarker.bindPopup(getPopupContent(marker), {
        maxWidth: 280,
        className: 'premium-leaflet-popup'
      });

      mapMarker.on('click', () => {
        map.panTo([marker.latitude, marker.longitude]);
      });
    });
  };

  const flyToMarker = (marker: MapMarker) => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;
    setActiveMarker(marker);
    
    mapInstanceRef.current.setView([marker.latitude, marker.longitude], 16, {
      animate: true,
      duration: 1.2
    });

    // Programmatically trigger map popup above icon
    L.popup({
      maxWidth: 280,
      className: 'premium-leaflet-popup',
      offset: [0, -32]
    })
    .setLatLng([marker.latitude, marker.longitude])
    .setContent(getPopupContent(marker))
    .openOn(mapInstanceRef.current);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f4f4f5] text-zinc-900 font-sans select-none">
      {/* Map Container */}
      <div id="tolee-map" className="w-full h-full z-0"></div>

      {/* Floating Header (Light Glassmorphic) */}
      <div className="absolute top-4 left-4 right-4 z-50 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/80 border border-zinc-200/50 backdrop-blur-md flex items-center justify-center text-zinc-800 hover:bg-white transition-colors shadow-md active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-white/80 border border-zinc-200/50 backdrop-blur-md rounded-xl shadow-md flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600 animate-spin-slow" />
            <div>
              <h1 className="text-sm font-black tracking-tight text-zinc-900">Tolee World Map</h1>
              <p className="text-[10px] text-zinc-500 font-medium">Hyperlocal Social Discovery</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={fetchMarkers}
            className="w-10 h-10 rounded-xl bg-white/80 border border-zinc-200/50 backdrop-blur-md flex items-center justify-center text-zinc-800 hover:bg-white transition-colors shadow-md active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {session?.user && (
            <Avatar className="w-10 h-10 border border-zinc-200/80 shadow-md">
              <AvatarImage src={(session.user as any).avatar || session.user.image} />
              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-black">ME</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {/* Sidebar - Hotspots & Discovery List (Light Glassmorphic) */}
      <div className="absolute left-4 top-20 bottom-4 w-80 bg-white/85 border border-zinc-200/60 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-4 z-10 shadow-xl pointer-events-auto overflow-hidden hidden md:flex">
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-emerald-600" /> Kalyan Hotspots
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
            {markers.length} spots
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            Locating nearby spots...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin">
            {markers.map((marker) => {
              let markerIcon = <Globe className="w-4 h-4 text-cyan-600" />;
              if (marker.type === 'marketplace') markerIcon = <ShoppingBag className="w-4 h-4 text-orange-500" />;
              else if (marker.type === 'meetup') markerIcon = <Users className="w-4 h-4 text-emerald-600" />;
              else if (marker.type === 'live_chat') markerIcon = <Video className="w-4 h-4 text-red-500" />;
              else if (marker.type === 'trending_reel') markerIcon = <Video className="w-4 h-4 text-fuchsia-500" />;

              return (
                <div
                  key={marker.id}
                  onClick={() => flyToMarker(marker)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    activeMarker?.id === marker.id
                      ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                      : 'bg-zinc-50/50 border-zinc-100 hover:bg-zinc-100/50 hover:border-zinc-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
                    {markerIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-zinc-950 truncate">{marker.name}</h3>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{marker.locationText}</p>
                    <p className="text-[10px] text-zinc-400 line-clamp-1 mt-1">{marker.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global Map Styles & Animations */}
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
          background-color: #f4f4f5 !important;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
        }
        /* Custom Leaflet Popup styling to match glassmorphic premium design */
        .premium-leaflet-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(228, 228, 231, 0.7) !important;
          border-radius: 16px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          padding: 8px 4px 4px 4px !important;
        }
        .premium-leaflet-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-left: 1px solid rgba(228, 228, 231, 0.7) !important;
          border-bottom: 1px solid rgba(228, 228, 231, 0.7) !important;
          box-shadow: none !important;
        }
        .premium-leaflet-popup .leaflet-popup-content {
          margin: 8px !important;
        }
        .premium-leaflet-popup .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          color: #71717a !important;
          font-size: 16px !important;
        }
        .premium-leaflet-popup .leaflet-popup-close-button:hover {
          color: #09090b !important;
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
