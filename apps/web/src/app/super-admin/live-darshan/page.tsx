'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, Trash2, Edit3, Eye, Check, X, 
  ExternalLink, Sparkles, Radio, MapPin, Search, AlertCircle 
} from 'lucide-react';

interface Temple {
  id: string;
  name: string;
  slug: string;
  deity?: string | null;
  city: string;
  state: string;
  country: string;
  thumbnail: string;
  coverImage?: string | null;
  description?: string | null;
  youtubeChannelId?: string | null;
  youtubeVideoId?: string | null;
  liveStatus: string;
  officialUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  lastCheckedAt?: string | null;
}

export default function SuperAdminLiveDarshanPage() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [stats, setStats] = useState({ total: 0, liveCount: 0, offlineCount: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemple, setEditingTemple] = useState<Temple | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    deity: '',
    city: '',
    state: '',
    country: 'India',
    thumbnail: '',
    youtubeChannelId: '',
    youtubeVideoId: '',
    officialUrl: '',
    sortOrder: 0,
    isFeatured: false,
    isActive: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/live-darshan');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTemples(data.temples || []);
          setStats(data.stats || { total: 0, liveCount: 0, offlineCount: 0, activeCount: 0 });
        }
      }
    } catch (err) {
      console.error('Error fetching admin temples:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/super-admin/live-darshan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' })
      });
      if (res.ok) {
        await fetchData();
        alert('All temple live streams synced successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sync live streams');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch('/api/super-admin/live-darshan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch('/api/super-admin/live-darshan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/live-darshan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...formData
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          slug: '',
          deity: '',
          city: '',
          state: '',
          country: 'India',
          thumbnail: '',
          youtubeChannelId: '',
          youtubeVideoId: '',
          officialUrl: '',
          sortOrder: 0,
          isFeatured: false,
          isActive: true
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to create temple');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error creating temple');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemple) return;

    try {
      const res = await fetch('/api/super-admin/live-darshan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ...editingTemple
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingTemple(null);
        fetchData();
      } else {
        alert(data.error || 'Failed to update temple');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error updating temple');
    }
  };

  const filteredTemples = temples.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e4e4e7' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛕</span> Live Darshan Management
          </h1>
          <p style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>
            Manage major Indian temples, configure official YouTube channel live broadcasts, and control display orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#e4e4e7',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live Streams'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ea580c, #f59e0b)',
              border: 'none',
              color: '#000',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Add Temple</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>Total Temples</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{stats.total}</div>
        </div>
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>🔴 Currently Live</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{stats.liveCount}</div>
        </div>
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>Offline Temples</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#a1a1aa', marginTop: 4 }}>{stats.offlineCount}</div>
        </div>
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Active Shrines</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>{stats.activeCount}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: '8px 14px', maxWidth: 360 }}>
        <Search size={16} color="#71717a" style={{ marginRight: 10 }} />
        <input
          type="text"
          placeholder="Filter by name or city..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none', width: '100%' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#111114', borderBottom: '1px solid #18181b', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px' }}>Temple</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>YouTube Source</th>
                <th style={{ padding: '12px 16px' }}>Live Status</th>
                <th style={{ padding: '12px 16px' }}>Order</th>
                <th style={{ padding: '12px 16px' }}>Active</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                    Loading temples...
                  </td>
                </tr>
              ) : filteredTemples.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                    No temples found. Click "Add Temple" to create one.
                  </td>
                </tr>
              ) : (
                filteredTemples.map(temple => (
                  <tr key={temple.id} style={{ borderBottom: '1px solid #141417' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={temple.thumbnail}
                          alt={temple.name}
                          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', background: '#1c1c1f' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{temple.name}</div>
                          {temple.deity && <div style={{ fontSize: 11, color: '#f59e0b' }}>{temple.deity}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>
                      {temple.city}, {temple.state}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa', fontFamily: 'monospace', fontSize: 11 }}>
                      {temple.youtubeChannelId ? (
                        <span title={temple.youtubeChannelId}>Ch: {temple.youtubeChannelId.slice(0, 10)}...</span>
                      ) : temple.youtubeVideoId ? (
                        <span title={temple.youtubeVideoId}>Vid: {temple.youtubeVideoId}</span>
                      ) : (
                        <span style={{ color: '#52525b' }}>Auto Search</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {temple.liveStatus === 'live' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 999, background: '#ef444422', color: '#ef4444', fontSize: 11, fontWeight: 700, border: '1px solid #ef444444' }}>
                          🔴 LIVE
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: 999, background: '#27272a', color: '#a1a1aa', fontSize: 11, fontWeight: 600 }}>
                          Offline
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>
                      {temple.sortOrder}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleActive(temple.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: temple.isActive ? '#22c55e22' : '#3f3f4622',
                          color: temple.isActive ? '#22c55e' : '#71717a',
                          border: `1px solid ${temple.isActive ? '#22c55e44' : '#3f3f46'}`
                        }}
                      >
                        {temple.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <a
                          href={`/darshan?temple=${temple.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: 6, borderRadius: 6, background: '#1c1c1f', color: '#a1a1aa', display: 'flex', alignItems: 'center' }}
                          title="Preview Temple"
                        >
                          <Eye size={14} />
                        </a>
                        <button
                          onClick={() => setEditingTemple(temple)}
                          style={{ padding: 6, borderRadius: 6, background: '#1c1c1f', color: '#38bdf8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(temple.id, temple.name)}
                          style={{ padding: 6, borderRadius: 6, background: '#1c1c1f', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Temple Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Add New Temple</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Temple Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shirdi Sai Baba"
                  value={formData.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({ ...formData, name, slug: formData.slug || slug });
                  }}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="shirdi-sai-baba"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Deity</label>
                  <input
                    type="text"
                    placeholder="e.g. Sai Baba / Lord Shiva"
                    value={formData.deity}
                    onChange={e => setFormData({ ...formData, deity: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shirdi"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Thumbnail Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formData.thumbnail}
                  onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>YouTube Channel ID (Official)</label>
                <input
                  type="text"
                  placeholder="e.g. UCp7Ew69g28c-s9r5d35aYSw"
                  value={formData.youtubeChannelId}
                  onChange={e => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Official Trust Website</label>
                <input
                  type="url"
                  placeholder="https://sai.org.in"
                  value={formData.officialUrl}
                  onChange={e => setFormData({ ...formData, officialUrl: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <label style={{ fontSize: 13, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                    />
                    Featured
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, background: '#1c1c1f', color: '#a1a1aa', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #ea580c, #f59e0b)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Save Temple
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Temple Modal */}
      {editingTemple && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Edit Temple</h3>
              <button onClick={() => setEditingTemple(null)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Temple Name</label>
                <input
                  type="text"
                  required
                  value={editingTemple.name}
                  onChange={e => setEditingTemple({ ...editingTemple, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>City</label>
                  <input
                    type="text"
                    required
                    value={editingTemple.city}
                    onChange={e => setEditingTemple({ ...editingTemple, city: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>State</label>
                  <input
                    type="text"
                    required
                    value={editingTemple.state}
                    onChange={e => setEditingTemple({ ...editingTemple, state: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Thumbnail URL</label>
                <input
                  type="url"
                  required
                  value={editingTemple.thumbnail}
                  onChange={e => setEditingTemple({ ...editingTemple, thumbnail: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>YouTube Channel ID</label>
                <input
                  type="text"
                  value={editingTemple.youtubeChannelId || ''}
                  onChange={e => setEditingTemple({ ...editingTemple, youtubeChannelId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Fixed YouTube Video ID (Optional Override)</label>
                <input
                  type="text"
                  placeholder="e.g. dQw4w9WgXcQ"
                  value={editingTemple.youtubeVideoId || ''}
                  onChange={e => setEditingTemple({ ...editingTemple, youtubeVideoId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Sort Order</label>
                  <input
                    type="number"
                    value={editingTemple.sortOrder}
                    onChange={e => setEditingTemple({ ...editingTemple, sortOrder: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <label style={{ fontSize: 13, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editingTemple.isFeatured}
                      onChange={e => setEditingTemple({ ...editingTemple, isFeatured: e.target.checked })}
                    />
                    Featured
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setEditingTemple(null)}
                  style={{ padding: '9px 16px', borderRadius: 8, background: '#1c1c1f', color: '#a1a1aa', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #ea580c, #f59e0b)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Update Temple
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
