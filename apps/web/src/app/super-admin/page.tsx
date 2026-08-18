'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Metrics {
  users: { 
    totalUsers: number; 
    activeToday: number; 
    activeWeek: number; 
    activeMonth: number;
    newToday: number; 
    newThisMonth: number; 
    verifiedUsers: number; 
    suspendedUsers: number;
    appInstalls?: number;
    appInstallsToday?: number;
    realUsersCount?: number;
    simulatedUsersCount?: number;
  };
  communities: { 
    totalTolees: number; 
    toleeToday: number; 
    topTolees: any[];
  };
  content: { 
    totalPosts: number; 
    totalComments: number; 
    totalMessages: number; 
    totalListings: number;
    totalReels: number;
    totalShares: number;
    realPostsCount?: number;
    simulatedPostsCount?: number;
  };
  ads: { 
    totalCampaigns: number; 
    activeCampaigns: number;
  };
  security: { 
    unresolvedSecurityEvents: number; 
    totalAuditLogs: number;
  };
  recentUsers: any[];
  recentSecurityEvents: any[];
  recentAuditLogs: any[];
  userGrowth: { date: string; count: number }[];
  contentDistribution: { date: string; posts: number; reels: number; listings: number }[];
  activeUsersHistory: { date: string; dau: number; wau: number; mau: number }[];
  locationAnalytics: { name: string; value: number }[];
  deviceAnalytics: { name: string; value: number }[];
  behaviorAnalytics: { section: string; percentage: number }[];
  infraUsage: {
    databaseRows: number;
    cloudinaryStorageMB: number;
    cloudinaryBandwidthGB: number;
    vercelBandwidthGB: number;
    vercelServerlessSeconds: number;
  };
  emailAnalytics?: {
    totalSent: number;
    failed: number;
    passwordResets: number;
    verificationSent: number;
    verifiedUsers: number;
    unverifiedUsers: number;
  };
  cloudinaryAccounts?: any[];
  meetingStorage?: {
    activeMeetings: number;
    totalTemporaryStorageMB: number;
    totalRecordingsStorageMB: number;
    autoCleanedFilesCount: number;
    failedCleanupJobs: number;
  };
}

