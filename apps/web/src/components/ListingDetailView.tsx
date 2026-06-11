'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, Share2, MapPin, Eye, Phone, MessageSquare, Mail, 
  Trash2, Edit, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, Copy, Rocket
} from 'lucide-react';
import { deleteListing, updateListingStatus } from '@/actions/marketplace';
import { QuickBoostModal } from './QuickBoostModal';

interface ListingDetailViewProps {
  listing: any;
  currentUserId?: string;
  relatedListings?: any[];
}

export function ListingDetailView({ listing, currentUserId, relatedListings = [] }: ListingDetailViewProps) {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);

  const images = listing.images ? listing.images.split(',') : [];
  const isOwner = listing.sellerId === currentUserId;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Listing link copied to clipboard!");
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    setIsDeleting(true);
    const res = await deleteListing(listing.id);
    if (res.success) {
      router.push('/marketplace');
      router.refresh();
    } else {
      alert("Failed to delete listing.");
      setIsDeleting(false);
    }
  };

  const handleMarkAsSold = async () => {
    const nextStatus = listing.status === 'sold' ? 'active' : 'sold';
    if (!window.confirm(`Mark this listing as ${nextStatus === 'sold' ? 'Sold' : 'Active'}?`)) return;
    
    const res = await updateListingStatus(listing.id, nextStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert("Failed to update listing status.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/marketplace')} 
            className="flex items-center gap-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Marketplace
          </Button>
          {isOwner && (
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button 
                onClick={() => setIsQuickBoostOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:via-teal-700 hover:to-indigo-700 text-white font-extrabold shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all duration-300 hover:shadow-emerald-500/20"
              >
                <Rocket className="w-4 h-4 text-white animate-pulse" /> Boost Listing
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/marketplace/edit/${listing.id}`)}
                className="flex items-center gap-2 rounded-xl"
              >
                <Edit className="w-4 h-4" /> Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={handleMarkAsSold}
                className={`flex items-center gap-2 rounded-xl ${listing.status === 'sold' ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
              >
                <CheckCircle2 className="w-4 h-4" /> {listing.status === 'sold' ? 'Mark Active' : 'Mark as Sold'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Galleries */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm relative">
              {listing.status === 'sold' && (
                <div className="absolute top-4 right-4 z-10 bg-red-600 text-white font-extrabold px-4 py-1.5 rounded-full shadow-lg text-sm tracking-wide uppercase">
                  Sold
                </div>
              )}
              {images.length > 0 ? (
                <div className="aspect-[4/3] w-full relative group">
                  <img 
                    src={images[activeImageIndex]} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-gray-800 dark:text-white p-2 rounded-full backdrop-blur-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-gray-800 dark:text-white p-2 rounded-full backdrop-blur-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-black text-gray-400">
                  <ImageIcon className="w-16 h-16 mb-2 opacity-50" />
                  <span className="font-semibold text-sm">No Images Provided</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activeImageIndex ? 'border-blue-600 scale-95' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
            
            {/* Description Card */}
            <Card className="bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </p>
              </CardContent>
            </Card>

            {/* Related Tolees Badge Section */}
            {listing.tolees && listing.tolees.length > 0 && (
              <Card className="bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 rounded-3xl">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Published in Tolees</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.tolees.map(({ tolee }: any) => (
                      <span 
                        key={tolee.id} 
                        className="px-3.5 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700"
                      >
                        {tolee.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Listing Information */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">
                    {listing.title}
                  </h1>
                  
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      ₹{listing.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 flex items-center mt-3">
                    <MapPin className="w-4 h-4 mr-1.5" /> {listing.locationText}
                  </p>
                </div>

                {/* Info tags / attributes */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Category</span>
                    <p className="text-sm font-extrabold text-gray-700 dark:text-gray-300 mt-0.5">{listing.category}</p>
                  </div>
                  {listing.condition && (
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Condition</span>
                      <p className="text-sm font-extrabold text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{listing.condition.replace('_', ' ')}</p>
                    </div>
                  )}
                </div>

                {/* Dynamic Attributes Grid */}
                {listing.attributes && Object.keys(listing.attributes).length > 0 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attributes</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(listing.attributes).map(([key, value]) => {
                        if (!value) return null;
                        // Format key from camelCase to Title Case
                        const label = key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase());
                        return (
                          <div key={key} className="bg-blue-50/30 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-50/50 dark:border-blue-900/20">
                            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">{label}</span>
                            <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* View stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" /> {listing.viewCount} views
                  </span>
                  <span>Published {new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => setIsSaved(!isSaved)}
                    variant={isSaved ? "default" : "outline"}
                    className={`flex-1 rounded-xl h-11 font-bold ${isSaved ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} /> 
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  <Button 
                    onClick={handleShare}
                    variant="outline"
                    className="flex-1 rounded-xl h-11 font-bold"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seller profile card */}
            <Card className="bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seller Information</h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800">
                    <img 
                      src={listing.seller.avatar || '/default-user-avatar.svg'} 
                      alt={listing.seller.name || 'Seller'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-gray-900 dark:text-white leading-snug">
                      {listing.seller.name || 'Anonymous User'}
                    </h5>
                    <p className="text-xs text-gray-500">@{listing.seller.username || 'user'}</p>
                  </div>
                </div>

                {/* Contact Seller Action triggers */}
                <div className="pt-2 space-y-2">
                  {listing.contactPhone && (
                    <Button 
                      asChild 
                      className="w-full rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <a href={`tel:${listing.contactPhone}`}>
                        <Phone className="w-4 h-4 mr-2" /> Call Seller
                      </a>
                    </Button>
                  )}
                  {listing.contactWhatsApp && (
                    <Button 
                      asChild 
                      className="w-full rounded-xl h-11 bg-green-500 hover:bg-green-600 text-white font-bold"
                    >
                      <a 
                        href={`https://wa.me/${listing.contactWhatsApp.replace(/[^0-9]/g, '')}`}
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> Chat on WhatsApp
                      </a>
                    </Button>
                  )}
                  {listing.contactEmail && (
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full rounded-xl h-11 font-bold border-gray-200 dark:border-zinc-800"
                    >
                      <a href={`mailto:${listing.contactEmail}`}>
                        <Mail className="w-4 h-4 mr-2" /> Email Seller
                      </a>
                    </Button>
                  )}
                  {!listing.contactPhone && !listing.contactWhatsApp && !listing.contactEmail && (
                    <Button 
                      onClick={() => alert("Message sent successfully! (Simulated)")}
                      className="w-full rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> Message on Tolee
                    </Button>
                  )}
                 </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Quick Boost Modal */}
      <QuickBoostModal 
        isOpen={isQuickBoostOpen} 
        onClose={() => setIsQuickBoostOpen(false)} 
        type="listing" 
        targetId={listing.id} 
      />
    </div>
  );
}
