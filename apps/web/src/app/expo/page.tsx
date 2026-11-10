'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Tent, 
  Sparkles, 
  BadgePercent, 
  Search, 
  Tag, 
  Flame, 
  CheckCircle2, 
  ExternalLink, 
  PhoneCall, 
  MessageSquare, 
  Play, 
  ShoppingBag, 
  Filter, 
  Award, 
  ArrowRight,
  ShieldCheck,
  Star,
  Store,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ExpoListing {
  id: string;
  brandName: string;
  category: 'fashion' | 'beauty' | 'food' | 'jewellery' | 'wellness';
  categoryLabel: string;
  stallTier: 'vip' | 'gold' | 'silver';
  stallTierLabel: string;
  city: string;
  tagline: string;
  offerLabel: string;
  offerDescription: string;
  productName: string;
  originalPrice: number;
  expoPrice: number;
  discountPct: number;
  image: string;
  creatorReview?: {
    creatorName: string;
    handle: string;
    rating: string;
  };
  features: string[];
  whatsappMessage: string;
  isVerified: boolean;
}

const EXPO_LISTINGS: ExpoListing[] = [
  {
    id: 'kashvi-handlooms',
    brandName: 'Kashvi Ethnic Studio',
    category: 'fashion',
    categoryLabel: '👗 Fashion & Ethnic',
    stallTier: 'vip',
    stallTierLabel: '🏆 VIP Front-Row Stall',
    city: 'Jaipur, Rajasthan',
    tagline: 'Authentic Sanganeri Block-Printed Cotton Ensembles',
    offerLabel: 'FLAT 50% OFF EXPO DEAL',
    offerDescription: 'Pure Mulmul Cotton Anarkali Suit set with hand-block dupatta & pants. Pre-washed, breathable organic fabric.',
    productName: 'Royal Indigo Floral Anarkali Set (3-Piece)',
    originalPrice: 2999,
    expoPrice: 1499,
    discountPct: 50,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Aanya Sharma',
      handle: '@aanya_fashion (120k)',
      rating: '4.9 ★ (Verified Fit & Fabric)'
    },
    features: ['100% Pure Cotton', 'Hand Block Printed', 'Free Shipping & COD Available'],
    whatsappMessage: 'Hello Kashvi Studio, I saw your 50% OFF Royal Indigo Anarkali on Tolee Expo! I want to book my size.',
    isVerified: true
  },
  {
    id: 'nutriherb-organics',
    brandName: 'NutriHerb Himalayan Organics',
    category: 'wellness',
    categoryLabel: '🌿 Health & Wellness',
    stallTier: 'gold',
    stallTierLabel: '🥇 Gold Expo Stall',
    city: 'Dehradun, Uttarakhand',
    tagline: 'Direct-from-Source Himalayan Shilajit & Herbal Extracts',
    offerLabel: 'BUY 1 GET 1 FREE + SHIP FREE',
    offerDescription: 'Grade-A Purified Himalayan Shilajit Resin (20g Jar) with 75%+ Fulvic Acid. Free Lab Certificate with each order.',
    productName: 'Pure Gold Grade Himalayan Shilajit Resin (20g)',
    originalPrice: 1999,
    expoPrice: 999,
    discountPct: 50,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Dr. Rohit Mehra',
      handle: '@dr_fit_rohit (Health Creator)',
      rating: '5.0 ★ (Lab Test Verified)'
    },
    features: ['Ayush Certified', 'Lab Tested 75%+ Fulvic', 'Buy 1 Get 1 Free Promo'],
    whatsappMessage: 'Hi NutriHerb, I saw your Buy 1 Get 1 Free Himalayan Shilajit offer on Tolee Expo. Please share order details.',
    isVerified: true
  },
  {
    id: 'urbanchai-co',
    brandName: 'UrbanChai Co. & Bakery',
    category: 'food',
    categoryLabel: '☕ Food & Gourmet',
    stallTier: 'gold',
    stallTierLabel: '🥇 Gold Expo Stall',
    city: 'Mumbai / Pune',
    tagline: 'Artisanal Spiced Tea Blends & Handmade Butter Cookies',
    offerLabel: 'EXPO TASTING COMBO (SAVE ₹350)',
    offerDescription: 'Kadak Ginger-Cardamom Masala Tea (250g) + Pista Cashew Artisan Butter Cookies (Box of 12). Vacuum packed fresh.',
    productName: 'Chai Lover Feast Box (Tea + 12 Cookies)',
    originalPrice: 850,
    expoPrice: 499,
    discountPct: 41,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Samir Joshi',
      handle: '@mumbaifoodie_sam',
      rating: '4.8 ★ (Must-Try Aroma)'
    },
    features: ['No Added Preservatives', '100% Real Spices', 'Same-Day Dispatch'],
    whatsappMessage: 'Hello UrbanChai Co, I want to order the Chai Lover Feast Box at ₹499 seen on Tolee Expo.',
    isVerified: true
  },
  {
    id: 'auracrafts-jewels',
    brandName: 'AuraCrafts Eco-Jewels',
    category: 'jewellery',
    categoryLabel: '💍 Jewellery & Silver',
    stallTier: 'silver',
    stallTierLabel: '🥈 Silver Expo Stall',
    city: 'Delhi-NCR',
    tagline: '925 Sterling Silver & Moissanite Diamond Daily Wear',
    offerLabel: 'EXTRA 25% OFF CODE: EXPO2026',
    offerDescription: 'Certified 925 Pure Silver Solitaire Ring with VVS Moissanite Diamond center. Anti-tarnish rhodium coating.',
    productName: 'Celeste 1-Carat Moissanite Silver Solitaire Ring',
    originalPrice: 2450,
    expoPrice: 1850,
    discountPct: 24,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Neha Verma',
      handle: '@neha_lifestyle',
      rating: '4.9 ★ (Indistinguishable from Diamond)'
    },
    features: ['925 Hallmark Certified', 'Zero Tarnish Guarantee', 'Gift Box & Certificate'],
    whatsappMessage: 'Hi AuraCrafts, I am interested in the Celeste 1-Carat Ring offer from Tolee Expo with code EXPO2026.',
    isVerified: true
  }
];

