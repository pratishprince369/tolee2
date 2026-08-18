'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Save, 
  X, 
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  getAllWorldToolsAdmin, 
  createWorldTool, 
  updateWorldTool, 
  deleteWorldTool, 
  WorldToolItem 
} from '@/actions/worldTools';

export default function WorldToolsManager() {
  const [tools, setTools] = useState<WorldToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Tool Form State
  const [newTool, setNewTool] = useState({
    name: '',
    slug: '',
    description: '',
    routeUrl: '/world/',
    category: 'Lead Generation',
    badge: 'NEW',
    accessType: 'FREE' as 'FREE' | 'PAID' | 'TIMED_FREE',
    priceMonthly: 19.99,
    freeTrialDays: 7,
    isVisible: true,
  });

  useEffect(() => {
    loadTools();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTools = async () => {
    setLoading(true);
    const res = await getAllWorldToolsAdmin();
    if (res.success && res.tools) {
      setTools(res.tools);
    }
    setLoading(false);
  };

  const handleToggleVisibility = async (tool: WorldToolItem) => {
    setSavingId(tool.id);
    const nextVal = !tool.isVisible;
    const res = await updateWorldTool(tool.id, { isVisible: nextVal });
    if (res.success) {
      setTools(tools.map(t => t.id === tool.id ? { ...t, isVisible: nextVal } : t));
      showToast(`Tool "${tool.name}" is now ${nextVal ? 'VISIBLE' : 'HIDDEN'} in Tolee World.`);
    } else {
      showToast('❌ Failed to update visibility.');
    }
    setSavingId(null);
  };

  const handleChangeAccessType = async (tool: WorldToolItem, accessType: 'FREE' | 'PAID' | 'TIMED_FREE') => {
    setSavingId(tool.id);
    const res = await updateWorldTool(tool.id, { accessType });
    if (res.success) {
      setTools(tools.map(t => t.id === tool.id ? { ...t, accessType } : t));
      showToast(`Tool "${tool.name}" access changed to ${accessType}.`);
    }
    setSavingId(null);
  };

  const handleUpdateTrialDays = async (tool: WorldToolItem, days: number) => {
    setSavingId(tool.id);
    const res = await updateWorldTool(tool.id, { freeTrialDays: days });
    if (res.success) {
      setTools(tools.map(t => t.id === tool.id ? { ...t, freeTrialDays: days } : t));
      showToast(`Trial updated to ${days} days.`);
    }
    setSavingId(null);
  };

  const handleUpdatePrice = async (tool: WorldToolItem, price: number) => {
    setSavingId(tool.id);
    const res = await updateWorldTool(tool.id, { priceMonthly: price });
    if (res.success) {
      setTools(tools.map(t => t.id === tool.id ? { ...t, priceMonthly: price } : t));
      showToast(`Price updated to $${price}/mo.`);
    }
    setSavingId(null);
  };

  const handleDelete = async (tool: WorldToolItem) => {
    if (!confirm(`Are you sure you want to remove "${tool.name}" from Tolee World?`)) return;
    const res = await deleteWorldTool(tool.id);
    if (res.success) {
      setTools(tools.filter(t => t.id !== tool.id));
      showToast(`🗑️ Tool "${tool.name}" removed.`);
    }
  };

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTool.name || !newTool.slug || !newTool.routeUrl) {
      alert('Please fill name, slug and route URL.');
      return;
    }

    const res = await createWorldTool(newTool);
    if (res.success) {
      setShowAddModal(false);
      loadTools();
      showToast(`🎉 New AI Tool "${newTool.name}" published!`);
      setNewTool({
        name: '',
        slug: '',
        description: '',
        routeUrl: '/world/',
        category: 'AI Utilities',
        badge: 'NEW',
        accessType: 'FREE',
        priceMonthly: 19.99,
        freeTrialDays: 7,
        isVisible: true,
      });
    } else {
      alert('Error creating tool: ' + (res.error || 'Unknown error'));
    }
  };

  return (
    <div className="bg-[#0b1220] border border-[#16253f] rounded-2xl p-5 sm:p-7 shadow-2xl mb-8">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-[#142036]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Tolee World AI Tools Manager</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                Owner Access Only
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Control which AI tools are visible, configure 100% Free vs Free Trial (with duration days) vs Paid Pro pricing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTools}
            className="p-2 rounded-xl bg-[#0e1728] border border-[#1b2b48] text-gray-400 hover:text-white text-xs"
            title="Refresh Tools"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New AI Tool</span>
          </button>
        </div>
      </div>

      {/* Tools Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-xs">
          Loading Tolee World tools...
        </div>
      ) : tools.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-xs">
          No tools configured yet. Click "Add New AI Tool" to publish the first tool.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#142036] bg-[#070d18] text-gray-400 font-semibold">
                <th className="py-3 px-4">Tool Name &amp; Route</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4">Access &amp; Pricing Mode</th>
                <th className="py-3 px-4">Trial Days / Price</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101a2d]">
              {tools.map((tool) => (
                <tr key={tool.id} className="hover:bg-[#0d1628]/60 transition-colors">
                  
                  {/* Tool Name & Route */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{tool.name}</span>
                        {tool.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {tool.routeUrl}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 text-gray-300">
                    {tool.category}
                  </td>

                  {/* Visibility Toggle */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleVisibility(tool)}
                      disabled={savingId === tool.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        tool.isVisible
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60'
                          : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      {tool.isVisible ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Visible (Active)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-gray-400" />
                          <span>Hidden (Draft)</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Access & Pricing Mode */}
                  <td className="py-3.5 px-4">
                    <select
                      value={tool.accessType}
                      onChange={(e) => handleChangeAccessType(tool, e.target.value as any)}
                      disabled={savingId === tool.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold bg-[#070d18] border focus:outline-none cursor-pointer ${
                        tool.accessType === 'FREE'
                          ? 'text-emerald-300 border-emerald-800/50'
                          : tool.accessType === 'TIMED_FREE'
                          ? 'text-amber-300 border-amber-800/50'
                          : 'text-rose-300 border-rose-800/50'
                      }`}
                    >
                      <option value="FREE" className="bg-[#0b1220] text-emerald-300">🟢 100% Free for all</option>
                      <option value="TIMED_FREE" className="bg-[#0b1220] text-amber-300">🟡 Free Trial (Timed)</option>
                      <option value="PAID" className="bg-[#0b1220] text-rose-300">🔴 Paid / Pro Subscription</option>
                    </select>
                  </td>

                  {/* Trial Days / Price Inputs */}
                  <td className="py-3.5 px-4">
                    {tool.accessType === 'TIMED_FREE' && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <input
                          type="number"
                          defaultValue={tool.freeTrialDays || 7}
                          onBlur={(e) => handleUpdateTrialDays(tool, Number(e.target.value))}
                          className="w-14 bg-[#070d18] border border-amber-800/50 text-white rounded px-1.5 py-0.5 text-xs text-center font-mono"
                          min={1}
                          max={365}
                        />
                        <span className="text-[11px] text-gray-400">days free</span>
                      </div>
                    )}

                    {tool.accessType === 'PAID' && (
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-rose-400" />
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={tool.priceMonthly || 19.99}
                          onBlur={(e) => handleUpdatePrice(tool, Number(e.target.value))}
                          className="w-16 bg-[#070d18] border border-rose-800/50 text-white rounded px-1.5 py-0.5 text-xs text-center font-mono"
                        />
                        <span className="text-[11px] text-gray-400">/mo</span>
                      </div>
                    )}

                    {tool.accessType === 'FREE' && (
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        Permanent Free Access
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={tool.routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-950/40"
                        title="Open App Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(tool)}
                        className="p-1.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-950/40"
                        title="Delete Tool"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1b2b48] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#152338] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add New AI Tool to Tolee World</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTool} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Tool Name</label>
                <input
                  type="text"
                  value={newTool.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                    setNewTool({ ...newTool, name, slug, routeUrl: `/world/${slug}` });
                  }}
                  placeholder="e.g. AI Content Writer"
                  className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Slug</label>
                  <input
                    type="text"
                    value={newTool.slug}
                    onChange={(e) => setNewTool({ ...newTool, slug: e.target.value })}
                    placeholder="ai-content-writer"
                    className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500/60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Route URL</label>
                  <input
                    type="text"
                    value={newTool.routeUrl}
                    onChange={(e) => setNewTool({ ...newTool, routeUrl: e.target.value })}
                    placeholder="/world/ai-content-writer"
                    className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500/60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Description</label>
                <textarea
                  value={newTool.description}
                  onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                  placeholder="Short description of what this AI tool does..."
                  className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 h-16 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={newTool.category}
                    onChange={(e) => setNewTool({ ...newTool, category: e.target.value })}
                    placeholder="Lead Generation, Content, Marketing..."
                    className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Badge</label>
                  <input
                    type="text"
                    value={newTool.badge}
                    onChange={(e) => setNewTool({ ...newTool, badge: e.target.value })}
                    placeholder="NEW, PRO, POPULAR..."
                    className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Access Mode</label>
                  <select
                    value={newTool.accessType}
                    onChange={(e) => setNewTool({ ...newTool, accessType: e.target.value as any })}
                    className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="FREE">🟢 100% Free</option>
                    <option value="TIMED_FREE">🟡 Free Trial (Timed)</option>
                    <option value="PAID">🔴 Paid / Pro Plan</option>
                  </select>
                </div>

                {newTool.accessType === 'TIMED_FREE' ? (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Free Trial Days</label>
                    <input
                      type="number"
                      value={newTool.freeTrialDays}
                      onChange={(e) => setNewTool({ ...newTool, freeTrialDays: Number(e.target.value) })}
                      className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500/60"
                      min={1}
                      max={365}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Monthly Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTool.priceMonthly}
                      onChange={(e) => setNewTool({ ...newTool, priceMonthly: Number(e.target.value) })}
                      className="w-full bg-[#070d18] border border-[#16253f] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#152338]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-950/40"
                >
                  Publish Tool
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
