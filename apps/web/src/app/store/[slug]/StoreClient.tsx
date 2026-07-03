'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, MapPin, Plus, ArrowLeft, MessageCircle, 
  Phone, Globe, CheckCircle2, Calendar, Clock, Star, Heart, Camera
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';
import { 
  followShopAction, unfollowShopAction, submitShopReviewAction, trackShopClick 
} from '@/actions/world';

interface StoreClientProps {
  project: any;
}

export default function StoreClient({ project }: StoreClientProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user ? (session.user as any).id : undefined;

  const [followersCount, setFollowersCount] = useState(project.followersCount || 0);
  const [isFollowing, setIsFollowing] = useState(
    project.followers?.some((f: any) => f.userId === currentUserId) || false
  );
  
  // Reviews state
  const [reviews, setReviews] = useState<any[]>(project.reviews || []);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // active tab
  const [activeTab, setActiveTab] = useState<'products' | 'gallery' | 'reviews'>('products');

  const handleFollowToggle = async () => {
    if (!currentUserId) return alert('You must be logged in to follow shops.');
    
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount((prev: number) => Math.max(0, prev - 1));
      await unfollowShopAction(project.id);
    } else {
      setIsFollowing(true);
      setFollowersCount((prev: number) => prev + 1);
      await followShopAction(project.id);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return alert('You must be logged in to submit a review.');
    if (!reviewText.trim()) return alert('Review text is required.');

    setSubmittingReview(true);
    const res = await submitShopReviewAction(project.id, rating, reviewText.trim());
    if (res.success && res.review) {
      alert('Thank you! Your review has been published.');
      const newReview = {
        ...res.review,
        user: {
          id: currentUserId,
          name: session?.user?.name || 'Anonymous User',
          avatar: session?.user?.image || null
        }
      };
      setReviews(prev => [newReview, ...prev.filter(r => r.userId !== currentUserId)]);
      setReviewText('');
      setIsReviewModalOpen(false);
    } else {
      alert(res.error || 'Failed to submit review.');
    }
    setSubmittingReview(false);
  };

  const trackClick = (type: 'map' | 'contact' | 'whatsapp') => {
    trackShopClick(project.id, type);
  };

  const formattedHours = project.openingHours || '10:00 AM - 09:00 PM';
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '4.8';

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24 relative selection:bg-cyan-500 selection:text-black font-sans">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        
        {/* Navigation */}
        <Link href="/map" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Live Map
        </Link>

        {/* Shop Profile Header */}
        <div className="bg-[#121214] border border-zinc-900 rounded-[28px] overflow-hidden shadow-2xl mb-8 relative">
          
          {/* Banner Image */}
          {project.bannerImage ? (
            <div className="w-full h-52 md:h-64 relative bg-zinc-950">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-44 bg-gradient-to-r from-cyan-600 to-indigo-600 opacity-90 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <ShoppingBag className="w-14 h-14 text-white/30" />
            </div>
          )}

          {/* Logo & Content Layout */}
          <div className="p-6 md:p-8 relative bg-[#121214] rounded-t-3xl border-t border-zinc-900">
            
            {/* Absolute circular logo wrapper */}
            <div className="absolute -top-14 left-6 md:left-8 w-24 h-24 rounded-full border-4 border-[#121214] bg-zinc-900 shadow-xl overflow-hidden">
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-cyan-600 flex items-center justify-center text-white text-3xl font-black">
                  {project.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="pt-10 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase text-[9px] font-extrabold px-2.5 py-0.5 rounded-md">
                    {project.type}
                  </Badge>
                  {project.isVerified && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Shop
                    </Badge>
                  )}
                  <span className="text-[10px] text-zinc-400 font-bold">
                    👥 {followersCount} followers • ⭐ {averageRating} ({reviews.length} reviews)
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  {project.name}
                  {project.isClosed && (
                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 font-black px-2 py-0.5 rounded-md uppercase">Closed</span>
                  )}
                </h1>
                <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">{project.description || 'Welcome to our digital boutique storefront.'}</p>
                
                {/* Meta details */}
                <div className="flex flex-col gap-2 mt-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400 shrink-0" /> {project.locationText || 'Local Shop'}</span>
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400 shrink-0" /> Open: {formattedHours}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
                <Button 
                  onClick={handleFollowToggle} 
                  className={`flex-grow sm:flex-grow-0 px-5 h-10 font-bold text-xs rounded-xl shadow-md transition-all duration-300 ${
                    isFollowing 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-cyan-500 hover:bg-cyan-600 text-black shadow-cyan-500/10'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow Shop'}
                </Button>
                {project.contactNumber && (
                  <a href={`tel:${project.contactNumber}`} onClick={() => trackClick('contact')} className="flex-grow sm:flex-grow-0">
                    <Button variant="outline" className="w-full border-zinc-800 hover:bg-zinc-900 text-white font-bold text-xs h-10 rounded-xl">
                      <Phone className="w-4 h-4" /> Call
                    </Button>
                  </a>
                )}
                {project.whatsapp && (
                  <a href={`https://wa.me/${project.whatsapp}`} target="_blank" onClick={() => trackClick('whatsapp')} className="flex-grow sm:flex-grow-0">
                    <Button variant="outline" className="w-full border-emerald-900 hover:bg-emerald-950/20 text-emerald-400 font-bold text-xs h-10 rounded-xl">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-zinc-900 mb-8">
          <button 
            onClick={() => setActiveTab('products')}
            className={`py-3 px-6 text-xs font-black border-b-2 transition-all ${
              activeTab === 'products' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Products ({project.listings?.length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`py-3 px-6 text-xs font-black border-b-2 transition-all ${
              activeTab === 'gallery' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Gallery
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-6 text-xs font-black border-b-2 transition-all ${
              activeTab === 'reviews' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!project.listings || project.listings.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-[#121214] border border-zinc-900 rounded-3xl">
                <ShoppingBag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-xs font-bold">No listed products in this shop yet.</p>
              </div>
            ) : (
              project.listings.map((prod: any) => (
                <Card key={prod.id} className="bg-[#121214] border-zinc-900 text-white rounded-2xl overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-zinc-800 transition-colors">
                  <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden">
                    <img 
                      src={prod.images?.split(',')[0] || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80`} 
                      alt={prod.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-cyan-500 text-black px-3 py-1.5 rounded-full text-xs font-black">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-base line-clamp-1 mb-1">{prod.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">{prod.description}</p>
                    <Link href={`/marketplace`}>
                      <Button size="sm" className="bg-zinc-800 hover:bg-zinc-750 text-white w-full rounded-xl text-xs font-bold">
                        View Product details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {!project.photos ? (
              <div className="col-span-full text-center py-16 bg-[#121214] border border-zinc-900 rounded-3xl">
                <Camera className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-xs font-bold">No gallery photos added yet.</p>
              </div>
            ) : (
              project.photos.split(',').map((pUrl: string, idx: number) => (
                <div key={idx} className="aspect-square bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900">
                  <img src={pUrl} alt="Gallery Photo" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            
            {/* Post review trigger */}
            <div className="flex justify-between items-center bg-[#121214] border border-zinc-900 p-5 rounded-[24px]">
              <div>
                <h4 className="text-sm font-bold">Bought from this store?</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Rate your experience to help the community.</p>
              </div>
              <Button 
                onClick={() => setIsReviewModalOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-black text-xs rounded-xl"
              >
                Write Review
              </Button>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-[#121214] border border-zinc-900 rounded-3xl">
                  <Star className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-550 text-xs">No reviews submitted yet. Be the first!</p>
                </div>
              ) : (
                reviews.map((rev: any) => (
                  <div key={rev.id} className="bg-zinc-900/30 border border-zinc-900/60 p-5 rounded-2xl">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2">
                        {rev.user?.avatar ? (
                          <img src={rev.user.avatar} alt="User" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-450 uppercase">
                            {rev.user?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">{rev.user?.name || 'Anonymous User'}</span>
                          <span className="text-[9px] text-zinc-500 block">{new Date(rev.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-yellow-500 gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 mt-3 leading-relaxed">{rev.text}</p>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* Review Dialog Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="bg-[#121214] border-zinc-900 text-white rounded-3xl p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Submit Shop Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostReview} className="space-y-4 mt-2">
            <div>
              <Label className="text-[10px] font-black text-zinc-450 uppercase tracking-wider block mb-1">Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-6 h-6 ${rating >= star ? 'text-yellow-500 fill-current' : 'text-zinc-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-black text-zinc-450 uppercase tracking-wider block mb-1">Review Comments</Label>
              <textarea
                required
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Describe your purchase experience, customer service, or quality..."
                className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 text-white"
              />
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={submittingReview}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-black py-2.5 rounded-xl transition-all"
              >
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
