'use client';

import { useEffect, useState } from 'react';

interface TopKeyword {
  keyword: string;
  searchCount: number;
  clickCount: number;
  ctr: number;
}

interface ClickLog {
  id: string;
  query: string;
  clickedId: string;
  clickedType: string;
  user: string;
  createdAt: string;
}

interface SearchAnalytics {
  success: boolean;
  totalQueries: number;
  averageCTR: number;
  trendingKeyword: string;
  topKeywords: TopKeyword[];
  clickLogs: ClickLog[];
}

export default function SearchAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchAnalytics | null>(null);
  const [hoveredKeywordIdx, setHoveredKeywordIdx] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/super-admin/search-analytics');
        if (!response.ok) {
          throw new Error('Failed to retrieve search analytics data. Please ensure you are logged in as a Super Admin.');
        }
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError('Failed to load search analytics.');
        }
      } catch (err: any) {
        console.error('Error fetching search analytics:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        {/* Skeleton Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 140,
                background: '#0d0d0f',
                border: '1px solid #1c1c1e',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 24, height: 24, background: '#1c1c1e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: 60, height: 16, background: '#1c1c1e', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ width: '60%', height: 32, background: '#1c1c1e', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '40%', height: 14, background: '#1c1c1e', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>

        {/* Large Layout Skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <div style={{ height: 350, background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 20 }}>
            <div style={{ width: 200, height: 24, background: '#1c1c1e', borderRadius: 6, marginBottom: 20 }} />
            <div style={{ width: '100%', height: 240, background: '#1c1c1e', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          background: '#0d0d0f',
          border: '1px solid #ef444433',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          maxWidth: 600,
          margin: '40px auto',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Denied or Error</h3>
        <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          {error || 'Unable to load Super Admin Search Analytics at this moment.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Calculate metrics
  const totalQueries = data.totalQueries;
  const avgCtr = data.averageCTR;
  const trendingWord = data.trendingKeyword;

  // Custom Interactive Top Keywords Chart Data (Bespoke SVG)
  const chartHeight = 220;
  const top5Keywords = data.topKeywords.slice(0, 5);
  const maxSearchCount = top5Keywords.length > 0 ? Math.max(...top5Keywords.map((k) => k.searchCount), 10) : 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* 3 Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Queries Card */}
        <div
          style={{
            background: '#0d0d0f',
            border: '1px solid #1c1c1e',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, #a78bfa15 0%, transparent 70%)', borderRadius: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 24 }}>🔍</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: '#2e1065', padding: '2px 8px', borderRadius: 20 }}>
              Search Count
            </span>
          </div>
          <div style={{ color: '#a78bfa', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{totalQueries.toLocaleString()}</div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Total Queries Tracked</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Cumulative user keyword searches on the platform</div>
        </div>

        {/* Avg CTR Card */}
        <div
          style={{
            background: '#0d0d0f',
            border: '1px solid #1c1c1e',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, #22c55e15 0%, transparent 70%)', borderRadius: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: '#052e16', padding: '2px 8px', borderRadius: 20 }}>
              Conversion Rate
            </span>
          </div>
          <div style={{ color: '#22c55e', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{avgCtr}%</div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Average Search CTR</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Percentage of queries that resulted in a user click-through</div>
        </div>

        {/* Trending Card */}
        <div
          style={{
            background: '#0d0d0f',
            border: '1px solid #1c1c1e',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, #eab30815 0%, transparent 70%)', borderRadius: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308', background: '#422006', padding: '2px 8px', borderRadius: 20 }}>
              Top Trend
            </span>
          </div>
          <div
            style={{
              color: '#eab308',
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '90%',
            }}
          >
            {trendingWord === 'N/A' ? 'None' : trendingWord}
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Trending Search Keyword</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Most frequently searched keyword of the day</div>
        </div>
      </div>

      {/* Interactive Keyword Analytics Visualization */}
      {top5Keywords.length > 0 && (
        <div
          style={{
            background: '#0d0d0f',
            border: '1px solid #1c1c1e',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>📈 Search Intent & Engagement Chart</h3>
          <p style={{ color: '#71717a', fontSize: 12, margin: '0 0 20px 0' }}>
            Visualizes search volumes (height) vs. conversion Click-Through Rates (glow) for the top keywords
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: chartHeight,
              paddingTop: 20,
              paddingBottom: 10,
              borderBottom: '1px solid #1c1c1e',
              gap: 12,
            }}
          >
            {top5Keywords.map((k, idx) => {
              const heightPct = Math.max(10, (k.searchCount / maxSearchCount) * 100);
              const barGlowColor =
                k.ctr >= 30
                  ? 'rgba(34, 197, 94, 0.4)'
                  : k.ctr >= 10
                  ? 'rgba(234, 179, 8, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)';
              const barColor = k.ctr >= 30 ? '#22c55e' : k.ctr >= 10 ? '#eab308' : '#ef4444';
              const isHovered = hoveredKeywordIdx === idx;

              return (
                <div
                  key={k.keyword}
                  onMouseEnter={() => setHoveredKeywordIdx(idx)}
                  onMouseLeave={() => setHoveredKeywordIdx(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    maxWidth: 100,
                    cursor: 'pointer',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {/* Tooltip on hover */}
                  <div
                    style={{
                      opacity: isHovered ? 1 : 0,
                      visibility: isHovered ? 'visible' : 'hidden',
                      transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease',
                      position: 'absolute',
                      bottom: (heightPct / 100) * (chartHeight - 40) + 50,
                      background: '#18181b',
                      border: `1px solid ${barColor}44`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      zIndex: 5,
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>"{k.keyword}"</div>
                    <div style={{ color: '#a1a1aa', fontSize: 10, marginTop: 4 }}>
                      Searches: <span style={{ color: '#fff', fontWeight: 600 }}>{k.searchCount}</span>
                    </div>
                    <div style={{ color: '#a1a1aa', fontSize: 10 }}>
                      Clicks: <span style={{ color: '#fff', fontWeight: 600 }}>{k.clickCount}</span>
                    </div>
                    <div style={{ color: barColor, fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                      CTR: {k.ctr}%
                    </div>
                  </div>

                  {/* Bar */}
                  <div
                    style={{
                      height: `${heightPct}%`,
                      width: '100%',
                      background: `linear-gradient(to top, ${barColor}11, ${barColor})`,
                      borderRadius: '8px 8px 0 0',
                      boxShadow: isHovered
                        ? `0 -4px 20px ${barGlowColor}, 0 0 10px ${barColor}22`
                        : `0 -2px 10px ${barGlowColor}`,
                      transition: 'box-shadow 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 6,
                      minHeight: 45,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {k.ctr}%
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 9, fontWeight: 500 }}>
                      {k.searchCount}
                    </span>
                  </div>

                  <span
                    style={{
                      color: isHovered ? '#fff' : '#a1a1aa',
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 8,
                      textAlign: 'center',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {k.keyword}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgGridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main Content Layout Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Keywords Table */}
          <div
            style={{
              background: '#0d0d0f',
              border: '1px solid #1c1c1e',
              borderRadius: 16,
              padding: 24,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>🔍 Top Searched Keywords</h3>
                <p style={{ color: '#71717a', fontSize: 12 }}>Detailed conversion rates and volume metrics for all keywords</p>
              </div>
            </div>

            {data.topKeywords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>📂</span>
                No search keywords recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1c1c1e' }}>
                      <th style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, paddingBottom: 12 }}>Keyword</th>
                      <th style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, paddingBottom: 12 }}>Search Volume</th>
                      <th style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, paddingBottom: 12 }}>Result Clicks</th>
                      <th style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, paddingBottom: 12 }}>Click-Through Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topKeywords.map((k) => {
                      const ctrColor = k.ctr >= 30 ? '#22c55e' : k.ctr >= 10 ? '#eab308' : '#ef4444';
                      const ctrBg = k.ctr >= 30 ? '#052e16' : k.ctr >= 10 ? '#422006' : '#450a0a';

                      return (
                        <tr
                          key={k.keyword}
                          style={{
                            borderBottom: '1px solid #131315',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#18181b33';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td style={{ color: '#fff', fontSize: 14, fontWeight: 600, padding: '14px 0' }}>
                            <span
                              style={{
                                background: '#1c1c1e',
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid #2d2d30',
                              }}
                            >
                              {k.keyword}
                            </span>
                          </td>
                          <td style={{ color: '#e4e4e7', fontSize: 14, padding: '14px 0' }}>
                            {k.searchCount.toLocaleString()}
                          </td>
                          <td style={{ color: '#e4e4e7', fontSize: 14, padding: '14px 0' }}>
                            {k.clickCount.toLocaleString()}
                          </td>
                          <td style={{ padding: '14px 0' }}>
                            <span
                              style={{
                                color: ctrColor,
                                background: ctrBg,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 20,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ctrColor }} />
                              {k.ctr}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Real-time Click Logs */}
          <div
            style={{
              background: '#0d0d0f',
              border: '1px solid #1c1c1e',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>⚡ Search Conversion Feed</h3>
              <p style={{ color: '#71717a', fontSize: 12, marginBottom: 20 }}>
                Real-time updates showing which results users are clicking after searching
              </p>
            </div>

            {data.clickLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717a' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>⚡</span>
                No click events logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                {data.clickLogs.map((log) => {
                  const typeLabel =
                    log.clickedType === 'user'
                      ? '👤 Profile'
                      : log.clickedType === 'reel'
                      ? '🎬 Reel'
                      : log.clickedType === 'listing'
                      ? '🛍️ Listing'
                      : log.clickedType === 'group'
                      ? '🏘️ Tolee'
                      : log.clickedType === 'requirement'
                      ? '📌 Need'
                      : '📝 Post';

                  const typeColor =
                    log.clickedType === 'user'
                      ? '#3b82f6'
                      : log.clickedType === 'reel'
                      ? '#ec4899'
                      : log.clickedType === 'listing'
                      ? '#10b981'
                      : log.clickedType === 'group'
                      ? '#a78bfa'
                      : log.clickedType === 'requirement'
                      ? '#f59e0b'
                      : '#6b7280';

                  return (
                    <div
                      key={log.id}
                      style={{
                        background: '#121214',
                        border: '1px solid #1c1c1e',
                        borderRadius: 12,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2d2d30';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#1c1c1e';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#71717a', fontSize: 12 }}>User:</span>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{log.user}</span>
                        </div>
                        <span style={{ color: '#71717a', fontSize: 11 }}>
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#71717a', fontSize: 12 }}>Searched:</span>
                        <span
                          style={{
                            color: '#a78bfa',
                            background: '#2e1065',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          "{log.query}"
                        </span>
                        <span style={{ color: '#71717a', fontSize: 12 }}>→ Clicked:</span>
                        <span
                          style={{
                            color: typeColor,
                            background: `${typeColor}15`,
                            border: `1px solid ${typeColor}30`,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
