'use client';

import React, { useEffect, useState } from 'react';
import {
  getAnalyticsSummary,
  getTrafficSourceReport,
  getFunnelData,
  getDailyTrends,
  getEngagementAndGeoReports,
  getRealtimeStats
} from '@/actions/analytics';
import { 
  TrendingUp, Users, UserCheck, UserMinus, ShieldAlert, BarChart2, PieChart, Info, 
  MapPin, Clock, Calendar, Download, RefreshCw, Smartphone, Laptop, Tablet, ArrowUpRight, ArrowDownRight, Globe
} from 'lucide-react';

export default function SuperAdminAnalyticsPage() {
  // Filters state
  const [rangeType, setRangeType] = useState<string>('Last 30 Days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Loaded analytics states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any[]>([]);
  const [featureActions, setFeatureActions] = useState<any[]>([]);

  // Real-time states
  const [realtime, setRealtime] = useState({ onlineUsers: 0, onlineLoggedIn: 0, trafficVelocity: 0 });
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  // Active chart hover tooltips state
  const [activeTrendIndex, setActiveTrendIndex] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, srcRes, funRes, trdRes, engRes] = await Promise.all([
        getAnalyticsSummary(rangeType, customStart, customEnd),
        getTrafficSourceReport(rangeType, customStart, customEnd),
        getFunnelData(rangeType, customStart, customEnd),
        getDailyTrends(rangeType, customStart, customEnd),
        getEngagementAndGeoReports(rangeType, customStart, customEnd),
      ]);

      if (sumRes.success) {
        setSummary(sumRes.summary);
        setDevices(sumRes.devices || []);
        setLocations(sumRes.locations || []);
      } else {
        setError(sumRes.error || 'Failed to fetch analytics summary.');
      }

      if (srcRes.success) setSources(srcRes.data || []);
      if (funRes.success) setFunnel(funRes.data || []);
      
      if (trdRes.success) {
        setTrends(trdRes.trends || []);
        setHourly(trdRes.hourly || []);
      }

      if (engRes.success) {
        setEngagement(engRes.engagement || []);
        setFeatureActions(engRes.featureActions || []);
      }

    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    setRealtimeLoading(true);
    try {
      const res = await getRealtimeStats();
      if (res.success) {
        setRealtime({
          onlineUsers: res.onlineUsers || 0,
          onlineLoggedIn: res.onlineLoggedIn || 0,
          trafficVelocity: res.trafficVelocity || 0
        });
      }
    } catch (err) {
      console.error('Failed to update realtime stats:', err);
    } finally {
      setRealtimeLoading(false);
    }
  };

  // Run analytics fetch on date range changes
  useEffect(() => {
    fetchAnalytics();
  }, [rangeType, customStart, customEnd]);

  // Run realtime stats fetch on mount, and set a polling interval of 20 seconds
  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 20000);
    return () => clearInterval(interval);
  }, []);

  // Export report to CSV helper
  const exportToCSV = (dataList: any[], filename: string, headers: string[], keyMap: string[]) => {
    if (dataList.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\r\n";
    
    dataList.forEach(item => {
      const row = keyMap.map(key => {
        let val = item[key];
        if (typeof val === 'string') {
          // Escape quotes
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSources = () => {
    exportToCSV(
      sources,
      `tolee_traffic_sources_${rangeType.replace(/\s+/g, '_')}`,
      ['Traffic Source', 'Total Visitors', 'Signups Driven', 'Logins Driven', 'Conversion Rate %'],
      ['source', 'visitors', 'signups', 'logins', 'conversion']
    );
  };

  const handleExportTrends = () => {
    exportToCSV(
      trends,
      `tolee_daily_traffic_trends_${rangeType.replace(/\s+/g, '_')}`,
      ['Date', 'Visitors count', 'Signups count', 'Logins count'],
      ['date', 'visitors', 'signups', 'logins']
    );
  };

  // Print PDF Trigger
  const triggerPrintReport = () => {
    window.print();
  };

  // Helper styles for Devices
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Mobile': return <Smartphone className="h-4.5 w-4.5" />;
      case 'Tablet': return <Tablet className="h-4.5 w-4.5" />;
      default: return <Laptop className="h-4.5 w-4.5" />;
    }
  };

  // custom responsive SVG line graph builder
  const renderTrendLineChart = () => {
    if (trends.length === 0) return null;

    const width = 600;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find maximum value to normalize chart
    const maxVal = Math.max(
      ...trends.map(t => Math.max(t.visitors, t.signups, t.logins)),
      10 // Base fallback max
    );

    // X coordinates
    const getX = (index: number) => {
      if (trends.length <= 1) return paddingLeft;
      return paddingLeft + (index / (trends.length - 1)) * chartWidth;
    };

    // Y coordinates
    const getY = (val: number) => {
      return paddingTop + chartHeight - (val / maxVal) * chartHeight;
    };

    // Paths
    let visitorPath = '';
    let signupPath = '';
    let loginPath = '';

    trends.forEach((t, idx) => {
      const x = getX(idx);
      const yVis = getY(t.visitors);
      const ySign = getY(t.signups);
      const yLog = getY(t.logins);

      if (idx === 0) {
        visitorPath = `M ${x} ${yVis}`;
        signupPath = `M ${x} ${ySign}`;
        loginPath = `M ${x} ${yLog}`;
      } else {
        visitorPath += ` L ${x} ${yVis}`;
        signupPath += ` L ${x} ${ySign}`;
        loginPath += ` L ${x} ${yLog}`;
      }
    });

    // Grid lines count
    const gridLines = 5;

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
          <defs>
            {/* Gradients */}
            <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: gridLines }).map((_, idx) => {
            const yVal = (idx / (gridLines - 1)) * maxVal;
            const y = getY(yVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1c1c1e"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {Math.round(yVal)}
                </text>
              </g>
            );
          })}

          {/* Fill Areas under lines (for visual rich premium depth!) */}
          {trends.length > 1 && (
            <>
              <path
                d={`${visitorPath} L ${getX(trends.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`}
                fill="url(#visitorGrad)"
              />
              <path
                d={`${signupPath} L ${getX(trends.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`}
                fill="url(#signupGrad)"
              />
            </>
          )}

          {/* Line paths */}
          <path d={visitorPath} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={signupPath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={loginPath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* X Axis Labels */}
          {trends.map((t, idx) => {
            // Label every Nth date to prevent overlapping
            const labelInterval = Math.max(1, Math.round(trends.length / 6));
            if (idx % labelInterval !== 0 && idx !== trends.length - 1) return null;

            const date = new Date(t.date);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 8}
                fill="#71717a"
                fontSize="10"
                textAnchor="middle"
              >
                {dateStr}
              </text>
            );
          })}

          {/* Interaction tracking nodes */}
          {trends.map((t, idx) => {
            const x = getX(idx);
            return (
              <rect
                key={idx}
                x={x - (chartWidth / trends.length) / 2}
                y={paddingTop}
                width={chartWidth / trends.length}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveTrendIndex(idx)}
                onMouseLeave={() => setActiveTrendIndex(null)}
              />
            );
          })}

          {/* Active tooltip marker line */}
          {activeTrendIndex !== null && (
            <line
              x1={getX(activeTrendIndex)}
              y1={paddingTop}
              x2={getX(activeTrendIndex)}
              y2={height - paddingBottom}
              stroke="#52525b"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Floating tooltip box details */}
        {activeTrendIndex !== null && trends[activeTrendIndex] && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: Math.max(50, Math.min(window.innerWidth - 200, getX(activeTrendIndex) - 75)),
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.6)',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 12,
            width: 160
          }}>
            <div style={{ color: '#fff', fontWeight: 700, borderBottom: '1px solid #27272a', paddingBottom: 4, marginBottom: 6, fontSize: 11 }}>
              {new Date(trends[activeTrendIndex].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 600 }}>
              <span>🟢 Visitors:</span>
              <span>{trends[activeTrendIndex].visitors}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>
              <span>🔵 Signups:</span>
              <span>{trends[activeTrendIndex].signups}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171', fontWeight: 600, marginTop: 2 }}>
              <span>🔴 Logins:</span>
              <span>{trends[activeTrendIndex].logins}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom SVG funnel rendering showing dropoffs
  const renderFunnelChart = () => {
    if (funnel.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#09090b', padding: 20, borderRadius: 16, border: '1px solid #1c1c1e' }}>
        {funnel.map((item, idx) => {
          const prevCount = idx > 0 ? funnel[idx - 1].count : item.count;
          const relativePercentage = prevCount > 0 ? Math.round((item.count / prevCount) * 100) : 0;
          
          return (
            <div key={item.stage} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 100, fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>{item.stage}</div>
              
              {/* Funnel tier block */}
              <div style={{ flex: 1, position: 'relative', height: 36, background: '#18181b', borderRadius: 8, overflow: 'hidden', border: '1px solid #27272a' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${item.percentage}%`,
                  background: `linear-gradient(90deg, rgba(34, 197, 94, ${0.8 - idx * 0.15}), rgba(16, 185, 129, ${0.6 - idx * 0.15}))`,
                  transition: 'width 0.4s ease'
                }} />
                
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  zIndex: 2
                }}>
                  <span>{item.count.toLocaleString()}</span>
                  <span>{item.percentage}%</span>
                </div>
              </div>

              {/* Conversion rate relative dropoff */}
              <div style={{ width: 85, textAlign: 'right' }}>
                {idx > 0 ? (
                  <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>
                    ↘ {relativePercentage}% conv.
                  </span>
                ) : (
                  <span style={{ color: '#71717a', fontSize: 11, fontWeight: 700 }}>Baseline</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } }
        .pulse-circle { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
        .preset-btn { background: #18181b; border: 1px solid #27272a; color: #a1a1aa; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
        .preset-btn:hover { border-color: #3f3f46; color: #fff; }
        .preset-btn.active { background: linear-gradient(135deg, #16a34a22, #22c55e22); border-color: #22c55e; color: #22c55e; }
        
        /* Printer stylesheets to make premium PDFs */
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .sa-sidebar, .mobile-overlay, .preset-btn, .datepicker-container, button, select, input { display: none !important; }
          .stat-card, .sec-card { background: #fff !important; border: 1px solid #ddd !important; color: #000 !important; }
          h1, h2, h3, text, span, p, td, th { color: #000 !important; }
          svg line { stroke: #ccc !important; }
          svg text { fill: #000 !important; }
        }
      `}</style>

      {/* Real-time Online traffic Bar */}
      <div style={{ background: '#0c0c0e', border: '1px solid #1c1c1e', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-circle" />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Real-time Online Visitors</span>
          <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 800 }}>{realtime.onlineUsers}</span>
          <span style={{ color: '#71717a', fontSize: 12 }}>({realtime.onlineLoggedIn} logged in)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#71717a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe className="h-4 w-4 text-green-500" />
            Activity: <strong style={{ color: '#a1a1aa' }}>{realtime.trafficVelocity} hits/min</strong>
          </span>
          <button
            onClick={fetchRealtime}
            disabled={realtimeLoading}
            style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', outline: 'none' }}
            title="Refresh Real-time counters"
          >
            <RefreshCw className={`h-4 w-4 ${realtimeLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #1c1c1e', paddingBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Traffic & Conversion Analytics</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Track organic acquisition channels, user conversion funnel ratios, and active behavioral graphs.
          </p>
        </div>

        {/* Custom Calendar Datepicker and Export */}
        <div className="datepicker-container" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['Today', 'Last 7 Days', 'Last 30 Days', 'This Month'].map((p) => (
              <button
                key={p}
                onClick={() => setRangeType(p)}
                className={`preset-btn ${rangeType === p ? 'active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#18181b', border: '1px solid #27272a', padding: '4px 10px', borderRadius: 10 }}>
            <Calendar className="h-4 w-4 text-[#71717a]" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setRangeType('custom');
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ color: '#52525b', fontSize: 12 }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setRangeType('custom');
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={triggerPrintReport}
            style={{
              background: '#22c55e', border: 'none', color: '#fff', padding: '8px 16px',
              borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Download className="h-4 w-4" />
            PDF Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#71717a', fontSize: 13 }}>Compiling analytics reports date-wise...</p>
        </div>
      ) : error ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#f87171', background: '#450a0a1a', border: '1px solid #7f1d1d33', borderRadius: 16 }}>
          ⚠️ {error}
        </div>
      ) : (
        <>
          {/* Main statistics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { label: 'Total Visitors', value: summary?.totalVisitors, desc: `${summary?.newUsers} new / ${summary?.returningUsers} returning`, icon: <Users className="text-green-500 h-5 w-5" />, color: '#fff' },
              { label: 'Signup Conversions', value: summary?.totalSignups, desc: `Conversion rate: ${summary?.conversionRate}%`, icon: <UserCheck className="text-blue-500 h-5 w-5" />, color: '#60a5fa' },
              { label: 'Login Conversions', value: summary?.totalLogins, desc: 'Successful authenticated sessions', icon: <UserMinus className="text-red-500 h-5 w-5" />, color: '#f87171' },
              { label: 'Conversion Performance', value: `${summary?.conversionRate}%`, desc: 'Visitors that convert to signups', icon: <TrendingUp className="text-emerald-500 h-5 w-5" />, color: '#10b981' },
            ].map(c => (
              <div key={c.label} className="stat-card" style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#71717a', fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                  {c.icon}
                </div>
                <div style={{ color: c.color, fontSize: 26, fontWeight: 800 }}>
                  {typeof c.value === 'number' ? c.value.toLocaleString() : c.value}
                </div>
                <div style={{ color: '#52525b', fontSize: 11, fontWeight: 500 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Graphs Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, flexWrap: 'wrap' }} className="grid-responsive">
            <style>{`
              @media (max-width: 1024px) {
                .grid-responsive { grid-template-columns: 1fr !important; }
              }
            `}</style>
            
            {/* 1. Traffic trend line graph */}
            <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Daily Traffic Acquisition Trends</h3>
                <button
                  onClick={handleExportTrends}
                  style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Download CSV
                </button>
              </div>
              
              {renderTrendLineChart()}

              {/* Chart legends */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>🟢 Visitors</span>
                <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>🔵 Signups</span>
                <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>🔴 Logins</span>
              </div>
            </div>

            {/* 2. Device analytics and Demographics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Device share */}
              <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, flex: 1 }}>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 14 }}>📱 Device Allocation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {devices.map(dev => {
                    const devPct = summary?.totalVisitors > 0 ? Math.round((dev.count / summary.totalVisitors) * 100) : 0;
                    return (
                      <div key={dev.device} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa', fontSize: 12 }}>
                          {getDeviceIcon(dev.device)}
                          <span>{dev.device}</span>
                        </div>
                        <div style={{ flex: 1, height: 6, background: '#1c1c1e', borderRadius: 3, overflow: 'hidden', margin: '0 8px' }}>
                          <div style={{ height: '100%', background: '#22c55e', width: `${devPct}%` }} />
                        </div>
                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, width: 60, textAlign: 'right' }}>
                          {devPct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Geographic locations summary */}
              <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, flex: 1.5 }}>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 12 }}>📍 Top Locations</h3>
                {locations.length === 0 ? (
                  <div style={{ color: '#52525b', fontSize: 12, padding: '10px 0' }}>No geo logs found yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {locations.slice(0, 4).map(loc => (
                      <div key={`${loc.state}-${loc.city}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                          {loc.city}, {loc.state}
                        </span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{loc.count.toLocaleString()} visits</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Funnel & Conversion Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid-responsive">
            {/* Conversion Funnel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Acquisition Conversion Funnel</h3>
              {renderFunnelChart()}
            </div>

            {/* Traffic sources table */}
            <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>💡 Traffic Channels & UTM Source</h3>
                <button
                  onClick={handleExportSources}
                  style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Download CSV
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1c1c1e', color: '#71717a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 4px', textAlign: 'left' }}>Acquisition Channel</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Sessions</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Signups</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>CR %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: '#52525b', padding: 20, textAlign: 'center' }}>No traffic logs recorded in range</td>
                      </tr>
                    ) : (
                      sources.map(src => (
                        <tr key={src.source} style={{ borderBottom: '1px solid #161618', fontSize: 12 }}>
                          <td style={{ padding: '10px 4px', color: '#e4e4e7', fontWeight: 600 }}>{src.source}</td>
                          <td style={{ padding: '10px 4px', color: '#a1a1aa', textAlign: 'right' }}>{src.visitors.toLocaleString()}</td>
                          <td style={{ padding: '10px 4px', color: '#a1a1aa', textAlign: 'right' }}>{src.signups.toLocaleString()}</td>
                          <td style={{ padding: '10px 4px', color: '#22c55e', fontWeight: 700, textAlign: 'right' }}>{src.conversion}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* User Behavioral Engagement Details */}
          <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Feature Engagement Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="grid-responsive">
              
              {/* Pages Views */}
              <div>
                <h4 style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #1c1c1e', paddingBottom: 8, marginBottom: 10 }}>
                  Top Visited Pages
                </h4>
                {engagement.length === 0 ? (
                  <div style={{ color: '#52525b', fontSize: 12, padding: 10 }}>No page views logged</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {engagement.map(eng => (
                      <div key={eng.feature} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#e4e4e7', fontFamily: 'monospace' }}>{eng.feature}</span>
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>{eng.views.toLocaleString()} hits</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Interactions */}
              <div>
                <h4 style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #1c1c1e', paddingBottom: 8, marginBottom: 10 }}>
                  Feature Engagement Actions
                </h4>
                {featureActions.length === 0 ? (
                  <div style={{ color: '#52525b', fontSize: 12, padding: 10 }}>No features interactions logged</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {featureActions.slice(0, 5).map((act, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#e4e4e7' }}>
                          {act.action.replace(/_/g, ' ').toUpperCase()} on <strong style={{ color: '#a1a1aa', fontFamily: 'monospace' }}>{act.path}</strong>
                        </span>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>{act.count.toLocaleString()} clicks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
