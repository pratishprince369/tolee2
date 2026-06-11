'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, Megaphone, CheckCircle2, XCircle, Clock, 
  ExternalLink, User, Target, BarChart2, ShieldCheck, 
  AlertTriangle, Check, X, Search, Wallet, ArrowLeftRight
} from 'lucide-react';
import { superAdminGetCampaigns, superAdminModerateCampaign, superAdminGetWalletTransactions } from '@/actions/ads';
import { getMediaThumbnail, isVideoUrl } from '@/lib/media';

export default function SuperAdminAdsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Moderation state
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'running' | 'paused' | 'rejected'>('all');

  // Wallet Transfers Audit System States
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<'approvals' | 'wallet'>('approvals');
  const [walletFilter, setWalletFilter] = useState<'all' | 'flagged' | 'transfers' | 'other'>('all');
  const [walletSearchQuery, setWalletSearchQuery] = useState('');

  const loadWalletTransactions = async () => {
    try {
      const res = await superAdminGetWalletTransactions();
      if (res.success && res.transactions) {
        setWalletTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Failed to load wallet transactions', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await superAdminGetCampaigns();
      if (res.success && res.campaigns) {
        setCampaigns(res.campaigns);
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error(err);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadCampaigns();
      loadWalletTransactions();
    }
  }, [session]);

  const handleModerate = async (campaignId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await superAdminModerateCampaign(campaignId, status, reason);
      if (res.success) {
        setSuccessMsg(`Campaign successfully ${status === 'approved' ? 'approved' : 'rejected'}.`);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedCampaign(null);
        loadCampaigns();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.error || 'Failed to moderate campaign');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="h-16 w-16 text-rose-500 animate-bounce" />
        <h1 className="mt-6 text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-slate-400">Please sign in with a Super Admin account to access this moderation deck.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-emerald-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wider animate-pulse">Loading Admin Deck...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="h-16 w-16 text-rose-500" />
        <h1 className="mt-6 text-2xl font-bold">Unauthorized Area</h1>
        <p className="mt-2 text-slate-400 max-w-sm">This dashboard is strictly restricted to Tolee system super administrators only.</p>
      </div>
    );
  }

  // Count stats
  const totalCount = campaigns.length;
  const pendingCount = campaigns.filter(c => c.status === 'pending').length;
  const runningCount = campaigns.filter(c => c.status === 'running').length;
  const rejectedCount = campaigns.filter(c => c.status === 'rejected').length;

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Wallet stats calculations
  const walletTotalVolume = walletTransactions
    .filter(tx => tx.type === 'transfer_receive')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const walletFlaggedCount = walletTransactions.filter(tx => tx.isFlagged).length;

  const walletUniqueUsers = new Set(
    walletTransactions.map(tx => tx.wallet?.user?.email).filter(Boolean)
  ).size;

  // Wallet Filtered Transactions
  const filteredWalletTransactions = walletTransactions.filter(tx => {
    const user = tx.wallet?.user;
    const matchesSearch = 
      (user?.name || '').toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
      (user?.email || '').toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
      (user?.username || '').toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
      (tx.description || '').toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(walletSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (walletFilter === 'flagged') return tx.isFlagged;
    if (walletFilter === 'transfers') return tx.type === 'transfer_send' || tx.type === 'transfer_receive';
    if (walletFilter === 'other') return tx.type !== 'transfer_send' && tx.type !== 'transfer_receive';
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
            <ShieldCheck className="h-4 w-4" />
            Security & System Moderation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            {adminActiveTab === 'approvals' ? 'Super Admin Ad Approvals' : 'System Wallet Audits & Security'}
          </h1>
        </div>

        <span className="text-xs bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-slate-400">
          Admin Account: <strong className="text-slate-200">{session?.user?.email}</strong>
        </span>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Tab Navigation Selector */}
      <div className="flex border-b border-white/5 mb-8">
        <button
          onClick={() => setAdminActiveTab('approvals')}
          className={`flex items-center gap-2 pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all px-4 select-none ${
            adminActiveTab === 'approvals'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Megaphone className="h-4.5 w-4.5" />
          Campaign Approvals ({pendingCount} pending)
        </button>
        <button
          onClick={() => {
            setAdminActiveTab('wallet');
            loadWalletTransactions();
          }}
          className={`flex items-center gap-2 pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all px-4 select-none ${
            adminActiveTab === 'wallet'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="h-4.5 w-4.5" />
          Wallet Audits ({walletTransactions.length} items)
        </button>
      </div>

      {/* Admin stats counters */}
      {adminActiveTab === 'approvals' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-4.5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Campaigns</p>
            <h3 className="text-2xl font-extrabold mt-1">{totalCount}</h3>
          </div>
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Pending Review</p>
            <h3 className="text-2xl font-extrabold text-amber-300 mt-1">{pendingCount}</h3>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Active Running</p>
            <h3 className="text-2xl font-extrabold text-emerald-300 mt-1">{runningCount}</h3>
          </div>
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">Rejected</p>
            <h3 className="text-2xl font-extrabold text-rose-300 mt-1">{rejectedCount}</h3>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-4.5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Transactions</p>
            <h3 className="text-2xl font-extrabold mt-1">{walletTransactions.length}</h3>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Audit Volume</p>
            <h3 className="text-2xl font-extrabold text-emerald-300 mt-1">₹{walletTotalVolume.toLocaleString('en-IN')}</h3>
          </div>
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Flagged Audits</p>
            <h3 className="text-2xl font-extrabold text-amber-300 mt-1">{walletFlaggedCount}</h3>
          </div>
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4.5">
            <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Monitored Wallets</p>
            <h3 className="text-2xl font-extrabold text-indigo-300 mt-1">{walletUniqueUsers}</h3>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      {adminActiveTab === 'approvals' ? (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950/80 border border-white/5 rounded-2xl p-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search campaign, advertiser..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500/40"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              {['all', 'pending', 'running', 'paused', 'rejected'].map((filterVal: any) => (
                <button
                  key={filterVal}
                  onClick={() => setStatusFilter(filterVal)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border capitalize shrink-0 select-none ${
                    statusFilter === filterVal 
                      ? 'bg-rose-600 border-rose-600 text-white shadow-lg' 
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {filterVal}
                </button>
              ))}
            </div>
          </div>

          {/* Campaigns Listing */}
          <div className="rounded-3xl border border-white/5 bg-slate-950 p-6 shadow-xl">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No matching campaigns found inside database.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCampaigns.map((camp) => {
                  const advertiser = camp.user;
                  const adSet = camp.adSets?.[0];
                  const ad = adSet?.ads?.[0];
                  const statusColors = 
                    camp.status === 'running' ? 'text-emerald-400 bg-emerald-500/10' : 
                    camp.status === 'pending' ? 'text-amber-400 bg-amber-500/10 animate-pulse' :
                    camp.status === 'paused' ? 'text-blue-400 bg-blue-500/10' :
                    'text-rose-400 bg-rose-500/10';

                  return (
                    <div key={camp.id} className="rounded-2xl border border-white/5 bg-slate-900/30 p-5 space-y-4 hover:border-white/10 transition-all">
                      
                      {/* Campaign top summary */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-100">{camp.name}</h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/5 ${statusColors}`}>
                              {camp.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Advertiser: <strong className="text-slate-300">{advertiser?.name || 'Tolee Creator'}</strong> ({advertiser?.email || 'N/A'}) 
                            • Wallet Balance: <strong className="text-emerald-400">₹{advertiser?.wallet?.balance?.toFixed(2) || '0.00'}</strong>
                          </p>
                        </div>

                        {camp.status === 'pending' && (
                          <div className="flex items-center gap-2 select-none">
                            <button
                              onClick={() => handleModerate(camp.id, 'approved')}
                              disabled={actionLoading}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCampaign(camp);
                                setShowRejectModal(true);
                              }}
                              disabled={actionLoading}
                              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Settings & Specs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-300">
                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-1.5">Campaign Config</p>
                          <ul className="space-y-1">
                            <li>Objective: <strong className="text-white capitalize">{camp.objective}</strong></li>
                            <li>Format: <strong className="text-white capitalize">{camp.type}</strong></li>
                            <li>Category: <strong className="text-white capitalize">{camp.specialAdCategory}</strong></li>
                          </ul>
                        </div>

                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-1.5">Targeting Criteria</p>
                          <ul className="space-y-1">
                            <li>Location: <strong className="text-white">{adSet?.targetingCities || adSet?.targetingStates || adSet?.targetingCountries || 'Worldwide'}</strong></li>
                            <li>Interests: <strong className="text-white">{adSet?.targetingInterests || 'All Interests'}</strong></li>
                            <li>Specific Tolees: <strong className="text-white">{adSet?.targetingToleeIds || 'Global Feed'}</strong></li>
                          </ul>
                        </div>

                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-1.5">Budget & Schedule</p>
                          <ul className="space-y-1">
                            <li>Limit: <strong className="text-white capitalize">{adSet?.budgetType}</strong> (<strong className="text-emerald-400">₹{adSet?.budgetAmount}</strong>)</li>
                            <li>Conversion Target: <strong className="text-white capitalize">{adSet?.conversionLocation} ({adSet?.performanceGoal})</strong></li>
                            <li>Schedule: <strong className="text-white">{adSet?.startDate ? new Date(adSet.startDate).toLocaleDateString() : 'Now'} - {adSet?.endDate ? new Date(adSet.endDate).toLocaleDateString() : 'Ongoing'}</strong></li>
                          </ul>
                        </div>
                      </div>

                      {/* Creative Preview */}
                      {ad && (
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col sm:flex-row gap-4 items-start">
                          {ad.mediaUrls && ad.mediaUrls.split(',').map((u: string) => u.trim()).filter(Boolean)[0] ? (
                            (() => {
                              const displayMedia = ad.mediaUrls.split(',').map((u: string) => u.trim()).filter(Boolean)[0];
                              const isVideo = isVideoUrl(displayMedia);
                              return (
                                <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-900 relative flex items-center justify-center">
                                  {isVideo ? (
                                    <video 
                                      src={displayMedia} 
                                      className="h-full w-full object-cover" 
                                      muted 
                                      playsInline 
                                      autoPlay 
                                      loop 
                                    />
                                  ) : (
                                    <img 
                                      src={displayMedia} 
                                      alt="Ad Creative" 
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })()
                          ) : null}
                          
                          <div className="space-y-1 max-w-lg">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Ad Copy Preview</p>
                            <h4 className="text-sm font-bold text-white leading-snug">{ad.headline || 'Product Headline'}</h4>
                            <p className="text-xs text-slate-300 line-clamp-2">{ad.primaryText || 'Ad primary text caption body'}</p>
                            {ad.destinationUrl && (
                              <a 
                                href={ad.destinationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:underline mt-1"
                              >
                                Dest: {ad.destinationUrl} <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Wallet Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950/80 border border-white/5 rounded-2xl p-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search Tx ID, User, Username, Note..."
                value={walletSearchQuery}
                onChange={(e) => setWalletSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500/40"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              {[
                { label: 'All Log Statements', value: 'all' },
                { label: 'Security Flagged Only', value: 'flagged' },
                { label: 'Transfers Only', value: 'transfers' },
                { label: 'Deposits / Other', value: 'other' }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setWalletFilter(item.value as any)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border shrink-0 select-none ${
                    walletFilter === item.value 
                      ? 'bg-rose-600 border-rose-600 text-white shadow-lg' 
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet logs panel */}
          <div className="rounded-3xl border border-white/5 bg-slate-950 p-6 shadow-xl">
            {filteredWalletTransactions.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No matching system wallet transactions found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWalletTransactions.map((tx) => {
                  const txUser = tx.wallet?.user;
                  const formattedDate = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : 'N/A';
                  
                  const isCredit = tx.amount > 0;
                  const isTransfer = tx.type === 'transfer_send' || tx.type === 'transfer_receive';

                  return (
                    <div 
                      key={tx.id} 
                      className={`rounded-2xl border bg-slate-900/30 p-5 hover:border-white/10 transition-all ${
                        tx.isFlagged ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-white/5'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* Owner / User */}
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                            <User className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-100">{txUser?.name || 'Tolee User'}</h4>
                              {txUser?.username && (
                                <span className="text-xs text-slate-400">@{txUser.username}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{txUser?.email || 'No email'}</p>
                          </div>
                        </div>

                        {/* Description & Note */}
                        <div className="flex-1 md:px-6">
                          <p className="text-xs text-slate-200 font-medium leading-relaxed">
                            {tx.description || 'System wallet adjustment'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-white/5">
                              TX ID: {tx.id}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Amount & Status Badge */}
                        <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0 gap-2">
                          <span className={`text-base font-extrabold tracking-tight ${
                            isCredit ? 'text-emerald-400' : 'text-slate-300'
                          }`}>
                            {isCredit ? '+' : ''}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {isTransfer ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                                <ArrowLeftRight className="h-2.5 w-2.5" /> Transfer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-500/10 border-slate-500/20 text-slate-400">
                                System
                              </span>
                            )}
                            
                            {tx.isFlagged && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse">
                                <AlertTriangle className="h-2.5 w-2.5" /> Flagged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Flag Warning Card */}
                      {tx.isFlagged && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 animate-in slide-in-from-top-1 duration-200">
                          <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold uppercase text-[9px] tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              Fraud Alert
                            </span>
                            <p className="mt-1 font-semibold">{tx.flagReason || 'Dynamic fraud risk rule matched.'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              This wallet statement represents a high-value transfer out of the account. Verify if this pattern is aligned with known advertising budgets.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Rejection Modal popover */}
      {showRejectModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 max-w-sm w-full text-white shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold">Reject Campaign</h3>
            <p className="text-xs text-slate-400 mt-1">Please provide a constructive feedback reason for the advertiser explaining why their promotion is rejected.</p>
            
            <textarea
              className="w-full mt-4 rounded-xl bg-white/5 border border-white/10 p-3 text-xs focus:outline-none focus:border-rose-500/40 text-slate-200"
              rows={3}
              placeholder="E.g., Creative violates advertising standards or contains invalid links."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedCampaign(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-white/5 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModerate(selectedCampaign.id, 'rejected', rejectionReason)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
