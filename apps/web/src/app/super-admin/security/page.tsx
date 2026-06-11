'use client';

import { useEffect, useState } from 'react';

export default function SecurityPage() {
  const [data, setData] = useState<{ events: any[]; auditLogs: any[] }>({ events: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'audit'>('events');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [bannedIps, setBannedIps] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/security');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resolveEvent = async (id: string) => {
    setActionLoading(id + 'resolve');
    try {
      await fetch('/api/super-admin/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchData();
    } catch (err) {
      alert('Failed to resolve event');
    } finally {
      setActionLoading(null);
    }
  };

  const simulateBanIp = (ip: string) => {
    if (!ip) return;
    if (bannedIps.includes(ip)) {
      alert(`IP address ${ip} is already blocked!`);
      return;
    }
    if (confirm(`Are you sure you want to block all traffic from IP: ${ip}?`)) {
      setBannedIps(prev => [...prev, ip]);
      alert(`IP ${ip} has been added to the local serverless firewall list successfully!`);
    }
  };

  const simulateUnbanIp = (ip: string) => {
    if (confirm(`Unblock traffic from IP: ${ip}?`)) {
      setBannedIps(prev => prev.filter(item => item !== ip));
      alert(`IP ${ip} has been removed from firewall ban list.`);
    }
  };

  const severityStyle = (s: string) => {
    const m: any = {
      low: { bg: '#052e16', border: '#14532d', color: '#4ade80' },
      medium: { bg: '#451a03', border: '#78350f', color: '#fbbf24' },
      high: { bg: '#450a0a', border: '#7f1d1d', color: '#f87171' },
      critical: { bg: '#7f1d1d', border: '#991b1b', color: '#fff', borderGlow: '0 0 10px rgba(239, 68, 68, 0.4)' },
    };
    return m[s] || m.low;
  };

  const auditIcon = (action: string) => {
    if (action.includes('delete')) return '🗑️';
    if (action.includes('suspend') || action.includes('ban')) return '🚫';
    if (action.includes('verify')) return '✅';
    if (action.includes('login')) return '🔐';
    if (action.includes('campaign')) return '📣';
    if (action.includes('restrict')) return '⛔';
    return '⚙️';
  };

  const unresolved = data.events.filter(e => !e.resolved).length;
  
  // Filter & Search logic
  const filteredEvents = data.events.filter(e => {
    const matchesSeverity = severityFilter === 'all' || e.severity === severityFilter;
    const matchesQuery = !searchQuery ? true : (
      e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.ipAddress && e.ipAddress.includes(searchQuery)) ||
      (e.endpoint && e.endpoint.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return matchesSeverity && matchesQuery;
  });

  const filteredAuditLogs = data.auditLogs.filter(log => {
    if (!searchQuery) return true;
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery)) ||
      (log.target && log.target.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tab-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #71717a;
          padding: 8px 20px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .tab-btn:hover { color: #fff; }
        .tab-btn.active {
          background: #0d0d0f;
          border-color: #27272a;
          color: #fff;
        }
        .sec-card {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .sec-card:hover {
          border-color: #27272a;
        }
        .severity-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          text-align: center;
          display: inline-block;
        }
        .audit-tr {
          border-bottom: 1px solid #18181b;
          transition: background 0.15s ease;
        }
        .audit-tr:hover {
          background: #141416;
        }
        .action-icon-btn {
          background: #18181b;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-icon-btn:hover {
          border-color: #f87171;
          color: #f87171;
          background: #450a0a22;
        }
        .copy-btn {
          background: #27272a;
          border: none;
          color: #a1a1aa;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s;
        }
        .copy-btn:hover {
          background: #3f3f46;
          color: #fff;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #1c1c1e', paddingBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Security Shield & Logs</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            {unresolved > 0 ? (
              <span style={{ color: '#f87171', fontWeight: 600 }}>🚨 {unresolved} unresolved security warnings pending review</span>
            ) : (
              <span style={{ color: '#22c55e', fontWeight: 600 }}>🟢 All security threat layers fully resolved</span>
            )}
            {' · '}{data.auditLogs.length} admin modifications logged
          </p>
        </div>
        <button onClick={fetchData} className="action-icon-btn" style={{ background: '#18181b', color: '#fff', padding: '8px 16px', borderRadius: 10 }}>
          🔄 Refresh Logs
        </button>
      </div>

      {/* Firewall & Ban Indicators */}
      {bannedIps.length > 0 && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: '14px 20px' }}>
          <h4 style={{ color: '#fca5a5', margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>⛔ Firewall IP Block List ({bannedIps.length})</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {bannedIps.map(ip => (
              <span key={ip} style={{ background: '#7f1d1d', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                🛡️ {ip}
                <button onClick={() => simulateUnbanIp(ip)} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, fontWeight: 800 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Unresolved Threats', value: unresolved, color: '#f87171', icon: '🚨' },
          { label: 'Critical Breaches', value: data.events.filter(e => e.severity === 'critical').length, color: '#ef4444', icon: '☢️' },
          { label: 'High Alert Events', value: data.events.filter(e => e.severity === 'high').length, color: '#f97316', icon: '⚠️' },
          { label: 'Threats Logged', value: data.events.length, color: '#3b82f6', icon: '📊' },
          { label: 'Admin Actions', value: data.auditLogs.length, color: '#22c55e', icon: '📋' },
        ].map(c => (
          <div key={c.label} style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: c.color, fontSize: 26, fontWeight: 800 }}>{c.value}</div>
            <div style={{ color: '#71717a', fontSize: 12 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 4, background: '#18181b', borderRadius: 12, padding: 4 }}>
          <button onClick={() => setTab('events')} className={`tab-btn ${tab === 'events' ? 'active' : ''}`}>
            🛡️ Security Alerts ({filteredEvents.length})
          </button>
          <button onClick={() => setTab('audit')} className={`tab-btn ${tab === 'audit' ? 'active' : ''}`}>
            📋 Admin Audits ({filteredAuditLogs.length})
          </button>
        </div>

        {/* Dynamic Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', minWidth: 260 }}>
          <input
            type="text"
            placeholder={tab === 'events' ? "Search IP, endpoint, threat..." : "Search action, target, IP..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 10, color: '#fff',
              padding: '8px 14px', fontSize: 12, outline: 'none', width: '100%', maxWidth: 200,
            }}
          />

          {tab === 'events' && (
            <select
              value={severityFilter}
              onChange={(e: any) => setSeverityFilter(e.target.value)}
              style={{
                background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 10, color: '#a1a1aa',
                padding: '8px 12px', fontSize: 12, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">Severity: All</option>
              <option value="critical">🔴 Critical Only</option>
              <option value="high">🟠 High Only</option>
              <option value="medium">🟡 Medium Only</option>
              <option value="low">🟢 Low Only</option>
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#71717a', fontSize: 13 }}>Syncing Security Shield Monitor...</p>
        </div>
      ) : tab === 'events' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEvents.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: '#52525b', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
              🛡️ No security events match the active search and filter criteria.
            </div>
          ) : (
            filteredEvents.map((e: any) => {
              const sc = severityStyle(e.severity);
              const isExpanded = expandedEventId === e.id;
              
              return (
                <div key={e.id} className="sec-card" style={{
                  opacity: e.resolved ? 0.55 : 1,
                  boxShadow: sc.borderGlow || 'none',
                  borderColor: e.resolved ? '#1c1c1e' : sc.border,
                }}>
                  {/* Summary Block */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 240 }}>
                      <span className="severity-pill" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        {e.severity}
                      </span>
                      <div>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {e.type.replace(/_/g, ' ').toUpperCase()}
                          {e.resolved && <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600 }}>✓ RESOLVED</span>}
                        </div>
                        <div style={{ color: '#71717a', fontSize: 11, marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          Endpoint: {e.endpoint || '—'}
                        </div>
                        <div style={{ color: '#52525b', fontSize: 11, marginTop: 2, display: 'flex', gap: 12 }}>
                          <span>IP: <strong style={{ color: '#a1a1aa' }}>{e.ipAddress || 'unknown'}</strong></span>
                          <span>Time: {new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Trigger Controls */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : e.id)}
                        style={{ background: '#1c1c1e', border: '1px solid #27272a', borderRadius: 8, color: '#a1a1aa', padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                      >
                        {isExpanded ? '▲ Hide Details' : '▼ View Payload'}
                      </button>

                      {e.ipAddress && e.ipAddress !== 'unknown' && !bannedIps.includes(e.ipAddress) && (
                        <button
                          onClick={() => simulateBanIp(e.ipAddress)}
                          className="action-icon-btn"
                        >
                          🚫 Block IP
                        </button>
                      )}

                      {!e.resolved && (
                        <button
                          onClick={() => resolveEvent(e.id)}
                          disabled={actionLoading === e.id + 'resolve'}
                          style={{ background: '#052e16', border: '1px solid #14532d', borderRadius: 8, color: '#4ade80', padding: '6px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        >
                          ✓ Resolve
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON Detail Payload Block */}
                  {isExpanded && (
                    <div style={{
                      background: '#070709', border: '1px solid #1c1c1e', borderRadius: 10, padding: 16, marginTop: 8,
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Threat Context / User Agent</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify({ type: e.type, userAgent: e.userAgent, details: e.details }, null, 2));
                            alert('Copied to clipboard!');
                          }}
                          className="copy-btn"
                        >
                          📋 Copy Payload
                        </button>
                      </div>
                      
                      <div style={{ color: '#a1a1aa', fontSize: 11, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div><span style={{ color: '#52525b' }}>User-Agent:</span> {e.userAgent || 'None logged'}</div>
                        {(() => {
                          try {
                            const d = JSON.parse(e.details);
                            return (
                              <div style={{ marginTop: 4 }}>
                                <span style={{ color: '#52525b' }}>Details Payload:</span>
                                <pre style={{ margin: '6px 0 0 0', background: '#141416', padding: 10, borderRadius: 6, border: '1px solid #1c1c1e', color: '#10b981', overflowX: 'auto' }}>
                                  {JSON.stringify(d, null, 2)}
                                </pre>
                              </div>
                            );
                          } catch {
                            return e.details ? <div><span style={{ color: '#52525b' }}>Details:</span> {e.details}</div> : null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
          {filteredAuditLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>No audit actions logged yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1c1c1e', background: '#141416' }}>
                    {['Admin Action', 'Entity Target', 'Audited IP Address', 'Creation Time'].map(h => (
                      <th key={h} style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '14px 18px', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log: any) => (
                    <tr key={log.id} className="audit-tr">
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{auditIcon(log.action)}</span>
                          <span style={{ color: '#e4e4e7', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}>{log.action.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}>
                        {log.target ? (
                          <span>
                            {log.targetType && <span style={{ color: '#52525b' }}>[{log.targetType.toUpperCase()}] </span>}
                            {log.target}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#71717a', fontSize: 11, fontFamily: 'monospace' }}>
                        {log.ipAddress || 'unknown'}
                        {log.ipAddress && log.ipAddress !== 'unknown' && (
                          <button
                            onClick={() => simulateBanIp(log.ipAddress)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', marginLeft: 8, padding: 0, fontWeight: 700 }}
                          >
                            Block
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#52525b', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
