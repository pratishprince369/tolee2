'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface RadarPostItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationName: string;
  radiusKm: number;
  isAnonymous: boolean;
  status: string;
  confirmationsCount: number;
  resolvedVotesCount: number;
  reportsCount: number;
  isVerified: boolean;
  verifiedAt: string | null;
  resolvedAt: string | null;
  extendedAt: string | null;
  extensionCount: number;
  expiresAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    radarStrikes: number;
    radarRestrictedUntil: string | null;
  };
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
  }>;
  moderationLogs: Array<{
    id: string;
    action: string;
    reason: string;
    createdAt: string;
  }>;
}

interface Metrics {
  activeCount: number;
  reportedCount: number;
  underReviewCount: number;
  expiredTodayCount: number;
  resolvedCount: number;
  removedCount: number;
}

export default function SuperAdminRadarPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('reported');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [metrics, setMetrics] = useState<Metrics>({
    activeCount: 0,
    reportedCount: 0,
    underReviewCount: 0,
    expiredTodayCount: 0,
    resolvedCount: 0,
    removedCount: 0
  });
  const [posts, setPosts] = useState<RadarPostItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<RadarPostItem | null>(null);
  const [moderationReason, setModerationReason] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const fetchData = useCallback(async (currentFilter = filter, currentPage = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/radar?filter=${currentFilter}&page=${currentPage}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setPosts(data.posts || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      }
    } catch (e) {
      console.error('Error fetching radar moderation data:', e);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchData(filter, page);
  }, [filter, page, fetchData]);

  const handleModerate = async (postId: string, action: string, reason?: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch('/api/super-admin/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action,
          reason: reason || moderationReason || `Super admin applied ${action}`
        })
      });
      if (res.ok) {
        setSelectedPost(null);
        setPendingAction(null);
        setModerationReason('');
        await fetchData(filter, page);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to execute moderation action.');
      }
    } catch (_) {
      alert('Network error while processing moderation action.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return 'No expiry set';
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', color: '#f4f4f5' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📡</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Radar Moderation & Alert Lifecycle
            </h1>
          </div>
          <p style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>
            Manage real-time neighborhood alerts, user reports, community verifications, strict 24h expiries, and user strikes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fetchData(filter, page)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #27272a',
              background: '#18181b',
              color: '#d4d4d8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Feed'}
          </button>
          <Link
            href="/radar"
            target="_blank"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: '#0E9F9A',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Open Live Radar ↗
          </Link>
        </div>
      </div>

      {/* 6-Item Metrics Bar (Rule 26) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Live Alerts
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6 }}>
            {metrics.activeCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Within valid expiry</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Flagged with Reports
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', marginTop: 6 }}>
            {metrics.reportedCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Requires admin review</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Under Review (Auto)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f43f5e', marginTop: 6 }}>
            {metrics.underReviewCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>&ge; 3 user reports</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Resolved
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6 }}>
            {metrics.resolvedCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Confirmed cleared</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Expired Today
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6 }}>
            {metrics.expiredTodayCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>24h timer elapsed</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Removed / Hidden
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444', marginTop: 6 }}>
            {metrics.removedCount}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Deleted by moderation</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1f1f23', paddingBottom: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'reported', label: `Flagged Reports (${metrics.reportedCount})` },
          { id: 'under_review', label: `Under Review (${metrics.underReviewCount})` },
          { id: 'active', label: `Active (${metrics.activeCount})` },
          { id: 'resolved', label: `Resolved (${metrics.resolvedCount})` },
          { id: 'removed', label: `Removed (${metrics.removedCount})` },
          { id: 'all', label: 'All Alerts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: filter === tab.id ? '1px solid #0E9F9A' : '1px solid transparent',
              background: filter === tab.id ? '#0E9F9A22' : 'transparent',
              color: filter === tab.id ? '#0E9F9A' : '#a1a1aa',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts List Table / Stream */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#71717a' }}>
          Loading radar alerts...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#121215', borderRadius: 12, border: '1px dashed #27272a' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>No alerts in this view</div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>
            All alerts under this category have been handled or none are currently active.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map((post) => {
            const isSuspended = post.author.radarRestrictedUntil && new Date(post.author.radarRestrictedUntil).getTime() > Date.now();
            return (
              <div
                key={post.id}
                style={{
                  background: '#121215',
                  border: '1px solid #1f1f23',
                  borderRadius: 12,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                {/* Top Row: Category, Title, Status Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          background: post.category === 'alert' ? '#f43f5e22' : '#3b82f622',
                          color: post.category === 'alert' ? '#f43f5e' : '#38bdf8',
                          border: `1px solid ${post.category === 'alert' ? '#f43f5e44' : '#38bdf844'}`
                        }}
                      >
                        {post.category}
                      </span>

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          background: post.status === 'ACTIVE' ? '#22c55e22' : post.status === 'UNDER_REVIEW' ? '#f43f5e22' : '#71717a22',
                          color: post.status === 'ACTIVE' ? '#22c55e' : post.status === 'UNDER_REVIEW' ? '#f43f5e' : '#a1a1aa'
                        }}
                      >
                        {post.status}
                      </span>

                      {post.isVerified && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#10b98122', color: '#10b981' }}>
                          🛡️ Verified Alert
                        </span>
                      )}

                      <span style={{ fontSize: 11, color: '#71717a' }}>
                        📍 {post.locationName} ({post.latitude.toFixed(4)}°, {post.longitude.toFixed(4)}°)
                      </span>
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                      {post.title}
                    </h3>

                    {post.description && (
                      <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4, lineHeight: 1.5 }}>
                        {post.description}
                      </p>
                    )}
                  </div>

                  {/* Top Right: Expiry & Author */}
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ color: '#d4d4d8', fontWeight: 600 }}>
                      ⏳ {formatExpiry(post.expiresAt)}
                    </div>
                    <div style={{ color: '#71717a', fontSize: 11, marginTop: 2 }}>
                      Created: {new Date(post.createdAt).toLocaleString()}
                    </div>
                    {post.extensionCount > 0 && (
                      <div style={{ color: '#38bdf8', fontSize: 10, marginTop: 2 }}>
                        Extended +{post.extensionCount * 24}h by Admin
                      </div>
                    )}
                  </div>
                </div>

                {/* Author & Verification Stats Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1a1a1e', paddingTop: 10, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#71717a' }}>
                      Author: <strong style={{ color: '#e4e4e7' }}>{post.isAnonymous ? 'Anonymous' : (post.author.username ? `@${post.author.username}` : post.author.name)}</strong>
                    </span>

                    <span style={{
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800,
                      background: post.author.radarStrikes >= 2 ? '#ef444422' : '#27272a',
                      color: post.author.radarStrikes >= 2 ? '#ef4444' : '#a1a1aa'
                    }}>
                      Strikes: {post.author.radarStrikes} {isSuspended ? '(Suspended)' : ''}
                    </span>

                    <span style={{ color: '#71717a' }}>
                      ✓ Still Happening: <strong style={{ color: '#22c55e' }}>{post.confirmationsCount}</strong>
                    </span>

                    <span style={{ color: '#71717a' }}>
                      ✕ Resolved Votes: <strong style={{ color: '#38bdf8' }}>{post.resolvedVotesCount}</strong>
                    </span>

                    <span style={{ color: '#71717a' }}>
                      🚩 Reports: <strong style={{ color: post.reportsCount > 0 ? '#f43f5e' : '#a1a1aa' }}>{post.reportsCount}</strong>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {post.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleModerate(post.id, 'APPROVE')}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        ✓ Make Active
                      </button>
                    )}

                    {!post.isVerified && (
                      <button
                        onClick={() => handleModerate(post.id, 'VERIFY')}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          background: '#0E9F9A',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        🛡️ Verify
                      </button>
                    )}

                    <button
                      onClick={() => handleModerate(post.id, 'EXTEND_24H')}
                      disabled={actionLoading === post.id}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: '#27272a',
                        color: '#38bdf8',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #38bdf844'
                      }}
                    >
                      ⏱️ Extend 24h
                    </button>

                    {post.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleModerate(post.id, 'RESOLVE')}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          background: '#27272a',
                          color: '#e4e4e7',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid #3f3f46'
                        }}
                      >
                        Mark Resolved
                      </button>
                    )}

                    {post.status !== 'REMOVED' && (
                      <button
                        onClick={() => {
                          setSelectedPost(post);
                          setPendingAction('REMOVE');
                        }}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          background: '#ef444422',
                          color: '#ef4444',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid #ef444444'
                        }}
                      >
                        Hide / Remove
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedPost(post);
                        setPendingAction('STRIKE_USER');
                      }}
                      disabled={actionLoading === post.id}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: '#f59e0b22',
                        color: '#f59e0b',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #f59e0b44'
                      }}
                    >
                      ⚠️ Strike Author
                    </button>
                  </div>
                </div>

                {/* Reports Details Drawer if any */}
                {post.reports.length > 0 && (
                  <div style={{ background: '#09090b', borderRadius: 8, padding: '10px 14px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e', marginBottom: 6 }}>
                      Flagged User Reports ({post.reports.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {post.reports.map((r) => (
                        <div key={r.id} style={{ fontSize: 11, color: '#a1a1aa', display: 'flex', gap: 8 }}>
                          <span style={{ color: '#f43f5e', fontWeight: 600 }}>• [{r.reason}]</span>
                          <span>{r.details || 'No additional details provided.'}</span>
                          <span style={{ color: '#52525b', marginLeft: 'auto' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {selectedPost && pendingAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 14,
            width: '100%',
            maxWidth: 480,
            padding: 24,
            color: '#fff'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
              {pendingAction === 'STRIKE_USER' ? '⚠️ Issue Strike to Author' : '🗑️ Remove Radar Alert'}
            </h3>
            <p style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 16 }}>
              {pendingAction === 'STRIKE_USER'
                ? `This will add 1 strike to ${selectedPost.author.name} (currently ${selectedPost.author.radarStrikes} strikes). 2 strikes triggers a 24h suspension, 3 strikes triggers a 7-day suspension.`
                : `Are you sure you want to remove "${selectedPost.title}" from public radar feeds?`}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#71717a', display: 'block', marginBottom: 6 }}>
                Audit Reason (Required for log)
              </label>
              <input
                type="text"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="e.g. Inaccurate emergency report / repeated spam"
                style={{
                  width: '100%',
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setPendingAction(null);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#27272a',
                  color: '#d4d4d8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleModerate(selectedPost.id, pendingAction, moderationReason)}
                disabled={actionLoading === selectedPost.id}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: pendingAction === 'STRIKE_USER' ? '#f59e0b' : '#ef4444',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                {actionLoading === selectedPost.id ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