function StatCard({ icon, label, value, sub, color = '#22c55e', trend, pulse }: any) {
  return (
    <div style={{
      background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = `${color}44`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#1c1c1e';
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`, borderRadius: '0 16px' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {pulse && <span className="pulse-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />}
        </span>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#22c55e' : '#f87171', background: trend >= 0 ? '#052e16' : '#450a0a', padding: '2px 8px', borderRadius: 20 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <div style={{ color, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ color: '#71717a', fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

// Custom interactive SVG Area/Line Chart for Active Users (DAU, WAU, MAU)
function ActiveUsersChart({ data }: { data: Metrics['activeUsersHistory'] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [visibleCurves, setVisibleCurves] = useState({ dau: true, wau: true, mau: true });

  if (!data || data.length === 0) return <div style={{ color: '#71717a', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No chart data</div>;

  const w = 500;
  const h = 200;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxVal = Math.max(...data.flatMap(d => [d.dau, d.wau, d.mau]), 10);
  
  const getCoords = (idx: number, val: number) => {
    const x = paddingLeft + (idx / (data.length - 1)) * (w - paddingLeft - paddingRight);
    const y = h - paddingBottom - (val / maxVal) * (h - paddingTop - paddingBottom);
    return { x, y };
  };

  const getPathData = (key: 'dau' | 'wau' | 'mau') => {
    return data.map((d, i) => {
      const { x, y } = getCoords(i, d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const getAreaPathData = (key: 'dau' | 'wau' | 'mau') => {
    const linePath = getPathData(key);
    if (!linePath) return '';
    const firstPoint = getCoords(0, 0);
    const lastPoint = getCoords(data.length - 1, 0);
    return `${linePath} L ${lastPoint.x.toFixed(1)} ${lastPoint.y.toFixed(1)} L ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)} Z`;
  };

  return (
    <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>📈 User Activity Analysis</h3>
          <p style={{ color: '#71717a', fontSize: 12, margin: 0 }}>Daily, Weekly & Monthly Active User engagement curves</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { key: 'dau', label: 'DAU', color: '#22c55e' },
            { key: 'wau', label: 'WAU', color: '#a78bfa' },
            { key: 'mau', label: 'MAU', color: '#3b82f6' },
          ].map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: c.color, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={visibleCurves[c.key as 'dau'|'wau'|'mau']}
                onChange={() => setVisibleCurves(prev => ({ ...prev, [c.key]: !prev[c.key as 'dau'|'wau'|'mau'] }))}
                style={{ accentColor: c.color }}
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="dau-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="wau-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="mau-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = paddingTop + (i / 4) * (h - paddingTop - paddingBottom);
            const val = Math.round(maxVal - (i / 4) * maxVal);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={w - paddingRight} y2={y} stroke="#1c1c1e" strokeDasharray="3,3" />
                <text x={paddingLeft - 8} y={y + 4} fill="#52525b" fontSize="9" textAnchor="end" fontWeight="500">{val.toLocaleString()}</text>
              </g>
            );
          })}

          {/* Areas */}
          {visibleCurves.mau && <path d={getAreaPathData('mau')} fill="url(#mau-grad)" />}
          {visibleCurves.wau && <path d={getAreaPathData('wau')} fill="url(#wau-grad)" />}
          {visibleCurves.dau && <path d={getAreaPathData('dau')} fill="url(#dau-grad)" />}

          {/* Lines */}
          {visibleCurves.mau && <path d={getPathData('mau')} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          {visibleCurves.wau && <path d={getPathData('wau')} stroke="#a78bfa" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          {visibleCurves.dau && <path d={getPathData('dau')} stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const { x } = getCoords(i, 0);
            return (
              <text key={i} x={x} y={h - 10} fill="#52525b" fontSize="9" textAnchor="middle" fontWeight="600">
                {d.date}
              </text>
            );
          })}

          {/* Hover interactive guides */}
          {data.map((d, i) => {
            const { x } = getCoords(i, 0);
            return (
              <rect
                key={i}
                x={x - (w / data.length) / 2}
                y={paddingTop}
                width={w / data.length}
                height={h - paddingTop - paddingBottom}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Hover guide line */}
          {hoveredIdx !== null && (
            <line
              x1={getCoords(hoveredIdx, 0).x}
              y1={paddingTop}
              x2={getCoords(hoveredIdx, 0).x}
              y2={h - paddingBottom}
              stroke="#27272a"
              strokeWidth="1.5"
            />
          )}

          {/* Dots on hover */}
          {hoveredIdx !== null && (
            <>
              {visibleCurves.mau && <circle cx={getCoords(hoveredIdx, data[hoveredIdx].mau).x} cy={getCoords(hoveredIdx, data[hoveredIdx].mau).y} r="4" fill="#3b82f6" stroke="#0d0d0f" strokeWidth="1.5" />}
              {visibleCurves.wau && <circle cx={getCoords(hoveredIdx, data[hoveredIdx].wau).x} cy={getCoords(hoveredIdx, data[hoveredIdx].wau).y} r="4" fill="#a78bfa" stroke="#0d0d0f" strokeWidth="1.5" />}
              {visibleCurves.dau && <circle cx={getCoords(hoveredIdx, data[hoveredIdx].dau).x} cy={getCoords(hoveredIdx, data[hoveredIdx].dau).y} r="5" fill="#22c55e" stroke="#0d0d0f" strokeWidth="1.5" />}
            </>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div style={{
            position: 'absolute', top: 10, left: hoveredIdx > data.length / 2 ? 'auto' : '55px', right: hoveredIdx > data.length / 2 ? '15px' : 'auto',
            background: 'rgba(9, 9, 11, 0.95)', border: '1px solid #27272a', borderRadius: 8, padding: '8px 12px',
            color: '#fff', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10, backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontWeight: 700, color: '#a1a1aa', borderBottom: '1px solid #1c1c1e', paddingBottom: 2, marginBottom: 2 }}>
              🗓️ {data[hoveredIdx].date}
            </div>
            {visibleCurves.mau && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Monthly:</span><strong style={{ color: '#3b82f6' }}>{data[hoveredIdx].mau.toLocaleString()}</strong></div>}
            {visibleCurves.wau && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Weekly:</span><strong style={{ color: '#a78bfa' }}>{data[hoveredIdx].wau.toLocaleString()}</strong></div>}
            {visibleCurves.dau && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Daily:</span><strong style={{ color: '#22c55e' }}>{data[hoveredIdx].dau.toLocaleString()}</strong></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom interactive SVG chart for Content Upload Distribution
function ContentDistributionChart({ data }: { data: Metrics['contentDistribution'] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return <div style={{ color: '#71717a', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No chart data</div>;

  const w = 500;
  const h = 200;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxVal = Math.max(...data.flatMap(d => [d.posts, d.reels, d.listings]), 5);
  
  const getCoords = (idx: number, val: number) => {
    const x = paddingLeft + (idx / (data.length - 1)) * (w - paddingLeft - paddingRight);
    const y = h - paddingBottom - (val / maxVal) * (h - paddingTop - paddingBottom);
    return { x, y };
  };

  const getPathData = (key: 'posts' | 'reels' | 'listings') => {
    return data.map((d, i) => {
      const { x, y } = getCoords(i, d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, position: 'relative' }}>
      <div>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Content Distribution</h3>
        <p style={{ color: '#71717a', fontSize: 12, margin: '0 0 16px 0' }}>Trend of Posts, Reels, and Listings uploaded per day</p>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = paddingTop + (i / 3) * (h - paddingTop - paddingBottom);
            const val = Math.round(maxVal - (i / 3) * maxVal);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={w - paddingRight} y2={y} stroke="#1c1c1e" strokeDasharray="3,3" />
                <text x={paddingLeft - 8} y={y + 4} fill="#52525b" fontSize="9" textAnchor="end" fontWeight="500">{val}</text>
              </g>
            );
          })}

          {/* Trend lines */}
          <path d={getPathData('posts')} stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={getPathData('reels')} stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={getPathData('listings')} stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const { x } = getCoords(i, 0);
            return (
              <text key={i} x={x} y={h - 10} fill="#52525b" fontSize="9" textAnchor="middle" fontWeight="600">
                {d.date}
              </text>
            );
          })}

          {/* Hover areas */}
          {data.map((d, i) => {
            const { x } = getCoords(i, 0);
            return (
              <rect
                key={i}
                x={x - (w / data.length) / 2}
                y={paddingTop}
                width={w / data.length}
                height={h - paddingTop - paddingBottom}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Indicator vertical line */}
          {hoveredIdx !== null && (
            <line
              x1={getCoords(hoveredIdx, 0).x}
              y1={paddingTop}
              x2={getCoords(hoveredIdx, 0).x}
              y2={h - paddingBottom}
              stroke="#27272a"
              strokeWidth="1.5"
            />
          )}

          {/* Dots on hover */}
          {hoveredIdx !== null && (
            <>
              <circle cx={getCoords(hoveredIdx, data[hoveredIdx].posts).x} cy={getCoords(hoveredIdx, data[hoveredIdx].posts).y} r="4" fill="#10b981" stroke="#0d0d0f" strokeWidth="1.5" />
              <circle cx={getCoords(hoveredIdx, data[hoveredIdx].reels).x} cy={getCoords(hoveredIdx, data[hoveredIdx].reels).y} r="4" fill="#a855f7" stroke="#0d0d0f" strokeWidth="1.5" />
              <circle cx={getCoords(hoveredIdx, data[hoveredIdx].listings).x} cy={getCoords(hoveredIdx, data[hoveredIdx].listings).y} r="4" fill="#f97316" stroke="#0d0d0f" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Posts</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} /> Reels</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a1a1aa' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} /> Listings</div>
        </div>

        {/* Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div style={{
            position: 'absolute', top: 10, left: hoveredIdx > data.length / 2 ? 'auto' : '50px', right: hoveredIdx > data.length / 2 ? '15px' : 'auto',
            background: 'rgba(9, 9, 11, 0.95)', border: '1px solid #27272a', borderRadius: 8, padding: '8px 12px',
            color: '#fff', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10, backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontWeight: 700, color: '#a1a1aa', borderBottom: '1px solid #1c1c1e', paddingBottom: 2, marginBottom: 2 }}>
              🗓️ {data[hoveredIdx].date}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Posts:</span><strong style={{ color: '#10b981' }}>{data[hoveredIdx].posts}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Reels:</span><strong style={{ color: '#a855f7' }}>{data[hoveredIdx].reels}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>Listings:</span><strong style={{ color: '#f97316' }}>{data[hoveredIdx].listings}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

// User Behavior Analytics card with sleek progress meters
function UserBehaviorList({ data }: { data: Metrics['behaviorAnalytics'] }) {
  const colors = ['#ec4899', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#3b82f6', '#f43f5e'];
  return (
    <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔥 User Behavior & Sections</h3>
      <p style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>Distribution of clicks, views, and activity across sections</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          return (
            <div key={item.section} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: '#e4e4e7' }}>{item.section}</span>
                <span style={{ color }}>{item.percentage}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${item.percentage}%`, height: '100%', background: `linear-gradient(90deg, ${color}cc, ${color})`,
                  borderRadius: 10, transition: 'width 0.8s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');
  return isLocal ? `http://${h}:4000` : 'https://api.tolee.in';
}