export default function ToleeExpoPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showVendorModal, setShowVendorModal] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: '🎪 All Stalls' },
    { id: 'fashion', label: '👗 Fashion & Ethnic' },
    { id: 'wellness', label: '🌿 Health & Wellness' },
    { id: 'food', label: '☕ Food & Gourmet' },
    { id: 'jewellery', label: '💍 Jewellery & Accessories' },
  ];

  const filteredListings = useMemo(() => {
    return EXPO_LISTINGS.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchQuery = searchQuery.trim() === '' || 
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.offerLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#115E59] to-[#0D9488] p-6 sm:p-8 text-white shadow-xl">
          {/* Decorative Background Elements */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-20 top-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
                <Tent className="w-3.5 h-3.5" />
                <span>TOLEE EXPO 2026 • SMALL BUSINESS BRANDS ZONE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                India's Sovereign Virtual Trade Fair & Brand Offers 🇮🇳
              </h1>
              <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
                Discover factory-direct discounts, creator-reviewed boutique products, and local business offers. Direct WhatsApp ordering with zero middleman markups!
              </p>
            </div>

            {/* VENDOR PITCH CARD */}
            <div className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/25 rounded-xl p-4 sm:p-5 text-center md:text-left space-y-2.5 max-w-sm">
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Join Tolee Expo Stalls</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                Starting ₹49,999/-
              </div>
              <p className="text-xs text-teal-100">
                1 Influencer Reel + PR News + YouTube Boost + 3 Mo Free Tolee Feed Ads!
              </p>
              <a 
                href="https://wa.me/918976274649?text=Hello%20Tolee%20Team,%20I%20am%20interested%20in%20booking%20a%20stall%20in%20Tolee%20Expo."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs transition-colors shadow-md"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Book Expo Slot (+91 8976274649)</span>
              </a>
            </div>
          </div>
        </div>

        {/* CONTROLS: CATEGORIES & SEARCH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-shrink-0 w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands, offers, city..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* LISTINGS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredListings.map(listing => (
            <div 
              key={listing.id}
              className="group bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                {/* Product Image & Offer Badge Header */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
                  <img 
                    src={listing.image} 
                    alt={listing.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Stall Tier Badge (Top Left) */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs ${
                      listing.stallTier === 'vip' 
                        ? 'bg-amber-400 text-slate-950 font-black' 
                        : listing.stallTier === 'gold'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-white'
                    }`}>
                      {listing.stallTierLabel}
                    </span>
                  </div>

                  {/* Discount / Offer Tag (Top Right) */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                      {listing.offerLabel}
                    </span>
                  </div>

                  {/* Brand & City Overlay (Bottom) */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm drop-shadow-md">{listing.brandName}</span>
                      {listing.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 fill-teal-400 drop-shadow-xs" />
                      )}
                    </div>
                    <p className="text-[11px] text-teal-200 drop-shadow-xs">{listing.city}</p>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-600 transition-colors">
                      {listing.productName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {listing.offerDescription}
                    </p>
                  </div>

                  {/* Creator Review Badge */}
                  {listing.creatorReview && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-[11px] text-teal-900 dark:text-teal-200">
                      <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                        <Play className="w-2.5 h-2.5 fill-white" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold">{listing.creatorReview.creatorName}</span>
                        <span className="text-[10px] text-teal-700 dark:text-teal-400 ml-1.5">
                          {listing.creatorReview.rating}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Feature Bullets */}
                  <div className="flex flex-wrap gap-1">
                    {listing.features.map((feat, idx) => (
                      <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>

                  {/* Price Block */}
                  <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      ₹{listing.expoPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      ₹{listing.originalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 ml-auto">
                      ({listing.discountPct}% OFF)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <a
                  href={`https://wa.me/918976274649?text=${encodeURIComponent(listing.whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Claim Expo Offer on WhatsApp</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER VENDOR BANNER: BOOK YOUR EXPO STALL */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-teal-600 p-0.5 shadow-lg">
          <div className="rounded-2xl bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                For Retailers, Boutiques, Clinics & Cafes
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Want Your Brand Stall Featured on Tolee Expo?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
                Get an Influencer Reel shoot, Instagram collaborative promotion, national digital PR release, YouTube ad boost, and 3 full months of free ad rotation on Tolee Feed Page!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="text-center md:text-right">
                <div className="text-xs text-slate-500">Starter Package</div>
                <div className="text-2xl font-black text-teal-600 dark:text-teal-400">₹49,999/-</div>
              </div>
              <a
                href="https://wa.me/918976274649?text=Hello%20Tolee%20Team,%20I%20want%20to%20register%20my%20brand%20for%20a%20Tolee%20Expo%20Stall."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs transition-all shadow-md"
              >
                <span>Book Expo Stall Today</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
