'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  Mail, 
  Globe, 
  MapPin, 
  Clock, 
  Sparkles, 
  Tag, 
  Share2, 
  ShoppingBag, 
  Send, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ExpoMicrositeViewProps {
  listing: any;
}

export function ExpoMicrositeView({ listing }: ExpoMicrositeViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [enquiryForm, setEnquiryForm] = useState({
    customerName: '',
    mobileNumber: '',
    emailAddress: '',
    productInterest: listing.productName || '',
    message: '',
    preferredMethod: 'whatsapp'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [activeGalleryModal, setActiveGalleryModal] = useState<string | null>(null);

  const microsite = listing.microsite || {};
  const products = microsite.products || [];
  const gallery = microsite.gallery || [];
  const businessHours = microsite.businessHours || {};
  const socialLinks = microsite.socialLinks || {};

  const cleanPhone = listing.whatsappNumber?.replace(/[^0-9]/g, '') || '918976274649';

  const handleCopyCoupon = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2500);
    }
  };

  const handleShare = () => {
    if (navigator?.share) {
      navigator.share({
        title: `${listing.brandName} - Tolee Expo`,
        text: listing.shortDescription,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.customerName.trim() || !enquiryForm.mobileNumber.trim()) {
      setEnquiryError('Please enter your Name and Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    setEnquiryError(null);

    try {
      const res = await fetch('/api/expo/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          ...enquiryForm
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit enquiry. Please try again.');
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      setEnquiryError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-black font-sans pb-24 md:pb-12 text-slate-800 dark:text-zinc-100">
      
      {/* TOP NAVIGATION / BRANDING BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href="/expo"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tolee Expo</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
              title="Share Micro-Website"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50">
              Verified Stall
            </span>
          </div>
        </div>
      </header>

      {/* MICROSITE CONTAINER (Card-Centered Architecture based on vCards) */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-zinc-800/80 overflow-hidden">
          
          {/* COVER BANNER */}
          <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-teal-700 to-slate-900 overflow-hidden">
            {listing.coverUrl ? (
              <img 
                src={listing.coverUrl} 
                alt={`${listing.brandName} Banner`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-4xl font-black">
                {listing.brandName}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            {/* Top Right Stall Tier Badge */}
            <div className="absolute top-4 right-4">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-amber-400 text-slate-950 shadow-md">
                {listing.package?.name || 'Exclusive Expo Stall'}
              </span>
            </div>
          </div>

          {/* AVATAR & HEADER DETAILS */}
          <div className="relative px-6 pt-0 pb-6 text-center border-b border-slate-100 dark:border-zinc-800">
            {/* Circular Overlapping Avatar */}
            <div className="-mt-16 sm:-mt-20 inline-block relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-zinc-900 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden mx-auto">
                <img 
                  src={listing.logoUrl || listing.thumbnailUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80'} 
                  alt={listing.brandName}
                  className="w-full h-full object-cover"
                />
              </div>
              {listing.isVerified && (
                <div className="absolute bottom-1 right-2 bg-white dark:bg-zinc-900 rounded-full p-1 shadow-md">
                  <CheckCircle2 className="w-6 h-6 text-teal-500 fill-teal-500" />
                </div>
              )}
            </div>

            {/* Business Titles */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3">
              {listing.brandName}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 mt-1">
              {listing.subcategory || listing.category?.toUpperCase()} • {listing.city}, {listing.state}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl mx-auto mt-2 leading-relaxed">
              {listing.shortDescription}
            </p>

            {/* ACTION BUTTONS (vCard Action Bar Paradigm) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <a
                href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(listing.brandName)},%20I%20am%20visiting%20your%20Tolee%20Expo%20microsite%20and%20want%20to%20enquire.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp</span>
              </a>

              {listing.contactNumber && (
                <a
                  href={`tel:${listing.contactNumber}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>
              )}

              {listing.email && (
                <a
                  href={`mailto:${listing.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              )}

              {listing.websiteUrl && (
                <a
                  href={listing.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>

          {/* SPECIAL EXPO OFFER BANNER */}
          {listing.offerLabel && (
            <div className="m-4 sm:m-6 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-slate-900 p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                <Tag className="w-36 h-36" />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    <Sparkles className="w-3 h-3 fill-slate-950" />
                    <span>Exclusive Expo Offer</span>
                  </div>
                  <h3 className="text-lg font-black text-white">{listing.offerLabel}</h3>
                  <p className="text-xs text-teal-100 max-w-md">{listing.offerDescription}</p>
                </div>

                {listing.couponCode && (
                  <button
                    onClick={() => handleCopyCoupon(listing.couponCode)}
                    className="flex-shrink-0 px-4 py-2 rounded-xl border-2 border-dashed border-white/60 bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    <span>CODE: {listing.couponCode}</span>
                    <span className="text-[10px] text-amber-300 uppercase underline">
                      {copiedCoupon ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ABOUT SECTION */}
          <div className="p-6 border-b border-slate-100 dark:border-zinc-800 space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-500" />
              <span>About {listing.brandName}</span>
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {listing.fullDescription || listing.shortDescription}
            </div>

            {/* Feature Bullets */}
            {listing.features && listing.features.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {listing.features.map((feat: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                    <ShieldCheck className="w-3 h-3 text-teal-600" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCTS CATALOG SECTION */}
          {products && products.length > 0 && (
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-teal-500" />
                  <span>Stall Products &amp; Catalog ({products.length})</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((prod: any) => (
                  <div 
                    key={prod.id}
                    className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow bg-slate-50/50 dark:bg-zinc-800/30"
                  >
                    <div>
                      {prod.imageUrl && (
                        <div className="h-40 w-full rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-zinc-700">
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{prod.name}</h4>
                      {prod.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1">{prod.description}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{prod.price?.toLocaleString('en-IN')}
                        </span>
                        {prod.originalPrice && prod.originalPrice > prod.price && (
                          <span className="text-xs text-slate-400 line-through ml-2">
                            ₹{prod.originalPrice?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <a
                        href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(listing.brandName)},%20I%20want%20to%20order%20the%20${encodeURIComponent(prod.name)}%20seen%20on%20your%20Tolee%20Expo%20microsite.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Order</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GALLERY SECTION */}
          {gallery && gallery.length > 0 && (
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <span>Gallery &amp; Showcase</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((img: any) => (
                  <div 
                    key={img.id}
                    onClick={() => setActiveGalleryModal(img.mediaUrl)}
                    className="relative h-28 sm:h-36 rounded-xl overflow-hidden cursor-pointer group bg-slate-200 dark:bg-zinc-800"
                  >
                    <img src={img.mediaUrl} alt={img.title || 'Gallery'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      View
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BUSINESS HOURS & LOCATION */}
          <div className="p-6 border-b border-slate-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hours */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <span>Business Operating Hours</span>
              </h3>
              <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-zinc-400">Monday - Friday:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{businessHours.monday || '09:30 AM - 08:00 PM'}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-zinc-400">Saturday:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{businessHours.saturday || '10:00 AM - 09:00 PM'}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600 dark:text-zinc-400">Sunday:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{businessHours.sunday || '11:00 AM - 06:00 PM'}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-500" />
                <span>Address &amp; Location</span>
              </h3>
              <div className="text-xs bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
                <p className="font-medium text-slate-700 dark:text-zinc-300">
                  {listing.address ? `${listing.address}, ` : ''}{listing.city}, {listing.state}, {listing.country}
                </p>
                {listing.googleMapsUrl && (
                  <a
                    href={listing.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* INTERACTIVE ENQUIRY & LEAD CAPTURE FORM */}
          <div className="p-6 bg-slate-50 dark:bg-zinc-800/30">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Send Direct Enquiry to {listing.brandName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Fill in your details below. The business owner will contact you directly.
                </p>
              </div>

              {submittedSuccess ? (
                <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
                  <h4 className="font-extrabold text-sm text-teal-950 dark:text-teal-200">
                    Enquiry Submitted Successfully!
                  </h4>
                  <p className="text-xs text-teal-800 dark:text-teal-300">
                    Your request has been delivered to {listing.brandName}.
                  </p>
                  <a
                    href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(listing.brandName)},%20I%20just%20submitted%20an%20enquiry%20via%20Tolee%20Expo.%20My%20Name:%20${encodeURIComponent(enquiryForm.customerName)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat Directly on WhatsApp</span>
                  </a>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="space-y-3">
                  {enquiryError && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                      {enquiryError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={enquiryForm.customerName}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, customerName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={enquiryForm.mobileNumber}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, mobileNumber: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={enquiryForm.emailAddress}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, emailAddress: e.target.value })}
                        placeholder="rahul@example.com"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                        Interested Product / Service
                      </label>
                      <input
                        type="text"
                        value={enquiryForm.productInterest}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, productInterest: e.target.value })}
                        placeholder="e.g. Anarkali Suit / Bulk Order"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                      Enquiry Message (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={enquiryForm.message}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      placeholder="Share your requirements, size, quantity or questions..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                      Preferred Contact Method
                    </label>
                    <div className="flex gap-4 text-xs">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredMethod"
                          value="whatsapp"
                          checked={enquiryForm.preferredMethod === 'whatsapp'}
                          onChange={() => setEnquiryForm({ ...enquiryForm, preferredMethod: 'whatsapp' })}
                        />
                        <span>WhatsApp</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredMethod"
                          value="call"
                          checked={enquiryForm.preferredMethod === 'call'}
                          onChange={() => setEnquiryForm({ ...enquiryForm, preferredMethod: 'call' })}
                        />
                        <span>Phone Call</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredMethod"
                          value="email"
                          checked={enquiryForm.preferredMethod === 'email'}
                          onChange={() => setEnquiryForm({ ...enquiryForm, preferredMethod: 'email' })}
                        />
                        <span>Email</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}</span>
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <footer className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800">
            <p>
              Official Virtual Stall on{' '}
              <Link href="/expo" className="font-bold text-teal-600 dark:text-teal-400 hover:underline">
                Tolee Expo
              </Link>{' '}
              • Powered by Tolee Social Network
            </p>
          </footer>

        </div>
      </main>

      {/* STICKY BOTTOM BAR FOR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-2.5 flex items-center gap-2 px-4 shadow-lg">
        <a
          href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(listing.brandName)},%20I%20am%20interested%20in%20your%20offers%20on%20Tolee%20Expo.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp Order</span>
        </a>

        {listing.contactNumber && (
          <a
            href={`tel:${listing.contactNumber}`}
            className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-900 dark:bg-zinc-800 text-white"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* LIGHTBOX MODAL */}
      {activeGalleryModal && (
        <div 
          onClick={() => setActiveGalleryModal(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={activeGalleryModal} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

    </div>
  );
}
