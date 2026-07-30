'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, Globe, Lock, ImageIcon, Monitor, Smartphone, CheckCircle2, 
  ArrowRight, ArrowLeft, Search, Eye, EyeOff, Sparkles, Building2,
  Briefcase, TrendingUp, PartyPopper, GraduationCap, School, ShoppingCart,
  Landmark, HeartHandshake, Factory, ClipboardList, Stethoscope, Home,
  Utensils, Sun, Users
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createTolee } from '@/actions/tolee';
import { TOLEE_TYPE_REGISTRY } from '@/modules/tolee-types/registry';

const ICON_MAP: Record<string, any> = {
  Building2, Briefcase, TrendingUp, PartyPopper, GraduationCap,
  School, ShoppingCart, Landmark, HeartHandshake, Factory,
  ClipboardList, Stethoscope, Home, Utensils, Sun, Users
};

export default function CreateToleePage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string>('general');
  const [isPublicVisible, setIsPublicVisible] = useState<boolean>(true);

  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private' | null>('public');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [rules, setRules] = useState('');
  const [questions, setQuestions] = useState('');
  const [postApproval, setPostApproval] = useState(true);

  // New location fields (Mandatory)
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [tags, setTags] = useState('');

  // Map & Geocoding Picker state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const mapRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);

  const categories = ['Buy and Sell', 'Business', 'Education', 'Jobs', 'Real Estate', 'Community', 'Gaming', 'Tech'];

  const isFormValid = name.trim().length > 0 && 
                      privacy !== null && 
                      country.trim().length > 0 && 
                      city.trim().length > 0 && 
                      lat !== null;

  // Dynamically initialize Leaflet map inside modal
  React.useEffect(() => {
    if (!isMapModalOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapMarkerRef.current = null;
      }
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadScript = () => {
      const L = (window as any).L;
      if (!L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => initPickerMap();
        document.body.appendChild(script);
      } else {
        initPickerMap();
      }
    };

    const initPickerMap = () => {
      const L = (window as any).L;
      if (!L || mapRef.current) return;

      const initialLat = lat || 19.2610; // Default Kalyan West
      const initialLng = lng || 73.1280;

      const mapInstance = L.map('picker-map', { zoomControl: false }).setView([initialLat, initialLng], 14);
      mapRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      const customIcon = L.divIcon({
        className: 'picker-temp-pin',
        html: `
          <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
            <span style="font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customIcon
      }).addTo(mapInstance);
      mapMarkerRef.current = marker;

      if (!lat) {
        triggerReverseGeocoding(initialLat, initialLng);
      }

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        triggerReverseGeocoding(pos.lat, pos.lng);
      });

      mapInstance.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        triggerReverseGeocoding(e.latlng.lat, e.latlng.lng);
      });
    };

    loadScript();
  }, [isMapModalOpen]);

  const triggerReverseGeocoding = async (latitude: number, longitude: number) => {
    setGeocoding(true);
    setLat(latitude);
    setLng(longitude);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
      if (res.ok) {
        const data = await res.json();
        const addressObj = data.address || {};
        
        setCountry(addressObj.country || 'India');
        setStateName(addressObj.state || 'Maharashtra');
        setDistrict(addressObj.state_district || addressObj.county || addressObj.district || '');
        setCity(addressObj.city || addressObj.town || addressObj.village || addressObj.municipality || 'Mumbai');
        setArea(addressObj.suburb || addressObj.neighbourhood || addressObj.locality || addressObj.quarter || '');
        setAddress(data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeocoding(false);
    }
  };

  const handlePickerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=5`);
      const data = await res.json();
      setMapSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSelectPickerResult = (res: any) => {
    const latitude = parseFloat(res.lat);
    const longitude = parseFloat(res.lon);
    
    setLat(latitude);
    setLng(longitude);
    
    const addressObj = res.address || {};
    setCountry(addressObj.country || 'India');
    setStateName(addressObj.state || 'Maharashtra');
    setDistrict(addressObj.state_district || addressObj.county || addressObj.district || '');
    setCity(addressObj.city || addressObj.town || addressObj.village || addressObj.municipality || 'Mumbai');
    setArea(addressObj.suburb || addressObj.neighbourhood || addressObj.locality || addressObj.quarter || '');
    setAddress(res.display_name || '');
    
    setMapSearchResults([]);
    setMapSearchQuery('');

    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
      if (mapMarkerRef.current) {
        mapMarkerRef.current.setLatLng([latitude, longitude]);
      }
    }
  };

  const handleUseGPSPicker = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        triggerReverseGeocoding(latitude, longitude);

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
          if (mapMarkerRef.current) {
            mapMarkerRef.current.setLatLng([latitude, longitude]);
          }
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'cover') {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      } else {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreate = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);

    let finalCover = '';
    let finalAvatar = '';

    // Upload Cover
    if (coverFile) {
      const fd = new FormData();
      fd.append('file', coverFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) finalCover = data.url;
      } catch (err) {}
    }

    // Upload Avatar
    if (avatarFile) {
      const fd = new FormData();
      fd.append('file', avatarFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) finalAvatar = data.url;
      } catch (err) {}
    }

    const result = await createTolee({
      name,
      isPrivate: privacy === 'private',
      toleeType: selectedType,
      isSearchable: isPublicVisible,
      isPublicVisible: isPublicVisible,
      description,
      category: selectedType,
      location: address || `${city}, ${stateName}`,
      rules,
      membershipQuestions: questions,
      pendingPostApproval: postApproval,
      coverImage: finalCover || undefined,
      avatar: finalAvatar || undefined,
      latitude: lat || undefined,
      longitude: lng || undefined,
      address: address || undefined,
      country: country || undefined,
      state: stateName || undefined,
      district: district || undefined,
      city: city || undefined,
      area: area || undefined,
      tags: tags || undefined
    });

    if (result.success && result.tolee) {
      window.location.href = `/t/${result.tolee.slug}?created=true`;
    } else {
      alert(`Failed to create Tolee: ${result.error || 'Unknown error'}`);
      console.error(result.error);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] dark:bg-black overflow-hidden font-sans">
      {step === 1 ? (
        /* STEP 1: PURPOSE SELECTION WIZARD */
        <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full custom-scrollbar">
          <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-center gap-3">
              <Link href="/discover">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
              </Link>
              <div className="text-sm font-semibold text-gray-500">Step 1 of 2: Select Tolee Purpose</div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
              Community Operating System (COS)
            </span>
          </div>

          <div className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">What type of Tolee do you want to create?</h1>
            <p className="text-sm text-gray-500 mt-2">
              Select a community purpose. Tolee automatically provisions dedicated SaaS business modules, governance roles, and AI assistants tailored for your type.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {Object.values(TOLEE_TYPE_REGISTRY).map((typeItem) => {
              const IconComp = ICON_MAP[typeItem.icon] || Users;
              const isSelected = selectedType === typeItem.id;
              return (
                <div
                  key={typeItem.id}
                  onClick={() => setSelectedType(typeItem.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.02]'
                      : 'bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 hover:border-indigo-400 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {typeItem.categoryTag}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">{typeItem.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{typeItem.description}</p>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg w-fit mb-2">
                      👥 {typeItem.estimatedMembers}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {typeItem.features.slice(0, 2).map((f) => (
                        <span key={f.id} className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          ✓ {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pb-12">
            <Button
              onClick={() => setStep(2)}
              className="h-13 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-lg flex items-center gap-2"
            >
              Continue to Setup ({TOLEE_TYPE_REGISTRY[selectedType]?.title}) <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* STEP 2: COMMON SETUP FORM */
        <>
          {/* LEFT SIDEBAR (Configuration) */}
          <div className="w-full md:w-[380px] bg-white dark:bg-[#121212] flex flex-col h-full border-r border-gray-200 dark:border-gray-800 shadow-sm z-10">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Purpose
              </button>
              <span className="text-xs font-bold text-gray-500">Step 2 of 2</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tolee Setup</h1>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {TOLEE_TYPE_REGISTRY[selectedType]?.title}
                </span>
              </div>

          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarImage src={session?.user?.image || "https://i.pravatar.cc/150?u=me"} />
              <AvatarFallback>{session?.user?.name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{session?.user?.name || "Admin User"}</p>
              <p className="text-xs text-gray-500 font-medium">Admin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Tolee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-lg bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-primary focus-visible:border-primary text-base px-4"
              />
            </div>

            {/* Privacy Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full h-14 rounded-lg border ${isDropdownOpen ? 'border-primary ring-1 ring-primary' : 'border-gray-300 dark:border-gray-700'} bg-transparent flex items-center justify-between px-4 transition-all`}
              >
                <div className="flex items-center gap-2">
                  {!privacy ? (
                    <span className="text-gray-500">Choose privacy</span>
                  ) : privacy === 'public' ? (
                    <><Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" /><span className="text-gray-900 dark:text-white">Public</span></>
                  ) : (
                    <><Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" /><span className="text-gray-900 dark:text-white">Private</span></>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-16 left-0 w-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-2">
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex gap-3"
                    onClick={() => { setPrivacy('public'); setIsDropdownOpen(false); }}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <Globe className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Public</h4>
                      <p className="text-xs text-gray-500">Anyone can see who's in the tolee and what they post.</p>
                    </div>
                    {privacy === 'public' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                  </div>
                  
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex gap-3"
                    onClick={() => { setPrivacy('private'); setIsDropdownOpen(false); }}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Private</h4>
                      <p className="text-xs text-gray-500">Only members can see who's in the tolee and what they post.</p>
                    </div>
                    {privacy === 'private' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                  </div>
                </div>
              )}
            </div>

            {/* Location (Mandatory Selection) */}
            <div className="space-y-3">
              {!lat ? (
                <div 
                  onClick={() => setIsMapModalOpen(true)}
                  className="p-4 border-2 border-dashed border-red-300 hover:border-red-400 bg-red-50/50 dark:bg-red-950/10 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📍</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Mandatory Group Location</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Please click here to select group locality.</p>
                    </div>
                  </div>
                  <span className="text-xs text-red-500 font-bold bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded">Required</span>
                </div>
              ) : (
                <div 
                  className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-950/10 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-none">Group Location Set</h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide mt-1.5 font-bold">{area || 'Local Area'}, {city}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsMapModalOpen(true)}
                      className="text-xs font-bold text-primary hover:underline bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 px-2.5 py-1 rounded"
                    >
                      Change
                    </button>
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate leading-relaxed text-left">
                    {address}
                  </div>
                </div>
              )}
            </div>

            {/* Public Search & Discovery Visibility (User Request) */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 space-y-2.5 my-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Public Search & Explore Visibility</h4>
                  <p className="text-[11px] text-gray-500">Allow this Tolee to be discovered by public users on Search & Map?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPublicVisible(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    isPublicVisible
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Visible (Public)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublicVisible(false)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    !isPublicVisible
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" /> Hidden (Secret)
                </button>
              </div>
            </div>

            {/* Tags (Optional) */}
            <div>
              <Input
                placeholder="Tags (Optional) e.g. cricket, coding, food"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="h-12 rounded-lg bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-primary focus-visible:border-primary text-sm px-4"
              />
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                {isAdvancedOpen ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                <svg className={`w-4 h-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>

            {/* Advanced Settings Content */}
            {isAdvancedOpen && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                
                {/* Images Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tolee Graphics</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition text-center min-h-[100px] relative overflow-hidden"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">Cover Photo</span>
                        </>
                      )}
                    </div>
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition text-center min-h-[100px] relative overflow-hidden"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">Profile Picture</span>
                        </>
                      )}
                    </div>
                  </div>
                  <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    placeholder="What is this Tolee about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent flex items-center justify-between px-4 text-sm"
                  >
                    <span className={category ? "text-gray-900 dark:text-white" : "text-gray-500"}>
                      {category || 'Select category'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute top-[70px] left-0 w-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                      {categories.map((cat) => (
                        <div 
                          key={cat}
                          className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm flex justify-between items-center"
                          onClick={() => { setCategory(cat); setIsCategoryOpen(false); }}
                        >
                          <span>{cat}</span>
                          {category === cat && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                {/* Membership Questions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Membership Questions</label>
                  <p className="text-xs text-gray-500 mb-2">Ask questions to people requesting to join.</p>
                  <textarea
                    placeholder="e.g. What is your budget? (One per line)"
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tolee Rules</label>
                  <p className="text-xs text-gray-500 mb-2">Set rules for behavior.</p>
                  <textarea
                    placeholder="e.g. No spam, be respectful. (One per line)"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Post Approval */}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Require Post Approval</label>
                    <p className="text-xs text-gray-500">Admins must approve posts.</p>
                  </div>
                  <div 
                    className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${postApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                    onClick={() => setPostApproval(!postApproval)}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${postApproval ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212]">
          <Button 
            className="w-full h-11 text-base font-bold rounded-lg"
            disabled={!isFormValid || isCreating}
            onClick={handleCreate}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>

      {/* RIGHT SIDEBAR (Preview) */}
      <div className="flex-1 hidden md:flex flex-col p-6 overflow-y-auto">
        <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex-1 max-w-4xl mx-auto w-full flex flex-col overflow-hidden">
          
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#121212] z-10">
            <span className="font-bold text-[15px] text-gray-900 dark:text-white">Desktop Preview</span>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-gray-100 dark:bg-gray-800 text-primary rounded-md"><Monitor className="w-5 h-5" /></button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"><Smartphone className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121212]">
            {/* Banner */}
            <div className="relative w-full h-[350px] bg-gray-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 rounded-b-xl flex items-center justify-center">
              <img src={coverPreview || "/default-tolee-cover.svg"} alt="Cover" className={`w-full h-full object-cover rounded-b-xl ${coverPreview ? '' : 'opacity-80'}`} />
              {!coverPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 font-medium bg-black/10">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50 text-white" />
                  <span className="text-white">Cover photo preview</span>
                </div>
              )}
            </div>

            {/* Title & Privacy */}
            <div className="px-8 pt-6 pb-4 relative">
              <div className="absolute -top-16 left-8 w-24 h-24 rounded-2xl border-4 border-white dark:border-[#121212] bg-white dark:bg-[#121212] overflow-hidden shadow-sm z-10">
                <img src={avatarPreview || "/default-tolee-avatar.svg"} alt="DP" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 mt-8">
                {name.trim() || 'Tolee name'}
              </h1>
              <div className="flex items-center text-sm font-medium text-gray-500 gap-1.5">
                {privacy === 'public' ? <Globe className="w-4 h-4" /> : privacy === 'private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                <span>{privacy === 'public' ? 'Public tolee' : privacy === 'private' ? 'Private tolee' : 'Tolee privacy'}</span>
                <span>•</span>
                <span>1 member</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-8 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-6">
                {['About', 'Posts', 'Members', 'Events'].map((tab, i) => (
                  <button key={tab} className={`pb-3 text-[15px] font-semibold ${i === 0 ? 'text-primary border-b-4 border-primary' : 'text-gray-500'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Layout Preview */}
            <div className="p-8 bg-[#f0f2f5] dark:bg-black min-h-[400px]">
              <div className="flex gap-4">
                <div className="w-full max-w-[600px] space-y-4">
                  {/* Create Post Card */}
                  <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{session?.user?.name?.[0] || "A"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 h-10 rounded-full bg-gray-100 dark:bg-gray-800 px-4 flex items-center text-gray-500 text-[15px]">
                          What's on your mind?
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <ImageIcon className="w-5 h-5 text-green-500" /> Photo/video
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <div className="w-5 h-5 rounded bg-blue-500" /> Tag people
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <div className="w-5 h-5 rounded-full border-2 border-yellow-500" /> Feeling/activity
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* About Card Preview */}
                <div className="hidden lg:block w-[360px]">
                  <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212]">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-[17px] mb-4">About</h3>
                      <div className="flex gap-3 mb-4">
                        <div className="mt-0.5">
                          {privacy === 'public' ? <Globe className="w-5 h-5 text-gray-500" /> : <Lock className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-[15px]">{privacy === 'public' ? 'Public' : 'Private'}</p>
                          <p className="text-sm text-gray-500 leading-tight mt-1">
                            {privacy === 'public' 
                              ? "Anyone can see who's in the tolee and what they post." 
                              : "Only members can see who's in the tolee and what they post."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </>
      )}

      {/* MAP LOCATION PICKER MODAL */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                📍 Pin Group Locality
              </h3>
              <button 
                type="button"
                onClick={() => setIsMapModalOpen(false)} 
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-xs bg-gray-105 dark:bg-zinc-900 px-2.5 py-1 rounded"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 flex flex-col min-h-0">
              {/* Autocomplete location search bar */}
              <form onSubmit={handlePickerSearch} className="relative flex gap-1.5">
                <input 
                  type="text"
                  placeholder="Search locality, city, landmark..."
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  className="flex-1 text-xs px-3 py-2.5 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900 focus:outline-hidden text-zinc-900 dark:text-white"
                />
                <button type="submit" className="px-3.5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shrink-0">
                  Search
                </button>

                {mapSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {mapSearchResults.map((res, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectPickerResult(res)}
                        className="p-2.5 text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer border-b border-gray-105 dark:border-zinc-800/50 last:border-0 truncate"
                      >
                        {res.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </form>

              {/* The Map Div Container */}
              <div 
                id="picker-map" 
                className="w-full h-64 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 shrink-0 z-10"
              />

              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-hidden text-zinc-900 dark:text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">State</label>
                  <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-hidden text-zinc-900 dark:text-white mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">District</label>
                  <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-hidden text-zinc-900 dark:text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-hidden text-zinc-900 dark:text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Area / Locality</label>
                  <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-hidden text-zinc-900 dark:text-white mt-1" />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleUseGPSPicker}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  🌐 Use Current GPS
                </button>
                <button 
                  type="button"
                  disabled={!lat || geocoding}
                  onClick={() => setIsMapModalOpen(false)}
                  className="flex-1 py-2.5 bg-primary hover:opacity-90 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1"
                >
                  {geocoding ? 'Loading address...' : 'Confirm Location ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
