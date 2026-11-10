'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MessageSquare, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  Save,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ListingEnquiriesPage({ params }: { params: { id: string } }) {
  const [listing, setListing] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEnquiries();
  }, [params.id]);

  const fetchEnquiries = async () => {
    try {
      const res = await fetch(`/api/expo/listings/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setListing(data.listing);
        setEnquiries(data.listing.enquiries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (enquiryId: string, newStatus: string, notes?: string) => {
    setUpdatingId(enquiryId);
    try {
      const res = await fetch(`/api/expo/listings/${params.id}/enquiries`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryId,
          status: newStatus,
          ...(notes !== undefined && { internalNotes: notes })
        })
      });
      if (res.ok) {
        setEnquiries(enquiries.map(e => e.id === enquiryId ? { ...e, status: newStatus, ...(notes !== undefined && { internalNotes: notes }) } : e));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredEnquiries = enquiries.filter(e => {
    if (filterStatus === 'ALL') return true;
    return e.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <Link
              href="/expo/my-listings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Listings</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Customer Leads &amp; Enquiries: {listing?.brandName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Total Leads Captured: <span className="font-bold text-teal-600">{enquiries.length} enquiries</span>
            </p>
          </div>

          {/* FILTER STATUS TABS */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold">
            {['ALL', 'NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  filterStatus === st 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* LEADS LIST */}
        {filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
            <p className="text-xs font-bold text-slate-500">No enquiries found in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEnquiries.map((enq) => {
              const cleanMobile = enq.mobileNumber?.replace(/[^0-9]/g, '');
              return (
                <div 
                  key={enq.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-sm">
                        {enq.customerName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{enq.customerName}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(enq.createdAt).toLocaleString('en-IN')}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={enq.status}
                        onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                        disabled={updatingId === enq.id}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200"
                      >
                        <option value="NEW">🟢 New Lead</option>
                        <option value="CONTACTED">💬 Contacted</option>
                        <option value="FOLLOW_UP">⏰ Follow-up Needed</option>
                        <option value="CONVERTED">🎉 Converted / Order Placed</option>
                        <option value="NOT_INTERESTED">❌ Not Interested</option>
                        <option value="CLOSED">🔒 Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Interested Product:</span>
                        <p className="font-extrabold text-slate-900 dark:text-white">{enq.productInterest || 'General Offer'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Customer Message:</span>
                        <p className="text-slate-700 dark:text-zinc-300">{enq.message}</p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Contact Info:</span>
                        <p className="font-bold text-slate-900 dark:text-white">📞 {enq.mobileNumber}</p>
                        {enq.emailAddress && <p className="text-slate-600 dark:text-zinc-400">✉️ {enq.emailAddress}</p>}
                      </div>

                      {/* Direct WhatsApp / Call CTAs */}
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={`https://wa.me/${cleanMobile}?text=Hello%20${encodeURIComponent(enq.customerName)},%20I%20am%20reaching%20out%20from%20${encodeURIComponent(listing?.brandName)}%20regarding%20your%20Tolee%20Expo%20enquiry.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          <span>WhatsApp Customer</span>
                        </a>

                        <a
                          href={`tel:${enq.mobileNumber}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
