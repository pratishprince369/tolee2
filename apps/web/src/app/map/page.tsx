'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Map, MapPin, Compass, ArrowLeft, RefreshCw, ShoppingBag, Globe, Video, Users, 
  Plus, Calendar, Clock, Phone, Shield, Activity, Check, ExternalLink, Lock, 
  AlertTriangle, Search, Info 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createTolee } from '@/actions/tolee';
import { createEventAction, joinEventAction, leaveEventAction } from '@/actions/event';

interface MapMarker {
  id: string;
  type: string; // 'marketplace' | 'website' | 'restaurant' | 'store' | 'blog' | 'meetup' | 'live_chat' | 'trending_reel' | 'group' | 'event';
  name: string;
  description: string;
  image: string | null;
  latitude: number;
  longitude: number;
  locationText: string;
  link: string;
  category?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  visibility?: string;
  maxAttendees?: number | null;
  contactDetails?: string | null;
  status?: string;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string | null;
  attendeeCount?: number;
  attendees?: { userId: string; status: string }[];
}

export default function InteractiveMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'group' | 'event' | 'marketplace' | 'hotspots'>('all');
  
  const mapInstanceRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  // Placement Mode States
  const [placementMode, setPlacementMode] = useState<'group' | 'event' | null>(null);
  const [tempLat, setTempLat] = useState<number | null>(null);
  const [tempLng, setTempLng] = useState<number | null>(null);
  const [tempAddress, setTempAddress] = useState<string>('');
  
  // Search Autocomplete States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Creation Modals
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // Form Fields - Group
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCategory, setGroupCategory] = useState('Social Meetup');
  const [groupCover, setGroupCover] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState('public');
  const [groupMaxMembers, setGroupMaxMembers] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Form Fields - Event
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventBanner, setEventBanner] = useState('');
  const [eventCategory, setEventCategory] = useState('Music Event');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventMaxAttendees, setEventMaxAttendees] = useState('');
  const [eventContact, setEventContact] = useState('');
  const [eventVisibility, setEventVisibility] = useState('public');
  const [creatingEvent, setCreatingEvent] = useState(false);

  const getEventStatusText = (startDateStr: string, endDateStr: string) => {
    const now = new Date();
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (now > end) {
      return { text: 'Event Ended', badgeClass: 'bg-zinc-200 text-zinc-800 border border-zinc-300' };
    }

    if (now >= start && now <= end) {
      return { text: '🔴 LIVE EVENT', badgeClass: 'bg-red-100 text-red-600 font-bold border border-red-200' };
    }

    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdownText = 'Starts in: ';
    if (diffDays > 0) {
      countdownText += `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      countdownText += `${diffHours}h ${diffMins}m`;
    } else {
      countdownText += `${diffMins}m`;
    }

    return { text: countdownText, badgeClass: 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-200' };
  };

  const getPopupContent = (marker: MapMarker) => {
    if (marker.type === 'event') {
      const statusInfo = getEventStatusText(marker.startDate!, marker.endDate!);
      const isAttending = session?.user && marker.attendees?.some((a: any) => a.userId === (session.user as any).id);
      const attendanceStatus = isAttending 
        ? marker.attendees!.find((a: any) => a.userId === (session.user as any).id)?.status 
        : null;

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`;
      
      let actionBtnHtml = '';
      if (session?.user) {
        if (isAttending) {
          if (attendanceStatus === 'pending') {
            actionBtnHtml = `<button class="popup-leave-event font-bold" data-event-id="${marker.id}" style="width: 100%; padding: 7px 0; border-radius: 8px; background-color: #eab308; color: white; border: none; font-size: 10px; cursor: pointer; transition: all 0.2s;">Requested (Cancel)</button>`;
          } else {
            actionBtnHtml = `<button class="popup-leave-event font-bold" data-event-id="${marker.id}" style="width: 100%; padding: 7px 0; border-radius: 8px; background-color: #ef4444; color: white; border: none; font-size: 10px; cursor: pointer; transition: all 0.2s;">Leave Event</button>`;
          }
        } else {
          const btnText = marker.visibility === 'public' ? 'Join Event' : 'Request Access';
          actionBtnHtml = `<button class="popup-join-event font-bold" data-event-id="${marker.id}" style="width: 100%; padding: 7px 0; border-radius: 8px; background-color: #10b981; color: white; border: none; font-size: 10px; cursor: pointer; transition: all 0.2s;">${btnText}</button>`;
        }
      }

      return `
        <div class="p-1" style="font-family: inherit; width: 230px;">
          <div style="display: flex; justify-content: space-between; gap: 8px; align-items: start;">
            <div style="flex: 1; min-width: 0;">
              <span class="${statusInfo.badgeClass}" style="font-size: 8px; text-transform: uppercase; padding: 2px 8px; border-radius: 9999px; display: inline-block;">
                ${statusInfo.text}
              </span>
              <h3 style="font-size: 13px; font-weight: 800; color: #09090b; margin: 6px 0 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${marker.name}
              </h3>
              <p style="font-size: 9px; color: #71717a; margin: 0;">
                📅 ${new Date(marker.startDate!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} | ⏰ ${marker.startTime} - ${marker.endTime}
              </p>
            </div>
            ${marker.image ? `<img src="${marker.image}" style="width: 50px; height: 50px; border-radius: 10px; object-fit: cover; border: 1px solid #e4e4e7;" />` : ''}
          </div>
          
          <p style="font-size: 11px; color: #3f3f46; line-height: 1.4; background-color: #f4f4f5; padding: 6px 8px; border-radius: 8px; border: 1px solid #e4e4e7; margin: 8px 0; max-height: 60px; overflow-y: auto;">
            ${marker.description}
          </p>

          <div style="font-size: 9px; color: #71717a; margin-bottom: 8px;">
            👤 Hosted by @${marker.creatorName} | 👥 ${marker.attendeeCount} attending
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px;">
            ${actionBtnHtml}
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; padding: 7px 0; border-radius: 8px; background-color: #f4f4f5; border: 1px solid #e4e4e7; color: #09090b; font-size: 10px; font-weight: 800; text-decoration: none; transition: all 0.2s;">
              Directions 🗺️
            </a>
          </div>
        </div>
      `;
    }

    const typeLabel = marker.type.replace('_', ' ');
    const imageHtml = marker.image 
      ? `<img src="${marker.image}" style="width: 50px; height: 50px; border-radius: 10px; object-fit: cover; border: 1px solid #e4e4e7; margin-top: 4px;" />` 
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

    // Global listener for Leaflet popup routing clicks & join/leave actions
    const handlePopupClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const link = target.closest('.popup-link') as HTMLAnchorElement;
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          router.push(href);
        }
        return;
      }

      const joinBtn = target.closest('.popup-join-event') as HTMLButtonElement;
      if (joinBtn) {
        e.preventDefault();
        const eventId = joinBtn.getAttribute('data-event-id');
        if (eventId) {
          joinBtn.disabled = true;
          joinBtn.innerText = 'Joining...';
          const res = await joinEventAction(eventId);
          if (res.success) {
            alert(res.status === 'pending' ? 'Access request sent.' : 'Successfully joined event!');
            fetchMarkers(); // refresh markers
          } else {
            alert(res.error || 'Failed to join event');
            joinBtn.disabled = false;
            joinBtn.innerText = 'Join Event';
          }
        }
        return;
      }

      const leaveBtn = target.closest('.popup-leave-event') as HTMLButtonElement;
      if (leaveBtn) {
        e.preventDefault();
        const eventId = leaveBtn.getAttribute('data-event-id');
        if (eventId) {
          leaveBtn.disabled = true;
          leaveBtn.innerText = 'Leaving...';
          const res = await leaveEventAction(eventId);
          if (res.success) {
            alert('Left the event.');
            fetchMarkers(); // refresh markers
          } else {
            alert('Failed to leave event');
            leaveBtn.disabled = false;
            leaveBtn.innerText = 'Leave Event';
          }
        }
        return;
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

  const getFilteredMarkers = () => {
    if (filterType === 'all') return markers;
    if (filterType === 'group') return markers.filter(m => m.type === 'group');
    if (filterType === 'event') return markers.filter(m => m.type === 'event');
    if (filterType === 'marketplace') return markers.filter(m => m.type === 'marketplace');
    if (filterType === 'hotspots') return markers.filter(m => ['meetup', 'live_chat', 'trending_reel', 'website', 'store', 'restaurant', 'blog'].includes(m.type));
    return markers;
  };

  useEffect(() => {
    const L = (window as any).L;
    if (L && mapInstanceRef.current) {
      // Clear existing layer markers (except temp marker)
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== tempMarkerRef.current) {
          layer.remove();
        }
      });
      renderMarkers(L, mapInstanceRef.current, getFilteredMarkers());
    }
  }, [filterType, markers]);

  const initMap = async () => {
    const freshMarkers = await fetchMarkers();
    const L = (window as any).L;
    if (!L) return;

    // Kalyan Khadakpada (19.2579124, 73.1231582)
    const defaultLat = 19.2579124;
    const defaultLng = 73.1231582;
    const defaultZoom = 15;

    const map = L.map('tolee-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], defaultZoom);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

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

    renderMarkers(L, map, freshMarkers);

    // If query string has an eventId, programmatically select and center on it
    const eventIdParam = searchParams.get('eventId');
    if (eventIdParam) {
      const matched = freshMarkers.find((m: any) => m.id === eventIdParam);
      if (matched) {
        setTimeout(() => {
          flyToMarker(matched);
        }, 800);
      }
    }
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
      } else if (marker.type === 'group') {
        markerColor = '#10b981'; // Green (Tolee Groups)
        iconHtml = '👥';
      } else if (marker.type === 'meetup') {
        markerColor = '#10b981'; // Green
        iconHtml = '👥';
      } else if (marker.type === 'live_chat') {
        markerColor = '#ef4444'; // Red
        iconHtml = '📞';
      } else if (marker.type === 'trending_reel') {
        markerColor = '#d946ef'; // Purple
        iconHtml = '🎥';
      } else if (marker.type === 'event') {
        // Event dynamic markers based on category
        markerColor = '#4f46e5'; // Indigo
        if (marker.category === 'Music Event') {
          iconHtml = '🎵';
        } else if (marker.category === 'Business Seminar') {
          iconHtml = '💼';
        } else if (marker.category === 'Cricket Tournament') {
          iconHtml = '🏏';
        } else if (marker.category === 'Startup Meetup') {
          iconHtml = '🚀';
        } else {
          iconHtml = '🎉';
        }
      }

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

    L.popup({
      maxWidth: 280,
      className: 'premium-leaflet-popup',
      offset: [0, -32]
    })
    .setLatLng([marker.latitude, marker.longitude])
    .setContent(getPopupContent(marker))
    .openOn(mapInstanceRef.current);
  };

  // PLACEMENT MODE LOGIC
  const enterPlacementMode = (type: 'group' | 'event') => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    setPlacementMode(type);
    
    // Get current map center
    const center = mapInstanceRef.current.getCenter();
    setTempLat(center.lat);
    setTempLng(center.lng);
    setTempAddress('Locating spot...');

    // Reverse geocode default center
    updateTempLocation(center.lat, center.lng);

    // Create a draggable pin at center
    const tempMarker = L.marker([center.lat, center.lng], {
      draggable: true,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: 'draggable-temp-pin',
        html: `
          <div style="position:relative; width:50px; height:50px; display:flex; align-items:center; justify-content:center; animation: bounce-effect 1s infinite alternate;">
            <span style="font-size:36px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">📍</span>
          </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 50]
      })
    }).addTo(mapInstanceRef.current);

    tempMarkerRef.current = tempMarker;

    tempMarker.on('dragend', () => {
      const pos = tempMarker.getLatLng();
      setTempLat(pos.lat);
      setTempLng(pos.lng);
      updateTempLocation(pos.lat, pos.lng);
    });

    mapInstanceRef.current.on('click', handleMapClickReposition);
  };

  const handleMapClickReposition = (e: any) => {
    setTempLat(e.latlng.lat);
    setTempLng(e.latlng.lng);
    updateTempLocation(e.latlng.lat, e.latlng.lng);

    if (tempMarkerRef.current) {
      tempMarkerRef.current.setLatLng(e.latlng);
    }
  };

  const updateTempLocation = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
      if (res.ok) {
        const data = await res.json();
        setTempAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        setTempAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setTempAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const exitPlacementMode = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.off('click', handleMapClickReposition);
    }
    setPlacementMode(null);
    setTempLat(null);
    setTempLng(null);
    setTempAddress('');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setTempLat(lat);
    setTempLng(lon);
    setTempAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng([lat, lon]);
      }
    }
  };

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setTempLat(lat);
        setTempLng(lon);
        updateTempLocation(lat, lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          if (tempMarkerRef.current) {
            tempMarkerRef.current.setLatLng([lat, lon]);
          }
        }
      }, () => {
        alert('Failed to get GPS location. Please check browser permissions.');
      });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleConfirmLocation = () => {
    if (!tempLat || !tempLng) {
      alert('Please select a valid location on the map first.');
      return;
    }

    if (placementMode === 'group') {
      setIsGroupDialogOpen(true);
    } else if (placementMode === 'event') {
      setIsEventDialogOpen(true);
    }
  };

  // PUBLISH LOGIC - GROUP
  const handlePublishGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return alert('Group Name is required.');
    setCreatingGroup(true);
    
    try {
      const res = await createTolee({
        name: groupName,
        description: groupDesc,
        category: groupCategory,
        isPrivate: groupPrivacy === 'private',
        location: tempAddress.substring(0, 100),
        address: tempAddress,
        latitude: tempLat!,
        longitude: tempLng!,
        avatar: groupIcon || undefined,
        coverImage: groupCover || undefined
      });

      if (res.success) {
        alert('Group created successfully!');
        setIsGroupDialogOpen(false);
        exitPlacementMode();
        fetchMarkers(); // refresh
      } else {
        alert(res.error || 'Failed to create group');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setCreatingGroup(false);
    }
  };

  // PUBLISH LOGIC - EVENT
  const handlePublishEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return alert('Event Name is required.');
    if (!eventStartDate || !eventStartTime) return alert('Start date and time are required.');
    if (!eventEndDate || !eventEndTime) return alert('End date and time are required.');

    setCreatingEvent(true);
    try {
      const res = await createEventAction({
        name: eventName,
        description: eventDesc,
        bannerImage: eventBanner || undefined,
        category: eventCategory,
        startDate: eventStartDate,
        startTime: eventStartTime,
        endDate: eventEndDate,
        endTime: eventEndTime,
        latitude: tempLat!,
        longitude: tempLng!,
        address: tempAddress,
        visibility: eventVisibility,
        maxAttendees: eventMaxAttendees ? parseInt(eventMaxAttendees) : undefined,
        contactDetails: eventContact || undefined
      });

      if (res.success) {
        alert('Event created successfully!');
        setIsEventDialogOpen(false);
        exitPlacementMode();
        fetchMarkers(); // refresh
      } else {
        alert(res.error || 'Failed to create event');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f4f4f5] text-zinc-900 font-sans select-none">
      {/* Map Container */}
      <div id="tolee-map" className="w-full h-full z-0"></div>

      {/* Floating Header (Light Glassmorphic) */}
      <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none flex items-center justify-between">
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

      {/* PLACEMENT MODE BANNER (Float Top Center) */}
      {placementMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/95 border border-zinc-300 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                📍 Placement Mode ({placementMode === 'group' ? 'Group' : 'Event'})
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Tap map or drag pin to position.</p>
            </div>
            <button onClick={exitPlacementMode} className="text-zinc-400 hover:text-zinc-700 text-xs font-bold px-2 py-1 rounded bg-zinc-100">
              Cancel
            </button>
          </div>

          {/* Search Autocomplete bar */}
          <form onSubmit={handleSearchLocation} className="relative flex gap-1.5">
            <input 
              type="text"
              placeholder="Search address or neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-hidden focus:border-emerald-500"
            />
            <button type="submit" disabled={searching} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
              {searching ? '...' : <Search className="w-3.5 h-3.5" />}
            </button>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="p-2.5 text-[11px] hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-0 truncate"
                  >
                    {res.display_name}
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Address Preview Panel */}
          <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none block">Selected Location</span>
              <p className="text-[11px] text-zinc-700 mt-1 line-clamp-2 leading-relaxed">{tempAddress || 'Locating...'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleUseGPS}
              className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              🌐 Use Current GPS
            </button>
            <button 
              onClick={handleConfirmLocation}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1"
            >
              Confirm Spot ✓
            </button>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS (FABs) - Right Side Map */}
      {!placementMode && session?.user && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 pointer-events-auto">
          <button
            onClick={() => enterPlacementMode('group')}
            className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-black border border-white/20"
          >
            <span>📍</span> Create Group
          </button>
          <button
            onClick={() => enterPlacementMode('event')}
            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-black border border-white/20"
          >
            <span>🎉</span> Create Event
          </button>
        </div>
      )}

      {/* Sidebar - Hotspots & Discovery List (Light Glassmorphic) */}
      <div className="absolute left-4 top-20 bottom-4 w-80 bg-white/85 border border-zinc-200/60 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-4 z-10 shadow-xl pointer-events-auto overflow-hidden hidden md:flex">
        
        {/* Category Filters */}
        <div className="flex flex-wrap gap-1 border-b border-zinc-200/60 pb-3">
          {[
            { id: 'all', label: 'All' },
            { id: 'group', label: 'Groups' },
            { id: 'event', label: 'Events' },
            { id: 'marketplace', label: 'Shop' },
            { id: 'hotspots', label: 'Local' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-1">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-emerald-600" /> Kalyan Discovery
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
            {getFilteredMarkers().length} spots
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            Locating nearby spots...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin">
            {getFilteredMarkers().length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-[11px] font-medium">
                No spots match this filter.
              </div>
            ) : (
              getFilteredMarkers().map((marker) => {
                let markerIcon = <Globe className="w-4 h-4 text-cyan-600" />;
                if (marker.type === 'marketplace') markerIcon = <ShoppingBag className="w-4 h-4 text-orange-500" />;
                else if (marker.type === 'group' || marker.type === 'meetup') markerIcon = <Users className="w-4 h-4 text-emerald-600" />;
                else if (marker.type === 'live_chat') markerIcon = <Video className="w-4 h-4 text-red-500" />;
                else if (marker.type === 'trending_reel') markerIcon = <Video className="w-4 h-4 text-fuchsia-500" />;
                else if (marker.type === 'event') markerIcon = <Calendar className="w-4 h-4 text-indigo-500" />;

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
              })
            )}
          </div>
        )}
      </div>

      {/* CREATE GROUP FORM DIALOG MODAL */}
      {isGroupDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                👥 Create Location Group
              </h3>
              <button onClick={() => setIsGroupDialogOpen(false)} className="text-zinc-400 hover:text-white font-bold text-xs bg-zinc-900 px-2.5 py-1 rounded">
                Close
              </button>
            </div>

            <form onSubmit={handlePublishGroup} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Location Address</label>
                <input 
                  type="text" 
                  disabled 
                  value={tempAddress} 
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Group Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter community name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Describe your community rules, activities..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Category</label>
                  <select 
                    value={groupCategory}
                    onChange={(e) => setGroupCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500 text-white"
                  >
                    {['Social Meetup', 'Tech & Code', 'Sports & Fitness', 'Art & Design', 'Startup', 'General'].map(cat => (
                      <option key={cat} value={cat} className="bg-zinc-950 text-white">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Privacy</label>
                  <select 
                    value={groupPrivacy}
                    onChange={(e) => setGroupPrivacy(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500 text-white"
                  >
                    <option value="public" className="bg-zinc-950 text-white">Public (Anyone can join)</option>
                    <option value="private" className="bg-zinc-950 text-white">Private (Request access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Group Icon URL (optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={groupIcon}
                    onChange={(e) => setGroupIcon(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Cover Image URL (optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={groupCover}
                    onChange={(e) => setGroupCover(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Maximum Members (optional)</label>
                <input 
                  type="number" 
                  placeholder="Unlimited"
                  value={groupMaxMembers}
                  onChange={(e) => setGroupMaxMembers(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={creatingGroup}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {creatingGroup ? 'Creating Group...' : 'Publish Group Live ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EVENT FORM DIALOG MODAL */}
      {isEventDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                🎉 Create Location Event
              </h3>
              <button onClick={() => setIsEventDialogOpen(false)} className="text-zinc-400 hover:text-white font-bold text-xs bg-zinc-900 px-2.5 py-1 rounded">
                Close
              </button>
            </div>

            <form onSubmit={handlePublishEvent} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Location Address</label>
                <input 
                  type="text" 
                  disabled 
                  value={tempAddress} 
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Event Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Acoustic Night Kalyan"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Describe your event details, requirements..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Category</label>
                  <select 
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  >
                    {['Music Event', 'Business Seminar', 'Cricket Tournament', 'Startup Meetup', 'General'].map(cat => (
                      <option key={cat} value={cat} className="bg-zinc-950 text-white">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Visibility</label>
                  <select 
                    value={eventVisibility}
                    onChange={(e) => setEventVisibility(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  >
                    <option value="public" className="bg-zinc-950 text-white">Public Event</option>
                    <option value="private" className="bg-zinc-950 text-white">Private Event</option>
                    <option value="invite_only" className="bg-zinc-950 text-white">Invite Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">End Date</label>
                  <input 
                    type="date" 
                    required
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">End Time</label>
                  <input 
                    type="time" 
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Banner Image URL</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={eventBanner}
                    onChange={(e) => setEventBanner(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Capacity (optional)</label>
                  <input 
                    type="number" 
                    placeholder="Unlimited"
                    value={eventMaxAttendees}
                    onChange={(e) => setEventMaxAttendees(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Contact Details (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Email or phone number"
                  value={eventContact}
                  onChange={(e) => setEventContact(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={creatingEvent}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {creatingEvent ? 'Creating Event...' : 'Publish Event Live ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Map Styles & Animations */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes bounce-effect {
          from { transform: translateY(0); }
          to { transform: translateY(-10px); }
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
        .premium-leaflet-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.94) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(228, 228, 231, 0.8) !important;
          border-radius: 16px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          padding: 8px 4px 4px 4px !important;
        }
        .premium-leaflet-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.94) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-left: 1px solid rgba(228, 228, 231, 0.8) !important;
          border-bottom: 1px solid rgba(228, 228, 231, 0.8) !important;
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
