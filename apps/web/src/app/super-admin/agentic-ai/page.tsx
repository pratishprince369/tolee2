'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles, Shield, Radio, Key, Settings, RefreshCw, CheckCircle2, AlertCircle, Plus, Eye, EyeOff } from 'lucide-react';

interface AgentUser {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  avatar: string | null;
  agenticInterval: string;
  agenticLastPostAt: string | null;
}

interface Stats {
  totalCount: number;
  enabledCount: number;
  agentPostCount: number;
}

export default function AgenticAiPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'personas' | 'voice' | 'reels_automation'>('providers');

  // ── Reels Automation States ──
  const [enabledUsers, setEnabledUsers] = useState<AgentUser[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCount: 0, enabledCount: 0, agentPostCount: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // ── AI Providers States ──
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);

  // ── Personas States ──
  const [personas, setPersonas] = useState<any[]>([]);
  const [newPersona, setNewPersona] = useState({
    name: '',
    avatar: '✨',
    systemPrompt: '',
    tone: 'friendly',
    language: 'auto',
    voiceName: 'Puck',
  });

  const intervals = [
    { value: '20_MINS', label: 'Every 20 Mins' },
    { value: '1_HOUR', label: 'Every Hour' },
    { value: 'DAILY', label: 'Daily' },
  ];

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/agentic-ai');
      if (res.ok) {
        const data = await res.json();
        setEnabledUsers(data.enabledUsers || []);
        setStats(data.stats || { totalCount: 0, enabledCount: 0, agentPostCount: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setLoadingProviders(true);
      const res = await fetch('/api/ai/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchPersonas = async () => {
    try {
      const res = await fetch('/api/ai/personas');
      if (res.ok) {
        const data = await res.json();
        setPersonas(data.personas || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchProviders();
    fetchPersonas();
  }, []);

  const handleSaveProvider = async (p: any) => {
    try {
      const res = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        alert('Provider configuration updated successfully!');
        setEditingProvider(null);
        fetchProviders();
      }
    } catch (err) {
      alert('Failed to save provider config.');
    }
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersona.name || !newPersona.systemPrompt) {
      alert('Name and System Prompt are required.');
      return;
    }

    try {
      const res = await fetch('/api/ai/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPersona),
      });
      if (res.ok) {
        alert('New persona created successfully!');
        setNewPersona({
          name: '',
          avatar: '✨',
          systemPrompt: '',
          tone: 'friendly',
          language: 'auto',
          voiceName: 'Puck',
        });
        fetchPersonas();
      }
    } catch (err) {
      alert('Failed to create persona.');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(`/api/super-admin/agentic-ai?searchOnly=true&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const updateAgentSettings = async (userId: string, enabled: boolean, interval: string) => {
    try {
      const res = await fetch('/api/super-admin/agentic-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', userId, enabled, interval }),
      });
      if (res.ok) {
        fetchConfig();
        setSearchResults((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, agenticReelsEnabled: enabled, agenticInterval: interval } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisableAll = async () => {
    if (!confirm('Are you sure you want to stop Agentic AI Reels for all users? This will shut down all automated bots.')) return;

    try {
      const res = await fetch('/api/super-admin/agentic-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable_all' }),
      });
      if (res.ok) {
        fetchConfig();
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerCron = async () => {
    try {
      setTriggeringCron(true);
      setCronResult(null);
      const res = await fetch('/api/cron/agentic-reels');
      const data = await res.json();
      setCronResult(data);
      fetchConfig();
    } catch (err) {
      setCronResult({ success: false, error: 'Network or server error while running cron job.' });
    } finally {
      setTriggeringCron(false);
    }
  };

  const formatLastPost = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} mins ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hours ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', color: '#e4e4e7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles className="w-6 h-6 text-teal-400" />
            Tolee Frontier AI Command Center
          </h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Control Gemini Web2API, Google Gemini API, live voice companions, AI personas, and automated bots.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: '#18181b', padding: 4, borderRadius: 12, border: '1px solid #27272a', gap: 4 }}>
          <button
            onClick={() => setActiveTab('providers')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'providers' ? '#0d9488' : 'transparent',
              color: activeTab === 'providers' ? '#fff' : '#a1a1aa',
              transition: 'all 0.2s',
            }}
          >
            🔌 Providers & Gateway
          </button>
          <button
            onClick={() => setActiveTab('personas')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'personas' ? '#0d9488' : 'transparent',
              color: activeTab === 'personas' ? '#fff' : '#a1a1aa',
              transition: 'all 0.2s',
            }}
          >
            🎭 Persona Studio
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'voice' ? '#0d9488' : 'transparent',
              color: activeTab === 'voice' ? '#fff' : '#a1a1aa',
              transition: 'all 0.2s',
            }}
          >
            🎙️ Voice AI
          </button>
          <button
            onClick={() => setActiveTab('reels_automation')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'reels_automation' ? '#0d9488' : 'transparent',
              color: activeTab === 'reels_automation' ? '#fff' : '#a1a1aa',
              transition: 'all 0.2s',
            }}
          >
            🤖 Reels Automation
          </button>
        </div>
      </div>

      {/* ── TAB 1: PROVIDERS & GATEWAY ── */}
      {activeTab === 'providers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Connected AI Engines & Status</h3>
            <button
              onClick={fetchProviders}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check Status
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {providers.map((p) => (
              <div key={p.id} style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{p.name}</h4>
                    <span style={{ fontSize: 11, color: '#71717a' }}>{p.type}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: p.status === 'CONNECTED' ? '#16a34a22' : '#dc262622',
                      color: p.status === 'CONNECTED' ? '#22c55e' : '#f87171',
                      border: `1px solid ${p.status === 'CONNECTED' ? '#16a34a44' : '#dc262644'}`,
                    }}
                  >
                    ● {p.status}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: 6, background: '#141416', padding: 12, borderRadius: 8 }}>
                  <div><strong>Default Model:</strong> {p.defaultModel}</div>
                  <div><strong>Capabilities:</strong> {p.isVision ? '👁️ Vision ' : ''}{p.isVoice ? '🎙️ Live Voice ' : ''}⚡ SSE Streaming</div>
                  <div><strong>API Key:</strong> <code style={{ color: '#2dd4bf', background: '#09090b', padding: '2px 6px', borderRadius: 4 }}>{p.apiKeyMasked || 'sk-••••••••••••'}</code></div>
                </div>

                <button
                  onClick={() => setEditingProvider(p)}
                  style={{
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: 'auto',
                  }}
                >
                  Configure Engine
                </button>
              </div>
            ))}
          </div>

          {editingProvider && (
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 24, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Configure {editingProvider.name}</h4>
                <button onClick={() => setEditingProvider(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Base URL (Optional)</label>
                  <input
                    type="text"
                    defaultValue={editingProvider.baseUrl || ''}
                    id="cfg-baseurl"
                    style={{ width: '100%', background: '#09090b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>API Key (Masked)</label>
                  <input
                    type="text"
                    placeholder="Enter new key to replace..."
                    id="cfg-apikey"
                    style={{ width: '100%', background: '#09090b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setEditingProvider(null)} style={{ background: 'none', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    const baseUrl = (document.getElementById('cfg-baseurl') as HTMLInputElement)?.value;
                    const apiKey = (document.getElementById('cfg-apikey') as HTMLInputElement)?.value;
                    handleSaveProvider({
                      providerType: editingProvider.type,
                      name: editingProvider.name,
                      baseUrl: baseUrl || undefined,
                      apiKey: apiKey || undefined,
                    });
                  }}
                  style={{ background: '#0d9488', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PERSONA STUDIO ── */}
      {activeTab === 'personas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Create Persona Form */}
          <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff' }}>✨ Create New AI Persona</h3>
            <form onSubmit={handleCreatePersona} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Persona Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marathi Mitra, Fitness Coach..."
                  value={newPersona.name}
                  onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                  style={{ width: '100%', background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Tone</label>
                  <select
                    value={newPersona.tone}
                    onChange={(e) => setNewPersona({ ...newPersona, tone: e.target.value })}
                    style={{ width: '100%', background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="direct">Direct / Technical</option>
                    <option value="creative">Creative</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Language</label>
                  <select
                    value={newPersona.language}
                    onChange={(e) => setNewPersona({ ...newPersona, language: e.target.value })}
                    style={{ width: '100%', background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="hinglish">Hinglish</option>
                    <option value="mr">Marathi</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>System Instructions</label>
                <textarea
                  rows={4}
                  placeholder="Define behavior, personality, formatting guidelines..."
                  value={newPersona.systemPrompt}
                  onChange={(e) => setNewPersona({ ...newPersona, systemPrompt: e.target.value })}
                  style={{ width: '100%', background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, resize: 'vertical' }}
                  required
                />
              </div>
              <button
                type="submit"
                style={{ background: '#0d9488', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
              >
                Create Persona
              </button>
            </form>
          </div>

          {/* Existing Personas List */}
          <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff' }}>🎭 Installed Personas ({personas.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
              {personas.map((p) => (
                <div key={p.id || p.name} style={{ background: '#141416', border: '1px solid #1c1c1f', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{p.avatar || '✨'}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{p.name} {p.isDefault && <span style={{ fontSize: 10, color: '#2dd4bf', background: '#0d948822', padding: '2px 6px', borderRadius: 4 }}>Default</span>}</div>
                      <div style={{ fontSize: 12, color: '#71717a' }}>{p.tone} · {p.language} · Voice: {p.voiceName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: VOICE AI ── */}
      {activeTab === 'voice' && (
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 14, padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff' }}>🎙️ Gemini Live Voice Companion</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Gemini Voice Model</label>
              <select style={{ width: '100%', background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13 }}>
                <option value="Puck">Puck (Neutral / Friendly)</option>
                <option value="Charon">Charon (Deeper / Professional)</option>
                <option value="Kore">Kore (Warm / Conversational)</option>
                <option value="Fenrir">Fenrir (Direct / Energetic)</option>
                <option value="Aoede">Aoede (Soft / Expressive)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Speech Rate / Speed</label>
              <input type="range" min="0.8" max="1.3" step="0.05" defaultValue="1.0" style={{ width: '100%', accentColor: '#0d9488' }} />
            </div>
            <div style={{ padding: 14, background: '#141416', borderRadius: 10, border: '1px solid #27272a', fontSize: 13, color: '#a1a1aa' }}>
              💡 <strong>Barge-in Interruption Active:</strong> Gemini Live automatically cancels speech synthesis when user begins talking into the microphone.
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REELS AUTOMATION ── */}
      {activeTab === 'reels_automation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleTriggerCron}
              disabled={triggeringCron}
              style={{
                background: triggeringCron ? '#27272a' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: triggeringCron ? 'not-allowed' : 'pointer',
              }}
            >
              {triggeringCron ? '⚡ Generating Reels...' : '▶ Run Reels Cron Now'}
            </button>

            {enabledUsers.length > 0 && (
              <button
                onClick={handleDisableAll}
                style={{
                  background: '#dc262622',
                  border: '1px solid #dc262644',
                  color: '#f87171',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🛑 Stop All AI Bots
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>Active AI Bots</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8 }}>
                {stats.enabledCount} <span style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>enabled</span>
              </div>
            </div>
            <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>Total Generated Reels</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8 }}>{stats.agentPostCount}</div>
            </div>
            <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>User Base Size</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8 }}>{stats.totalCount}</div>
            </div>
          </div>

          {/* Search & Add Bots */}
          <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff' }}>🤖 Search and Setup New AI Bot</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Search user by name, username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={searching}
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  padding: '0 20px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #18181b', paddingTop: 16 }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#141416',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #1c1c1f',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={user.avatar || '/default-user-avatar.svg'}
                        alt={user.name}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#1c1c1f' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{user.name}</div>
                        <div style={{ color: '#71717a', fontSize: 12 }}>@{user.username || 'unknown'} • {user.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {user.agenticReelsEnabled ? (
                        <span style={{ fontSize: 12, color: '#22c55e', background: '#16a34a1a', padding: '6px 12px', borderRadius: 20, border: '1px solid #16a34a33', fontWeight: 600 }}>
                          🤖 Bot Active ({intervals.find((i) => i.value === user.agenticInterval)?.label})
                        </span>
                      ) : (
                        <>
                          <select
                            id={`interval-select-${user.id}`}
                            defaultValue="DAILY"
                            style={{
                              background: '#18181b',
                              border: '1px solid #27272a',
                              borderRadius: 6,
                              padding: '6px 10px',
                              color: '#fff',
                              fontSize: 13,
                            }}
                          >
                            {intervals.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>

                          <button
                            onClick={() => {
                              const selectEl = document.getElementById(`interval-select-${user.id}`) as HTMLSelectElement;
                              updateAgentSettings(user.id, true, selectEl.value);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 6,
                              padding: '7px 14px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Activate Bot
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Bots Table */}
          <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#fff' }}>🤖 Active AI Bot Accounts</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#71717a', fontSize: 14 }}>Loading agent configurations...</p>
              </div>
            ) : enabledUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #27272a', borderRadius: 10 }}>
                <p style={{ color: '#a1a1aa', fontSize: 15, fontWeight: 600 }}>No Active Bots</p>
                <p style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>Search and activate a bot for a user above.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #18181b' }}>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, fontSize: 13 }}>User</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, fontSize: 13 }}>Interval</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, fontSize: 13 }}>Last Reels Post</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, fontSize: 13 }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #18181b' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img
                              src={user.avatar || '/default-user-avatar.svg'}
                              alt={user.name}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#1c1c1f' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{user.name}</div>
                              <div style={{ color: '#71717a', fontSize: 12 }}>@{user.username || 'unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <select
                            value={user.agenticInterval}
                            onChange={(e) => updateAgentSettings(user.id, true, e.target.value)}
                            style={{
                              background: '#18181b',
                              border: '1px solid #27272a',
                              borderRadius: 6,
                              padding: '6px 10px',
                              color: '#fff',
                              fontSize: 13,
                            }}
                          >
                            {intervals.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '16px', fontSize: 14 }}>{formatLastPost(user.agenticLastPostAt)}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                            ● Bot Active
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            onClick={() => updateAgentSettings(user.id, false, user.agenticInterval)}
                            style={{
                              background: 'none',
                              border: '1px solid #3f3f46',
                              borderRadius: 6,
                              padding: '6px 12px',
                              color: '#f87171',
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
