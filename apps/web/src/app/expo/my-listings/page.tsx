'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Store, 
  ExternalLink, 
  Edit3, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  Layers,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MyExpoListingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/expo/my-listings');
      return;
    }

    if (status === 'authenticated') {
      fetchListings();
    }
  }, [status, router]);

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/expo/listings');
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to fetch user listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (listingStatus: string, reason?: string) => {
    switch (listingStatus) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved &amp; Live on Expo</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Pending Super Admin Approval</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
            <span>Blocked / Hidden</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {listingStatus}
          </span>
        );
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your Expo listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 mb-2">
              <Store className="w-3.5 h-3.5" />
              <span>Business Owner Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              My Expo Listings &amp; Micro-Websites
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Manage your virtual trade stalls, update micro-website products, and track customer leads.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/expo/my-listings/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Create New Listing</span>
            </Link>
          </div>
        </div>

        {/* LISTINGS CONTAINER */}
        {listings.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl font-black">
              🎪
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No Expo Listings Created Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              Join India&apos;s virtual trade fair. Create a dedicated micro-website for your brand, showcase offers, and receive direct WhatsApp customer enquiries.
            </p>
            <div className="pt-2">
              <Link
                href="/expo/my-listings/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Expo Listing</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((item) => (
              <div 
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 flex-shrink-0 border border-slate-200 dark:border-zinc-700">
                      <img 
                        src={item.logoUrl || item.thumbnailUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80'} 
                        alt={item.brandName} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{item.brandName}</h2>
                        {item.isVerified && <CheckCircle2 className="w-4 h-4 text-teal-500 fill-teal-500" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {item.category?.toUpperCase()} • {item.city}, {item.state} • Slug: <span className="font-mono text-teal-600 dark:text-teal-400">/expo/{item.slug}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(item.status, item.rejectionReason)}
                  </div>
                </div>

                {/* Rejection Alert if Rejected */}
                {item.status === 'REJECTED' && item.rejectionReason && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="font-black flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Admin Rejection Reason:</span>
                    </div>
                    <p>{item.rejectionReason}</p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-300 pt-1 font-semibold">
                      Please edit your listing below with corrected details to request review again.
                    </p>
                  </div>
                )}

                {/* Offer & Metrics Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Stall Offer</span>
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.productName}</p>
                    <span className="text-teal-600 font-extrabold">{item.offerLabel}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Offer Price</span>
                    <p className="font-black text-slate-900 dark:text-white text-sm">
                      ₹{item.expoPrice?.toLocaleString('en-IN')}{' '}
                      <span className="text-xs text-slate-400 line-through">₹{item.originalPrice?.toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Customer Enquiries</span>
                    <p className="font-black text-slate-900 dark:text-white text-base">
                      {item._count?.enquiries || 0} Leads
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Package Tier</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {item.package?.name || 'Standard Tier'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">{item.paymentStatus}</span>
                  </div>
                </div>

                {/* ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/expo/my-listings/${item.id}/builder`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Manage Micro-Website (Builder)</span>
                    </Link>

                    <Link
                      href={`/expo/my-listings/${item.id}/enquiries`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>View Leads ({item._count?.enquiries || 0})</span>
                    </Link>
                  </div>

                  {item.status === 'APPROVED' && (
                    <Link
                      href={`/expo/${item.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      <span>Open Live Micro-Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