export default function SuperAdminOverview() {
  const [dataType, setDataType] = useState<'real' | 'simulated'>('real');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Realtime Presence States
  const [realtimeOnlineCount, setRealtimeOnlineCount] = useState<number>(0);
  const [activeRealtimeSessions, setActiveRealtimeSessions] = useState<any[]>([]);
  const [realtimeDevices, setRealtimeDevices] = useState<any>({});
  const [realtimeLocations, setRealtimeLocations] = useState<any>({});
  const [nowTick, setNowTick] = useState(Date.now());
  const socketRef = useRef<Socket | null>(null);

  // Connect to realtime presence signaling socket
  useEffect(() => {
    const SOCKET_URL = getSocketUrl();
    console.log('[Admin Presence] Connecting to Socket server at:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Admin Presence] Connected! Socket ID:', socket.id);
      // Register admin tab as a session so it counts in online users
      socket.emit('register-session', {
        userId: 'super-admin',
        name: 'Super Admin',
        device: 'Desktop Web',
        location: 'Admin Panel',
        currentPage: '/super-admin'
      });
    });

    socket.on('realtime-presence', (data: { count: number; sessions: any[]; deviceStats: any; locationStats: any }) => {
      setRealtimeOnlineCount(data.count);
      setActiveRealtimeSessions(data.sessions);
      setRealtimeDevices(data.deviceStats);
      setRealtimeLocations(data.locationStats);
    });

    socket.on('connect_error', (err) => {
      console.error('[Admin Presence] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Admin Presence] Disconnected:', reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // HTTP Polling Fallback: fetch /presence every 5s if socket is not connected
  useEffect(() => {
    const SOCKET_URL = getSocketUrl();
    const poll = async () => {
      // Only use HTTP fallback if socket is disconnected
      if (socketRef.current?.connected) return;
      try {
        const res = await fetch(`${SOCKET_URL}/presence`);
        if (res.ok) {
          const data = await res.json();
          setRealtimeOnlineCount(data.count || 0);
          setActiveRealtimeSessions(data.sessions || []);
          setRealtimeDevices(data.deviceStats || {});
          setRealtimeLocations(data.locationStats || {});
        }
      } catch {
        // Silent fail — socket will handle when reconnected
      }
    };
    poll(); // immediate first fetch
    const t = setInterval(poll, 15000); // 🛡️ Bandwidth Safeguard: 15s instead of 5s
    return () => clearInterval(t);
  }, []);

  // Duration ticker
  useEffect(() => {
    const t = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const getDuration = (connectedAt: number) => {
    const diffMs = nowTick - connectedAt;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s`;
    const diffMins = Math.floor(diffSecs / 60);
    const remainingSecs = diffSecs % 60;
    return `${diffMins}m ${remainingSecs}s`;
  };

  const fetchMetrics = async (type = dataType) => {
    try {
      const res = await fetch(`/api/super-admin/metrics?dataType=${type}`);
      if (!res.ok) throw new Error('Failed');
      setMetrics(await res.json());
      setLastRefreshed(new Date());
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to load metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(dataType);
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [dataType]);

  useEffect(() => {
    if (pollingActive) {
      pollingTimerRef.current = setInterval(() => {
        fetchMetrics(dataType);
      }, 60000); // 🛡️ Bandwidth Safeguard: 60s instead of 30s
    } else {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [pollingActive, dataType]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#71717a', fontSize: 14 }}>Initializing Enterprise Control Center...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ color: '#fca5a5', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>⚠️ API Load Failure</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: 13 }}>{error}</p>
      <button onClick={fetchMetrics} style={{ background: '#7f1d1d', border: '1px solid #b91c1c', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
        Retry Loading
      </button>
    </div>
  );

  const m = metrics!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .refresh-btn:active { transform: scale(0.97); }
        .polling-indicator {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { opacity: 1; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .pulse-dot {
          animation: pulse-dot-anim 1.5s infinite;
        }
        @keyframes pulse-dot-anim {
          0% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { opacity: 1; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes bandwidth-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
          50% { box-shadow: 0 0 16px 4px rgba(220, 38, 38, 0.3); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
        }
      `}</style>

      {/* Dynamic Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #1c1c1e', paddingBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Platform Overview</h1>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: '#052e16', border: '1px solid #14532d', padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="polling-indicator" /> LIVE MONITOR
            </span>
          </div>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>Real-time production metrics, active users growth and system resources.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Polling Switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#a1a1aa', background: '#0d0d0f', border: '1px solid #1c1c1e', padding: '6px 12px', borderRadius: 10 }}>
            <input
              type="checkbox"
              checked={pollingActive}
              onChange={() => setPollingActive(!pollingActive)}
              style={{ accentColor: '#22c55e', cursor: 'pointer' }}
            />
            Auto-refresh (30s)
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button onClick={() => fetchMetrics(dataType)} className="refresh-btn" style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#a1a1aa', padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              🔄 Refresh Analytics
            </button>
            <span style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>Sync: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Real vs Simulated Data Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1c1c1e', gap: 24, marginBottom: 10 }}>
        <button
          onClick={() => { setDataType('real'); setLoading(true); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: dataType === 'real' ? '2px solid #22c55e' : '2px solid transparent',
            color: dataType === 'real' ? '#fff' : '#71717a',
            padding: '12px 6px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          👤 Real Data
        </button>
        <button
          onClick={() => { setDataType('simulated'); setLoading(true); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: dataType === 'simulated' ? '2px solid #22c55e' : '2px solid transparent',
            color: dataType === 'simulated' ? '#fff' : '#71717a',
            padding: '12px 6px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          🤖 Simulated Data
        </button>
      </div>

      {/* Security Alert Header */}
      {m.security.unresolvedSecurityEvents > 0 && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>{m.security.unresolvedSecurityEvents} unresolved security events</span>
            <span style={{ color: '#f87171', fontSize: 13 }}> — Suspicious IPs, spam activities, or potential hacking attempts detected.</span>
          </div>
          <a href="/super-admin/security" style={{ background: '#7f1d1d', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid #991b1b' }}>Review Events</a>
        </div>
      )}

      {/* 🚨 BANDWIDTH CRITICAL ALERT — Shows when Network Transfer approaches or exceeds 1 GB target */}
      {(m.infraUsage?.transferStatus === 'WARNING' || m.infraUsage?.transferStatus === 'CRITICAL') && (
        <div style={{
          background: m.infraUsage?.transferStatus === 'CRITICAL' ? '#450a0a' : '#451a03',
          border: `2px solid ${m.infraUsage?.transferStatus === 'CRITICAL' ? '#dc2626' : '#d97706'}`,
          borderRadius: 14,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          animation: m.infraUsage?.transferStatus === 'CRITICAL' ? 'bandwidth-pulse 1.5s infinite' : 'none'
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>
            {m.infraUsage?.transferStatus === 'CRITICAL' ? '🔴' : '🟡'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              color: m.infraUsage?.transferStatus === 'CRITICAL' ? '#fca5a5' : '#fde68a',
              fontWeight: 800,
              fontSize: 15,
              marginBottom: 3
            }}>
              {m.infraUsage?.transferStatus === 'CRITICAL'
                ? '⚠️ CRITICAL: Database Network Transfer has EXCEEDED 1 GB monthly target!'
                : '⚠️ WARNING: Database Network Transfer approaching 1 GB monthly target!'}
            </div>
            <div style={{
              color: m.infraUsage?.transferStatus === 'CRITICAL' ? '#f87171' : '#fbbf24',
              fontSize: 12,
              lineHeight: 1.5
            }}>
              Current usage: <strong>{m.infraUsage?.databaseTransferGB?.toFixed(3) || '0.000'} GB</strong> ({m.infraUsage?.transferPercentage?.toFixed(1) || 0}% of 1 GB target).
              {m.infraUsage?.transferStatus === 'CRITICAL'
                ? ' AI news auto-publishing should be paused. Neon free tier limit is 5 GB — exceeding it will lock your database!'
                : ' Consider reducing API calls and monitoring closely. AI news is capped at 10/day.'}
            </div>
          </div>
          <div style={{
            background: m.infraUsage?.transferStatus === 'CRITICAL' ? '#7f1d1d' : '#78350f',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: 10,
            border: `1px solid ${m.infraUsage?.transferStatus === 'CRITICAL' ? '#991b1b' : '#92400e'}`,
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}>
            {m.infraUsage?.databaseTransferGB?.toFixed(3)} GB<br/>/ 1 GB
          </div>
        </div>
      )}

      {/* 🛡️ Network Transfer & AI News Bandwidth Safeguard */}
      <div style={{ background: '#0d0d0f', border: `1px solid ${m.infraUsage?.transferStatus === 'CRITICAL' ? '#7f1d1d' : m.infraUsage?.transferStatus === 'WARNING' ? '#78350f' : '#1c1c1e'}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              🛡️ Database Health & Network Transfer Monitor
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: m.infraUsage?.dualDbActive ? '#4ade80' : '#fbbf24',
                background: m.infraUsage?.dualDbActive ? '#052e16' : '#451a03',
                border: `1px solid ${m.infraUsage?.dualDbActive ? '#14532d' : '#92400e'}`,
                padding: '2px 8px', borderRadius: 12
              }}>
                {m.infraUsage?.dualDbActive ? '2 DATABASES ACTIVE' : 'SINGLE DB'}
              </span>
            </h3>
            <p style={{ color: '#71717a', fontSize: 12, margin: '4px 0 0' }}>Real-time storage & bandwidth tracker for both databases. AI content is isolated on tolee-1.</p>
          </div>
        </div>

        {/* Dual Database Progress Bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

          {/* Main DB Card */}
          <div style={{ background: '#111113', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🗄️</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Main Database</div>
                  <div style={{ color: '#71717a', fontSize: 11 }}>Real Users Only — Login, Chat, Posts</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                color: m.infraUsage?.transferStatus === 'CRITICAL' ? '#fca5a5' : m.infraUsage?.transferStatus === 'WARNING' ? '#fbbf24' : '#4ade80',
                background: m.infraUsage?.transferStatus === 'CRITICAL' ? '#450a0a' : m.infraUsage?.transferStatus === 'WARNING' ? '#451a03' : '#052e16',
                border: `1px solid ${m.infraUsage?.transferStatus === 'CRITICAL' ? '#991b1b' : m.infraUsage?.transferStatus === 'WARNING' ? '#92400e' : '#14532d'}`
              }}>
                {m.infraUsage?.transferStatus || 'OPTIMAL'}
              </span>
            </div>

            {/* Main DB Progress */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#a1a1aa', fontWeight: 600 }}>Network Transfer</span>
                <span style={{ color: '#e4e4e7', fontWeight: 700 }}>{m.infraUsage?.databaseTransferGB?.toFixed(3) || '0.000'} GB / 5 GB</span>
              </div>
              <div style={{ width: '100%', height: 12, background: '#1c1c1e', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((m.infraUsage?.databaseTransferGB || 0) / 5 * 100, 100)}%`,
                  height: '100%',
                  background: (m.infraUsage?.transferPercentage || 0) > 100 ? '#ef4444' : (m.infraUsage?.transferPercentage || 0) > 80 ? '#f59e0b' : '#22c55e',
                  borderRadius: 8,
                  transition: 'width 0.6s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#52525b', marginTop: 4 }}>
                <span>0 GB</span>
                <span style={{ color: (m.infraUsage?.databaseTransferGB || 0) > 1 ? '#ef4444' : '#3b82f6' }}>{((m.infraUsage?.databaseTransferGB || 0) / 5 * 100).toFixed(1)}% full</span>
                <span>5 GB limit</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontSize: 18, fontWeight: 800 }}>{m.users?.totalUsers || 0}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>Real Users</div>
              </div>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 800 }}>{m.content?.totalPosts || 0}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>Real Posts</div>
              </div>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#a78bfa', fontSize: 18, fontWeight: 800 }}>{m.content?.totalMessages || 0}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>Messages</div>
              </div>
            </div>
          </div>

          {/* AI DB (tolee-1) Card */}
          <div style={{ background: '#111113', border: '1px solid #1e3a5f', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>AI Database <span style={{ color: '#3b82f6', fontSize: 11 }}>(tolee-1)</span></div>
                  <div style={{ color: '#71717a', fontSize: 11 }}>AI News, YouTube Videos, Coverr Posts</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                color: '#93c5fd', background: '#172554', border: '1px solid #1e3a5f'
              }}>
                LAUNCH PLAN
              </span>
            </div>

            {/* AI DB Progress */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#a1a1aa', fontWeight: 600 }}>Network Transfer</span>
                <span style={{ color: '#e4e4e7', fontWeight: 700 }}>{m.infraUsage?.aiDatabaseTransferGB?.toFixed(3) || '0.000'} GB / 50 GB</span>
              </div>
              <div style={{ width: '100%', height: 12, background: '#1c1c1e', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((m.infraUsage?.aiDatabaseTransferGB || 0) / 50 * 100, 100)}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: 8,
                  transition: 'width 0.6s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#52525b', marginTop: 4 }}>
                <span>0 GB</span>
                <span style={{ color: '#3b82f6' }}>{((m.infraUsage?.aiDatabaseTransferGB || 0) / 50 * 100).toFixed(1)}% full</span>
                <span>50 GB limit (Launch)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 800 }}>{m.infraUsage?.aiDbPostCount || 0}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>AI Posts</div>
              </div>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 800 }}>{`${m.infraUsage?.todayNewsCount || 0}/${m.infraUsage?.dailyNewsLimit || 10}`}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>News Today</div>
              </div>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#a78bfa', fontSize: 18, fontWeight: 800 }}>{m.infraUsage?.monthlyNewsCount || 0}</div>
                <div style={{ color: '#71717a', fontSize: 10 }}>This Month</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Expanded Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon="👥" label="Total Registered Users" value={m.users.totalUsers} sub={`Real: ${m.users.realUsersCount?.toLocaleString() || 0} · Simulated: ${m.users.simulatedUsersCount?.toLocaleString() || 0}`} color="#22c55e" trend={m.users.newToday} />
        <StatCard icon="🟢" label="Users Online Now" value={realtimeOnlineCount} sub={`${realtimeOnlineCount} Users Active Now`} color="#22c55e" pulse={true} />
        <StatCard icon="⚡" label="Active Users Today (DAU)" value={m.users.activeToday} sub={`WAU: ${m.users.activeWeek.toLocaleString()} · MAU: ${m.users.activeMonth.toLocaleString()}`} color="#3b82f6" />
        <StatCard icon="📱" label="App Installations" value={m.users.appInstalls || 0} sub={`+${m.users.appInstallsToday || 0} today from PWA prompt`} color="#10b981" trend={m.users.appInstallsToday || 0} />
        <StatCard icon="🏘️" label="Total Tolees (Groups)" value={m.communities.totalTolees} sub={`+${m.communities.toleeToday} groups today`} color="#f59e0b" trend={m.communities.toleeToday} />
        <StatCard icon="📝" label="Total Posts" value={m.content.totalPosts} sub={`Real: ${m.content.realPostsCount?.toLocaleString() || 0} · Simulated: ${m.content.simulatedPostsCount?.toLocaleString() || 0}`} color="#06b6d4" />
        <StatCard icon="🎥" label="Total Reels Uploaded" value={m.content.totalReels} sub="Short-video content pieces" color="#d946ef" />
        <StatCard icon="🛍️" label="Marketplace Listings" value={m.content.totalListings} sub="Active buy/sell advertising ads" color="#f97316" />
        <StatCard icon="💬" label="Messages Sent" value={m.content.totalMessages} sub="Instant messages routed" color="#a78bfa" />
        <StatCard icon="🔄" label="Shares / Re-shares" value={m.content.totalShares} sub="Post repost distribution stats" color="#14b8a6" />
        <StatCard icon="📣" label="Active Campaigns" value={m.ads.activeCampaigns} sub={`Out of ${m.ads.totalCampaigns} total boosted ads`} color="#f43f5e" />
        <StatCard icon="🛡️" label="Audit Logging" value={m.security.totalAuditLogs} sub="System activity records" color="#a1a1aa" />
      </div>

      {/* Resend Email Analytics Stats Grid */}
      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📧 Resend Email Analytics
          </h3>
          <p style={{ color: '#71717a', fontSize: 12, margin: '4px 0 0' }}>Real-time status of email deliveries, signup confirmations, and verification metrics via Resend.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <StatCard icon="✉️" label="Total Emails Sent" value={m.emailAnalytics?.totalSent || 0} sub="Delivered successfully" color="#10b981" />
          <StatCard icon="🔑" label="Verification Codes" value={m.emailAnalytics?.verificationSent || 0} sub="Signup OTP verification" color="#3b82f6" />
          <StatCard icon="🔄" label="Password Recovery" value={m.emailAnalytics?.passwordResets || 0} sub="Forgot password OTP" color="#a78bfa" />
          <StatCard icon="⚠️" label="Failed Deliveries" value={m.emailAnalytics?.failed || 0} sub="Delivery bounces / errors" color="#ef4444" />
          <StatCard icon="✅" label="Verified Users" value={m.emailAnalytics?.verifiedUsers || 0} sub={`${m.emailAnalytics?.verifiedUsers && m.users.totalUsers ? Math.round((m.emailAnalytics.verifiedUsers / m.users.totalUsers) * 100) : 0}% verification rate`} color="#22c55e" />
          <StatCard icon="❌" label="Unverified Users" value={m.emailAnalytics?.unverifiedUsers || 0} sub="Pending verification" color="#fb923c" />
        </div>
      </div>

      {/* Live Meeting Storage & Cleanup Monitor */}
      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            🎥 Live Meeting Storage & Cleanup Monitor
          </h3>
          <p style={{ color: '#71717a', fontSize: 12, margin: '4px 0 0' }}>Real-time status of active meeting streams, temporary data allocations, S3/Cloudinary recordings storage, and auto-cleaned files count.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <StatCard icon="📞" label="Active Meetings" value={m.meetingStorage?.activeMeetings || 0} sub="Ongoing live sessions" color="#3b82f6" />
          <StatCard icon="🗑️" label="Temporary Storage" value={`${(m.meetingStorage?.totalTemporaryStorageMB || 0).toFixed(1)} MB`} sub="WebRTC buffers & cache" color="#ec4899" />
          <StatCard icon="💾" label="Recordings Storage" value={`${(m.meetingStorage?.totalRecordingsStorageMB || 0).toLocaleString()} MB`} sub="Permanent MP4 files" color="#10b981" />
          <StatCard icon="✨" label="Auto-Cleaned Files" value={m.meetingStorage?.autoCleanedFilesCount || 0} sub="Temp chunks garbage collected" color="#a78bfa" />
          <StatCard icon="❌" label="Failed Cleanup Jobs" value={m.meetingStorage?.failedCleanupJobs || 0} sub="Failed database or storage purges" color="#ef4444" />
        </div>
      </div>

      {/* Interactive Charts Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
        <ActiveUsersChart data={m.activeUsersHistory} />
        <ContentDistributionChart data={m.contentDistribution} />
      </div>

      {/* Location, Device & Behavior Advanced Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* User Behavior */}
        <UserBehaviorList data={m.behaviorAnalytics} />

        {/* Location Analytics */}
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📍 User Location Analytics</h3>
          <p style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>User base geological distribution (cities/countries)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {m.locationAnalytics.map((loc, idx) => {
              const maxVal = Math.max(...m.locationAnalytics.map(l => l.value), 1);
              const percent = Math.round((loc.value / maxVal) * 100);
              return (
                <div key={loc.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 80, fontSize: 12, color: '#e4e4e7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                  <div style={{ flex: 1, height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: '#3b82f6', borderRadius: 10 }} />
                  </div>
                  <div style={{ width: 40, fontSize: 11, color: '#71717a', textAlign: 'right', fontWeight: 700 }}>{loc.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Analytics */}
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📱 Device & Environment</h3>
          <p style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>Breakdown of client environments, systems & apps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {m.deviceAnalytics.map((dev) => {
              const icons: any = { 'Android App': '🤖', 'iPhone App': '📱', 'Desktop Web': '💻', 'Mobile Safari/Chrome': '🌐' };
              const colors: any = { 'Android App': '#a7f3d0', 'iPhone App': '#fbcfe8', 'Desktop Web': '#bae6fd', 'Mobile Safari/Chrome': '#ddd6fe' };
              return (
                <div key={dev.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#141416', border: '1px solid #1c1c1e', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{icons[dev.name] || '⚙️'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>{dev.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors[dev.name] || '#a1a1aa', background: '#1c1c1e', padding: '2px 8px', borderRadius: 10 }}>
                    {dev.value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Realtime Presence Explorer */}
      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-dot" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              Realtime Presence Explorer
            </h3>
            <p style={{ color: '#71717a', fontSize: 12, margin: '4px 0 0 0' }}>Detailed real-time tracking of active user sessions, device types, geolocations, and navigation paths.</p>
          </div>
          <span style={{ fontSize: 12, color: '#a1a1aa', background: '#18181b', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
            {realtimeOnlineCount} active sessions
          </span>
        </div>

        {/* Realtime breakdown stats (Devices / Location) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Live Devices */}
          <div style={{ background: '#141416', border: '1px solid #1c1c1e', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>📱 Live Environments</h4>
            {Object.keys(realtimeDevices).length === 0 ? (
              <p style={{ color: '#52525b', fontSize: 12, margin: 0 }}>Waiting for session metadata...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(realtimeDevices).map(([device, count]: any) => (
                  <div key={device} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{device}</span>
                    <span style={{ color: '#22c55e', fontWeight: 700, background: '#052e16', padding: '2px 8px', borderRadius: 10 }}>{count} online</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Locations */}
          <div style={{ background: '#141416', border: '1px solid #1c1c1e', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>📍 Live Locations</h4>
            {Object.keys(realtimeLocations).length === 0 ? (
              <p style={{ color: '#52525b', fontSize: 12, margin: 0 }}>Waiting for geographical data...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(realtimeLocations).map(([location, count]: any) => (
                  <div key={location} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#e4e4e7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{location}</span>
                    <span style={{ color: '#3b82f6', fontWeight: 700, background: '#092d5c', padding: '2px 8px', borderRadius: 10 }}>{count} active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Users Table */}
        <div style={{ border: '1px solid #1c1c1e', borderRadius: 12, overflow: 'hidden', background: '#0d0d0f' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#141416', borderBottom: '1px solid #1c1c1e', color: '#a1a1aa', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>User</th>
                  <th style={{ padding: '12px 16px' }}>Environment</th>
                  <th style={{ padding: '12px 16px' }}>Geolocation</th>
                  <th style={{ padding: '12px 16px' }}>Active Page</th>
                  <th style={{ padding: '12px 16px' }}>Connected</th>
                </tr>
              </thead>
              <tbody>
                {activeRealtimeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#52525b' }}>
                      🟢 No online users active on the platform currently.
                    </td>
                  </tr>
                ) : (
                  activeRealtimeSessions.map((session: any, idx: number) => {
                    const isGuest = session.name === 'Guest User';
                    const deviceIcon = session.device?.includes('Mobile') ? '📱' : session.device?.includes('Tablet') ? '📟' : '💻';
                    
                    return (
                      <tr key={session.socketId || idx} style={{ borderBottom: '1px solid #141416', transition: 'background-color 0.2s', background: idx % 2 === 0 ? 'transparent' : '#08080a' }}>
                        {/* User */}
                        <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGuest ? '#71717a' : '#22c55e', border: isGuest ? '1px dashed #27272a' : '1px solid #14532d', fontSize: 12, flexShrink: 0 }}>
                            {isGuest ? '👤' : session.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{session.name}</span>
                            {session.userId && <span style={{ color: '#71717a', fontSize: 10, fontFamily: 'monospace' }}>ID: {session.userId.slice(-6)}</span>}
                          </div>
                        </td>
                        {/* Environment */}
                        <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span>{deviceIcon}</span>
                            <span>{session.device}</span>
                          </span>
                        </td>
                        {/* Geolocation */}
                        <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>
                          📍 {session.location}
                        </td>
                        {/* Active Page */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: '#18181b', border: '1px solid #27272a', color: '#a78bfa',
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'monospace'
                          }}>
                            {session.currentPage}
                          </span>
                        </td>
                        {/* Connected duration */}
                        <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 600 }}>
                          {getDuration(session.connectedAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cloudinary, Vercel & Resource Usage Card */}
      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>☁️ Infrastructure & Billing Stats</h3>
        <p style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>Cloudinary hosting, Vercel edge bandwidth, and Neon database usage statistics.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {/* Neon DB Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: '#a1a1aa' }}>Neon Postgres Rows</span>
              <span style={{ color: '#fb923c' }}>{m.infraUsage.databaseRows.toLocaleString()} / 10k free</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((m.infraUsage.databaseRows / 10000) * 100, 100)}%`, height: '100%', background: '#fb923c', borderRadius: 10 }} />
            </div>
          </div>

          {/* Cloudinary Storage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: '#a1a1aa' }}>Cloudinary Storage</span>
              <span style={{ color: '#22c55e' }}>{m.infraUsage.cloudinaryStorageMB} MB / 25 GB</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((m.infraUsage.cloudinaryStorageMB / 25600) * 100, 100)}%`, height: '100%', background: '#22c55e', borderRadius: 10 }} />
            </div>
          </div>

          {/* Cloudinary Bandwidth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: '#a1a1aa' }}>Cloudinary Bandwidth</span>
              <span style={{ color: '#06b6d4' }}>{m.infraUsage.cloudinaryBandwidthGB} GB / 25 GB</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((m.infraUsage.cloudinaryBandwidthGB / 25) * 100, 100)}%`, height: '100%', background: '#06b6d4', borderRadius: 10 }} />
            </div>
          </div>

          {/* Vercel Edge Bandwidth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: '#a1a1aa' }}>Vercel Bandwidth</span>
              <span style={{ color: '#3b82f6' }}>{m.infraUsage.vercelBandwidthGB} GB / 100 GB</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((m.infraUsage.vercelBandwidthGB / 100) * 100, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 10 }} />
            </div>
          </div>

          {/* Vercel Serverless seconds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: '#a1a1aa' }}>Serverless Functions</span>
              <span style={{ color: '#a78bfa' }}>{Math.round(m.infraUsage.vercelServerlessSeconds)}s / 100k s</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((m.infraUsage.vercelServerlessSeconds / 100000) * 100, 100)}%`, height: '100%', background: '#a78bfa', borderRadius: 10 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Cloudinary Multi-Account Dashboard */}
      {m.cloudinaryAccounts && m.cloudinaryAccounts.length > 0 && (
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>☁️ Cloudinary Multi-Account Pools</h3>
            <p style={{ color: '#71717a', fontSize: 12, margin: 0 }}>
              Dynamic upload failover rotation active across {m.cloudinaryAccounts.length} accounts. 
              If the current account reaches limit thresholds, the system seamlessly redirects uploads to the next available account.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {m.cloudinaryAccounts.map((acc: any) => {
              const isCurrentlyActive = acc.active;
              const statusColor = acc.status === 'active' ? '#22c55e' : acc.status === 'full' ? '#ef4444' : '#eab308';
              
              return (
                <div key={acc.index} style={{ 
                  background: isCurrentlyActive ? 'rgba(34, 197, 94, 0.02)' : '#09090b',
                  border: isCurrentlyActive ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid #1c1c1e',
                  borderRadius: 12,
                  padding: 16,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  {isCurrentlyActive && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#22c55e'
                    }}>
                      <span className="animate-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                      ACTIVE
                    </div>
                  )}
                  
                  <div>
                    <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 2px 0' }}>
                      {acc.label}
                    </h4>
                    <span style={{ color: '#71717a', fontSize: 10 }}>cloudName: {acc.cloudName}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Storage Progress */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 500 }}>
                        <span style={{ color: '#a1a1aa' }}>Storage</span>
                        <span style={{ color: '#22c55e' }}>{acc.storageUsedMB} MB / {(acc.storageLimitMB / 1024).toFixed(1)} GB</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(acc.storagePercent, 100)}%`, height: '100%', background: '#22c55e', borderRadius: 10 }} />
                      </div>
                    </div>

                    {/* Bandwidth Progress */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 500 }}>
                        <span style={{ color: '#a1a1aa' }}>Bandwidth</span>
                        <span style={{ color: '#06b6d4' }}>{acc.bandwidthUsedGB.toFixed(2)} GB / {acc.bandwidthLimitGB} GB</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(acc.bandwidthPercent, 100)}%`, height: '100%', background: '#06b6d4', borderRadius: 10 }} />
                      </div>
                    </div>

                    {/* Credits Progress */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 500 }}>
                        <span style={{ color: '#a1a1aa' }}>Credits Usage</span>
                        <span style={{ color: '#a78bfa' }}>{acc.creditsUsed.toFixed(1)} / {acc.creditsLimit} credits</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#1c1c1e', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(acc.creditsPercent, 100)}%`, height: '100%', background: '#a78bfa', borderRadius: 10 }} />
                      </div>
                    </div>
                  </div>
                  
                  {acc.error && (
                    <div style={{ color: '#ef4444', fontSize: 10, background: 'rgba(239, 68, 68, 0.08)', padding: '4px 8px', borderRadius: 6, marginTop: 4 }}>
                      ⚠️ {acc.error}
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1c1c1e', paddingTop: 8, fontSize: 11 }}>
                    <span style={{ color: '#71717a' }}>Status:</span>
                    <span style={{ color: statusColor, fontWeight: 700, fontSize: 10 }}>
                      {acc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom lists: Top Communities & Signups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Recent Signups */}
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>👥 Recent Signups</h3>
            <a href="/super-admin/users" style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Manage Users →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {m.recentUsers.length === 0 ? (
              <p style={{ color: '#52525b', fontSize: 13 }}>No recent signups</p>
            ) : m.recentUsers.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid #18181b' }}>
                <div style={{ width: 34, height: 34, background: '#18181b', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  {u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 14 }}>👤</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.name}
                    {u.isVerified && <span style={{ color: '#3b82f6', fontSize: 10 }} title="Verified profile">✓</span>}
                    {u.isSuspended && <span style={{ color: '#f87171', fontSize: 10 }} title="Suspended profile">🚫</span>}
                  </div>
                  <div style={{ color: '#52525b', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <div style={{ color: '#52525b', fontSize: 10, flexShrink: 0 }}>{new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>⚙️ Audit Records</h3>
            <a href="/super-admin/security" style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Full Logs →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {m.recentAuditLogs.length === 0 ? (
              <p style={{ color: '#52525b', fontSize: 13 }}>No audit actions logged yet</p>
            ) : m.recentAuditLogs.map((log: any) => {
              const isDelete = log.action.includes('delete');
              const isSuspend = log.action.includes('suspend') || log.action.includes('restrict') || log.action.includes('hide');
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#141416', border: '1px solid #1c1c1e', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>{isDelete ? '🗑️' : isSuspend ? '⛔' : '⚙️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase' }}>{log.action.replace(/_/g, ' ')}</div>
                    {log.target && <div style={{ color: '#71717a', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ID: {log.target}</div>}
                    <div style={{ color: '#52525b', fontSize: 9, marginTop: 4 }}>{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── CREATOR APPLICATIONS SECTION ─────────────────────────────── */}
      <CreatorApplicationsPanel />

    </div>
  );
}

// ── Creator Applications Panel (separate component to keep page clean) ─────────────────────
function CreatorApplicationsPanel() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [actionTier, setActionTier] = useState('creator');
  const [actionNotes, setActionNotes] = useState('');
  const [giveWallet, setGiveWallet] = useState(true);
  const [giveVerified, setGiveVerified] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/creators?status=${filter}`);
      const data = await res.json();
      setApps(data.applications || []);
      setTotal(data.total || 0);
    } catch { setApps([]); }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [filter]);

  const doAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/super-admin/creators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tier: actionTier, adminNotes: actionNotes, giveWalletCredit: giveWallet, giveVerifiedBadge: giveVerified })
      });
      if (res.ok) {
        setSelected(null);
        setActionNotes('');
        fetchApps();
      }
    } catch {}
    setActionLoading(null);
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444'
  };
  const TIER_LABELS: Record<string, string> = {
    creator: '🌱 Creator', influencer: '⭐ Influencer',
    vip_creator: '💎 VIP Creator', verified_creator: '✅ Verified Creator', premium_partner: '👑 Premium Partner'
  };

  return (
    <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 20, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>🎭 Creator Applications</h3>
          <p style={{ color: '#71717a', fontSize: 12, margin: '4px 0 0' }}>Review, approve or reject influencer & creator applications</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? (f === 'pending' ? '#451a03' : f === 'approved' ? '#052e16' : f === 'rejected' ? '#450a0a' : '#18181b') : '#141416',
              border: `1px solid ${filter === f ? (f === 'pending' ? '#f59e0b' : f === 'approved' ? '#22c55e' : f === 'rejected' ? '#ef4444' : '#3f3f46') : '#27272a'}`,
              color: filter === f ? '#fff' : '#71717a',
              borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize'
            }}>
              {f === 'all' ? `All (${total})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={fetchApps} style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#71717a' }}>Loading applications...</div>
      ) : apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#52525b', fontSize: 14 }}>
          No {filter === 'all' ? '' : filter} applications found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apps.map(app => (
            <div key={app.id} style={{ background: '#141416', border: `1px solid ${app.status === 'pending' ? '#451a0322' : '#1c1c1e'}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {/* Avatar */}
                <img src={app.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${app.username}`} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #27272a', flexShrink: 0 }} alt={app.fullName} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{app.fullName}</span>
                    <span style={{ color: '#71717a', fontSize: 12 }}>@{app.username}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLOR[app.status]}20`, color: STATUS_COLOR[app.status] }}>
                      {app.status.toUpperCase()}
                    </span>
                    {app.creatorTier && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#3b076422', color: '#d8b4fe' }}>
                        {TIER_LABELS[app.creatorTier] || app.creatorTier}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#71717a', fontSize: 11, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>📧 {app.email}</span>
                    <span>📍 {app.city}, {app.country}</span>
                    <span>👥 {app.followersRange}</span>
                    <span>🎯 {app.niche}</span>
                    <span>📅 {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {app.instagramLink && <div style={{ color: '#a78bfa', fontSize: 10, marginTop: 2 }}>📸 {app.instagramLink}</div>}
                  {app.youtubeLink && <div style={{ color: '#f87171', fontSize: 10 }}>▶️ {app.youtubeLink}</div>}
                </div>

                {/* Action buttons */}
                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    <button onClick={() => setSelected(app)} style={{ background: '#052e16', border: '1px solid #14532d', color: '#22c55e', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      ✅ Review
                    </button>
                    <button onClick={() => doAction(app.id, 'reject')} disabled={actionLoading === app.id} style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#f87171', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: actionLoading === app.id ? 0.6 : 1 }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
                {app.status === 'approved' && (
                  <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>✓ Approved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d0d0f', border: '1px solid #27272a', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>✅ Approve Creator</h3>
            <p style={{ color: '#71717a', fontSize: 13, margin: '0 0 20px' }}>{selected.fullName} (@{selected.username})</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Assign Tier</label>
              <select value={actionTier} onChange={e => setActionTier(e.target.value)} style={{ width: '100%', background: '#141416', border: '1px solid #27272a', color: '#fff', borderRadius: 10, padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: '#141416' }}>{v}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Admin Notes (optional)</label>
              <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={2} placeholder="Welcome note or reason..." style={{ width: '100%', background: '#141416', border: '1px solid #27272a', color: '#fff', borderRadius: 10, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#a1a1aa' }}>
                <input type="checkbox" checked={giveWallet} onChange={e => setGiveWallet(e.target.checked)} style={{ accentColor: '#22c55e' }} />
                Give ₹20,000 Ads Wallet Credit
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#a1a1aa' }}>
                <input type="checkbox" checked={giveVerified} onChange={e => setGiveVerified(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                Grant Verified Blue Tick (✅)
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => doAction(selected.id, 'approve')} disabled={!!actionLoading} style={{ flex: 1, background: '#052e16', border: '1px solid #14532d', color: '#22c55e', borderRadius: 12, padding: '12px', cursor: 'pointer', fontSize: 14, fontWeight: 800, opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? '⏳ Processing...' : '✅ Approve Creator'}
              </button>
              <button onClick={() => setSelected(null)} style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 12, padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
