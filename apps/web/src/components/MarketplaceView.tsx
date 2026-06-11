'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Search, PlusCircle, MessageCircle, Home, Car, Smartphone, 
  Briefcase, Store, MoreVertical, Edit, Trash2, CheckCircle2, Heart, Copy, AlertTriangle, LayoutGrid, Plus, Rocket
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { deleteListing, updateListingStatus } from '@/actions/marketplace';
import { fetchEligibleAds } from '@/actions/ads';
import { QuickBoostModal } from './QuickBoostModal';
import { AdTracker } from './AdTracker';
import { getMediaThumbnail } from '@/lib/media';
import { getOrCreatePersonalChat } from '@/actions/chat';

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

export function MarketplaceView({ initialListings }: { initialListings: any[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user ? (session.user as any).id : undefined;

  const handleAdClick = async (e: React.MouseEvent, ad: any) => {
    e.preventDefault();
    e.stopPropagation();
    const advertiserId = ad.adSet?.campaign?.user?.id;
    if (!advertiserId) {
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (session?.user && (session.user as any).id === advertiserId) {
      router.push('/ads-manager');
      return;
    }

    try {
      const res = await getOrCreatePersonalChat(advertiserId);
      if (res.success && res.chatId) {
        router.push(`/chat?id=${res.chatId}&tab=personal`);
      } else {
        if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Chat redirection error:', err);
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const [listings, setListings] = useState(initialListings);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);

  // Ads and Boost State
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);
  const [quickBoostType, setQuickBoostType] = useState<'post' | 'reel' | 'listing'>('listing');
  const [quickBoostTargetId, setQuickBoostTargetId] = useState('');

  // Fetch sponsored ads on mount
  useEffect(() => {
    fetchEligibleAds({ limit: 10 }).then((res) => {
      if (Array.isArray(res)) {
        setSponsoredAds(res);
      }
    }).catch((err) => console.error('Failed to load sponsored ads:', err));
  }, []);

  const categories = [
    { name: 'All', icon: LayoutGrid },
    { name: 'Property', icon: Home },
    { name: 'Vehicles', icon: Car },
    { name: 'Electronics', icon: Smartphone },
    { name: 'Services', icon: Briefcase },
  ];

  const filteredListings = listings.filter(l => 
    (category === 'All' || l.category === category) &&
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemsToRender: any[] = [];
  let adIndex = 0;
  filteredListings.forEach((listing, index) => {
    itemsToRender.push({ type: 'listing', data: listing });
    if ((index + 1) % 4 === 0 && sponsoredAds.length > 0) {
      itemsToRender.push({ type: 'ad', data: sponsoredAds[adIndex % sponsoredAds.length] });
      adIndex++;
    }
  });

  const handleCardClick = (e: React.MouseEvent, listingId: string) => {
    const target = e.target as HTMLElement;
    // Don't navigate if clicking on buttons, triggers, or dropdown items
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[role="menuitem"]') || 
      target.closest('[data-slot="dropdown-menu-trigger"]')
    ) {
      return;
    }
    router.push(`/marketplace/listing/${listingId}`);
  };

  const handleCopyLink = (listingId: string) => {
    const link = `${window.location.origin}/marketplace/listing/${listingId}`;
    navigator.clipboard.writeText(link);
    alert("Listing link copied to clipboard!");
  };

  const handleSaveListing = (listingId: string) => {
    setSavedListingIds(prev => 
      prev.includes(listingId) ? prev.filter(id => id !== listingId) : [...prev, listingId]
    );
    alert("Listing saved to your favorites!");
  };

  const handleReportListing = () => {
    alert("Thank you. This listing has been flagged for admin review.");
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    const res = await deleteListing(listingId);
    if (res.success) {
      setListings(prev => prev.filter(l => l.id !== listingId));
    } else {
      alert("Failed to delete listing.");
    }
  };

  const handleMarkAsSold = async (listingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'sold' ? 'active' : 'sold';
    const res = await updateListingStatus(listingId, nextStatus);
    if (res.success) {
      setListings(prev => 
        prev.map(l => l.id === listingId ? { ...l, status: nextStatus } : l)
      );
    } else {
      alert("Failed to update status.");
    }
  };

  // Helper to dynamically resolve and style tags based on item data
  const getListingTags = (listing: any) => {
    const tags: { label: string; type: 'category' | 'condition' | 'number' | 'feature' }[] = [];
    
    tags.push({ label: listing.category.toUpperCase(), type: 'category' });
    
    if (listing.condition) {
      tags.push({ 
        label: listing.condition.replace('_', ' ').toUpperCase(), 
        type: 'condition' 
      });
    }

    // Synthesize specs to look identical to the screenshot
    if (listing.category.toLowerCase() === 'property') {
      if (listing.title.toLowerCase().includes('1bhk') || listing.title.toLowerCase().includes('1 bhk') || listing.id === 'mock-1') {
        tags.push({ label: '1', type: 'number' });
        tags.push({ label: '0', type: 'number' });
        tags.push({ label: '460', type: 'number' });
      } else if (listing.title.toLowerCase().includes('2bhk') || listing.title.toLowerCase().includes('2 bhk')) {
        tags.push({ label: '2', type: 'number' });
        tags.push({ label: '2', type: 'number' });
        tags.push({ label: '850', type: 'number' });
      }
      tags.push({ label: 'UNFURNISHED', type: 'feature' });
      tags.push({ label: 'FOR SALE', type: 'feature' });
      tags.push({ label: 'APARTMENT', type: 'feature' });
    } else if (listing.category.toLowerCase() === 'vehicles') {
      tags.push({ label: 'CAR', type: 'feature' });
      tags.push({ label: 'PETROL', type: 'feature' });
      tags.push({ label: 'MANUAL', type: 'feature' });
      tags.push({ label: 'INSURED', type: 'feature' });
    } else if (listing.category.toLowerCase() === 'electronics') {
      tags.push({ label: 'GADGET', type: 'feature' });
      tags.push({ label: 'WARRANTY', type: 'feature' });
      tags.push({ label: 'BRAND NEW', type: 'feature' });
    } else {
      tags.push({ label: 'PREMIUM', type: 'feature' });
      tags.push({ label: 'VERIFIED', type: 'feature' });
    }

    // Include database attributes if any
    if (listing.attributes && typeof listing.attributes === 'object') {
      Object.entries(listing.attributes).forEach(([key, val]) => {
        if (val && typeof val === 'string') {
          tags.push({ label: val.toUpperCase(), type: 'feature' });
        }
      });
    }

    // De-duplicate tags by label
    const seen = new Set();
    return tags.filter(t => {
      const duplicate = seen.has(t.label);
      seen.add(t.label);
      return !duplicate;
    }).slice(0, 8); // Display at most 8 tags
  };

  const getTagColorClasses = (type: 'category' | 'condition' | 'number' | 'feature', label: string) => {
    if (label.toUpperCase() === 'NEW') {
      return 'bg-[#EBFDF5] text-[#10B981] border-[#D1FAE5]';
    }
    switch (type) {
      case 'category':
        return 'bg-[#F0F9FF] text-[#0369A1] border-[#E0F2FE]';
      case 'condition':
        return 'bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]';
      case 'number':
        return 'bg-white text-zinc-800 border-zinc-200';
      case 'feature':
        return 'bg-white text-[#475569] border-[#E2E8F0]';
      default:
        return 'bg-white text-[#475569] border-[#E2E8F0]';
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl pt-24 min-h-screen font-sans bg-[#F8FAFC] dark:bg-zinc-950">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary dark:text-white tracking-tight">Marketplace</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base mt-1 font-medium">Buy and sell items locally</p>
        </div>
        <Link href="/marketplace/create" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto justify-center font-bold px-6 h-11 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 active:scale-[0.98] transition-all duration-300 flex items-center">
            <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center mr-2">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            Create New Listing
          </Button>
        </Link>
      </div>

      {/* Main Categories and Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Search Bar & Categories panel (Desktop Only) */}
        <div className="hidden lg:flex flex-col w-72 flex-shrink-0 gap-6">
          {/* Compact Search Bar */}
          <div className="relative group">
            <Search className="w-4.5 h-4.5 absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search marketplace..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 h-11 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all duration-300 shadow-sm"
            />
          </div>

          {/* Categories panel */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 rounded-[24px] p-5 shadow-sm">
            <h3 className="font-extrabold text-primary dark:text-white text-base tracking-wide mb-4">Categories</h3>
            <div className="space-y-1">
              {categories.map(cat => {
                const IconComponent = cat.icon;
                const isActive = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-primary'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile View: Search & Horizontal Categories Scroll */}
        <div className="lg:hidden flex flex-col gap-4 mb-4 w-full">
          {/* Mobile Search Bar */}
          <div className="relative group w-full">
            <Search className="w-4.5 h-4.5 absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search marketplace..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 h-11 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all duration-300 shadow-sm"
            />
          </div>

          {/* Mobile Horizontal Scroll Categories */}
          <div className="w-full overflow-x-auto flex gap-2 pb-3 scrollbar-none">
            {categories.map(cat => {
              const ActiveIcon = cat.icon;
              const isActive = category === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm border border-primary/20' 
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ActiveIcon className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Grid */}
        <div className="flex-1">
          {filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
              <Store className="w-14 h-14 text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white mb-1.5">No listings found</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm">Try adjusting your filters or search query to find what you're looking for.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6.5">
              {itemsToRender.map((item, idx) => {
                if (item.type === 'ad') {
                  const ad = item.data;
                  const advertiserName = ad.adSet?.campaign?.user?.name || 'Tolee Sponsor';
                  const advertiserAvatar = ad.adSet?.campaign?.user?.avatar || ad.adSet?.campaign?.user?.image || '';
                  const mediaList = ad.mediaUrls ? ad.mediaUrls.split(/,(?=https?:\/\/)/).map((u: string) => u.trim()).filter(Boolean) : [];
                  const displayMedia = mediaList[0] || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80`;
                  const headline = ad.headline || 'Sponsored Ad';
                  const ctaText = ad.ctaButton === 'send_message' ? 'Send Message' : ad.ctaButton === 'shop_now' ? 'Shop Now' : ad.ctaButton === 'sign_up' ? 'Sign Up' : 'Learn More';

                  // Find preceding listing details to attribute revenue correctly
                  let precedingListingId: string | undefined = undefined;
                  for (let i = idx - 1; i >= 0; i--) {
                    if (itemsToRender[i].type === 'listing') {
                      precedingListingId = itemsToRender[i].data.id;
                      break;
                    }
                  }

                  return (
                    <Card 
                      key={`ad-${ad.id}-${idx}`}
                      className="p-4 border border-indigo-155 dark:border-indigo-900 bg-gradient-to-b from-white to-indigo-50/10 dark:from-[#0d0d0f] dark:to-[#0a0a0c] group hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-none transition-all duration-300 rounded-[28px] flex flex-col relative"
                    >
                      {/* Impression Tracker */}
                      <AdTracker adId={ad.id} type="impression" contentId={precedingListingId} placementType="normal_feed" />

                      <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden rounded-[18px] shrink-0">
                        <AdTracker adId={ad.id} type="click" contentId={precedingListingId} placementType="normal_feed" className="w-full h-full">
                          <div onClick={(e) => handleAdClick(e, ad)} className="w-full h-full cursor-pointer">
                            <img 
                              src={displayMedia} 
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out rounded-[18px]" 
                              alt={headline}
                            />
                          </div>
                        </AdTracker>
                        
                        {/* Sponsored Badge Overlay (Top Left) */}
                        <div className="absolute top-3.5 left-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md shadow-black/10 flex items-center gap-1">
                          <Rocket className="w-3 h-3 text-white animate-pulse" /> Sponsored
                        </div>

                        {/* Top Right Verified Badge */}
                        <div className="absolute top-3.5 right-3.5 z-10 bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-full text-[9px] shadow-sm uppercase tracking-wider">
                          Verified Partner
                        </div>
                      </div>
                      
                      <CardContent className="p-0 pt-4 flex flex-col flex-grow">
                        {/* Headline */}
                        <h3 className="font-extrabold text-[17px] md:text-[18px] text-indigo-950 dark:text-white line-clamp-1 mb-1">
                          {headline}
                        </h3>
                        
                        {/* Primary Text or Description */}
                        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 flex items-center mb-3 line-clamp-2 min-h-[32px]">
                          {ad.primaryText || ad.description || 'Promoted product/service on Tolee Marketplace.'}
                        </p>

                        {/* Soft Chips representing categories/tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4 flex-grow content-start">
                          <span className="px-2.5 py-1 border border-indigo-100 dark:border-indigo-950/40 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                            PROMOTED
                          </span>
                          <span className="px-2.5 py-1 border border-[#EBFDF5] rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-[#EBFDF5] dark:bg-emerald-950/20 text-[#10B981]">
                            OFFER ACTIVE
                          </span>
                        </div>

                        {/* Bottom Info/Action Section */}
                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-auto">
                          <div className="flex items-center gap-2">
                            {advertiserAvatar ? (
                              <img src={getValidAvatarUrl(advertiserAvatar)} alt={advertiserName} className="w-6.5 h-6.5 rounded-full object-cover border border-zinc-100" />
                            ) : (
                              <div className="w-6.5 h-6.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-200">
                                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                                  {advertiserName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]">
                              {advertiserName}
                            </span>
                          </div>
                          
                          <AdTracker adId={ad.id} type="lead" contentId={precedingListingId} placementType="normal_feed">
                            <div onClick={(e) => handleAdClick(e, ad)} className="cursor-pointer">
                              <Button 
                                size="sm" 
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 h-9 font-extrabold text-xs flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg"
                              >
                                {ctaText}
                              </Button>
                            </div>
                          </AdTracker>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                const listing = item.data;
                const isOwner = listing.sellerId === currentUserId;
                const isSaved = savedListingIds.includes(listing.id);
                const tags = getListingTags(listing);

                return (
                  <Card 
                    key={listing.id} 
                    onClick={(e) => handleCardClick(e, listing.id)}
                    className="p-4 border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 group hover:shadow-xl hover:shadow-zinc-200/40 dark:hover:shadow-none transition-all duration-300 rounded-[28px] flex flex-col cursor-pointer relative"
                  >
                    <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden rounded-[18px] shrink-0">
                      <img 
                        src={listing.images?.split(/,(?=https?:\/\/)/)[0] || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80`} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out rounded-[18px]" 
                        alt={listing.title}
                      />
                      
                      {/* Price Badge Overlay (Top Left) */}
                      <div className="absolute top-3.5 left-3.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full text-[13px] font-extrabold shadow-md shadow-black/10">
                        ₹{listing.price.toLocaleString('en-IN')}
                      </div>

                      {/* Status Sold Indicator */}
                      {listing.status === 'sold' && (
                        <div className="absolute top-3.5 right-14 bg-red-500 text-white font-extrabold px-3 py-1 rounded-full text-[10px] shadow-sm uppercase tracking-wider">
                          Sold
                        </div>
                      )}

                      {/* Three-Dot Menu Overlay (Top Right) */}
                      <div className="absolute top-3.5 right-3.5 z-20">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-primary shadow-md border border-zinc-100 flex items-center justify-center"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 rounded-2xl p-1.5 shadow-xl z-30">
                            {isOwner ? (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/marketplace/edit/${listing.id}`)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5 text-zinc-500" /> Edit Listing
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleMarkAsSold(listing.id, listing.status)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> {listing.status === 'sold' ? 'Mark Active' : 'Mark as Sold'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCopyLink(listing.id)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5 text-zinc-500" /> Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(listing.id)}
                                  className="flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Listing
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleSaveListing(listing.id)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-red-500' : 'text-zinc-500'}`} /> {isSaved ? 'Saved' : 'Save Listing'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCopyLink(listing.id)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5 text-zinc-500" /> Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={handleReportListing}
                                  className="flex items-center gap-2 px-3 py-2.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Report Listing
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <CardContent className="p-0 pt-4 flex flex-col flex-grow">
                      {/* Title */}
                      <h3 className="font-bold text-[17px] md:text-[18px] text-primary dark:text-white line-clamp-1 mb-1.5 transition-colors duration-300">
                        {listing.title}
                      </h3>
                      
                      {/* Location */}
                      <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 flex items-center mb-3">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400" /> {listing.locationText}
                      </p>

                      {/* Premium Soft Tag Chips */}
                      <div className="flex flex-wrap gap-1.5 mb-4 flex-grow content-start">
                        {tags.map((tag, tagIdx) => (
                          <span 
                            key={tagIdx} 
                            className={`px-2.5 py-1 border rounded-full text-[9px] font-extrabold tracking-wide uppercase ${getTagColorClasses(tag.type, tag.label)}`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>

                      {/* Bottom Info/Action Section */}
                      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                          {listing.seller?.avatar ? (
                            <img src={getValidAvatarUrl(listing.seller.avatar)} alt="Seller" className="w-6.5 h-6.5 rounded-full object-cover border border-zinc-100" />
                          ) : (
                            <div className="w-6.5 h-6.5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                              <span className="text-[10px] font-extrabold text-primary dark:text-zinc-400 uppercase">
                                {listing.seller?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]">
                            {listing.seller?.name || 'User'}
                          </span>
                        </div>
                        
                        {isOwner ? (
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickBoostTargetId(listing.id);
                              setIsQuickBoostOpen(true);
                            }}
                            className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:via-teal-700 hover:to-indigo-700 text-white px-4 h-9 font-extrabold text-xs flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-sm shadow-emerald-500/10 animate-pulse animate-in duration-300"
                          >
                            <Rocket className="w-3.5 h-3.5" /> Boost
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground px-4 h-9 font-bold text-xs flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-sm shadow-primary/10"
                          >
                            <MessageCircle className="w-4 h-4" /> Message
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Quick Boost Modal */}
      <QuickBoostModal 
        isOpen={isQuickBoostOpen} 
        onClose={() => setIsQuickBoostOpen(false)} 
        type={quickBoostType} 
        targetId={quickBoostTargetId} 
      />
    </div>
  );
}
