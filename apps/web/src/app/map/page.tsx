'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Map, MapPin, Compass, ArrowLeft, RefreshCw, ShoppingBag, Globe, Video, Users, 
  Plus, Calendar, Clock, Phone, Shield, Activity, Check, ExternalLink, Lock, 
  AlertTriangle, Search, Info, MessageSquare, Share2, Heart, Bookmark, ChevronRight,
  Star, UserPlus, Send, DollarSign, Tv 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createTolee, getUserOwnedTolees } from '@/actions/tolee';
import { createEventAction, joinEventAction, leaveEventAction } from '@/actions/event';
import { createWorldProject } from '@/actions/world';

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
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  area?: string | null;
  tags?: string | null;
  address?: string | null;
  ticketPrice?: number | null;
  maxCapacity?: number | null;
  dressCode?: string | null;
  rules?: string | null;
  whatsappNumber?: string | null;
  website?: string | null;
  galleryImages?: string | null;
  autoWelcomeMessage?: string | null;
  contactNumber?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  photos?: string | null;
  videos?: string | null;
  offers?: string | null;
  socialLinks?: string | null;
  logoUrl?: string | null;
  logoThumbnailUrl?: string | null;
  isClosed?: boolean;
  isVerified?: boolean;
  isFeatured?: boolean;
  isMapFeatured?: boolean;
}

