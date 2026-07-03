'use client';

import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Trash2, Heart, Award, Eye, Settings, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateWorldProject, deleteWorldProject } from '@/actions/world';

export default function SuperAdminShops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/map-markers');
      const data = await res.json();
      if (data.success && data.markers) {
        // Filter out non-shop types
        const onlyShops = data.markers.filter((m: any) => 
          !['event', 'group', 'marketplace', 'live_chat', 'trending_reel', 'meetup'].includes(m.type)
        );
        setShops(onlyShops);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleToggleVerify = async (shop: any) => {
    const next = !shop.isVerified;
    const res = await updateWorldProject(shop.id, { isVerified: next });
    if (res.success) {
      alert(`Shop verification status updated to: ${next ? 'VERIFIED' : 'UNVERIFIED'}`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, isVerified: next } : s));
    }
  };

  const handleToggleSuspend = async (shop: any) => {
    const next = !shop.isClosed;
    const res = await updateWorldProject(shop.id, { isClosed: next });
    if (res.success) {
      alert(`Shop closed status updated to: ${next ? 'CLOSED' : 'OPEN'}`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, isClosed: next } : s));
    }
  };

  const handleToggleFeatured = async (shop: any) => {
    const next = !shop.isFeatured;
    const res = await updateWorldProject(shop.id, { isFeatured: next });
    if (res.success) {
      alert(`Shop featured status updated to: ${next ? 'FEATURED' : 'STANDARD'}`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, isFeatured: next } : s));
    }
  };

  const handleToggleMapFeatured = async (shop: any) => {
    const next = !shop.isMapFeatured;
    const res = await updateWorldProject(shop.id, { isMapFeatured: next });
    if (res.success) {
      alert(`Shop map featured status updated to: ${next ? 'FEATURED ON MAP' : 'STANDARD'}`);
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, isMapFeatured: next } : s));
    }
  };

  const handleDelete = async (shopId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this shop?')) return;
    const res = await deleteWorldProject(shopId);
    if (res.success) {
      alert('Shop deleted successfully.');
      setShops(prev => prev.filter(s => s.id !== shopId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans p-6 md:p-10">
      
      {/* Title */}
      <div className="mb-8 border-b border-zinc-900 pb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          🏪 Shops & Business Directory
        </h1>
        <p className="text-zinc-400 text-xs mt-1">Moderate listings, toggle verification badges, feature shops on map, or suspend store operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {shops.length === 0 ? (
          <div className="text-center py-16 bg-[#121214] border border-zinc-900 rounded-[28px]">
            <Store className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-xs font-bold">No registered business shops found in the directory.</p>
          </div>
        ) : (
          shops.map((shop) => (
            <Card key={shop.id} className="bg-[#121214] border-zinc-900 text-white rounded-2xl p-5 hover:border-zinc-800 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                {/* Logo & Name info */}
                <div className="flex items-center gap-3.5">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover border border-zinc-800 shadow" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-lg font-black border border-cyan-900/30">
                      🏪
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      {shop.name}
                      {shop.isVerified && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black px-1.5 py-0.5 rounded">Verified</span>
                      )}
                      {shop.isClosed && (
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/30 font-black px-1.5 py-0.5 rounded">Suspended</span>
                      )}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Type: <span className="text-cyan-400 font-bold uppercase">{shop.type}</span> • Address: {shop.locationText}
                    </p>
                  </div>
                </div>

                {/* Moderate Action Trigger Buttons */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button 
                    size="xs" 
                    onClick={() => handleToggleVerify(shop)}
                    className={`h-8 text-[10px] font-black rounded-lg ${
                      shop.isVerified 
                        ? 'bg-zinc-800 text-zinc-400 hover:text-white' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    }`}
                  >
                    {shop.isVerified ? 'Unverify' : 'Verify'}
                  </Button>
                  
                  <Button 
                    size="xs" 
                    onClick={() => handleToggleSuspend(shop)}
                    className={`h-8 text-[10px] font-black rounded-lg ${
                      shop.isClosed 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-black' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {shop.isClosed ? 'Unsuspend' : 'Suspend'}
                  </Button>

                  <Button 
                    size="xs" 
                    onClick={() => handleToggleFeatured(shop)}
                    className={`h-8 text-[10px] font-black rounded-lg ${
                      shop.isFeatured 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-black' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Feature Listing
                  </Button>

                  <Button 
                    size="xs" 
                    onClick={() => handleToggleMapFeatured(shop)}
                    className={`h-8 text-[10px] font-black rounded-lg ${
                      shop.isMapFeatured 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Feature on Map
                  </Button>

                  <Button 
                    size="xs" 
                    onClick={() => handleDelete(shop.id)}
                    className="h-8 text-[10px] font-black rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-red-950/20 text-red-400 hover:border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
