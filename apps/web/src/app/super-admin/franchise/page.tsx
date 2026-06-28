'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, ShieldAlert, Award, Landmark, FileText, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';

export default function SuperAdminFranchisePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [franchises, setFranchises] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Slab form states
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [minUsers, setMinUsers] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [commission, setCommission] = useState('');

  // Override form states
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideDesc, setOverrideDesc] = useState('');

  // App edit states
  const [editLocFranchiseId, setEditLocFranchiseId] = useState<string | null>(null);
  const [customLoc, setCustomLoc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/franchise');
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load admin stats.');
        return;
      }
      setFranchises(data.franchises || []);
      setWithdrawals(data.withdrawals || []);
      setSlabs(data.slabs || []);
      setAuditLogs(data.auditLogs || []);
      setReferrals(data.referrals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch franchise data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, preferredLocation?: string) => {
    try {
      const res = await fetch('/api/super-admin/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateFranchiseStatus',
          id,
          status,
          preferredLocation
        })
      });
      if (res.ok) {
        setEditLocFranchiseId(null);
        setCustomLoc('');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Action failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWithdrawAction = async (id: string, approve: boolean, reason?: string) => {
    try {
      const res = await fetch('/api/super-admin/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'handleWithdrawal',
          id,
          approve,
          rejectionReason: reason
        })
      });
      if (res.ok) {
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Payout action failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSlabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSlab',
          id: editingSlabId,
          minUsers: Number(minUsers),
          maxUsers: Number(maxUsers),
          commission: Number(commission)
        })
      });
      if (res.ok) {
        setEditingSlabId(null);
        setMinUsers('');
        setMaxUsers('');
        setCommission('');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Slab saving failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slab?')) return;
    try {
      const res = await fetch('/api/super-admin/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteSlab',
          id
        })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchiseId) return;

    try {
      const res = await fetch('/api/super-admin/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'overrideCommission',
          franchiseId: selectedFranchiseId,
          overrideAmount: Number(overrideAmount),
          description: overrideDesc
        })
      });
      if (res.ok) {
        setSelectedFranchiseId(null);
        setOverrideAmount('');
        setOverrideDesc('');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Override failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px] text-zinc-400 font-medium">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Syncing Franchise Panel records...
      </div>
    );
  }

  const pendingApps = franchises.filter(f => f.status === 'pending');
  const activeFranchises = franchises.filter(f => f.status === 'active' || f.status === 'suspended');
  const pendingPayouts = withdrawals.filter(w => w.status === 'pending');

  return (
    <div className="p-6 space-y-8 bg-[#09090b] text-zinc-100 min-h-screen">
      {error && <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl text-sm text-red-400 font-bold">{error}</div>}

      {/* Slabs Configuration Panel */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
          <h2 className="text-base font-black flex items-center gap-2">
            <Award className="w-5 h-5 text-zinc-400" /> Commission Slabs Configuration
          </h2>
          <Button 
            onClick={() => {
              setEditingSlabId('');
              setMinUsers('0');
              setMaxUsers('19999');
              setCommission('2.0');
            }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs rounded-lg"
          >
            Add New Slab
          </Button>
        </div>

        {editingSlabId !== null && (
          <form onSubmit={handleSlabSubmit} className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 items-end animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Min Users</label>
              <Input type="number" required value={minUsers} onChange={e => setMinUsers(e.target.value)} className="bg-[#09090b] border-zinc-800 text-xs h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Max Users</label>
              <Input type="number" required value={maxUsers} onChange={e => setMaxUsers(e.target.value)} className="bg-[#09090b] border-zinc-800 text-xs h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Commission %</label>
              <Input type="number" step="0.1" required value={commission} onChange={e => setCommission(e.target.value)} className="bg-[#09090b] border-zinc-800 text-xs h-9 rounded-xl" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" onClick={() => setEditingSlabId(null)} variant="ghost" className="text-xs h-9 rounded-xl text-zinc-500">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-xl px-4">Save</Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {slabs.map(s => (
            <div key={s.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between gap-3 relative group">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-zinc-500">Active Slab Level</span>
                <div className="text-sm font-black text-zinc-350">{s.minUsers.toLocaleString()} - {s.maxUsers > 1000000 ? '100k+' : s.maxUsers.toLocaleString()} Users</div>
                <div className="text-xl font-black text-emerald-500">{s.commission}% commission</div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-zinc-900">
                <button 
                  onClick={() => {
                    setEditingSlabId(s.id);
                    setMinUsers(s.minUsers.toString());
                    setMaxUsers(s.maxUsers.toString());
                    setCommission(s.commission.toString());
                  }} 
                  className="text-[10px] font-bold text-zinc-400 hover:text-white"
                >
                  Edit
                </button>
                <button onClick={() => handleDeleteSlab(s.id)} className="text-[10px] font-bold text-red-500 hover:text-red-400 ml-auto">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pending Applications Queue */}
        <div className="lg:col-span-6 bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-5 space-y-4">
          <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3">Pending Franchise Queue ({pendingApps.length})</h3>
          
          {pendingApps.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-bold">No pending franchise requests.</div>
          ) : (
            <div className="space-y-4">
              {pendingApps.map(app => (
                <div key={app.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-white">{app.fullName}</div>
                      <div className="text-[10px] text-zinc-500">Email: {app.email} | Mob: {app.mobile}</div>
                      <div className="text-[10px] text-zinc-500">Business Name: {app.businessName || 'N/A'}</div>
                    </div>
                    <span className="font-mono text-[9px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">{app.code}</span>
                  </div>

                  <div className="p-3 bg-[#0d0d0f] border border-zinc-900 rounded-xl space-y-1 text-[10px]">
                    <div><strong>Requested Area:</strong> {app.preferredLocation}</div>
                    <div><strong>PIN Code:</strong> {app.pincode}</div>
                    <div><strong>PAN/Aadhaar:</strong> {app.aadhaarPan || 'N/A'}</div>
                    <div><strong>Payment Reference:</strong> {app.paymentDetails || 'N/A'}</div>
                    <div className="pt-1 text-zinc-450 italic"><strong>Address:</strong> {app.address}, {app.city}, {app.state}</div>
                  </div>

                  {editLocFranchiseId === app.id ? (
                    <div className="flex gap-2">
                      <Input value={customLoc} onChange={e => setCustomLoc(e.target.value)} placeholder="Confirm location assignment" className="bg-[#09090b] border-zinc-800 text-xs h-8 rounded-lg" />
                      <Button onClick={() => handleUpdateStatus(app.id, 'active', customLoc)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-3 font-bold h-8 rounded-lg shrink-0">Confirm Approve</Button>
                      <Button onClick={() => setEditLocFranchiseId(null)} size="sm" variant="ghost" className="text-[10px] h-8 rounded-lg">Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end pt-1">
                      <Button onClick={() => handleUpdateStatus(app.id, 'rejected')} size="sm" variant="ghost" className="text-xs text-red-500 hover:bg-red-950/20 hover:text-red-400 h-8 rounded-lg font-bold">Reject</Button>
                      <Button 
                        onClick={() => {
                          setEditLocFranchiseId(app.id);
                          setCustomLoc(app.preferredLocation);
                        }} 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg font-bold"
                      >
                        Approve License
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Payout Queue */}
        <div className="lg:col-span-6 bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-5 space-y-4">
          <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3">Pending Withdrawals Queue ({pendingPayouts.length})</h3>
          
          {pendingPayouts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-bold">No pending payouts.</div>
          ) : (
            <div className="space-y-4">
              {pendingPayouts.map(w => (
                <div key={w.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-white">{w.franchise?.fullName}</div>
                      <div className="text-[9px] text-zinc-500">Franchise: {w.franchise?.code} ({w.franchise?.preferredLocation})</div>
                    </div>
                    <div className="text-base font-black text-emerald-500">₹{w.amount.toFixed(2)}</div>
                  </div>

                  <div className="p-3 bg-[#0d0d0f] border border-zinc-900 rounded-xl text-[10px] space-y-1">
                    <div><strong>Recipient Bank/UPI:</strong></div>
                    <div className="font-mono text-zinc-300 font-bold bg-[#09090b] p-2 rounded border border-zinc-900/60 mt-1 select-all">{w.bankDetails}</div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button 
                      onClick={() => {
                        const reason = prompt('Please enter a rejection reason:');
                        if (reason !== null) handleWithdrawAction(w.id, false, reason);
                      }} 
                      size="sm" 
                      variant="ghost" 
                      className="text-xs text-red-500 hover:bg-red-950/20 hover:text-red-400 h-8 rounded-lg font-bold"
                    >
                      Reject request
                    </Button>
                    <Button onClick={() => handleWithdrawAction(w.id, true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg font-bold">
                      Approve & Mark Paid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Franchise Management & Override Controls */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 space-y-6">
        <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3">Active Franchise Partners ({activeFranchises.length})</h3>
        
        {activeFranchises.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-bold">No active franchise partners registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-black uppercase text-[9px] tracking-wider">
                  <th className="py-3">Partner Code</th>
                  <th className="py-3">Full Name</th>
                  <th className="py-3">Location Assigned</th>
                  <th className="py-3">Balance</th>
                  <th className="py-3">Paid Earnings</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-medium">
                {activeFranchises.map(f => (
                  <tr key={f.id} className="text-zinc-300">
                    <td className="py-3 font-mono font-bold text-white">{f.code}</td>
                    <td className="py-3">
                      <div>{f.fullName}</div>
                      <div className="text-[10px] text-zinc-500">@{f.user?.username}</div>
                    </td>
                    <td className="py-3 font-bold text-zinc-450">{f.preferredLocation}</td>
                    <td className="py-3 font-mono text-emerald-500">₹{f.walletBalance.toFixed(2)}</td>
                    <td className="py-3 font-mono">₹{f.commissionPaid.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${f.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedFranchiseId(f.id);
                          setOverrideAmount('');
                          setOverrideDesc('');
                        }} 
                        className="text-[10px] font-black text-emerald-500 hover:underline"
                      >
                        Override Balance
                      </button>
                      
                      {f.status === 'active' ? (
                        <button onClick={() => handleUpdateStatus(f.id, 'suspended')} className="text-[10px] font-black text-red-500 hover:underline">Suspend</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(f.id, 'active')} className="text-[10px] font-black text-emerald-500 hover:underline">Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedFranchiseId !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleOverrideSubmit} className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-black text-white border-b border-zinc-900 pb-3 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-500" /> Admin Wallet Override
            </h4>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Adjustment Amount (₹)</label>
              <Input 
                type="number" 
                step="0.01" 
                required 
                value={overrideAmount} 
                onChange={e => setOverrideAmount(e.target.value)} 
                placeholder="e.g. 500 (positive) or -200 (negative)" 
                className="bg-[#09090b] border-zinc-800 text-xs h-10 rounded-xl" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Adjustment Details / Reason</label>
              <textarea 
                required 
                value={overrideDesc} 
                onChange={e => setOverrideDesc(e.target.value)} 
                placeholder="Reason for override adjustment log" 
                rows={3} 
                className="w-full bg-[#09090b] border border-zinc-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-white" 
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" onClick={() => setSelectedFranchiseId(null)} variant="ghost" className="text-xs h-10 rounded-xl text-zinc-500">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-xs px-4">Submit Override</Button>
            </div>
          </form>
        </div>
      )}

      {/* Referred Users list */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3">Referred User Registrations ({referrals.length})</h3>
        
        {referrals.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs">No referrals conversions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-black uppercase text-[9px] tracking-wider">
                  <th className="py-2.5">Referred User</th>
                  <th className="py-2.5">Referring Franchise</th>
                  <th className="py-2.5">Registration Date</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-medium">
                {referrals.map((r) => {
                  const u = r.referee;
                  if (!u) return null;
                  const isActive = u.email_verified || u.phoneVerified || u.isMobileVerified || (u.lastActiveAt && (Date.now() - new Date(u.lastActiveAt).getTime()) < 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr key={r.id} className="text-zinc-300">
                      <td className="py-3">
                        <span className="font-bold text-white block">{u.name}</span>
                        <span className="text-[10px] text-zinc-500">@{u.username} | {u.email}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-white block">{r.franchise?.code}</span>
                        <span className="text-[10px] text-zinc-500">{r.franchise?.fullName} ({r.franchise?.preferredLocation})</span>
                      </td>
                      <td className="py-3 font-mono text-zinc-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-500'
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

      {/* Audit Logs section */}
      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs uppercase font-black tracking-wider text-zinc-500 border-b border-zinc-900 pb-3">Franchise Program Audit Log</h3>
        
        {auditLogs.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs">No audit logs recorded yet.</div>
        ) : (
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-900/60 rounded-xl text-[11px] flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-zinc-350">{log.details}</div>
                  <div className="text-[9px] text-zinc-500 uppercase font-mono">{log.action}</div>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono shrink-0">{new Date(log.createdAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
