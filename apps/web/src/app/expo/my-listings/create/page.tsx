'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Store, 
  Sparkles, 
  Tag, 
  Layers, 
  CreditCard, 
  Send,
  UploadCloud,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateExpoListingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Business Information
    brandName: '',
    category: 'fashion',
    subcategory: '',
    shortDescription: '',
    fullDescription: '',
    ownerName: '',
    contactNumber: '',
    whatsappNumber: '',
    email: '',
    websiteUrl: '',
    address: '',
    city: '',
    state: '',
    googleMapsUrl: '',

    // Step 2: Branding
    logoUrl: '',
    coverUrl: '',
    bannerUrl: '',
    primaryColor: '#0D9488',

    // Step 3: Expo Listing Details
    productName: '',
    offerLabel: 'FLAT 50% OFF EXPO DEAL',
    offerDescription: '',
    originalPrice: '',
    expoPrice: '',
    discountPct: 50,
    couponCode: '',
    tags: 'fashion, shopping, expo',
    features: '100% Verified Quality, Free Shipping, COD Available',
    thumbnailUrl: '',

    // Step 4: Micro Website Slug
    customSlug: '',

    // Step 5: Package
    packageTier: 'GOLD',
    packagePrice: 49999,
    paymentTxnId: ''
  });

  const categories = [
    { id: 'fashion', label: '👗 Fashion & Ethnic' },
    { id: 'wellness', label: '🌿 Health & Wellness' },
    { id: 'food', label: '☕ Food & Gourmet' },
    { id: 'jewellery', label: '💍 Jewellery & Accessories' },
    { id: 'tech', label: '📱 Technology & Gadgets' },
    { id: 'general', label: '🏪 General Retail' },
  ];

  const packages = [
    {
      id: 'vip-front-row',
      tier: 'VIP',
      title: 'VIP Front-Row Stall',
      price: 99999,
      duration: '6 Months',
      badge: 'TOP PRIORITY',
      features: ['Top Grid Placement', 'Influencer Reel Shoot', 'National Digital PR', 'YouTube Video Ads', '6 Months Free Feed Ads']
    },
    {
      id: 'gold-expo-stall',
      tier: 'GOLD',
      title: 'Gold Expo Stall',
      price: 49999,
      duration: '3 Months',
      badge: 'POPULAR CHOICE',
      features: ['Priority Grid Placement', 'Influencer Reel Shoot', 'YouTube Ad Boost', '3 Months Free Feed Ads']
    },
    {
      id: 'silver-expo-stall',
      tier: 'SILVER',
      title: 'Silver Expo Stall',
      price: 24999,
      duration: '2 Months',
      badge: 'STARTER STALL',
      features: ['Standard Grid Placement', 'Verified Business Badge', '1 Month Free Feed Ads']
    }
  ];

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!formData.brandName.trim() || !formData.contactNumber.trim() || !formData.city.trim()) {
        setErrorMsg('Please fill in Brand Name, Contact Number, and City.');
        return;
      }
      if (!formData.customSlug) {
        setFormData({
          ...formData,
          customSlug: formData.brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        });
      }
    } else if (currentStep === 3) {
      if (!formData.productName.trim() || !formData.expoPrice) {
        setErrorMsg('Please fill in the Product Name and Expo Offer Price.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitListing = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        originalPrice: Number(formData.originalPrice) || Number(formData.expoPrice),
        expoPrice: Number(formData.expoPrice),
        discountPct: Number(formData.discountPct) || 0,
        amountPaid: formData.packagePrice,
        tags: formData.tags.split(',').map((s) => s.trim()).filter(Boolean),
        features: formData.features.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch('/api/expo/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit listing');
      }

      // Success -> navigate to My Listings
      router.push('/expo/my-listings?created=true');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting listing');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <Link
            href="/expo/my-listings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Listings</span>
          </Link>
          <span className="text-xs font-black text-teal-600 dark:text-teal-400">
            Step {currentStep} of 6
          </span>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="grid grid-cols-6 gap-2">
          {['1. Business', '2. Branding', '3. Offer', '4. Microsite', '5. Package', '6. Submit'].map((label, idx) => (
            <div key={idx} className="space-y-1">
              <div
                className={`h-2 rounded-full transition-all ${
                  idx + 1 <= currentStep ? 'bg-teal-600' : 'bg-slate-200 dark:bg-zinc-800'
                }`}
              />
              <span className="hidden sm:block text-[10px] font-bold text-slate-500 truncate">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* WIZARD CARD */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-6">

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: BUSINESS INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Business Information</h2>
                <p className="text-xs text-slate-500">Provide official details about your brand or boutique.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. Royal Silks &amp; Handlooms"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Expo Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Subcategory (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g. Pure Banarasi Sarees"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Owner / Manager Name
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    WhatsApp Order Number
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="919876543210"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@brand.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Varanasi"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Short Business Description / Tagline
                </label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="e.g. Handcrafted pure silk heritage sarees direct from weaver looms."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Full Business Description (Appears on your Micro-Website)
                </label>
                <textarea
                  rows={3}
                  value={formData.fullDescription}
                  onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                  placeholder="Tell customers about your story, heritage, artisan sourcing, and quality guarantee..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 2: BRANDING */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Branding &amp; Visual Assets</h2>
                <p className="text-xs text-slate-500">Provide logo and cover banner URLs (Cloudinary, Unsplash, or direct image links).</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Business Logo / Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Cover Banner Image URL (Top header of your micro-website)
                  </label>
                  <input
                    type="url"
                    value={formData.coverUrl}
                    onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Primary Brand Theme Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-zinc-700"
                    />
                    <span className="text-xs font-mono text-slate-600 dark:text-zinc-400">
                      {formData.primaryColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXPO LISTING DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Expo Offer &amp; Grid Details</h2>
                <p className="text-xs text-slate-500">This offer will be displayed directly on the Tolee Expo homepage grid.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Product / Offer Headline *
                </label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="e.g. Royal Indigo Floral Anarkali Set (3-Piece)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Offer Badge Label
                  </label>
                  <input
                    type="text"
                    value={formData.offerLabel}
                    onChange={(e) => setFormData({ ...formData, offerLabel: e.target.value })}
                    placeholder="e.g. FLAT 50% OFF EXPO DEAL"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Coupon Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                    placeholder="e.g. EXPO2026"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Expo Discounted Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.expoPrice}
                    onChange={(e) => setFormData({ ...formData, expoPrice: e.target.value })}
                    placeholder="1499"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="2999"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={formData.discountPct}
                    onChange={(e) => setFormData({ ...formData, discountPct: Number(e.target.value) })}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Card Thumbnail Image URL (Square/Landscape)
                </label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Key Features / Badges (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="100% Pure Cotton, Free Shipping, COD Available"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 4: MICRO WEBSITE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Micro-Website Configuration</h2>
                <p className="text-xs text-slate-500">Your dedicated virtual stall URL on Tolee Expo.</p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase">
                  Your Dedicated Stall URL:
                </span>
                <div className="flex items-center gap-2 text-sm font-mono font-black text-slate-900 dark:text-white">
                  <span>https://www.tolee.in/expo/</span>
                  <input
                    type="text"
                    value={formData.customSlug}
                    onChange={(e) => setFormData({ ...formData, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') })}
                    className="px-2 py-1 rounded-lg border border-teal-300 bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-300"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Visitors clicking your stall card on Tolee Expo will open this dedicated micro-website.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-4 space-y-2 bg-slate-50 dark:bg-zinc-800/30 text-xs">
                <span className="font-extrabold uppercase text-slate-400">Micro-Website Features Included:</span>
                <ul className="space-y-1 text-slate-600 dark:text-zinc-300">
                  <li>✓ Mobile-Responsive vCard Template Layout</li>
                  <li>✓ Direct WhatsApp &amp; Call Action Bar</li>
                  <li>✓ Interactive Products Catalog &amp; Photo Gallery</li>
                  <li>✓ Lead Capture &amp; Customer Enquiry Form</li>
                  <li>✓ Business Operating Hours &amp; Google Map Pin</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 5: PACKAGE & PAYMENT */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Select Expo Stall Package</h2>
                <p className="text-xs text-slate-500">Choose your promotion tier to get preferred ranking and influencer shoot perks.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const isSelected = formData.packageTier === pkg.tier;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setFormData({ ...formData, packageTier: pkg.tier, packagePrice: pkg.price })}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 shadow-md' 
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          {pkg.badge}
                        </span>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">{pkg.title}</h3>
                        <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[11px] text-slate-500">Validity: {pkg.duration}</span>

                        <ul className="space-y-1 text-xs text-slate-600 dark:text-zinc-300 pt-2 border-t border-slate-100 dark:border-zinc-800">
                          {pkg.features.map((f, i) => (
                            <li key={i}>✓ {f}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-2">
                        <span className={`block w-full py-2 rounded-xl text-center text-xs font-bold ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {isSelected ? 'Selected Tier' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Payment Reference / Transaction ID (Optional for offline/bank transfers)
                </label>
                <input
                  type="text"
                  value={formData.paymentTxnId}
                  onChange={(e) => setFormData({ ...formData, paymentTxnId: e.target.value })}
                  placeholder="e.g. UPI Ref / Bank IMPS / Cheque number"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 6: SUBMIT FOR APPROVAL */}
          {currentStep === 6 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-3xl">
                🚀
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Ready to Submit for Super Admin Approval
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Once submitted, your listing will enter the verification pipeline. Super Admin will inspect the content, verify the payment details, and approve it for public display.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-4 text-left max-w-lg mx-auto border border-slate-100 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Brand Name:</span>
                  <span className="text-slate-900 dark:text-white">{formData.brandName}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Micro-Website Slug:</span>
                  <span className="text-teal-600">/expo/{formData.customSlug}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Expo Stall Offer:</span>
                  <span className="text-slate-900 dark:text-white">{formData.productName} (₹{formData.expoPrice})</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Selected Package:</span>
                  <span className="text-amber-600">{formData.packageTier} Tier (₹{formData.packagePrice.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Initial Status:</span>
                  <span className="text-amber-500">PENDING_APPROVAL (Hidden from public Expo)</span>
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={submitting}
                className="rounded-xl px-5 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Previous</span>
              </Button>
            ) : <div />}

            {currentStep < 6 ? (
              <Button
                onClick={handleNext}
                className="rounded-xl px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitListing}
                disabled={submitting}
                className="rounded-xl px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-lg"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                <span>{submitting ? 'Submitting Listing...' : 'Submit Listing for Approval'}</span>
              </Button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
