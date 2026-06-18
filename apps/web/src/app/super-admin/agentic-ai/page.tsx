'use client';

import { useState, useEffect } from 'react';

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
  const [enabledUsers, setEnabledUsers] = useState<AgentUser[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCount: 0, enabledCount: 0, agentPostCount: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Intervals
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

  useEffect(() => {
    fetchConfig();
  }, []);

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
        body: JSON.stringify({ action: 'update', userId, enabled, interval })
      });
      if (res.ok) {
        // Refresh
        fetchConfig();
        // Update search results list if open
        setSearchResults(prev =>
          prev.map(u => (u.id === userId ? { ...u, agenticReelsEnabled: enabled, agenticInterval: interval } : u))
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
        body: JSON.stringify({ action: 'disable_all' })
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

  const runCronNow = async () => {
    try {
      setTriggeringCron(true);
      setCronResult(null);
      // We pass the default secret token which we defined in the API
      const res = await fetch('/api/cron/agentic-post?secret=tolee-cron-agentic-secret-key-2026', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCronResult({ success: true, ...data });
        fetchConfig(); // Refresh last post times
      } else {
        const data = await res.json().catch(() => ({}));
        setCronResult({ success: false, error: data.error || 'Failed to trigger cron job.' });
      }
    } catch (err: any) {
      setCronResult({ success: false, error: err.message || 'Network error occurred.' });
    } finally {
      setTriggeringCron(false);
    }
  };

  const formatLastPost = (dateStr: string | null) => {
    if (!dateStr) return <span style={{ color: '#71717a' }}>Never</span>;
    const date = new Date(dateStr);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return <span style={{ color: '#22c55e', fontWeight: 600 }}>Just now</span>;
    if (diffMins < 60) return <span style={{ color: '#22c55e' }}>{diffMins}m ago</span>;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return <span style={{ color: '#a1a1aa' }}>{diffHours}h ago</span>;
    
    return <span style={{ color: '#71717a' }}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>;
  };

  return (
    <div style={{ color: '#f4f4f5', fontFamily: 'Inter, sans-serif' }}>
      {/* Heading Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            🤖 Agentic AI Reels Manager
          </h2>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Enable automated AI posting for real user accounts. The AI will download/crawl and post general reels on their behalf.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={runCronNow}
            disabled={triggeringCron}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: triggeringCron ? 0.7 : 1,
              transition: 'transform 0.2s',
            }}
          >
            {triggeringCron ? '⌛ Executing...' : '⚙️ Run Reels Cron Now'}
          </button>

          {enabledUsers.length > 0 && (
            <button
              onClick={handleDisableAll}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: '#dc262622',
                border: '1px solid #dc262644',
                color: '#f87171',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#dc262633'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#dc262622'; }}
            >
              🛑 Stop All AI Bots
            </button>
          )}
        </div>
      </div>

      {/* Cron Result Modal */}
      {cronResult && (
        <div style={{
          background: 'rgba(24, 24, 27, 0.95)',
          border: '1px solid #27272a',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontWeight: 700, fontSize: 16, color: cronResult.success ? '#22c55e' : '#f87171' }}>
              {cronResult.success ? '✅ Cron Job Executed Successfully' : '❌ Cron Job Failed'}
            </h4>
            <button
              onClick={() => setCronResult(null)}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.5 }}>
            {cronResult.success ? (
              <>
                <p>{cronResult.message}</p>
                <p style={{ marginTop: 6, fontWeight: 600, color: '#fff' }}>
                  Total Reels Posted in this run: {cronResult.postedCount}
                </p>
                {cronResult.postedCount > 0 && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, color: '#22c55e' }}>
                    {cronResult.postedUsers.map((user: string, i: number) => (
                      <li key={i}>{user}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>{cronResult.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>Active AI Bots</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {stats.enabledCount} <span style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>enabled</span>
          </div>
        </div>

        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>Total Generated Reels</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8 }}>
            {stats.agentPostCount}
          </div>
        </div>

        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>User Base Size</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 8 }}>
            {stats.totalCount}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
        {/* Search & Add Bots Section */}
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
                opacity: searching ? 0.7 : 1,
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
                        🤖 Bot Active ({intervals.find(i => i.value === user.agenticInterval)?.label})
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
                          {intervals.map(opt => (
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

          {searchQuery && searchResults.length === 0 && !searching && (
            <p style={{ color: '#71717a', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>No users found matching your search.</p>
          )}
        </div>

        {/* Active Bots Table */}
        <div style={{ background: '#0d0d0f', border: '1px solid #18181b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#fff' }}>🤖 Active AI Bot Accounts</h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <p style={{ color: '#71717a', fontSize: 14, marginTop: 12 }}>Loading agent configurations...</p>
            </div>
          ) : enabledUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #27272a', borderRadius: 10 }}>
              <span style={{ fontSize: 32 }}>🤖</span>
              <p style={{ color: '#a1a1aa', fontSize: 15, fontWeight: 600, marginTop: 12 }}>No Active Bots</p>
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
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #18181b',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#141416'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
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
                          {intervals.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {formatLastPost(user.agenticLastPostAt)}
                      </td>

                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                          Bot Active
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
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.background = '#ef444411';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#3f3f46';
                            e.currentTarget.style.background = 'none';
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
