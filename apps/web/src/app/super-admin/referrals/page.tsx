'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, MousePointerClick, Download, CheckCircle2, Wallet, 
  Clock, AlertTriangle, Check, X, Search, ArrowRight, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { 
  getSuperAdminReferralsDashboard, 
  approveReferralAction, 
  rejectReferralAction 
} from '@/actions/ads';

export default function SuperAdminReferralsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Drill down modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getSuperAdminReferralsDashboard();
      if (res.success) {
        setDashboard(res);
      } else {
        setError(res.error || 'Failed to retrieve dashboard metrics.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (referralId: string) => {
    if (!confirm("Are you sure you want to approve this referral reward? This will credit ₹500 to the referrer's wallet.")) return;
    setActionLoadingId(referralId);
    try {
      const res = await approveReferralAction(referralId);
      if (res.success) {
        alert("Referral successfully approved! Wallet credited.");
        await loadDashboard();
      } else {
        alert(res.error || "Failed to approve referral.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (referralId: string) => {
    if (!confirm("Are you sure you want to reject this referral? No reward will be issued.")) return;
    setActionLoadingId(referralId);
    try {
      const res = await rejectReferralAction(referralId);
      if (res.success) {
        alert("Referral rejected.");
        await loadDashboard();
      } else {
        alert(res.error || "Failed to reject referral.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div style={{ width: 40, height: 40, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Loading referral analytics...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl text-sm flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          <h4 className="font-bold">Error loading panel</h4>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const { stats, topReferrers, referrersList, pendingReferralsList } = dashboard;

  // Filter referrers list by username or name
  const filteredReferrers = referrersList.filter((r: any) => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-zinc-300 font-sans">
      
      {/* ─── STATS GRID OVERVIEW ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Referral Clicks', value: stats.totalClicks, icon: <MousePointerClick className="w-5 h-5 text-blue-500" /> },
          { label: 'App Installs', value: stats.totalDownloads, icon: <Download className="w-5 h-5 text-purple-500" /> },
          { label: 'Successful Signups', value: stats.totalSuccessful, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
          { label: 'Referral Earnings', value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, icon: <Wallet className="w-5 h-5 text-indigo-500" /> },
          { label: 'Wallet Credits', value: `₹${stats.totalWalletCredits.toLocaleString('en-IN')}`, icon: <ShieldCheck className="w-5 h-5 text-teal-500" /> },
          { label: 'Pending Approvals', value: stats.totalPending, icon: <Clock className="w-5 h-5 text-amber-500" />, highlight: stats.totalPending > 0 },
        ].map((item, idx) => (
          <div key={idx} className={`bg-[#0c0c0e] border rounded-3xl p-5 flex flex-col justify-between shadow-lg ${item.highlight ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-900'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
              {item.icon}
            </div>
            <p className="text-xl font-black text-white mt-3">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ─── TIME PERIODS COUNTERS ─── */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6">
        <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3 mb-4">Referral Conversion Velocities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Daily Conversions</span>
              <p className="text-2xl font-black text-emerald-500 mt-1">{stats.dailyReferrals}</p>
            </div>
            <span className="text-xs text-zinc-400">Past 24 Hours</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Weekly Conversions</span>
              <p className="text-2xl font-black text-indigo-400 mt-1">{stats.weeklyReferrals}</p>
            </div>
            <span className="text-xs text-zinc-400">Past 7 Days</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Monthly Conversions</span>
              <p className="text-2xl font-black text-purple-400 mt-1">{stats.monthlyReferrals}</p>
            </div>
            <span className="text-xs text-zinc-400">Past 30 Days</span>
          </div>
        </div>
      </div>

      {/* ─── PENDING MODERATION QUEUE (FRAUD DETECTED) ─── */}
      {pendingReferralsList.length > 0 && (
        <div className="bg-[#0c0c0e] border border-amber-500/10 rounded-3xl p-6 space-y-4 shadow-lg shadow-amber-500/[0.01]">
          <h3 className="text-xs uppercase font-black tracking-wider text-amber-500 border-b border-zinc-900 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Pending Fraud-Flagged Approvals ({pendingReferralsList.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-black uppercase text-[9px] tracking-wider">
                  <th className="py-3">Referrer (Inviter)</th>
                  <th className="py-3">Referee (New User)</th>
                  <th className="py-3">Suspicion Reason</th>
                  <th className="py-3">Joined On</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-medium">
                {pendingReferralsList.map((r: any) => (
                  <tr key={r.id} className="text-zinc-300 hover:bg-zinc-950/40">
                    <td className="py-4">
                      <span className="font-bold text-white block">{r.referrer.name}</span>
                      <span className="text-[10px] text-zinc-500">@{r.referrer.username}</span>
                    </td>
                    <td className="py-4">
                      <span className="font-bold text-white block">{r.referee.name}</span>
                      <span className="text-[10px] text-zinc-500">@{r.referee.username}</span>
                    </td>
                    <td className="py-4 text-amber-400/80">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[10px]">Same IP Address Detected</span>
                        <span className="text-[9px] text-zinc-500 mt-0.5">IP: {r.referee.lastLoginIp || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 text-zinc-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 text-right">
                      {actionLoadingId === r.id ? (
                        <span className="text-xs text-zinc-500 font-bold">Processing...</span>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold text-[10px] uppercase transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 border border-red-500/20 px-3 py-1 rounded-lg font-bold text-[10px] uppercase transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MAIN REFERS MANAGEMENT DASHBOARD ─── */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
          <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500">
            Registered Referrers Directory ({filteredReferrers.length})
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#09090b] border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-700 text-white w-full sm:w-64"
            />
          </div>
        </div>

        {filteredReferrers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">No matching referrers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-black uppercase text-[9px] tracking-wider">
                  <th className="py-3">User Name</th>
                  <th className="py-3">Referral Code</th>
                  <th className="py-3">Total Clicks</th>
                  <th className="py-3">Successful Referrals</th>
                  <th className="py-3">Wallet Balance</th>
                  <th className="py-3">Total Earned</th>
                  <th className="py-3">Last Referral Date</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-medium">
                {filteredReferrers.map((u: any) => (
                  <tr key={u.id} className="text-zinc-300 hover:bg-zinc-950/40">
                    <td className="py-3.5">
                      <span className="font-bold text-white block">{u.name}</span>
                      <span className="text-[10px] text-zinc-500">Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3.5 text-zinc-400 font-mono">
                      {u.code}
                    </td>
                    <td className="py-3.5 text-zinc-100">
                      {u.clicks} Clicks
                    </td>
                    <td className="py-3.5 text-emerald-500 font-bold">
                      {u.successfulReferrals} Joined
                    </td>
                    <td className="py-3.5 text-zinc-100 font-bold">
                      ₹{u.walletBalance}
                    </td>
                    <td className="py-3.5 text-[#00ba88] font-bold">
                      ₹{u.totalEarned}
                    </td>
                    <td className="py-3.5 text-zinc-400">
                      {u.lastReferralDate ? new Date(u.lastReferralDate).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-xs font-black text-indigo-500 hover:underline inline-flex items-center gap-1"
                      >
                        <span>History</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── DRILL DOWN USER REFERRAL HISTORY MODAL ─── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h4 className="text-sm font-black text-white">{selectedUser.name}&apos;s Referral History</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Code: {selectedUser.code}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {selectedUser.referrals.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No referral conversions recorded yet.</p>
              ) : (
                selectedUser.referrals.map((r: any) => (
                  <div key={r.id} className="p-3 bg-zinc-950/60 border border-zinc-900/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{r.referee.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">@{r.referee.username}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        r.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {r.status}
                      </span>
                      <p className="text-[9px] text-zinc-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-900">
              <button 
                onClick={() => setSelectedUser(null)} 
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-10 px-5 rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
