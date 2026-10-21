'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  CreditCard,
  Gift,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminMembershipOverviewAction, adminAdjustMembershipAction } from '@/actions/membership';

export default function AdminBoostMembershipPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Adjustment modal
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [adjustDays, setAdjustDays] = useState(30);
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await getAdminMembershipOverviewAction();
      if (!res.success) {
        showToast(res.error || 'Failed to load admin overview');
      } else {
        setData(res.overview);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMembership) return;
    if (!adjustReason.trim()) {
      showToast('Please enter an adjustment reason for the audit log');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await adminAdjustMembershipAction({
        membershipId: selectedMembership.id,
        daysDelta: adjustDays,
        reason: adjustReason.trim(),
      });

      if (!res.success) {
        showToast(res.error || 'Adjustment failed');
        return;
      }

      showToast(`Adjusted membership by ${adjustDays > 0 ? `+${adjustDays}` : adjustDays} days`);
      setSelectedMembership(null);
      setAdjustReason('');
      await loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Adjustment failed');
    } finally {
      setIsAdjusting(false);
    }
  }

  const stats = data?.stats;
  const memberships = data?.memberships || [];

  const filteredMemberships = memberships.filter((m: any) => {
    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      (m.user?.name || '').toLowerCase().includes(q) ||
      (m.user?.username || '').toLowerCase().includes(q) ||
      (m.user?.email || '').toLowerCase().includes(q) ||
      (m.user?.phone || '').includes(q) ||
      m.userId.includes(q);

    if (!matchesQuery) return false;

    if (filterStatus === 'ACTIVE') return m.isActive;
    if (filterStatus === 'EXPIRED') return !m.isActive;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-black text-emerald-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paid Boost Memberships</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Tolee Unlimited Boost Membership Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Overview of ₹500/6-month paid memberships, revenue, and referral rewards (+1 month per paid referral).
          </p>
        </div>

        <Button
          onClick={loadOverview}
          disabled={loading}
          variant="outline"
          className="border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold shrink-0"
        >
          Refresh Data
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Memberships</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalMemberships || 0}</p>
          <span className="text-[10px] text-zinc-500">Ever created</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Active Members</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats?.activeMemberships || 0}</p>
          <span className="text-[10px] text-zinc-500">Unexpired</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Revenue</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">
            ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-zinc-500">{stats?.totalPaidOrders || 0} Paid Orders</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs">
            <span>Referral Months</span>
            <Gift className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">
            +{stats?.totalReferralMonthsAwarded || 0}
          </p>
          <span className="text-[10px] text-zinc-500">Free months granted</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Plan Price / Terms</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-xl font-black text-teal-400">₹500 / 180d</p>
          <span className="text-[10px] text-zinc-500">+30d per paid referee</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-400">Filter:</span>
          {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === s
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Memberships Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4">Referral Bonus</th>
                <th className="py-3 px-4">Last Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No memberships found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredMemberships.map((m: any) => {
                  const expiry = new Date(m.expiresAt);
                  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={m.id} className="hover:bg-zinc-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{m.user?.name || m.user?.username || 'User'}</div>
                        <div className="text-[11px] text-zinc-500">{m.user?.email || m.user?.phone || m.userId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            m.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          {m.isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-200">
                          {expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {m.isActive ? `${daysLeft} days remaining` : 'Expired'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-purple-400">
                          +{m.totalMonthsEarned || 0} Month(s)
                        </div>
                        <div className="text-[10px] text-zinc-500">From paid referrals</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.lastPayment ? (
                          <div>
                            <span className="font-bold text-zinc-200">₹{m.lastPayment.amount}</span>
                            <div className="text-[10px] text-zinc-500">{m.lastPayment.orderId}</div>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          onClick={() => {
                            setSelectedMembership(m);
                            setAdjustDays(30);
                            setAdjustReason('');
                          }}
                          size="sm"
                          variant="outline"
                          className="border-zinc-700 hover:border-emerald-500 text-xs rounded-xl"
                        >
                          Adjust Days
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Days Modal */}
      {selectedMembership && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustSubmit}
            className="bg-zinc-900 rounded-3xl border border-zinc-800 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">Adjust Membership Duration</h3>
              <button
                type="button"
                onClick={() => setSelectedMembership(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400 space-y-1">
              <p>
                User: <strong className="text-white">{selectedMembership.user?.name || selectedMembership.userId}</strong>
              </p>
              <p>
                Current Expiry:{' '}
                <strong className="text-emerald-400">
                  {new Date(selectedMembership.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Days to Add / Subtract</label>
              <input
                type="number"
                value={adjustDays}
                onChange={(e) => setAdjustDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                placeholder="e.g. 30 (add 30 days) or -30 (subtract)"
              />
              <div className="flex gap-2 pt-1">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setAdjustDays(d)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 text-[10px] text-zinc-300 hover:text-white font-bold"
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Adjustment Reason (Required for Audit Log)</label>
              <textarea
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Manual promotion extension, customer support compensation, fraud reversal"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMembership(null)}
                className="rounded-xl border-zinc-700 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdjusting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {isAdjusting ? 'Saving...' : 'Apply Adjustment'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-zinc-900 text-white border border-zinc-700 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
