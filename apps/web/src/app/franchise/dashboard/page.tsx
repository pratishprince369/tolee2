'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building, Copy, Check, Share2, Send, Link as LinkIcon, DollarSign, 
  Users, Activity, Wallet, Clock, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, Download, Eye, ShieldAlert, Award
} from 'lucide-react';

type Tab = 'overview' | 'referrals' | 'payouts';

export default function FranchiseDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [franchiseStatus, setFranchiseStatus] = useState('');
  
  // Dashboard Data
  const [franchise, setFranchise] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Payout Form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');

  // Copy/Share Notification
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/franchise/dashboard');
    } else if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/franchise/dashboard');
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to fetch dashboard data.');
        return;
      }

      setHasApplied(data.hasApplied);
      if (data.hasApplied) {
        setFranchiseStatus(data.status);
        setFranchise(data.franchise);
        setReferrals(data.referrals || []);
        setWithdrawals(data.withdrawals || []);
        setTransactions(data.transactions || []);
        setChartData(data.chartData || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccess('');
    setPayoutLoading(true);

    try {
      const res = await fetch('/api/franchise/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          bankDetails
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.message || 'Failed to submit withdrawal request.');
        return;
      }

      setPayoutSuccess(data.message || 'Withdrawal request submitted successfully!');
      setWithdrawAmount('');
      // Reload stats
      fetchDashboardData();
    } catch (err: any) {
      setPayoutError(err.message || 'Something went wrong.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const referralLink = franchise ? `${window.location.origin}/ref/${franchise.code}` : '';
  const qrCodeUrl = franchise ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = (platform: 'whatsapp' | 'facebook' | 'telegram' | 'email') => {
    const text = `Join Tolee today using my Franchise link! Create content, watch reels, and run ad campaigns: ${referralLink}`;
    let url = '';
    
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
        break;
      case 'email':
        url = `mailto:?subject=Join Tolee&body=${encodeURIComponent(text)}`;
        break;
    }
    
    window.open(url, '_blank');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b]">
        <div className="text-center space-y-4">
          <Building className="w-10 h-10 text-zinc-400 animate-pulse mx-auto" />
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-550">Loading Franchise Workspace...</p>
        </div>
      </div>
    );
  }

  if (!hasApplied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b] p-4">
        <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 bg-zinc-50/20 dark:bg-zinc-900/5 text-center max-w-sm w-full space-y-4">
          <Building className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-black text-zinc-850 dark:text-white">Become a Tolee Franchise</h3>
          <p className="text-xs text-zinc-450 dark:text-zinc-550 leading-relaxed">
            You don't have a franchise profile register yet. Start your application to activate your referred ads sharing dashboard.
          </p>
          <Button onClick={() => router.push('/franchise')} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-10 rounded-xl text-xs gap-1.5 shadow-sm">
            Apply Now <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (franchiseStatus === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b] p-4">
        <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 bg-zinc-50/20 dark:bg-zinc-900/5 text-center max-w-md w-full space-y-4">
          <Clock className="w-12 h-12 text-zinc-400 mx-auto animate-pulse" />
          <h3 className="text-lg font-black text-zinc-850 dark:text-white">Application Under Review</h3>
          <p className="text-xs text-zinc-450 dark:text-zinc-550 leading-relaxed">
            Your application (Code: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{franchise?.code}</span>) is pending admin review. We are currently verifying your payment reference ID. This process usually takes 24 hours.
          </p>
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-950/20 text-[10px] text-zinc-500 font-mono text-left space-y-1">
            <div><strong>Location:</strong> {franchise?.preferredLocation}</div>
            <div><strong>Business Name:</strong> {franchise?.businessName || 'N/A'}</div>
            <div><strong>Transaction Reference:</strong> {franchise?.paymentDetails || 'N/A'}</div>
          </div>
          <Button onClick={fetchDashboardData} className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-bold h-10 rounded-xl text-xs gap-1.5">
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  if (franchiseStatus === 'suspended' || franchiseStatus === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b] p-4">
        <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 bg-zinc-50/20 dark:bg-zinc-900/5 text-center max-w-sm w-full space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-black text-zinc-850 dark:text-white">Account {franchiseStatus.toUpperCase()}</h3>
          <p className="text-xs text-zinc-450 dark:text-zinc-550 leading-relaxed">
            Your franchise license ({franchise?.code}) has been {franchiseStatus} by the Super Admin. Please contact Tolee Support for more details or recovery options.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-150 font-sans">
      {/* Top Brand Header */}
      <div className="h-16 border-b border-zinc-200/60 dark:border-zinc-900/60 bg-zinc-50/50 dark:bg-[#0c0c0e] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg">🏪</span>
          <div className="flex flex-col">
            <span className="text-xs font-black text-zinc-800 dark:text-white flex items-center gap-1">
              Franchise Portal ({franchise.code})
            </span>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-extrabold">Marketing Area: {franchise.preferredLocation}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Slabs counter badge */}
          <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 rounded-xl text-[10px] font-black text-zinc-700 dark:text-zinc-300">
            Slab: {franchise.currentSlabPercent}% Commission
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs font-extrabold rounded-xl text-left border transition-all ${
              activeTab === 'overview'
                ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-350/50 dark:border-zinc-700/60 text-zinc-850 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Overview & Clicks
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs font-extrabold rounded-xl text-left border transition-all ${
              activeTab === 'referrals'
                ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-350/50 dark:border-zinc-700/60 text-zinc-850 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
            }`}
          >
            <Users className="w-4 h-4" /> Referred Network ({referrals.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs font-extrabold rounded-xl text-left border transition-all ${
              activeTab === 'payouts'
                ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-350/50 dark:border-zinc-700/60 text-zinc-850 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
            }`}
          >
            <Wallet className="w-4 h-4" /> Wallet & Payout requests
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Financial & Users Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Referred Clicks</span>
                  <div className="text-xl sm:text-2xl font-black text-zinc-850 dark:text-white leading-none pt-1">{franchise.totalClicks}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Active / Total</span>
                  <div className="text-xl sm:text-2xl font-black text-zinc-850 dark:text-white leading-none pt-1">{franchise.activeCount} / {franchise.registeredCount}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Ad volume generated</span>
                  <div className="text-xl sm:text-2xl font-black text-zinc-850 dark:text-white leading-none pt-1">₹{franchise.totalAdVolume.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Wallet balance</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-500 dark:text-emerald-400 leading-none pt-1">₹{franchise.walletBalance.toFixed(2)}</div>
                </div>
              </div>

              {/* Unique Referral Link share banner */}
              <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0c0c0e]/80 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-zinc-850 dark:text-white flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-zinc-400" /> Share Referral Code Link
                    </h3>
                    <p className="text-[11px] text-zinc-450 dark:text-zinc-500 max-w-sm">
                      Copy and share this unique URL to register creators. Clicks and registration conversions are tracked automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input readOnly value={referralLink} className="bg-zinc-50/60 dark:bg-zinc-900/20 border-zinc-250 dark:border-zinc-800 text-xs font-mono select-all h-10 rounded-xl" />
                  <Button onClick={handleCopyLink} size="icon" className="bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl shrink-0 w-10 h-10">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Social Share Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                  <Button onClick={() => shareVia('whatsapp')} size="sm" variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800 rounded-lg h-7 px-2.5">🟢 WhatsApp</Button>
                  <Button onClick={() => shareVia('facebook')} size="sm" variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800 rounded-lg h-7 px-2.5">🔵 Facebook</Button>
                  <Button onClick={() => shareVia('telegram')} size="sm" variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800 rounded-lg h-7 px-2.5">✈️ Telegram</Button>
                  <Button onClick={() => shareVia('email')} size="sm" variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800 rounded-lg h-7 px-2.5">📧 Email Share</Button>
                </div>
              </div>

              {/* QR Code & Weekly Growth Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* QR Code Card */}
                <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Download QR Code</span>
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="Franchise QR Code" className="w-32 h-32 border border-zinc-200 p-1 bg-white rounded-lg shadow-sm" />
                  )}
                  <a href={qrCodeUrl} download="tolee-franchise-qr.png" target="_blank" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-zinc-500 hover:text-zinc-800 dark:hover:text-white uppercase tracking-wider transition-colors pt-1">
                    <Download className="w-3 h-3" /> Save Image File
                  </a>
                </div>

                {/* Click & Signup Charts */}
                <div className="md:col-span-2 bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5 flex flex-col justify-between">
                  <h4 className="text-xs uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-900/50">Weekly Referrals Performance</h4>
                  
                  <div className="h-32 flex items-end justify-between gap-2 pt-4">
                    {chartData.map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[9px] p-1 rounded font-mono z-15 whitespace-nowrap shadow-md">
                          Clicks: {day.clicks} | Signups: {day.signups}
                        </div>

                        <div className="flex gap-0.5 w-full items-end h-full justify-center">
                          {/* Clicks bar */}
                          <div 
                            className="w-1.5 rounded-t bg-zinc-200 dark:bg-zinc-800" 
                            style={{ height: `${Math.min(100, (day.clicks / Math.max(1, ...chartData.map(d => d.clicks))) * 100)}%` }}
                          />
                          {/* Signups bar */}
                          <div 
                            className="w-1.5 rounded-t bg-zinc-400 dark:bg-zinc-650" 
                            style={{ height: `${Math.min(100, (day.signups / Math.max(1, ...chartData.map(d => d.signups))) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-550 mt-2 truncate w-full text-center">{day.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REFERRED NETWORK */}
          {activeTab === 'referrals' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Join Stats Header */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-3 text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-450 dark:text-zinc-500">Joined today</span>
                  <div className="text-lg font-black text-zinc-850 dark:text-white pt-0.5">{franchise.dailyJoins}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-3 text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-450 dark:text-zinc-500">Joined this week</span>
                  <div className="text-lg font-black text-zinc-850 dark:text-white pt-0.5">{franchise.weeklyJoins}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-3 text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-450 dark:text-zinc-500">Joined this month</span>
                  <div className="text-lg font-black text-zinc-850 dark:text-white pt-0.5">{franchise.monthlyJoins}</div>
                </div>
              </div>

              {/* Referrals table list */}
              <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-900/50 pb-3">Referred User Log</h3>
                
                {referrals.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 font-bold text-xs">
                    No users have signed up using your link yet. Start promoting your franchise link!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-150 dark:border-zinc-900 text-zinc-450 dark:text-zinc-500 font-black uppercase text-[9px] tracking-wider">
                          <th className="py-2.5">User</th>
                          <th className="py-2.5">Join Date</th>
                          <th className="py-2.5 text-center">Device</th>
                          <th className="py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-medium">
                        {referrals.map((r) => {
                          const u = r.referee;
                          if (!u) return null;
                          const isActive = u.email_verified || u.phoneVerified || u.isMobileVerified || (u.lastActiveAt && (Date.now() - new Date(u.lastActiveAt).getTime()) < 30 * 24 * 60 * 60 * 1000);
                          
                          return (
                            <tr key={r.id} className="text-zinc-700 dark:text-zinc-300">
                              <td className="py-3 flex items-center gap-2">
                                <span className="font-bold text-zinc-900 dark:text-white">{u.name}</span>
                                <span className="text-[10px] text-zinc-450">@{u.username}</span>
                              </td>
                              <td className="py-3 font-mono text-zinc-500">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                              <td className="py-3 text-center text-[10px] text-zinc-500">{r.device || 'N/A'}</td>
                              <td className="py-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  isActive 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                    : 'bg-zinc-100 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-500'
                                }`}>
                                  {isActive ? 'Active' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WALLET & PAYOUT REQUESTS */}
          {activeTab === 'payouts' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Financial Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Commission Earned</span>
                  <div className="text-lg font-black text-zinc-850 dark:text-white leading-none pt-1">₹{franchise.commissionEarned.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Available to Withdraw</span>
                  <div className="text-lg font-black text-emerald-500 dark:text-emerald-450 leading-none pt-1">₹{franchise.walletBalance.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Pending Approvals</span>
                  <div className="text-lg font-black text-zinc-500 leading-none pt-1">₹{franchise.commissionPending.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Commission Paid</span>
                  <div className="text-lg font-black text-zinc-850 dark:text-white leading-none pt-1">₹{franchise.commissionPaid.toFixed(2)}</div>
                </div>
              </div>

              {/* Request Payout Form */}
              <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0c0c0e]/80 shadow-sm space-y-5">
                <h3 className="text-sm font-black text-zinc-850 dark:text-white border-b border-zinc-100 dark:border-zinc-900/50 pb-3">Initiate Payout Withdrawal</h3>
                
                {payoutError && <div className="p-3 bg-red-100/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-xs text-red-500 font-semibold">{payoutError}</div>}
                {payoutSuccess && <div className="p-3 bg-emerald-100/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-500 font-semibold">{payoutSuccess}</div>}

                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Withdraw Amount (₹)</label>
                      <Input
                        type="number"
                        min="1000"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        required
                        placeholder="Min ₹1,000"
                        className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Bank Details / UPI ID</label>
                      <Input
                        value={bankDetails}
                        onChange={e => setBankDetails(e.target.value)}
                        required
                        placeholder="UPI ID, or Bank Account + IFSC details"
                        className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10"
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={payoutLoading} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-10 rounded-xl text-xs">
                    {payoutLoading ? 'Processing Request...' : 'Request Payout Transfer'}
                  </Button>
                </form>
              </div>

              {/* Transactions logs list */}
              <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-900/50 pb-3">Financial Transaction Log</h3>
                
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-450 dark:text-zinc-550 font-bold text-xs">
                    No transactions logs recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900/50 rounded-xl text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{tx.description}</span>
                          <span className="text-[10px] text-zinc-450 font-mono">{new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <span className={`font-mono font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
