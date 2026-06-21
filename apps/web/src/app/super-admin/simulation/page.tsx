'use client';

import { useEffect, useState } from 'react';

interface SimulationSettings {
  simulationMode: boolean;
  simulatedUsersCount: number;
  simulatedPostsCount: number;
  simulatedReelsCount: number;
  minLikes: number;
  maxLikes: number;
  minComments: number;
  maxComments: number;
  minViews: number;
  maxViews: number;
  minGroupMembers: number;
  maxGroupMembers: number;
}

const cardStyle: React.CSSProperties = {
  background: '#111113',
  border: '1px solid #1f1f23',
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 6,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const flexRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginBottom: 16,
};

const flexColStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

export default function SimulationModePage() {
  const [settings, setSettings] = useState<SimulationSettings>({
    simulationMode: false,
    simulatedUsersCount: 100,
    simulatedPostsCount: 50,
    simulatedReelsCount: 50,
    minLikes: 100,
    maxLikes: 10000,
    minComments: 5,
    maxComments: 200,
    minViews: 1000,
    maxViews: 100000,
    minGroupMembers: 5000,
    maxGroupMembers: 5000000,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('/api/super-admin/simulation')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        } else {
          showToast(data.error || 'Failed to fetch settings', 'error');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        showToast('Error loading simulation settings', 'error');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    // Basic range validation
    if (settings.minLikes >= settings.maxLikes) {
      showToast('Max likes must be greater than min likes', 'error');
      return;
    }
    if (settings.minComments >= settings.maxComments) {
      showToast('Max comments must be greater than min comments', 'error');
      return;
    }
    if (settings.minViews >= settings.maxViews) {
      showToast('Max views must be greater than min views', 'error');
      return;
    }
    if (settings.minGroupMembers >= settings.maxGroupMembers) {
      showToast('Max group members must be greater than min group members', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      setSaving(false);

      if (data.success) {
        setSettings(data.settings);
        showToast(`🎉 Settings saved! ${data.syncMessage}`);
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      console.error(err);
      setSaving(false);
      showToast('Failed to connect to simulation API', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#71717a', fontSize: 14 }}>Loading simulation dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '12px 20px', borderRadius: 12,
          fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Simulation Mode Config</h1>
        <p style={{ color: '#71717a', fontSize: 14 }}>
          Generate virtual user profiles and simulated engagement. Strictly for demo, staging, and internal presentations.
        </p>
      </div>

      {/* Simulation Toggle card */}
      <div style={{
        ...cardStyle,
        border: '1px solid ' + (settings.simulationMode ? '#22c55e44' : '#1f1f23'),
        background: settings.simulationMode ? 'linear-gradient(135deg, #111113 0%, #16a34a0a 100%)' : '#111113'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              🟢 Simulation Mode Status
            </h2>
            <p style={{ color: '#71717a', fontSize: 13 }}>
              {settings.simulationMode
                ? 'Simulation is ACTIVE. Virtual users, posts, and engagement counts are visible.'
                : 'Simulation is INACTIVE. Only real user data is visible.'}
            </p>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
            <input
              type="checkbox"
              checked={settings.simulationMode}
              onChange={(e) => setSettings(p => ({ ...p, simulationMode: e.target.checked }))}
              style={{ display: 'none' }}
            />
            <div style={{
              width: 52, height: 28, borderRadius: 15, background: settings.simulationMode ? '#22c55e' : '#27272a',
              transition: 'background 0.2s', position: 'relative'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: settings.simulationMode ? 27 : 3,
                transition: 'left 0.2s'
              }} />
            </div>
          </label>
        </div>
      </div>

      {/* Pools configuration */}
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📦 Simulated Mock Pools</h3>
        
        <div style={flexRowStyle}>
          <div style={flexColStyle}>
            <label style={labelStyle}>Simulated Users Count</label>
            <input
              type="number"
              style={inputStyle}
              value={settings.simulatedUsersCount}
              onChange={(e) => setSettings(p => ({ ...p, simulatedUsersCount: parseInt(e.target.value) || 0 }))}
            />
            <span style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Number of virtual profiles to create</span>
          </div>
          
          <div style={flexColStyle}>
            <label style={labelStyle}>Simulated Posts Count</label>
            <input
              type="number"
              style={inputStyle}
              value={settings.simulatedPostsCount}
              onChange={(e) => setSettings(p => ({ ...p, simulatedPostsCount: parseInt(e.target.value) || 0 }))}
            />
            <span style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Regular mock posts inside groups</span>
          </div>

          <div style={flexColStyle}>
            <label style={labelStyle}>Simulated Reels Count</label>
            <input
              type="number"
              style={inputStyle}
              value={settings.simulatedReelsCount}
              onChange={(e) => setSettings(p => ({ ...p, simulatedReelsCount: parseInt(e.target.value) || 0 }))}
            />
            <span style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Simulated video reels count</span>
          </div>
        </div>
      </div>

      {/* Engagement config */}
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📊 Engagement Config Ranges</h3>

        {/* Likes */}
        <label style={labelStyle}>Random Likes Range</label>
        <div style={flexRowStyle}>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Min Likes"
              value={settings.minLikes}
              onChange={(e) => setSettings(p => ({ ...p, minLikes: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div style={{ alignSelf: 'center', color: '#71717a' }}>to</div>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Max Likes"
              value={settings.maxLikes}
              onChange={(e) => setSettings(p => ({ ...p, maxLikes: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Comments */}
        <label style={labelStyle}>Random Comments Range</label>
        <div style={flexRowStyle}>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Min Comments"
              value={settings.minComments}
              onChange={(e) => setSettings(p => ({ ...p, minComments: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div style={{ alignSelf: 'center', color: '#71717a' }}>to</div>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Max Comments"
              value={settings.maxComments}
              onChange={(e) => setSettings(p => ({ ...p, maxComments: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Views */}
        <label style={labelStyle}>Random Views Range</label>
        <div style={flexRowStyle}>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Min Views"
              value={settings.minViews}
              onChange={(e) => setSettings(p => ({ ...p, minViews: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div style={{ alignSelf: 'center', color: '#71717a' }}>to</div>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Max Views"
              value={settings.maxViews}
              onChange={(e) => setSettings(p => ({ ...p, maxViews: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {/* Group members config */}
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🏘️ Group Member Configuration</h3>
        
        <label style={labelStyle}>Simulated Group Members Range</label>
        <div style={flexRowStyle}>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Min Group Members"
              value={settings.minGroupMembers}
              onChange={(e) => setSettings(p => ({ ...p, minGroupMembers: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div style={{ alignSelf: 'center', color: '#71717a' }}>to</div>
          <div style={flexColStyle}>
            <input
              type="number"
              style={inputStyle}
              placeholder="Max Group Members"
              value={settings.maxGroupMembers}
              onChange={(e) => setSettings(p => ({ ...p, maxGroupMembers: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <span style={{ color: '#52525b', fontSize: 11, marginTop: 4, display: 'block' }}>
          * deterministic member counts will be calculated for groups using this range. Hardcoded values for premium groups remain active.
        </span>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#16a34a88' : 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px',
            fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)', transition: 'opacity 0.2s',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {saving ? 'Syncing Simulation Data...' : 'Save & Re-sync Simulation Data'}
        </button>
      </div>
    </div>
  );
}
