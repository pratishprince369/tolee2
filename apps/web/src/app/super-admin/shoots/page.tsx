'use client';

import { useEffect, useState } from 'react';
import { getAdminShootsList, toggleUserPromotionalRestriction } from '@/actions/shoot';

export default function SuperAdminShootsPage() {
  const [shoots, setShoots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'reported' | 'moderated'>('all');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    restrict: boolean;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    restrict: false
  });

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    const res = await getAdminShootsList();
    if (res.success && res.shoots) {
      setShoots(res.shoots);
    } else {
      setError(res.error || 'Failed to load campaigns list.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRestriction = (userId: string, userName: string, currentRestricted: boolean) => {
    setConfirmModal({
      isOpen: true,
      userId,
      userName,
      restrict: !currentRestricted
    });
  };

  const executeToggleRestriction = async () => {
    const { userId, userName, restrict } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setActionLoading(userId);

    const res = await toggleUserPromotionalRestriction(userId, restrict);
    setActionLoading(null);

    if (res.success) {
      showToast(
        `${userName} has been successfully ${restrict ? 'restricted from' : 'granted access to'} sending bulk promotional broadcasts.`,
        'success'
      );
      // Reload lists
      loadData();
    } else {
      showToast(`Action failed: ${res.error}`, 'error');
    }
  };

  // Filter items
  const filteredShoots = shoots.filter(s => {
    if (filter === 'reported') return s.reports && s.reports.length > 0;
    if (filter === 'moderated') return s.status === 'moderated';
    return true;
  });

  // Calculate statistics
  const totalCampaigns = shoots.length;
  const totalReportsCount = shoots.reduce((sum, s) => sum + (s.reports?.length || 0), 0);
  const totalModerated = shoots.filter(s => s.status === 'moderated').length;
  
  // Unique restricted users in dataset
  const restrictedUsersSet = new Set(shoots.filter(s => s.sender?.promotionalRestricted).map(s => s.senderId));
  const totalRestrictedSenders = restrictedUsersSet.size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .filter-btn {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          color: #a1a1aa;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          border-color: #22c55e;
          color: #fff;
        }
        .filter-btn.active {
          background: #22c55e;
          border-color: #22c55e;
          color: #000;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
        }
        .sa-card {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 16px;
          padding: 24px;
        }
        .moderation-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .moderation-table th {
          background: #18181b;
          color: #71717a;
          font-weight: 700;
          padding: 12px 16px;
          border-bottom: 1px solid #27272a;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .moderation-table td {
          padding: 16px;
          border-bottom: 1px solid #1c1c1e;
          vertical-align: top;
        }
        .moderation-table tr:hover {
          background: #141416;
        }
        .restrict-btn {
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .restrict-btn:active {
          transform: scale(0.97);
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>🚀 Tolee Shoot Broadcast Moderation</h1>
        <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
          Audit community promotions, track delivery campaigns, check receiver spam reports, and restrict abusive senders.
        </p>
      </div>

      {/* Stats Counter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Campaigns</div>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 900 }}>{totalCampaigns}</div>
          <div style={{ color: '#52525b', fontSize: 11 }}>Aggregated bulk campaigns sent</div>
        </div>

        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '3px solid #ef4444' }}>
          <div style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Abuse / Spam Reports</div>
          <div style={{ color: '#ef4444', fontSize: 28, fontWeight: 900 }}>{totalReportsCount}</div>
          <div style={{ color: '#7f1d1d', fontSize: 11 }}>User-reported spam flags logged</div>
        </div>

        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Automated Moderated</div>
          <div style={{ color: '#f59e0b', fontSize: 28, fontWeight: 900 }}>{totalModerated}</div>
          <div style={{ color: '#78350f', fontSize: 11 }}>Flagged by anti-spam keyword check</div>
        </div>

        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Restricted Senders</div>
          <div style={{ color: '#3b82f6', fontSize: 28, fontWeight: 900 }}>{totalRestrictedSenders}</div>
          <div style={{ color: '#1e3a8a', fontSize: 11 }}>Senders currently restricted from broadcasts</div>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          📁 All Campaigns ({shoots.length})
        </button>
        <button
          onClick={() => setFilter('reported')}
          className={`filter-btn ${filter === 'reported' ? 'active' : ''}`}
          style={filter === 'reported' ? {} : { borderLeftColor: '#ef4444' }}
        >
          🚩 Reported Spam ({shoots.filter(s => s.reports && s.reports.length > 0).length})
        </button>
        <button
          onClick={() => setFilter('moderated')}
          className={`filter-btn ${filter === 'moderated' ? 'active' : ''}`}
          style={filter === 'moderated' ? {} : { borderLeftColor: '#f59e0b' }}
        >
          🤖 Auto Moderated ({shoots.filter(s => s.status === 'moderated').length})
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ color: '#fca5a5', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Campaigns list Table */}
      <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#71717a', fontSize: 14 }}>Fetching shoot campaigns list...</p>
          </div>
        ) : filteredShoots.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#52525b' }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🚀</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#a1a1aa' }}>No campaigns match this filter</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="moderation-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Sender</th>
                  <th>Broadcast Content</th>
                  <th style={{ width: 140 }}>Target / Type</th>
                  <th style={{ width: 120 }}>Stats</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 220 }}>Reports Log</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShoots.map((shoot) => {
                  const sender = shoot.sender || {};
                  const reports = shoot.reports || [];
                  const isRestricted = sender.promotionalRestricted || false;

                  let targetSummary = '';
                  if (shoot.targetingType === 'GROUP') {
                    const g = JSON.parse(shoot.targetGroups || '[]');
                    targetSummary = `Groups: ${g.length}`;
                  } else if (shoot.targetingType === 'LOCATION') {
                    const l = JSON.parse(shoot.targetLocations || '[]');
                    targetSummary = `Geo: ${l.join(', ')}`;
                  } else if (shoot.targetingType === 'PINCODE') {
                    const p = JSON.parse(shoot.targetPincodes || '[]');
                    targetSummary = `Pins: ${p.join(', ')}`;
                  }

                  const ctr = shoot.deliveredCount > 0 ? ((shoot.clickCount / shoot.deliveredCount) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={shoot.id}>
                      {/* Sender details */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', bg: '#27272a', flexShrink: 0 }}>
                            {sender.avatar ? (
                              <img src={sender.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: '#1c1c1e', color: '#71717a' }}>👤</div>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 650, color: '#fff', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender.name || 'Unknown User'}</div>
                            <div style={{ fontSize: 10, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender.email || 'No email'}</div>
                          </div>
                        </div>
                        {isRestricted && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b' }}>
                              ⚠️ RESTRICTED
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Content payload */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0, background: '#141416', padding: 8, borderRadius: 8, border: '1px solid #1c1c1e' }}>
                            {shoot.content}
                          </p>
                          {shoot.mediaUrl && (
                            <a href={shoot.mediaUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              🖼️ View Attached Image
                            </a>
                          )}
                          {shoot.contentType !== 'TEXT' && (
                            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                              🔗 Attached {shoot.contentType} (ID: {shoot.contentId})
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#52525b' }}>Sent: {new Date(shoot.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Targeting info */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' }}>
                            🎯 {shoot.targetingType}
                          </span>
                          <span style={{ fontSize: 11, color: '#71717a', wordBreak: 'break-all' }}>
                            {targetSummary}
                          </span>
                        </div>
                      </td>

                      {/* Stats */}
                      <td>
                        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div>📬 <strong style={{ color: '#fff' }}>{shoot.deliveredCount}</strong> del</div>
                          <div>👁️ <strong style={{ color: '#fff' }}>{shoot.seenCount}</strong> seen</div>
                          <div>🖱️ <strong style={{ color: '#fff' }}>{shoot.clickCount}</strong> click</div>
                          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>CTR: {ctr}%</div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 20,
                          background: shoot.status === 'sent' ? '#052e16' : shoot.status === 'moderated' ? '#451a03' : '#1c1c1e',
                          color: shoot.status === 'sent' ? '#86efac' : shoot.status === 'moderated' ? '#fcd34d' : '#a1a1aa'
                        }}>
                          {shoot.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Spam reports list */}
                      <td>
                        {reports.length === 0 ? (
                          <span style={{ fontSize: 11, color: '#52525b' }}>No reports logged</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxH: 140, overflowY: 'auto' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>🚩 Flagged {reports.length} time(s):</div>
                            {reports.map((rep: any, idx: number) => (
                              <div key={idx} style={{ fontSize: 11, background: '#1c1c1e', border: '1px solid #27272a', padding: '6px 10px', borderRadius: 8, color: '#a1a1aa' }}>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: 10 }}>Reason: {rep.reason}</div>
                                <div style={{ fontSize: 9, color: '#71717a', marginTop: 2 }}>Reported at: {new Date(rep.createdAt).toLocaleDateString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <button
                          onClick={() => handleToggleRestriction(sender.id, sender.name, isRestricted)}
                          disabled={actionLoading === sender.id}
                          className="restrict-btn"
                          style={{
                            background: isRestricted ? '#052e16' : '#450a0a',
                            borderColor: isRestricted ? '#15803d' : '#991b1b',
                            color: isRestricted ? '#86efac' : '#fca5a5',
                            width: '100%',
                            display: 'block',
                            textAlign: 'center'
                          }}
                        >
                          {actionLoading === sender.id ? 'Updating...' : isRestricted ? '✓ Grant Access' : '🚫 Restrict User'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#0d0d0f',
            border: '1px solid #27272a',
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>
                {confirmModal.restrict ? '🚫' : '✓'}
              </span>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {confirmModal.restrict ? 'Restrict Bulk Broadcasts' : 'Unrestrict User'}
              </h3>
            </div>
            
            <p style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {confirmModal.restrict ? (
                <span>
                  Are you sure you want to restrict <strong>{confirmModal.userName}</strong> from sending bulk messages? They will no longer be allowed to use Tolee Shoot.
                </span>
              ) : (
                <span>
                  Are you sure you want to restore bulk promotional access to <strong>{confirmModal.userName}</strong>?
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  flex: 1,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  color: '#fff',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeToggleRestriction}
                style={{
                  flex: 1,
                  background: confirmModal.restrict 
                    ? 'linear-gradient(135deg, #dc2626, #ef4444)' 
                    : 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {confirmModal.restrict ? 'Yes, Restrict' : 'Yes, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: toast.type === 'success' 
            ? 'linear-gradient(135deg, #064e3b, #065f46)' 
            : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
          border: toast.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
          borderRadius: 12,
          padding: '16px 24px',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 1001,
          animation: 'fadeUp 0.2s ease'
        }}>
          <span style={{ fontSize: 20 }}>
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {toast.type === 'success' ? 'Moderated' : 'Error'}
            </div>
            <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 2 }}>
              {toast.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
