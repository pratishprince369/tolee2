'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Store, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ArrowUpDown, 
  PlusCircle, 
  Eye, 
  Edit3, 
  Trash2, 
  Pin, 
  Sparkles, 
  Search, 
  MessageSquare, 
  ExternalLink,
  ChevronUp,
  ChevronDown,
  UserCheck,
  CreditCard,
  Layers,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminExpoManagementPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'priority' | 'enquiries'>('pending');
  const [listings, setListings] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    blockedCount: 0,
    totalEnquiries: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Client Creation Modal State
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [clientForm, setClientForm] = useState({
    brandName: '',
    category: 'fashion',
    contactNumber: '',
    whatsappNumber: '',
    city: '',
    productName: '',
    offerLabel: 'SPECIAL EXPO DEAL',
    expoPrice: '',
    originalPrice: '',
    packageId: '',
    amountPaid: 49999,
    paymentStatus: 'MANUAL_VERIFIED',
    paymentTxnId: 'OFFLINE_VERIFIED',
    autoApprove: true
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Rejection Modal State
  const [rejectingListingId, setRejectingListingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/super-admin/expo');
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
        setPackages(data.packages || []);
        setMetrics(data.metrics || {});
        if (data.packages?.length > 0 && !clientForm.packageId) {
          setClientForm(prev => ({ ...prev, packageId: data.packages[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId: string) => {
    try {
      const res = await fetch(`/api/expo/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', rejectionReason: null })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!rejectingListingId) return;
    try {
      const res = await fetch(`/api/expo/listings/${rejectingListingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim() || 'Details do not meet Tolee Expo verification criteria.'
        })
      });
      if (res.ok) {
        setRejectingListingId(null);
        setRejectionReason('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlock = async (listingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'BLOCKED' ? 'APPROVED' : 'BLOCKED';
    try {
      await fetch(`/api/expo/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to permanently delete this Expo listing?')) return;
    try {
      await fetch(`/api/expo/listings/${listingId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // User search for Create For Client
  const handleSearchUsers = async (q: string) => {
    setUserQuery(q);
    if (q.trim().length < 2) {
      setFoundUsers([]);
      return;
    }
    try {
      const res = await fetch(`/api/super-admin/expo/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setFoundUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClientListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      alert('Please search and select a Tolee client user.');
      return;
    }

    setIsCreatingClient(true);
    try {
      const res = await fetch('/api/super-admin/expo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          ...clientForm,
          expoPrice: Number(clientForm.expoPrice),
          originalPrice: Number(clientForm.originalPrice) || Number(clientForm.expoPrice)
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateClientModal(false);
        setSelectedUser(null);
        setClientForm({
          brandName: '',
          category: 'fashion',
          contactNumber: '',
          whatsappNumber: '',
          city: '',
          productName: '',
          offerLabel: 'SPECIAL EXPO DEAL',
          expoPrice: '',
          originalPrice: '',
          packageId: packages[0]?.id || '',
          amountPaid: 49999,
          paymentStatus: 'MANUAL_VERIFIED',
          paymentTxnId: 'OFFLINE_VERIFIED',
          autoApprove: true
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to create listing');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Priority Reordering (Move up / down)
  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    const listCopy = [...listings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= listCopy.length) return;

    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIndex];
    listCopy[targetIndex] = temp;

    // Recalculate displayOrders
    const orders = listCopy.map((item, idx) => ({
      id: item.id,
      displayOrder: idx + 1,
      isPinned: item.isPinned,
      isFeatured: item.isFeatured
    }));

    setListings(listCopy);

    try {
      await fetch('/api/super-admin/expo/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (listingId: string, currentPin: boolean) => {
    try {
      await fetch(`/api/expo/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPin })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredListings = listings.filter((item) => {
    if (activeTab === 'pending' && item.status !== 'PENDING_APPROVAL') return false;
    if (activeTab === 'approved' && item.status !== 'APPROVED') return false;
    if (activeTab === 'rejected' && item.status !== 'REJECTED' && item.status !== 'BLOCKED') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchBrand = item.brandName?.toLowerCase().includes(q);
      const matchCity = item.city?.toLowerCase().includes(q);
      const matchOwner = item.user?.name?.toLowerCase().includes(q) || item.user?.email?.toLowerCase().includes(q);
      return matchBrand || matchCity || matchOwner;
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-zinc-100">

      {/* HEADER WITH METRIC SUMMARY & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-xs uppercase mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Super Admin Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Tolee Expo &amp; Micro-Websites Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Review vendor listing submissions, manage client micro-websites, and configure global Expo grid ranking order.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/expo"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-xs font-bold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Expo</span>
          </Link>

          <Button
            onClick={() => setShowCreateClientModal(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Listing for Client</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Listings', value: metrics.totalCount, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-50 dark:bg-zinc-800/40' },
          { label: 'Pending Approval', value: metrics.pendingCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
          { label: 'Approved Live', value: metrics.approvedCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
          { label: 'Rejected', value: metrics.rejectedCount, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-950/20' },
          { label: 'Blocked', value: metrics.blockedCount, color: 'text-slate-600 dark:text-zinc-400', bg: 'bg-slate-100 dark:bg-zinc-800' },
          { label: 'Total Enquiries', value: metrics.totalEnquiries, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50/50 dark:bg-teal-950/20' }
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800 ${kpi.bg}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{kpi.label}</span>
            <div className={`text-xl font-black ${kpi.color} mt-1`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          {[
            { id: 'pending', label: `Pending Approvals (${metrics.pendingCount})` },
            { id: 'approved', label: `Approved (${metrics.approvedCount})` },
            { id: 'all', label: `All Listings (${metrics.totalCount})` },
            { id: 'rejected', label: `Rejected &amp; Blocked` },
            { id: 'priority', label: `Priority &amp; Order Manager` }
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-teal-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100'
              }`}
              dangerouslySetInnerHTML={{ __html: tab.label }}
            />
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search brand, city, owner..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* PRIORITY & POSITION MANAGER (Module 5) */}
      {activeTab === 'priority' ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-teal-600" />
                <span>Expo Listing Priority Manager</span>
              </h2>
              <p className="text-xs text-slate-500">
                Move listings up or down to set their real-time display sequence on the live Tolee Expo page.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-600">
              Orders auto-save to database instantly
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
            {listings
              .filter(l => l.status === 'APPROVED')
              .map((item, idx) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-zinc-300">
                      #{idx + 1}
                    </span>

                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      <img src={item.logoUrl || item.thumbnailUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80'} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">{item.brandName}</span>
                        {item.isPinned && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 fill-slate-950" />
                            <span>Pinned</span>
                          </span>
                        )}
                        <span className="text-[10px] text-teal-600 font-bold uppercase">
                          {item.package?.tier || 'Stall'} Tier
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.city} • Paid: ₹{item.amountPaid?.toLocaleString('en-IN')} • Slug: /expo/{item.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(item.id, item.isPinned)}
                      className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                        item.isPinned 
                          ? 'bg-amber-100 text-amber-900 border-amber-300' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Pin to Top"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      disabled={idx === 0}
                      onClick={() => handleMovePriority(idx, 'up')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <button
                      disabled={idx === listings.filter(l => l.status === 'APPROVED').length - 1}
                      onClick={() => handleMovePriority(idx, 'down')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* LISTINGS LIST */
        <div className="space-y-4">
          {filteredListings.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
              <p className="text-xs font-bold text-slate-500">No listings found matching this criteria.</p>
            </div>
          ) : (
            filteredListings.map((item) => (
              <div 
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                      <img src={item.logoUrl || item.thumbnailUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">{item.brandName}</h3>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Owner: <span className="font-bold text-slate-800 dark:text-zinc-200">{item.user?.name || item.ownerName}</span> ({item.user?.email}) • {item.city}, {item.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/expo/${item.slug}`}
                      target="_blank"
                      className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-600"
                      title="Preview Micro-Website"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {item.status === 'PENDING_APPROVAL' && (
                      <>
                        <Button
                          onClick={() => handleApprove(item.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>Approve &amp; Publish</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setRejectingListingId(item.id)}
                          className="px-4 py-2 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Reject</span>
                        </Button>
                      </>
                    )}

                    {item.status === 'APPROVED' && (
                      <Button
                        variant="outline"
                        onClick={() => handleBlock(item.id, item.status)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600"
                      >
                        Block / Hide
                      </Button>
                    )}

                    {item.status === 'BLOCKED' && (
                      <Button
                        onClick={() => handleBlock(item.id, item.status)}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
                      >
                        Restore Listing
                      </Button>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Listing Details Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Stall Offer</span>
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.productName}</p>
                    <span className="text-teal-600 font-bold">{item.offerLabel}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Price</span>
                    <p className="font-black text-slate-900 dark:text-white">
                      ₹{item.expoPrice?.toLocaleString('en-IN')} (Orig: ₹{item.originalPrice?.toLocaleString('en-IN')})
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Package &amp; Payment</span>
                    <p className="font-bold text-slate-900 dark:text-white">{item.package?.name || 'Standard'}</p>
                    <span className="text-[10px] text-emerald-600 font-bold">₹{item.amountPaid?.toLocaleString('en-IN')} ({item.paymentStatus})</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Leads &amp; Enquiries</span>
                    <p className="font-bold text-slate-900 dark:text-white">{item._count?.enquiries || 0} Leads</p>
                    <span className="text-[10px] text-slate-500 font-mono">/expo/{item.slug}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE LISTING FOR CLIENT MODAL (Module 4) */}
      {showCreateClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 dark:border-zinc-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>Create Expo Listing on Behalf of Client</span>
              </h2>
              <button
                onClick={() => setShowCreateClientModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClientListing} className="space-y-4">
              {/* Step A: Search Client User */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  1. Search &amp; Select Existing Registered Tolee User *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search user by name, email, or username..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  {foundUsers.length > 0 && !selectedUser && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {foundUsers.map(u => (
                        <div
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setFoundUsers([]); }}
                          className="p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer text-xs"
                        >
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email} • ID: {u.id}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-teal-950 dark:text-teal-200">Selected Client: {selectedUser.name}</span>
                      <p className="text-[11px] text-teal-700 dark:text-teal-400">{selectedUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-rose-500 font-bold"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Step B: Business Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.brandName}
                    onChange={(e) => setClientForm({ ...clientForm, brandName: e.target.value })}
                    placeholder="e.g. Jaipur Crafts Studio"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.city}
                    onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                    placeholder="e.g. Jaipur"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={clientForm.contactNumber}
                    onChange={(e) => setClientForm({ ...clientForm, contactNumber: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={clientForm.whatsappNumber}
                    onChange={(e) => setClientForm({ ...clientForm, whatsappNumber: e.target.value })}
                    placeholder="919876543210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Offer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Offer Product *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.productName}
                    onChange={(e) => setClientForm({ ...clientForm, productName: e.target.value })}
                    placeholder="e.g. Pure Cotton Anarkali"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={clientForm.expoPrice}
                    onChange={(e) => setClientForm({ ...clientForm, expoPrice: e.target.value })}
                    placeholder="1499"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Package & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Select Package</label>
                  <select
                    value={clientForm.packageId}
                    onChange={(e) => setClientForm({ ...clientForm, packageId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  >
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Payment Status</label>
                  <select
                    value={clientForm.paymentStatus}
                    onChange={(e) => setClientForm({ ...clientForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
                  >
                    <option value="MANUAL_VERIFIED">MANUAL_VERIFIED (Offline / IMPS)</option>
                    <option value="COMPLETED">COMPLETED (Online Gateway)</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoApproveCheck"
                  checked={clientForm.autoApprove}
                  onChange={(e) => setClientForm({ ...clientForm, autoApprove: e.target.checked })}
                />
                <label htmlFor="autoApproveCheck" className="text-xs font-bold cursor-pointer">
                  Immediately Approve and Publish Listing on Expo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateClientModal(false)}
                  className="rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingClient}
                  className="rounded-xl px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {isCreatingClient ? 'Creating...' : 'Create & Assign to Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingListingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="text-base font-black text-rose-600 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Enter Rejection Reason</span>
            </h3>
            <p className="text-xs text-slate-500">
              The listing owner will see this reason in their dashboard so they can make corrections.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please provide a clear logo and verified business phone number."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectingListingId(null)}
                className="rounded-xl px-4 py-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                className="rounded-xl px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
