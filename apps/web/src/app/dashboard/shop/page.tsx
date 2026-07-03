'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Eye, Users, Heart, ClipboardList, TrendingUp, 
  MapPin, Phone, Globe, Trash2, Edit3, Plus, ArrowLeft, Settings, 
  Store, ShieldCheck, Percent, HelpCircle, Save, Power
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getUserOwnedShops, getShopStats, updateWorldProject, deleteWorldProject 
} from '@/actions/world';

export default function ShopDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Mode state variables
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editCover, setEditCover] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  useEffect(() => {
    if (!session?.user) return;
    loadShops();
  }, [session]);

  const loadShops = async () => {
    setLoading(true);
    const res = await getUserOwnedShops();
    if (res.success && res.shops && res.shops.length > 0) {
      setShops(res.shops);
      selectShop(res.shops[0]);
    } else {
      setShops([]);
    }
    setLoading(false);
  };

  const selectShop = async (shop: any) => {
    setSelectedShop(shop);
    setEditName(shop.name);
    setEditDesc(shop.description || '');
    setEditHours(shop.openingHours || '');
    setEditContact(shop.contactNumber || '');
    setEditWhatsapp(shop.whatsapp || '');
    setEditWebsite(shop.website || '');
    setEditAddress(shop.locationText || '');
    setEditLogo(shop.logoUrl || '');
    setEditCover(shop.bannerImage || '');
    setIsClosed(shop.isClosed);

    // Fetch Stats
    const statsRes = await getShopStats(shop.id);
    if (statsRes.success && statsRes.stats) {
      setStats(statsRes.stats);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    setSaving(true);
    const res = await updateWorldProject(selectedShop.id, {
      name: editName,
      description: editDesc,
      openingHours: editHours,
      contactNumber: editContact,
      whatsapp: editWhatsapp,
      website: editWebsite,
      locationText: editAddress,
      logoUrl: editLogo,
      logoThumbnailUrl: editLogo,
      bannerImage: editCover,
      isClosed: isClosed
    });

    if (res.success) {
      alert('Shop details updated successfully!');
      // Reload shop details
      const updatedShops = shops.map(s => s.id === selectedShop.id ? { ...s, ...res.project } : s);
      setShops(updatedShops);
      setSelectedShop({ ...selectedShop, ...res.project });
    } else {
      alert(res.error || 'Failed to update shop details.');
    }
    setSaving(false);
  };

  const handleDeleteShop = async () => {
    if (!selectedShop) return;
    if (!window.confirm('🚨 WARNING: Are you sure you want to permanently delete this shop and all its linked products? This action CANNOT be undone.')) return;

    setSaving(true);
    const res = await deleteWorldProject(selectedShop.id);
    if (res.success) {
      alert('Shop permanently deleted.');
      window.location.reload();
    } else {
      alert(res.error || 'Failed to delete shop.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <Store className="w-16 h-16 text-cyan-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black mb-2">No Shops Found</h2>
        <p className="text-zinc-400 text-sm max-w-sm text-center mb-6">
          Before accessing the dashboard or listing products on the Marketplace, you must create a Shop.
        </p>
        <Link href="/map">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-black px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-300">
            Create a Shop on Live Map
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Shop Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-zinc-900 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-black tracking-wider text-cyan-500 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-900/30">
                Merchant Center
              </span>
            </div>
            <div className="flex items-center gap-3">
              {selectedShop?.logoUrl && (
                <img src={selectedShop.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-zinc-800 shadow-md" />
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {selectedShop?.name} Dashboard
              </h1>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedShop?.id}
              onChange={(e) => {
                const found = shops.find(s => s.id === e.target.value);
                if (found) selectShop(found);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Link href="/marketplace/create">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-black flex items-center gap-1.5 h-10 px-4 rounded-xl">
                <Plus className="w-4 h-4 stroke-[3]" /> Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl max-w-xs border border-zinc-900">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 ${
              activeTab === 'overview' 
                ? 'bg-cyan-500 text-black shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 ${
              activeTab === 'settings' 
                ? 'bg-cyan-500 text-black shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-[#121214] border-zinc-900 text-white rounded-[24px]">
                <CardContent className="p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Total Products</span>
                    <ShoppingBag className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{stats?.totalProducts || 0}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Listed items</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121214] border-zinc-900 text-white rounded-[24px]">
                <CardContent className="p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Total Views</span>
                    <Eye className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{stats?.totalViews || 0}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Direct views</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121214] border-zinc-900 text-white rounded-[24px]">
                <CardContent className="p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Followers</span>
                    <Users className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{stats?.followers || 0}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Subscribed users</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121214] border-zinc-900 text-white rounded-[24px]">
                <CardContent className="p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Orders</span>
                    <ClipboardList className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{stats?.orders || 0}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Completed purchases</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121214] border-zinc-900 text-white rounded-[24px] col-span-2 lg:col-span-1">
                <CardContent className="p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Estimated Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-emerald-400">₹{(stats?.revenue || 0).toLocaleString('en-IN')}</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Gross sales estimation</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Click-through Analytics Section */}
            <div className="bg-[#121214] border border-zinc-900 rounded-[28px] p-6">
              <h2 className="text-base font-black mb-6 flex items-center gap-2 text-cyan-500">
                📊 Engagement Metrics & Interactions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl text-center">
                  <h4 className="text-zinc-500 text-[10px] font-black uppercase mb-1">Product Clicks</h4>
                  <span className="text-xl font-bold text-white">{stats?.productClicks || 0}</span>
                </div>
                <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl text-center">
                  <h4 className="text-zinc-500 text-[10px] font-black uppercase mb-1">Map Visits</h4>
                  <span className="text-xl font-bold text-white">{stats?.mapVisits || 0}</span>
                </div>
                <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl text-center">
                  <h4 className="text-zinc-500 text-[10px] font-black uppercase mb-1">Contact Clicks</h4>
                  <span className="text-xl font-bold text-white">{stats?.contactClicks || 0}</span>
                </div>
                <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl text-center">
                  <h4 className="text-zinc-500 text-[10px] font-black uppercase mb-1">WhatsApp Clicks</h4>
                  <span className="text-xl font-bold text-white">{stats?.whatsappClicks || 0}</span>
                </div>
              </div>
            </div>

            {/* Action Alert Banner */}
            <div className="bg-cyan-950/20 border border-cyan-900/30 p-5 rounded-[24px] flex items-center justify-between gap-4">
              <div className="flex gap-3 items-center">
                <Store className="w-8 h-8 text-cyan-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Your Shop is Live on Tolee Map!</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Nearby users can discover your listings, check opening hours, and message you directly.</p>
                </div>
              </div>
              <Link href={`/store/${selectedShop?.slug}`} target="_blank">
                <Button size="sm" className="bg-white hover:bg-zinc-100 text-black font-bold text-xs rounded-xl h-9 shrink-0">
                  View Profile 🏪
                </Button>
              </Link>
            </div>

          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form Details */}
            <div className="lg:col-span-2 bg-[#121214] border border-zinc-900 p-6 rounded-[28px]">
              <h2 className="text-base font-black mb-6 flex items-center gap-2 text-cyan-500">
                ⚙️ Shop Details & Settings
              </h2>
              <form onSubmit={handleUpdateShop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Shop Name</label>
                    <input 
                      type="text" 
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Opening Hours</label>
                    <input 
                      type="text" 
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Shop Description</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Contact Number</label>
                    <input 
                      type="text" 
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                    <input 
                      type="text" 
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Website Link</label>
                    <input 
                      type="text" 
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Address / Locality</label>
                  <input 
                    type="text" 
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Logo URL</label>
                    <input 
                      type="text" 
                      value={editLogo}
                      onChange={(e) => setEditLogo(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Banner Cover Image URL</label>
                    <input 
                      type="text" 
                      value={editCover}
                      onChange={(e) => setEditCover(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-black px-6 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Toggle Close & Delete operations */}
            <div className="space-y-6">
              
              {/* Temporary Close */}
              <div className="bg-[#121214] border border-zinc-900 p-6 rounded-[28px]">
                <h3 className="text-sm font-black mb-2 flex items-center gap-2 text-yellow-500">
                  <Power className="w-4 h-4" /> Toggle Open Status
                </h3>
                <p className="text-zinc-400 text-xs mb-4">
                  Temporarily mark your shop as CLOSED to pause customer clicks, calls, or messaging inquiries.
                </p>
                <div className="flex items-center justify-between bg-zinc-900/60 p-3.5 border border-zinc-800 rounded-xl">
                  <span className="text-xs font-bold">{isClosed ? 'Shop is CLOSED' : 'Shop is OPEN'}</span>
                  <button
                    onClick={async () => {
                      const next = !isClosed;
                      setIsClosed(next);
                      const res = await updateWorldProject(selectedShop.id, { isClosed: next });
                      if (res.success) {
                        alert(`Shop is now ${next ? 'CLOSED' : 'OPEN'}!`);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-colors duration-300 ${
                      isClosed 
                        ? 'bg-emerald-500 text-black hover:bg-emerald-600' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {isClosed ? 'Open Shop' : 'Close Shop'}
                  </button>
                </div>
              </div>

              {/* Permanent Deletion */}
              <div className="bg-[#121214] border border-red-950/30 p-6 rounded-[28px]">
                <h3 className="text-sm font-black mb-2 flex items-center gap-2 text-red-500">
                  ⚠️ Danger Zone
                </h3>
                <p className="text-zinc-400 text-xs mb-4">
                  Permanently delete this shop and all listed products. This operation is immediate and irreversable.
                </p>
                <Button 
                  onClick={handleDeleteShop}
                  disabled={saving}
                  className="bg-red-500 hover:bg-red-600 text-white font-black w-full rounded-xl"
                >
                  Permanently Delete Shop
                </Button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
