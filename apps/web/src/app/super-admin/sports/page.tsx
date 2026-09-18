'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Plus, RefreshCw, Trash2, Edit3, Eye, Check, X, 
  Search, AlertCircle, Calendar, MapPin, Activity, Flame, 
  ShieldCheck, Layers, ExternalLink, Zap
} from 'lucide-react';

interface SportsCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  eventsCount?: number;
}

interface SportsEvent {
  id: string;
  title: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  team1Name: string;
  team1Logo?: string | null;
  team2Name: string;
  team2Logo?: string | null;
  status: string;
  eventDate: string;
  startTime?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  homeScore?: string | null;
  awayScore?: string | null;
  currentStatusText?: string | null;
  isFeatured: boolean;
  isManual: boolean;
  apiSource?: string | null;
  updatedAt: string;
}

export default function SuperAdminSportsPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'categories' | 'live' | 'api'>('events');
  const [categories, setCategories] = useState<SportsCategory[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, liveEvents: 0, manualEvents: 0, totalCategories: 0 });
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SportsCategory | null>(null);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);

  const [quickScoreEvent, setQuickScoreEvent] = useState<SportsEvent | null>(null);
  const [quickScoreData, setQuickScoreData] = useState({ homeScore: '', awayScore: '', currentStatusText: '', status: 'LIVE' });

  // Form states - Category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    icon: 'trophy',
    description: '',
    displayOrder: 0,
    isActive: true
  });

  // Form states - Event
  const [eventForm, setEventForm] = useState({
    title: '',
    categoryId: '',
    tournamentName: '',
    team1Name: '',
    team1Logo: '',
    team2Name: '',
    team2Logo: '',
    eventDate: new Date().toISOString().split('T')[0],
    startTime: '19:30',
    venue: '',
    city: '',
    country: 'India',
    status: 'UPCOMING',
    homeScore: '',
    awayScore: '',
    currentStatusText: '',
    description: '',
    isFeatured: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/sports');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories || []);
          setEvents(data.events || []);
          setStats(data.stats || { totalEvents: 0, liveEvents: 0, manualEvents: 0, totalCategories: 0 });
          setApiConfig(data.apiConfig || null);
          if (data.categories?.length > 0 && !eventForm.categoryId) {
            setEventForm(prev => ({ ...prev, categoryId: data.categories[0].id }));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sports admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = Boolean(editingCategory);
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEditing ? 'update_category' : 'create_category',
          id: editingCategory?.id,
          ...categoryForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddCategoryOpen(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', slug: '', icon: 'trophy', description: '', displayOrder: 0, isActive: true });
        await fetchData();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_category', id })
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCategory = async (id: string) => {
    try {
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_category', id })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Event Actions
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = Boolean(editingEvent);
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEditing ? 'update_event' : 'create_event',
          id: editingEvent?.id,
          ...eventForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddEventOpen(false);
        setEditingEvent(null);
        await fetchData();
      } else {
        alert(data.error || 'Failed to save event');
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving event');
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_event', id })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScoreEvent) return;
    try {
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_score',
          id: quickScoreEvent.id,
          ...quickScoreData
        })
      });
      if (res.ok) {
        setQuickScoreEvent(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncApi = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/super-admin/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_api' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`API Sync completed! Synced/updated ${data.syncedCount || 0} matches.`);
        fetchData();
      } else {
        alert(`API Sync error: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to API sync service');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.team1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.team2Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveEvents = events.filter(e => e.status === 'LIVE');

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f4f4f5' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy style={{ color: '#00c298', width: 28, height: 28 }} />
            Tolee Sports Management
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '14px', marginTop: '4px' }}>
            Manage sports categories, fixtures, live scores, and sports API sync integrations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSyncApi}
            disabled={isSyncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#18181b', color: '#fff',
              border: '1px solid #27272a', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.7 : 1
            }}
          >
            <RefreshCw style={{ width: 15, height: 15, animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Syncing...' : 'Sync Sports API'}
          </button>

          <button
            onClick={() => {
              setEditingEvent(null);
              setEventForm({
                title: '',
                categoryId: categories[0]?.id || '',
                tournamentName: '',
                team1Name: '',
                team1Logo: '',
                team2Name: '',
                team2Logo: '',
                eventDate: new Date().toISOString().split('T')[0],
                startTime: '19:30',
                venue: '',
                city: '',
                country: 'India',
                status: 'UPCOMING',
                homeScore: '',
                awayScore: '',
                currentStatusText: '',
                description: '',
                isFeatured: false
              });
              setIsAddEventOpen(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#00c298', color: '#09090b',
              border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Add Sports Event
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, padding: '16px' }}>
          <div style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Matches</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{stats.totalEvents}</div>
        </div>
        <div style={{ background: '#121214', border: '1px solid #00c29833', borderRadius: 12, padding: '16px' }}>
          <div style={{ color: '#00c298', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c298', display: 'inline-block' }} />
            Live Now
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00c298', marginTop: 4 }}>{stats.liveEvents}</div>
        </div>
        <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, padding: '16px' }}>
          <div style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Manual Admin Events</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{stats.manualEvents}</div>
        </div>
        <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, padding: '16px' }}>
          <div style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Sports Categories</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}>{stats.totalCategories}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #27272a', marginBottom: 24 }}>
        {[
          { id: 'events', label: 'Sports Events & Matches', icon: Activity },
          { id: 'live', label: `Live Matches (${liveEvents.length})`, icon: Flame },
          { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
          { id: 'api', label: 'API Sync Settings', icon: Zap },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                background: 'transparent', border: 'none', borderBottom: isActive ? '2px solid #00c298' : '2px solid transparent',
                color: isActive ? '#00c298' : '#a1a1aa', fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: 'pointer'
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ALL EVENTS */}
      {activeTab === 'events' && (
        <div>
          {/* Search filter */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#71717a' }} />
              <input
                type="text"
                placeholder="Search matches, teams, tournaments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 8,
                  padding: '9px 12px 9px 36px', color: '#fff', fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Events Table */}
          <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Match / Fixture</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Status & Score</th>
                  <th style={{ padding: '12px 16px' }}>Date & Venue</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
                      No matches found. Click "Add Sports Event" or "Sync Sports API" to get started.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid #1f1f23' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{event.title}</div>
                        <div style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>
                          {event.team1Name} vs {event.team2Name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#27272a', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          {event.category?.name || 'Sports'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                            background: event.status === 'LIVE' ? '#ef4444' : event.status === 'COMPLETED' ? '#27272a' : '#0284c7',
                            color: '#fff'
                          }}>
                            {event.status}
                          </span>
                          {(event.homeScore || event.awayScore) && (
                            <span style={{ fontWeight: 800, color: '#00c298' }}>
                              {event.homeScore || 0} - {event.awayScore || 0}
                            </span>
                          )}
                        </div>
                        {event.currentStatusText && (
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{event.currentStatusText}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div>{new Date(event.eventDate).toLocaleDateString()} {event.startTime ? `• ${event.startTime}` : ''}</div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{event.venue || event.city || 'TBA'}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, color: event.isManual ? '#a1a1aa' : '#0284c7' }}>
                          {event.isManual ? 'Manual' : 'API Synced'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setQuickScoreEvent(event);
                              setQuickScoreData({
                                homeScore: event.homeScore || '',
                                awayScore: event.awayScore || '',
                                currentStatusText: event.currentStatusText || '',
                                status: event.status
                              });
                            }}
                            title="Quick Update Score"
                            style={{ background: '#27272a', border: 'none', color: '#00c298', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Score
                          </button>
                          <button
                            onClick={() => {
                              setEditingEvent(event);
                              setEventForm({
                                title: event.title,
                                categoryId: event.categoryId,
                                tournamentName: '',
                                team1Name: event.team1Name,
                                team1Logo: event.team1Logo || '',
                                team2Name: event.team2Name,
                                team2Logo: event.team2Logo || '',
                                eventDate: new Date(event.eventDate).toISOString().split('T')[0],
                                startTime: event.startTime || '',
                                venue: event.venue || '',
                                city: event.city || '',
                                country: event.country || 'India',
                                status: event.status,
                                homeScore: event.homeScore || '',
                                awayScore: event.awayScore || '',
                                currentStatusText: event.currentStatusText || '',
                                description: '',
                                isFeatured: event.isFeatured
                              });
                              setIsAddEventOpen(true);
                            }}
                            style={{ background: '#27272a', border: 'none', color: '#fff', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                            title="Edit Event"
                          >
                            <Edit3 style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            style={{ background: '#3f1515', border: 'none', color: '#f87171', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                            title="Delete Event"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
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
      )}

      {/* TAB 2: LIVE MATCHES QUICK MANAGER */}
      {activeTab === 'live' && (
        <div>
          <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, padding: '20px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame style={{ color: '#ef4444', width: 20, height: 20 }} />
              Active Live Matches Real-Time Score Updater
            </h3>
            {liveEvents.length === 0 ? (
              <p style={{ color: '#71717a', fontSize: 13 }}>No matches are currently marked as LIVE. You can mark any match as LIVE from the Events tab.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {liveEvents.map(event => (
                  <div key={event.id} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>LIVE NOW</span>
                      <span style={{ color: '#a1a1aa', fontSize: 11 }}>{event.category?.name}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 6 }}>{event.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121214', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{event.team1Name}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#00c298' }}>{event.homeScore || '0'}</div>
                      </div>
                      <span style={{ color: '#71717a', fontWeight: 800 }}>VS</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{event.team2Name}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#00c298' }}>{event.awayScore || '0'}</div>
                      </div>
                    </div>
                    {event.currentStatusText && (
                      <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 12 }}>⏱️ {event.currentStatusText}</div>
                    )}
                    <button
                      onClick={() => {
                        setQuickScoreEvent(event);
                        setQuickScoreData({
                          homeScore: event.homeScore || '',
                          awayScore: event.awayScore || '',
                          currentStatusText: event.currentStatusText || '',
                          status: 'LIVE'
                        });
                      }}
                      style={{ width: '100%', background: '#00c298', color: '#09090b', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                    >
                      Update Live Score Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: '#a1a1aa', fontSize: 13 }}>Configure sport categories shown on the main Tolee Sports page.</p>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', slug: '', icon: 'trophy', description: '', displayOrder: categories.length + 1, isActive: true });
                setIsAddCategoryOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00c298', color: '#09090b', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Category
            </button>
          </div>

          <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Order</th>
                  <th style={{ padding: '12px 16px' }}>Category Name</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px' }}>Matches</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #1f1f23' }}>
                    <td style={{ padding: '12px 16px', color: '#71717a', fontWeight: 700 }}>#{cat.displayOrder}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{cat.name}</td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa', fontFamily: 'monospace' }}>{cat.slug}</td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{cat.eventsCount || 0} events</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleCategory(cat.id)}
                        style={{
                          background: cat.isActive ? '#064e3b' : '#3f1515', color: cat.isActive ? '#34d399' : '#f87171',
                          border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              slug: cat.slug,
                              icon: cat.icon || 'trophy',
                              description: cat.description || '',
                              displayOrder: cat.displayOrder,
                              isActive: cat.isActive
                            });
                            setIsAddCategoryOpen(true);
                          }}
                          style={{ background: '#27272a', border: 'none', color: '#fff', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Edit3 style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          style={{ background: '#3f1515', border: 'none', color: '#f87171', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: API SYNC SETTINGS */}
      {activeTab === 'api' && (
        <div style={{ background: '#121214', border: '1px solid #1f1f23', borderRadius: 12, padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap style={{ color: '#00c298', width: 20, height: 20 }} />
            Sports Data Integration (TheSportsDB & Open APIs)
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            Tolee Sports uses a decoupled sports API layer. The default provider syncs live fixtures, scores, and upcoming schedules for major leagues without overwriting custom admin-created events.
          </p>

          <div style={{ background: '#18181b', padding: 16, borderRadius: 8, border: '1px solid #27272a', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#a1a1aa' }}>Provider:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>TheSportsDB (V3 Public Live + Leagues)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#a1a1aa' }}>Status:</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>Operational</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#a1a1aa' }}>Last Synchronized:</span>
              <span style={{ color: '#fff' }}>
                {apiConfig?.lastSyncAt ? new Date(apiConfig.lastSyncAt).toLocaleString() : 'Not yet synced'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSyncApi}
            disabled={isSyncing}
            style={{
              background: '#00c298', color: '#09090b', border: 'none', padding: '10px 20px', borderRadius: 8,
              fontWeight: 700, fontSize: 13, cursor: isSyncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <RefreshCw style={{ width: 16, height: 16, animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Synchronizing Fixtures...' : 'Run Immediate Sync Now'}
          </button>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {isAddCategoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingCategory ? 'Edit Category' : 'Add Sport Category'}</h3>
              <button onClick={() => setIsAddCategoryOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table Tennis, Kabaddi"
                  value={categoryForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setCategoryForm(prev => ({ ...prev, name, slug: editingCategory ? prev.slug : slug }));
                  }}
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Slug (URL identifier) *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.slug}
                  onChange={e => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Description</label>
                <input
                  type="text"
                  placeholder="Short description"
                  value={categoryForm.description}
                  onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.displayOrder}
                    onChange={e => setCategoryForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value, 10) || 0 }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={e => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Category Active
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  style={{ background: '#27272a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#00c298', border: 'none', color: '#09090b', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SPORTS EVENT */}
      {isAddEventOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingEvent ? 'Edit Sports Event' : 'Add Sports Event / Match'}</h3>
              <button onClick={() => setIsAddEventOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. India vs Pakistan (ICC World Cup)"
                  value={eventForm.title}
                  onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Sport Category *</label>
                  <select
                    value={eventForm.categoryId}
                    onChange={e => setEventForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Tournament / League</label>
                  <input
                    type="text"
                    placeholder="e.g. IPL 2026, Premier League"
                    value={eventForm.tournamentName}
                    onChange={e => setEventForm(prev => ({ ...prev, tournamentName: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Team / Player 1 *</label>
                  <input
                    type="text"
                    required
                    placeholder="Team 1 Name"
                    value={eventForm.team1Name}
                    onChange={e => setEventForm(prev => ({ ...prev, team1Name: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Team / Player 2 *</label>
                  <input
                    type="text"
                    required
                    placeholder="Team 2 Name"
                    value={eventForm.team2Name}
                    onChange={e => setEventForm(prev => ({ ...prev, team2Name: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Match Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.eventDate}
                    onChange={e => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Start Time</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Status</label>
                  <select
                    value={eventForm.status}
                    onChange={e => setEventForm(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="POSTPONED">POSTPONED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Venue / Stadium</label>
                  <input
                    type="text"
                    placeholder="Wankhede Stadium, Mumbai"
                    value={eventForm.venue}
                    onChange={e => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>City / Country</label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={eventForm.city}
                    onChange={e => setEventForm(prev => ({ ...prev, city: e.target.value }))}
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Scores (for live or manual updates) */}
              <div style={{ background: '#121214', padding: 14, borderRadius: 8, border: '1px solid #27272a' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#00c298', marginBottom: 8 }}>Match Scores & Current Status</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 2 }}>Team 1 Score</label>
                    <input
                      type="text"
                      placeholder="e.g. 210/4 or 2"
                      value={eventForm.homeScore}
                      onChange={e => setEventForm(prev => ({ ...prev, homeScore: e.target.value }))}
                      style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: 6, padding: '6px 10px', color: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 2 }}>Team 2 Score</label>
                    <input
                      type="text"
                      placeholder="e.g. 195 or 1"
                      value={eventForm.awayScore}
                      onChange={e => setEventForm(prev => ({ ...prev, awayScore: e.target.value }))}
                      style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: 6, padding: '6px 10px', color: '#fff' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 2 }}>Status Text / Commentary Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Live: Over 18.2, Target 211 or 74'"
                    value={eventForm.currentStatusText}
                    onChange={e => setEventForm(prev => ({ ...prev, currentStatusText: e.target.value }))}
                    style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: 6, padding: '6px 10px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  style={{ background: '#27272a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#00c298', border: 'none', color: '#09090b', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK UPDATE SCORE */}
      {quickScoreEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Update Live Score: {quickScoreEvent.title}</h3>
              <button onClick={() => setQuickScoreEvent(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <form onSubmit={handleUpdateScoreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>{quickScoreEvent.team1Name} Score</label>
                  <input
                    type="text"
                    value={quickScoreData.homeScore}
                    onChange={e => setQuickScoreData(prev => ({ ...prev, homeScore: e.target.value }))}
                    placeholder="e.g. 182/3"
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 16, fontWeight: 700 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>{quickScoreEvent.team2Name} Score</label>
                  <input
                    type="text"
                    value={quickScoreData.awayScore}
                    onChange={e => setQuickScoreData(prev => ({ ...prev, awayScore: e.target.value }))}
                    placeholder="e.g. 179"
                    style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 16, fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Status Commentary / Current Over / Time</label>
                <input
                  type="text"
                  value={quickScoreData.currentStatusText}
                  onChange={e => setQuickScoreData(prev => ({ ...prev, currentStatusText: e.target.value }))}
                  placeholder="e.g. Over 19.3 • Need 3 runs in 3 balls"
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Match Status</label>
                <select
                  value={quickScoreData.status}
                  onChange={e => setQuickScoreData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', background: '#121214', border: '1px solid #27272a', borderRadius: 6, padding: '8px 12px', color: '#fff' }}
                >
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="POSTPONED">POSTPONED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setQuickScoreEvent(null)}
                  style={{ background: '#27272a', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#00c298', border: 'none', color: '#09090b', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
