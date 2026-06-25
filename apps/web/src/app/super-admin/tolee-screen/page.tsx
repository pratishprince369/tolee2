'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, ShieldAlert, Award, Eye, EyeOff, Check, Trash2, 
  AlertTriangle, RefreshCw, Star, User, Film, Video, Users, 
  MessageSquare, Heart, AlertOctagon, Flame, ChevronRight, Play, Shield
} from 'lucide-react';

export default function ToleeScreenAdminPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'moderation' | 'leaderboard'>('analytics');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('subscribers');
  
  // Data states
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [moderationData, setModerationData] = useState<any>({ items: [], totalPending: 0, pages: 1 });
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  
  // Modals / Input states
  const [warningVideoId, setWarningVideoId] = useState<string | null>(null);
  const [warningReason, setWarningReason] = useState<string>('');
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/tolee-screen?tab=${activeTab}&sortBy=${sortBy}`);
      if (!res.ok) throw new Error('Failed to fetch admin data');
      const data = await res.json();
      
      if (activeTab === 'analytics') {
        setAnalyticsData(data.analytics);
      } else if (activeTab === 'moderation') {
        setModerationData(data.moderation || { items: [], totalPending: 0, pages: 1 });
      } else if (activeTab === 'leaderboard') {
        setLeaderboardData(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, sortBy]);

  const handleModerationAction = async (videoId: string, action: string, reason?: string) => {
    setActionLoading(`${videoId}-${action}`);
    try {
      const res = await fetch('/api/super-admin/tolee-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action, reason })
      });
      if (!res.ok) throw new Error('Moderation action failed');
      const data = await res.json();
      if (data.success) {
        // Refresh data
        fetchData();
        if (action === 'warn_creator') {
          setWarningVideoId(null);
          setWarningReason('');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Moderation action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.7) return '#ef4444'; // Red
    if (score > 0.4) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e4e4e7' }}>
      <style>{`
        .admin-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          color: #a1a1aa;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .admin-tab-btn:hover {
          background: #18181b;
          color: #fff;
        }
        .admin-tab-btn.active {
          background: linear-gradient(135deg, #16a34a22, #22c55e22);
          border-color: #22c55e44;
          color: #22c55e;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .dashboard-card {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .green-theme {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.15);
        }
        .blue-theme {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        .amber-theme {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .red-theme {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .purple-theme {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.15);
        }
        .moderation-item {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: border-color 0.2s;
        }
        .moderation-item:hover {
          border-color: #27272a;
        }
        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }
        .action-button:hover {
          opacity: 0.9;
        }
        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
        }
        .leaderboard-th {
          text-align: left;
          color: #71717a;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 14px 18px;
          border-bottom: 1px solid #1c1c1e;
        }
        .leaderboard-td {
          padding: 14px 18px;
          font-size: 13px;
          border-bottom: 1px solid #121214;
        }
        .leaderboard-tr:hover {
          background: #141416;
        }
      `}</style>

      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #1c1c1e', paddingBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Tolee Screen Panel</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Monitor videos, review reported content, and check creator leaderboard metrics.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            background: '#18181b', border: '1px solid #27272a', color: '#fff',
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #1c1c1e', paddingBottom: 16 }}>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          <BarChart2 className="h-4 w-4" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`admin-tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
        >
          <ShieldAlert className="h-4 w-4" />
          Moderation Queue
          {moderationData?.totalPending > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
              {moderationData.totalPending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`admin-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        >
          <Award className="h-4 w-4" />
          Creator Leaderboard
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {activeTab === 'analytics' && analyticsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Top Cards Row */}
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <div className="card-icon green-theme">📺</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{analyticsData.totalVideos}</div>
                    <div style={{ color: '#71717a', fontSize: 12, fontWeight: 500 }}>Total Videos</div>
                  </div>
                </div>
                <div className="dashboard-card">
                  <div className="card-icon blue-theme">👥</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{analyticsData.totalCreators}</div>
                    <div style={{ color: '#71717a', fontSize: 12, fontWeight: 500 }}>Total Creators</div>
                  </div>
                </div>
                <div className="dashboard-card">
                  <div className="card-icon purple-theme">🔔</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{analyticsData.totalSubscriptions}</div>
                    <div style={{ color: '#71717a', fontSize: 12, fontWeight: 500 }}>Subscriptions</div>
                  </div>
                </div>
                <div className="dashboard-card">
                  <div className="card-icon red-theme">⚠️</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{analyticsData.totalReports}</div>
                    <div style={{ color: '#71717a', fontSize: 12, fontWeight: 500 }}>Total Reports</div>
                  </div>
                </div>
              </div>

              {/* Detailed Analytics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                {/* Verification Queue & Anti-Spam */}
                <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Verification & Anti-Spam Queue</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Verified Platform Views</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{analyticsData.totalPlatformViews?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Filtered Spam Views</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{analyticsData.totalSpamViews?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Pending Verification</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{analyticsData.totalPendingViews?.toLocaleString() || 0}</span>
                    </div>
                    
                    {/* Spam Reasons breakdown */}
                    <div style={{ marginTop: 10 }}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>Spam Filtration Breakdown</span>
                      {(!analyticsData.spamReasons || analyticsData.spamReasons.length === 0) ? (
                        <span style={{ color: '#71717a', fontSize: 11 }}>No spam views detected. System clean!</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {analyticsData.spamReasons.map((r: any) => (
                            <div key={r.reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                              <span style={{ color: '#71717a' }}>{r.reason}</span>
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>{r.count} sessions</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Engagement Breakdown */}
                <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Engagement Metrics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Total Video Views</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{analyticsData.totalViews.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Estimated Watch Time</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{analyticsData.estimatedWatchHours} Hours</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Average Audience Retention</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{analyticsData.avgRetention}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Total Likes</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{analyticsData.totalLikes.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 5 }}>
                      <span style={{ color: '#a1a1aa' }}>Total Comments</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{analyticsData.totalComments.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Moderation Status */}
                <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Moderation Overview</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Clean (Approved) Videos</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Flagged Videos</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{analyticsData.flaggedVideos}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c1c1e', paddingBottom: 10 }}>
                      <span style={{ color: '#a1a1aa' }}>Removed Videos</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{analyticsData.removedVideos}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 5 }}>
                      <span style={{ color: '#a1a1aa' }}>Simulated Videos</span>
                      <span style={{ color: '#a855f7', fontWeight: 600 }}>{analyticsData.simulatedVideos}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Content Category Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {analyticsData.categoryBreakdown?.map((cat: any, i: number) => (
                    <div key={i} style={{ background: '#141416', padding: '12px 16px', borderRadius: 12, border: '1px solid #1c1c1e' }}>
                      <div style={{ color: '#71717a', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {cat.category || 'Uncategorized'}
                      </div>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                        {cat.count} <span style={{ fontSize: 12, fontWeight: 500, color: '#71717a' }}>videos</span>
                      </div>
                    </div>
                  ))}
                  {(!analyticsData.categoryBreakdown || analyticsData.categoryBreakdown.length === 0) && (
                    <p style={{ color: '#71717a', fontSize: 14 }}>No categories indexed yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {moderationData.items.length === 0 ? (
                <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
                  <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Inbox Clear</h3>
                  <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
                    No reported videos are currently pending review. Great job keeping Tolee safe!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {moderationData.items.map((item: any) => (
                    <div key={item.video.id} className="moderation-item">
                      {/* Video Header & Creator Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 280 }}>
                          {/* Thumbnail / Video Preview Placeholder */}
                          <div style={{ position: 'relative', width: 90, height: 120, background: '#18181b', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid #27272a' }}>
                            {item.video.thumbnailUrl ? (
                              <img src={item.video.thumbnailUrl} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a' }}>
                                <Video className="h-6 w-6" />
                              </div>
                            )}
                            <button
                              onClick={() => setPreviewVideoUrl(item.video.mediaUrl)}
                              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                            >
                              <Play className="h-6 w-6 fill-white" />
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{item.video.title}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
                              <span>by</span>
                              <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{item.video.user?.name || item.video.user?.username}</span>
                              {item.video.user?.isVerified && <Star className="h-3.5 w-3.5 fill-[#22c55e] text-[#22c55e]" />}
                            </div>
                            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>
                              Uploaded: {new Date(item.video.createdAt).toLocaleDateString()} | Views: {item.video.viewsCount}
                            </div>
                            
                            {/* AI Analysis Scores */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {item.video.nsfwScore !== null && (
                                <span style={{ fontSize: 11, background: '#141416', border: `1px solid ${getScoreColor(item.video.nsfwScore)}`, color: getScoreColor(item.video.nsfwScore), padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                                  NSFW: {Math.round(item.video.nsfwScore * 100)}%
                                </span>
                              )}
                              {item.video.spamScore !== null && (
                                <span style={{ fontSize: 11, background: '#141416', border: `1px solid ${getScoreColor(item.video.spamScore)}`, color: getScoreColor(item.video.spamScore), padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                                  Spam: {Math.round(item.video.spamScore * 100)}%
                                </span>
                              )}
                              {item.video.violenceScore !== null && (
                                <span style={{ fontSize: 11, background: '#141416', border: `1px solid ${getScoreColor(item.video.violenceScore)}`, color: getScoreColor(item.video.violenceScore), padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                                  Violence: {Math.round(item.video.violenceScore * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Report statistics count */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: '#ef444422', border: '1px solid #ef444444', color: '#ef4444', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                            {item.totalReports} Reports
                          </span>
                        </div>
                      </div>

                      {/* Reports details block */}
                      <div style={{ background: '#141416', border: '1px solid #1c1c1e', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 12 }}>User Reports Detailed:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {item.reports.map((report: any, idx: number) => (
                            <div key={report.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: idx < item.reports.length - 1 ? 12 : 0, borderBottom: idx < item.reports.length - 1 ? '1px solid #1c1c1e' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{report.reporter?.name || `@${report.reporter?.username}`}</span>
                                <span style={{ color: '#71717a' }}>{new Date(report.createdAt).toLocaleString()}</span>
                              </div>
                              <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>Reason: {report.reason}</div>
                              {report.description && <div style={{ color: '#a1a1aa', fontSize: 12 }}>"{report.description}"</div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons bar */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #1c1c1e', paddingTop: 16 }}>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleModerationAction(item.video.id, 'approve')}
                          className="action-button"
                          style={{ background: '#10b981', color: '#fff' }}
                        >
                          <Check className="h-3.5 w-3.5" /> Approve Content
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleModerationAction(item.video.id, 'hide')}
                          className="action-button"
                          style={{ background: '#f59e0b', color: '#fff' }}
                        >
                          <EyeOff className="h-3.5 w-3.5" /> Hide Video
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleModerationAction(item.video.id, 'remove')}
                          className="action-button"
                          style={{ background: '#ef4444', color: '#fff' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove Video
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleModerationAction(item.video.id, 'age_restrict')}
                          className="action-button"
                          style={{ background: '#3b82f6', color: '#fff' }}
                        >
                          <Shield className="h-3.5 w-3.5" /> Age Restrict
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => setWarningVideoId(item.video.id)}
                          className="action-button"
                          style={{ background: '#a855f7', color: '#fff' }}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Warn Creator
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleModerationAction(item.video.id, 'dismiss')}
                          className="action-button"
                          style={{ background: '#27272a', color: '#a1a1aa', marginLeft: 'auto' }}
                        >
                          Dismiss Reports
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1c1c1e' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Rankings</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#71717a' }}>Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ background: '#141416', border: '1px solid #1c1c1e', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}
                  >
                    <option value="subscribers">Subscribers</option>
                    <option value="views">Total Views</option>
                    <option value="watchHours">Watch Hours</option>
                    <option value="videos">Uploads Count</option>
                    <option value="growth">Weekly Growth</option>
                  </select>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th className="leaderboard-th" style={{ width: 60 }}>Rank</th>
                      <th className="leaderboard-th">Creator</th>
                      <th className="leaderboard-th">Subscribers</th>
                      <th className="leaderboard-th">Uploads</th>
                      <th className="leaderboard-th">Total Views</th>
                      <th className="leaderboard-th">Est. Watch Time</th>
                      <th className="leaderboard-th">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((creator, index) => (
                      <tr key={creator.id} className="leaderboard-tr">
                        <td className="leaderboard-td" style={{ fontWeight: 800, color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#71717a' }}>
                          #{index + 1}
                        </td>
                        <td className="leaderboard-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1f1f23', overflow: 'hidden', border: '1px solid #27272a' }}>
                              {creator.avatar ? (
                                <img src={creator.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 12 }}>
                                  <User className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {creator.name || creator.username}
                                {creator.isVerified && <Star className="h-3.5 w-3.5 fill-[#22c55e] text-[#22c55e]" />}
                              </div>
                              <div style={{ color: '#71717a', fontSize: 11 }}>@{creator.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="leaderboard-td" style={{ fontWeight: 600, color: '#fff' }}>{creator.subscriberCount.toLocaleString()}</td>
                        <td className="leaderboard-td" style={{ color: '#a1a1aa' }}>{creator.videosCount}</td>
                        <td className="leaderboard-td" style={{ color: '#a1a1aa' }}>{creator.totalViews.toLocaleString()}</td>
                        <td className="leaderboard-td" style={{ color: '#a1a1aa' }}>{creator.watchHours} hrs</td>
                        <td className="leaderboard-td" style={{ color: '#10b981', fontWeight: 600 }}>+{creator.growthPercent}%</td>
                      </tr>
                    ))}
                    {leaderboardData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="leaderboard-td" style={{ textAlign: 'center', padding: '32px 0', color: '#71717a' }}>
                          No creators in the database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Warn Creator Modal */}
      {warningVideoId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle className="h-5 w-5 text-[#a855f7]" /> Warn Creator
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: 13 }}>
              Send an official warnings notification to the creator of this video regarding community policy violations.
            </p>
            <textarea
              placeholder="e.g. Please avoid displaying extreme violence or hate speech, otherwise your channel will be suspended."
              value={warningReason}
              onChange={(e) => setWarningReason(e.target.value)}
              style={{
                width: '100%', height: 100, background: '#141416', border: '1px solid #1c1c1e',
                borderRadius: 10, color: '#fff', padding: 12, fontSize: 13, outline: 'none',
                resize: 'none', fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setWarningVideoId(null)}
                style={{ background: '#1c1c1e', border: '1px solid #27272a', color: '#a1a1aa', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleModerationAction(warningVideoId, 'warn_creator', warningReason)}
                style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {previewVideoUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPreviewVideoUrl(null)}>
          <div style={{ width: '100%', maxWidth: 400, aspectRatio: '9/16', background: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <button
              onClick={() => setPreviewVideoUrl(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