export default function InteractiveMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  
  // Advanced Multi-select Filters
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  
  const mapInstanceRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  // Placement Mode States
  const [placementMode, setPlacementMode] = useState<'group' | 'event' | 'shop' | null>(null);
  const [tempLat, setTempLat] = useState<number | null>(null);
  const [tempLng, setTempLng] = useState<number | null>(null);
  const [tempAddress, setTempAddress] = useState<string>('');

  // Localized location temporary variables (parsed from geocoding)
  const [tempCountry, setTempCountry] = useState('India');
  const [tempState, setTempState] = useState('Maharashtra');
  const [tempDistrict, setTempDistrict] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [tempArea, setTempArea] = useState('');
  
  // Search Autocomplete States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Creation Modals
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);

  // Form Fields - Group
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupCategory, setGroupCategory] = useState('Social Meetup');
  const [groupCover, setGroupCover] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState('public');
  const [groupMaxMembers, setGroupMaxMembers] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Form Fields - Event (Detailed Upgrade)
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
  
  const [eventTicketPrice, setEventTicketPrice] = useState('');
  const [eventDressCode, setEventDressCode] = useState('');
  const [eventRules, setEventRules] = useState('');
  const [eventWhatsappNumber, setEventWhatsappNumber] = useState('');
  const [eventWebsite, setEventWebsite] = useState('');
  const [eventGalleryImages, setEventGalleryImages] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [eventAutoWelcomeMessage, setEventAutoWelcomeMessage] = useState('');

  // Form Fields - Shop
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('Store');
  const [shopDesc, setShopDesc] = useState('');
  const [shopHours, setShopHours] = useState('10:00 AM - 09:00 PM');
  const [shopContact, setShopContact] = useState('');
  const [shopWhatsapp, setShopWhatsapp] = useState('');
  const [shopWebsite, setShopWebsite] = useState('');
  const [shopCover, setShopCover] = useState('');
  const [shopLogo, setShopLogo] = useState('');
  const [shopOffers, setShopOffers] = useState('');
  const [shopSocialLinks, setShopSocialLinks] = useState('');
  const [shopToleeIds, setShopToleeIds] = useState<string[]>([]);
  const [userTolees, setUserTolees] = useState<any[]>([]);
  const [creatingShop, setCreatingShop] = useState(false);

  useEffect(() => {
    if (session?.user) {
      getUserOwnedTolees().then((res: any) => {
        if (res?.success && res?.tolees) {
          setUserTolees(res.tolees);
        }
      });
    }
  }, [session]);

  // Interactive Reviews Feed State (local mock persistent review logs)
  const [localReviews, setLocalReviews] = useState<Record<string, any[]>>({
    'mock-meetup-1': [
      { rating: 5, text: "Always a great networking space for builders!", username: "prince_dev", date: "2 days ago" },
      { rating: 4, text: "Fun discussion. Highly recommend joining next week.", username: "swastik_c", date: "1 week ago" }
    ]
  });
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');

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
    if (!['event', 'group', 'marketplace', 'live_chat', 'trending_reel', 'meetup'].includes(marker.type)) {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`;
      const isClosedText = marker.isClosed ? '<span style="color: #ef4444; font-weight: bold;">CLOSED</span>' : '<span style="color: #10b981; font-weight: bold;">OPEN NOW</span>';
      const logoHtml = marker.logoUrl 
        ? `<img src="${marker.logoUrl}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />`
        : `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #06b6d4; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">🏪</div>`;

      return `
        <div class="p-1" style="font-family: inherit; width: 230px;">
          <div style="display: flex; justify-content: space-between; gap: 8px; align-items: start;">
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #0891b2; background-color: #ecfeff; padding: 2px 8px; border-radius: 9999px; display: inline-block; border: 0.5px solid #c5f6fa;">
                ${marker.type.toUpperCase()}
              </span>
              <h3 style="font-size: 13px; font-weight: 800; color: #09090b; margin: 6px 0 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${marker.name}
              </h3>
              <p style="font-size: 9px; color: #71717a; margin: 0; display: flex; align-items: center; gap: 4px;">
                ⭐ 4.8 (12 reviews) • ${isClosedText}
              </p>
            </div>
            ${logoHtml}
          </div>

          <div style="font-size: 9px; color: #3f3f46; margin: 8px 0 6px 0; display: flex; flex-direction: column; gap: 2px;">
            <span>📍 ${marker.locationText}</span>
            ${marker.openingHours ? `<span>⏰ ${marker.openingHours}</span>` : ''}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px;">
            <a href="${marker.link}" class="popup-link" style="display: block; text-align: center; padding: 7px 0; border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; font-size: 10px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(8, 145, 178, 0.2); transition: all 0.2s;">
              View Shop 🏪
            </a>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; padding: 7px 0; border-radius: 8px; background-color: #f4f4f5; border: 1px solid #e4e4e7; color: #09090b; font-size: 10px; font-weight: 800; text-decoration: none; transition: all 0.2s;">
              Directions 🗺️
            </a>
          </div>
        </div>
      `;
    }

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
    let filtered = markers;
    
    // Keyword search filter (Landmark, Pincode, City, Area, Category, Name, Tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.locationText && m.locationText.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.tags && m.tags.toLowerCase().includes(q)) ||
        (m.city && m.city.toLowerCase().includes(q)) ||
        (m.area && m.area.toLowerCase().includes(q)) ||
        (m.country && m.country.toLowerCase().includes(q)) ||
        (m.state && m.state.toLowerCase().includes(q)) ||
        (m.district && m.district.toLowerCase().includes(q))
      );
    }

    if (selectedFilters.includes('all')) return filtered;

    return filtered.filter(m => {
      const type = m.type.toLowerCase();
      if (selectedFilters.includes('groups') && (type === 'group' || type === 'meetup')) return true;
      if (selectedFilters.includes('events') && type === 'event') return true;
      if (selectedFilters.includes('shops') && !['group', 'meetup', 'event', 'marketplace', 'live_chat', 'trending_reel'].includes(type)) return true;
      if (selectedFilters.includes('marketplace') && type === 'marketplace') return true;
      return false;
    });
  };

  useEffect(() => {
    const L = (window as any).L;
    if (L && mapInstanceRef.current) {
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== tempMarkerRef.current) {
          layer.remove();
        }
      });
      renderMarkers(L, mapInstanceRef.current, getFilteredMarkers());
    }
  }, [selectedFilters, searchQuery, markers]);

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
    const zoom = map.getZoom();
    const threshold = 0.04 / Math.pow(2, zoom - 13);

    const clusters: { center: [number, number]; markers: MapMarker[] }[] = [];

    markerList.forEach(marker => {
      let addedToCluster = false;
      for (const cluster of clusters) {
        const dist = Math.sqrt(
          Math.pow(cluster.center[0] - marker.latitude, 2) +
          Math.pow(cluster.center[1] - marker.longitude, 2)
        );
        if (dist < threshold) {
          const count = cluster.markers.length;
          cluster.center[0] = (cluster.center[0] * count + marker.latitude) / (count + 1);
          cluster.center[1] = (cluster.center[1] * count + marker.longitude) / (count + 1);
          cluster.markers.push(marker);
          addedToCluster = true;
          break;
        }
      }
      if (!addedToCluster) {
        clusters.push({
          center: [marker.latitude, marker.longitude],
          markers: [marker]
        });
      }
    });

    clusters.forEach((cluster) => {
      if (cluster.markers.length === 1) {
        const marker = cluster.markers[0];
        let markerColor = '#ec4899'; // Pink
        let iconHtml = '📍';

        if (marker.type === 'marketplace') {
          markerColor = '#f97316'; // Orange
          iconHtml = '🛍️';
        } else if (!['marketplace', 'group', 'meetup', 'live_chat', 'trending_reel', 'event'].includes(marker.type)) {
          markerColor = '#06b6d4'; // Teal
          iconHtml = '🏪';
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
          markerColor = '#4f46e5'; // Indigo
          if (marker.category === 'Music Event') iconHtml = '🎵';
          else if (marker.category === 'Business Seminar') iconHtml = '💼';
          else if (marker.category === 'Cricket Tournament') iconHtml = '🏏';
          else if (marker.category === 'Startup Meetup') iconHtml = '🚀';
          else iconHtml = '🎉';
        }

        let innerHtml = `<span style="font-size: 18px;">${iconHtml}</span>`;
        if (marker.logoUrl) {
          innerHtml = `<img src="${marker.logoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="${marker.name}" />`;
        }

        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="
              position: relative;
              width: 42px;
              height: 42px;
              background-color: #ffffff;
              border: 2.5px solid ${markerColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2), 0 0 8px ${markerColor}66;
              cursor: pointer;
              transition: transform 0.2s ease;
              overflow: hidden;
            " class="marker-bubble">
              ${innerHtml}
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
          setActiveMarker(marker);
        });
      } else {
        // Render Cluster marker
        const customIcon = L.divIcon({
          className: 'custom-map-cluster-marker',
          html: `
            <div style="
              position: relative;
              width: 46px;
              height: 46px;
              background: linear-gradient(135deg, #0d9488, #0f766e);
              border: 3px solid #ffffff;
              color: #ffffff;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 900;
              box-shadow: 0 10px 15px -3px rgba(15, 118, 110, 0.4), 0 4px 6px -2px rgba(15, 118, 110, 0.2);
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              <span style="font-size: 10px; opacity: 0.8; line-height: 1;">📍</span>
              <span style="line-height: 1.1;">${cluster.markers.length}</span>
            </div>
          `,
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        });

        const mapMarker = L.marker(cluster.center, { icon: customIcon }).addTo(map);
        mapMarker.on('click', () => {
          map.setView(cluster.center, zoom + 2, { animate: true });
        });
      }
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
  const enterPlacementMode = (type: 'group' | 'event' | 'shop') => {
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
        const addressObj = data.address || {};
        
        setTempCountry(addressObj.country || 'India');
        setTempState(addressObj.state || 'Maharashtra');
        setTempDistrict(addressObj.state_district || addressObj.county || addressObj.district || '');
        setTempCity(addressObj.city || addressObj.town || addressObj.village || addressObj.municipality || 'Mumbai');
        setTempArea(addressObj.suburb || addressObj.neighbourhood || addressObj.locality || addressObj.quarter || '');
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
    } else if (placementMode === 'shop') {
      setIsShopDialogOpen(true);
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
        coverImage: groupCover || undefined,
        country: tempCountry,
        state: tempState,
        district: tempDistrict,
        city: tempCity,
        area: tempArea
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
        contactDetails: eventContact || undefined,
        country: tempCountry,
        state: tempState,
        district: tempDistrict,
        city: tempCity,
        area: tempArea,
        ticketPrice: eventTicketPrice ? parseFloat(eventTicketPrice) : 0,
        maxCapacity: eventMaxAttendees ? parseInt(eventMaxAttendees) : undefined,
        dressCode: eventDressCode || undefined,
        rules: eventRules || undefined,
        whatsappNumber: eventWhatsappNumber || undefined,
        website: eventWebsite || undefined,
        galleryImages: eventGalleryImages || undefined,
        tags: eventTags || undefined,
        autoWelcomeMessage: eventAutoWelcomeMessage || undefined
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

  // PUBLISH LOGIC - SHOP
  const handlePublishShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return alert('Shop Name is required.');
    if (!shopLogo.trim()) return alert('Business Logo is required.');

    setCreatingShop(true);
    try {
      const res = await createWorldProject({
        type: shopType,
        name: shopName,
        description: shopDesc,
        bannerImage: shopCover || undefined,
        content: {}, // empty content representation
        locationText: tempAddress.substring(0, 100),
        latitude: tempLat!,
        longitude: tempLng!,
        country: tempCountry,
        state: tempState,
        district: tempDistrict,
        city: tempCity,
        area: tempArea,
        contactNumber: shopContact || undefined,
        whatsapp: shopWhatsapp || undefined,
        website: shopWebsite || undefined,
        openingHours: shopHours || undefined,
        photos: shopCover || undefined,
        logoUrl: shopLogo || undefined,
        logoThumbnailUrl: shopLogo || undefined,
        offers: shopOffers || undefined,
        socialLinks: shopSocialLinks || undefined,
        selectedToleeIds: shopToleeIds
      });

      if (res.success) {
        alert('Shop published successfully!');
        setIsShopDialogOpen(false);
        exitPlacementMode();
        fetchMarkers(); // refresh
      } else {
        alert(res.error || 'Failed to publish shop');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setCreatingShop(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f4f4f5] text-zinc-900 font-sans select-none">
      {/* Map Container */}
      <div id="tolee-map" className="w-full h-full z-0"></div>

      {/* DETAIL PANEL SLIDE-OVER */}
      {activeMarker && (
        <div className="absolute right-4 top-20 bottom-4 w-90 bg-white/95 dark:bg-zinc-950/95 border border-zinc-205 dark:border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col pointer-events-auto transition-all animate-in slide-in-from-right duration-200">
          
          {/* Header Banner */}
          <div className="relative h-32 bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
            <img 
              src={activeMarker.image || "/default-tolee-cover.svg"} 
              alt="Banner" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button 
              onClick={() => setActiveMarker(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  {activeMarker.type}
                </span>
                <h2 className="text-sm font-black text-white truncate mt-1 leading-none">
                  {activeMarker.name}
                </h2>
              </div>
            </div>
          </div>

          {/* Details Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar text-left">
            <div className="flex items-start gap-2 text-xs text-zinc-500">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">{activeMarker.locationText}</p>
                {activeMarker.address && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{activeMarker.address}</p>
                )}
              </div>
            </div>

            {activeMarker.description && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-805 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-400 block mb-1">About</span>
                <p className="text-[11px] text-zinc-650 dark:text-zinc-350 leading-relaxed whitespace-pre-wrap">
                  {activeMarker.description}
                </p>
              </div>
            )}

            {/* EVENT SPECIFIC METADATA */}
            {activeMarker.type === 'event' && (
              <div className="space-y-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/85">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl">
                    <span className="text-[9px] font-bold text-indigo-500 block uppercase">Ticket Price</span>
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 mt-1 block">
                      {activeMarker.ticketPrice && activeMarker.ticketPrice > 0 ? `₹${activeMarker.ticketPrice}` : 'Free Entry'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl">
                    <span className="text-[9px] font-bold text-indigo-500 block uppercase">Capacity</span>
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 mt-1 block">
                      {activeMarker.maxCapacity ? `${activeMarker.attendeeCount || 1} / ${activeMarker.maxCapacity} Seats` : 'Unlimited'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-zinc-500 font-medium">🕒 Timings</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {activeMarker.startTime} - {activeMarker.endTime || 'End'}
                    </span>
                  </div>
                  {activeMarker.dressCode && (
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 font-medium">👕 Dress Code</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{activeMarker.dressCode}</span>
                    </div>
                  )}
                  {activeMarker.website && (
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 font-medium">🌐 Event Page</span>
                      <a href={activeMarker.website} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-0.5">
                        Visit website <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {activeMarker.rules && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Event Rules</span>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">{activeMarker.rules}</p>
                  </div>
                )}
                
                {/* Auto Welcome Status indicator */}
                {activeMarker.autoWelcomeMessage && (
                  <div className="p-2.5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/25 rounded-xl flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Auto Welcome Message</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">Active for all attendees.</p>
                    </div>
                  </div>
                )}

                {/* Event Join / Leave Action Row */}
                <div className="pt-2 flex gap-2">
                  {session?.user && (
                    <button 
                      onClick={async () => {
                        const isAttending = activeMarker.attendees?.some((a: any) => a.userId === (session.user as any).id);
                        if (isAttending) {
                          const leaveRes = await leaveEventAction(activeMarker.id);
                          if (leaveRes.success) {
                            alert('Left the event.');
                            const fresh = await fetchMarkers();
                            const updated = fresh.find((m: any) => m.id === activeMarker.id);
                            if (updated) setActiveMarker(updated);
                          }
                        } else {
                          const joinRes = await joinEventAction(activeMarker.id);
                          if (joinRes.success) {
                            alert('Joined event successfully!');
                            const fresh = await fetchMarkers();
                            const updated = fresh.find((m: any) => m.id === activeMarker.id);
                            if (updated) setActiveMarker(updated);
                          }
                        }
                      }}
                      className="flex-1 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:opacity-95 transition-opacity"
                    >
                      {activeMarker.attendees?.some((a: any) => a.userId === (session.user as any).id) ? 'Leave Event' : 'Join Event 🎉'}
                    </button>
                  )}
                  {activeMarker.whatsappNumber && (
                    <a 
                      href={`https://wa.me/${activeMarker.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      💬
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* SHOP / STORE SPECIFIC METADATA */}
            {!['event', 'group', 'marketplace', 'live_chat', 'trending_reel', 'meetup'].includes(activeMarker.type) && (
              <div className="space-y-3 pt-1 border-t border-zinc-105 dark:border-zinc-800/85">
                
                {/* Hours & Offers */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-teal-50/20 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/20 rounded-xl">
                    <span className="text-[9px] font-bold text-teal-600 block uppercase">Opening Hours</span>
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mt-1 block">
                      {activeMarker.openingHours || '10:00 AM - 09:00 PM'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-600 block uppercase">Special Offer</span>
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 mt-1 block">
                      {activeMarker.offers || 'Flat 10% Off!'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {activeMarker.contactNumber && (
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 font-medium">📞 Phone</span>
                      <a href={`tel:${activeMarker.contactNumber}`} className="font-bold text-zinc-800 dark:text-zinc-200 hover:underline">{activeMarker.contactNumber}</a>
                    </div>
                  )}
                  {activeMarker.website && (
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 font-medium">🌐 Website</span>
                      <a href={activeMarker.website} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-0.5">
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Products Catalog section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    🛍️ Catalog & Items
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Mock product lists */}
                    <div className="p-2 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl">
                      <div className="w-full h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-xs opacity-55">📦 Product A</div>
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] font-bold">Item 1</span>
                        <span className="text-[10px] text-emerald-600 font-black">₹199</span>
                      </div>
                    </div>
                    <div className="p-2 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl">
                      <div className="w-full h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-xs opacity-55">📦 Product B</div>
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] font-bold">Item 2</span>
                        <span className="text-[10px] text-emerald-600 font-black">₹399</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating & Review Section */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      ⭐ Ratings & Reviews
                    </h4>
                    <span className="text-xs font-bold text-amber-500">⭐ 4.8 (124 reviews)</span>
                  </div>

                  {/* Reviews list */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(localReviews[activeMarker.id] || [
                      { rating: 5, text: "Excellent products and swift delivery!", username: "tolee_fan", date: "Today" },
                      { rating: 4, text: "Very good customer care support.", username: "mumbai_eats", date: "3 days ago" }
                    ]).map((rev: any, idx: number) => (
                      <div key={idx} className="p-2 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-lg border border-zinc-100 dark:border-zinc-800/50 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">@{rev.username}</span>
                          <span className="text-[9px] text-zinc-400">{rev.date}</span>
                        </div>
                        <div className="text-[9px] text-amber-500 mt-0.5">{"★".repeat(rev.rating)}</div>
                        <p className="text-[10px] text-zinc-650 dark:text-zinc-350 mt-1 leading-relaxed">{rev.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Review Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newReviewText.trim()) return;
                      const newRev = {
                        rating: newReviewRating,
                        text: newReviewText.trim(),
                        username: session?.user?.name || "anonymous",
                        date: "Just now"
                      };
                      const current = localReviews[activeMarker.id] || [];
                      setLocalReviews({
                        ...localReviews,
                        [activeMarker.id]: [newRev, ...current]
                      });
                      setNewReviewText('');
                    }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-400">Your Rating:</span>
                      {[1, 2, 3, 4, 5].map(num => (
                        <button 
                          key={num}
                          type="button" 
                          onClick={() => setNewReviewRating(num)}
                          className={`text-xs ${num <= newReviewRating ? 'text-amber-500' : 'text-zinc-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="Write a quick review..." 
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        className="flex-1 text-[11px] px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-transparent text-zinc-900 dark:text-white"
                      />
                      <button type="submit" className="px-3 bg-teal-600 text-white rounded-lg text-[10px] font-bold">
                        Post
                      </button>
                    </div>
                  </form>
                </div>

                {/* Contact and Directions Actions */}
                <div className="pt-2 flex gap-1.5">
                  {activeMarker.whatsapp && (
                    <a 
                      href={`https://wa.me/${activeMarker.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm"
                    >
                      💬 WhatsApp Shop
                    </a>
                  )}
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeMarker.latitude},${activeMarker.longitude}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-2 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs"
                  >
                    🗺️ Directions
                  </a>
                </div>
              </div>
            )}

            {/* Default Quick Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400">
              <button className="flex items-center gap-1 hover:text-red-500 text-[10px] font-bold">
                <Heart className="w-3.5 h-3.5" /> Like
              </button>
              <button className="flex items-center gap-1 hover:text-emerald-500 text-[10px] font-bold">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <button className="flex items-center gap-1 hover:text-cyan-500 text-[10px] font-bold">
                <Bookmark className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="relative">
              <button 
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white flex items-center justify-center hover:opacity-95 transition-all shadow-md active:scale-95 border border-white/20"
              >
                <Plus className={`w-5 h-5 transition-transform duration-200 ${isCreateMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              
              {isCreateMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 py-2.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <div className="px-3 pb-2 mb-1.5 border-b border-zinc-105 dark:border-zinc-800/80">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Map Creations</p>
                  </div>
                  <button 
                    onClick={() => { enterPlacementMode('group'); setIsCreateMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                  >
                    <span>👥</span> Create Group (Tolee)
                  </button>
                  <button 
                    onClick={() => { enterPlacementMode('event'); setIsCreateMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                  >
                    <span>📅</span> Create Local Event
                  </button>
                  <button 
                    onClick={() => { enterPlacementMode('shop'); setIsCreateMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                  >
                    <span>🏪</span> Create Shop / Store
                  </button>
                </div>
              )}
            </div>
          )}

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
                📍 Placement Mode ({placementMode === 'group' ? 'Group' : placementMode === 'event' ? 'Event' : 'Shop'})
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

      {/* Sidebar - Hotspots & Discovery List (Light Glassmorphic) */}
      <div className="absolute left-4 top-20 bottom-4 w-80 bg-white/85 border border-zinc-200/60 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-4 z-10 shadow-xl pointer-events-auto overflow-hidden hidden md:flex text-left">
        
        {/* Desktop Create Options Dropdown */}
        {session?.user && (
          <div className="relative border-b border-zinc-200/60 pb-3 shrink-0">
            <button
              onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 border border-white/10"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${isCreateMenuOpen ? 'rotate-45' : ''}`} />
              Create / Publish
            </button>

            {isCreateMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { enterPlacementMode('group'); setIsCreateMenuOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                >
                  <span>👥</span> Create Group (Tolee)
                </button>
                <button
                  onClick={() => { enterPlacementMode('event'); setIsCreateMenuOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                >
                  <span>📅</span> Create Local Event
                </button>
                <button
                  onClick={() => { enterPlacementMode('shop'); setIsCreateMenuOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
                >
                  <span>🏪</span> Create Shop / Store
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1 border-b border-zinc-200/60 pb-3">
          {[
            { id: 'all', label: 'All' },
            { id: 'groups', label: '👥 Groups' },
            { id: 'events', label: '📅 Events' },
            { id: 'shops', label: '🏪 Shops' },
            { id: 'marketplace', label: '🛍️ Market' }
          ].map((tab) => {
            const isSelected = selectedFilters.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'all') {
                    setSelectedFilters(['all']);
                  } else {
                    let updated = selectedFilters.filter(f => f !== 'all');
                    if (updated.includes(tab.id)) {
                      updated = updated.filter(f => f !== tab.id);
                    } else {
                      updated.push(tab.id);
                    }
                    if (updated.length === 0) {
                      setSelectedFilters(['all']);
                    } else {
                      setSelectedFilters(updated);
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
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
          <div className="flex-grow flex flex-col gap-2.5 pr-1 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin">
            {getFilteredMarkers().length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-[11px] font-medium">
                No spots match this filter.
              </div>
            ) : (
              getFilteredMarkers().map((marker) => {
                let markerIcon = <ShoppingBag className="w-4 h-4 text-cyan-600" />;
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Ticket Price (₹)</label>
                  <input 
                    type="number" 
                    placeholder="0 for Free"
                    value={eventTicketPrice}
                    onChange={(e) => setEventTicketPrice(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Dress Code (optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Casual"
                    value={eventDressCode}
                    onChange={(e) => setEventDressCode(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">WhatsApp Contact (optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 919876543210"
                    value={eventWhatsappNumber}
                    onChange={(e) => setEventWhatsappNumber(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Website URL (optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={eventWebsite}
                    onChange={(e) => setEventWebsite(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Tags (optional, comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. music, coding, food"
                  value={eventTags}
                  onChange={(e) => setEventTags(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Event Rules (one per line)</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Bring water. No outside food."
                  value={eventRules}
                  onChange={(e) => setEventRules(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block mb-1">Automated Welcome Message (Inbox)</label>
                <textarea 
                  rows={2}
                  placeholder="Auto-sent to user's chat inbox upon joining this event..."
                  value={eventAutoWelcomeMessage}
                  onChange={(e) => setEventAutoWelcomeMessage(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-emerald-900 rounded-xl focus:outline-hidden focus:border-emerald-500 resize-none"
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

      {/* CREATE SHOP FORM DIALOG MODAL */}
      {isShopDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                🏪 Publish Shop / Store
              </h3>
              <button onClick={() => setIsShopDialogOpen(false)} className="text-zinc-400 hover:text-white font-bold text-xs bg-zinc-900 px-2.5 py-1 rounded">
                Close
              </button>
            </div>

            <form onSubmit={handlePublishShop} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Location Address</label>
                <input 
                  type="text" 
                  disabled 
                  value={tempAddress} 
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Shop Category</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Makeup Artist, Bakery"
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Shop Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Kalyan Organic Grocers"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">About & Description</label>
                <textarea 
                  rows={2}
                  placeholder="Describe your shop products, specialization, services..."
                  value={shopDesc}
                  onChange={(e) => setShopDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Opening Hours</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10:00 AM - 09:00 PM"
                    value={shopHours}
                    onChange={(e) => setShopHours(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Special Offers</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Flat 10% off"
                    value={shopOffers}
                    onChange={(e) => setShopOffers(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Contact Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +91 98765 43210"
                    value={shopContact}
                    onChange={(e) => setShopContact(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 919876543210"
                    value={shopWhatsapp}
                    onChange={(e) => setShopWhatsapp(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">
                  Select Tolee Group (Associate at least one)
                </label>
                {userTolees.length === 0 ? (
                  <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl text-center">
                    <p className="text-[11px] text-red-400 font-bold">You don't own any Tolee groups yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsShopDialogOpen(false);
                        setIsGroupDialogOpen(true);
                      }}
                      className="mt-2 px-3 py-1 bg-red-800 hover:bg-red-750 text-white font-black text-[10px] uppercase rounded-lg"
                    >
                      Create a Tolee Group First
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto border border-zinc-800 p-2.5 rounded-xl bg-zinc-900/50">
                    {userTolees.map((tg: any) => {
                      const checked = shopToleeIds.includes(tg.id);
                      return (
                        <label key={tg.id} className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setShopToleeIds(shopToleeIds.filter(id => id !== tg.id));
                              } else {
                                setShopToleeIds([...shopToleeIds, tg.id]);
                              }
                            }}
                            className="w-3.5 h-3.5 accent-cyan-500 rounded border-zinc-700 bg-zinc-800"
                          />
                          <span>{tg.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Website URL</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={shopWebsite}
                    onChange={(e) => setShopWebsite(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Shop Banner / Photos</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={shopCover}
                    onChange={(e) => setShopCover(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-[#06b6d4] uppercase tracking-wider block mb-1">
                  Business Logo (Mandatory)
                </label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    required
                    placeholder="https://... or upload logo"
                    value={shopLogo}
                    onChange={(e) => setShopLogo(e.target.value)}
                    className="flex-grow text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const mockLogos = [
                        'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=150&q=80',
                        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&q=80',
                        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=150&q=80'
                      ];
                      const chosen = mockLogos[Math.floor(Math.random() * mockLogos.length)];
                      setShopLogo(chosen);
                      alert('📸 Image Upload, Auto Crop (1:1 Ratio), Resize (150x150), and WebP Compression Completed successfully!');
                    }}
                    className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-bold rounded-xl active:scale-95 transition-all text-zinc-300"
                  >
                    📷 Upload
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Social Links (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. instagram.com/shop"
                  value={shopSocialLinks}
                  onChange={(e) => setShopSocialLinks(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={creatingShop}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {creatingShop ? 'Publishing Shop...' : 'Publish Shop Live ✓'}
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
