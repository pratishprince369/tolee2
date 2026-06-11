'use client';

import { useEffect, useState } from 'react';

export default function ContentPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all'); // all, reels, listings, flagged, reported, hidden
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemType: string;
    action: string;
  }>({
    isOpen: false,
    itemId: '',
    itemType: '',
    action: ''
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

  const fetchContent = async (f = filter, p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/super-admin/content?filter=${f}&page=${p}`);
      if (!res.ok) {
        throw new Error('Failed to load content');
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err: any) {
      setError(err?.message || 'Error loading content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(filter, page);
  }, [page, filter]);

  const doAction = (id: string, type: string, action: string) => {
    setConfirmModal({
      isOpen: true,
      itemId: id,
      itemType: type,
      action
    });
  };

  const handleConfirmAction = async () => {
    const { itemId: id, itemType: type, action } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setActionLoading(id + action);

    // Optimistic Update for instant UI feedback
    const previousItems = [...items];
    const previousTotal = total;
    if (action === 'delete') {
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    }

    try {
      const res = await fetch('/api/super-admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, action }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Action failed');
      }

      const successMsg = action === 'delete'
        ? `${type === 'listing' ? 'Marketplace listing' : type === 'world_project' ? 'World project' : type.charAt(0).toUpperCase() + type.slice(1)} deleted permanently.`
        : `${type === 'world_project' ? 'World project' : type.charAt(0).toUpperCase() + type.slice(1)} status updated successfully.`;

      showToast(successMsg, 'success');
      fetchContent(filter, page);
    } catch (err: any) {
      // Revert optimistic state on error
      if (action === 'delete') {
        setItems(previousItems);
        setTotal(previousTotal);
      }
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getMediaArray = (mediaUrls: any): string[] => {
    if (!mediaUrls) return [];
    if (Array.isArray(mediaUrls)) return mediaUrls;
    if (typeof mediaUrls === 'string') {
      return mediaUrls.split(',').map((url: string) => url.trim()).filter(Boolean);
    }
    return [];
  };

  const filters = [
    { key: 'all', label: '📝 Posts', desc: 'User text and image feed posts' },
    { key: 'reels', label: '🎥 Reels', desc: 'Video short content' },
    { key: 'listings', label: '🛍️ Listings', desc: 'Marketplace buy/sell ads' },
    { key: 'world_projects', label: '🌍 World Projects', desc: 'Websites, Blogs, Restaurants & Stores created in Tolee World' },
    { key: 'flagged', label: '🚩 AI Flagged', desc: 'Content flagged by AI moderation' },
    { key: 'reported', label: '⚠️ Reported', desc: 'User reports or pending moderation' },
    { key: 'hidden', label: '🙈 Hidden', desc: 'Suspended or rejected content' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, sans-serif' }}>
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
        .content-card {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          transition: all 0.2s;
        }
        .content-card:hover {
          border-color: #27272a;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .moderation-btn {
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 8px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
        }
        .moderation-btn:active {
          transform: scale(0.97);
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Content Moderation</h1>
        <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
          {loading ? 'Fetching content...' : `${total.toLocaleString()} item(s) found • Audit, verify, hide or delete platform content`}
        </p>
      </div>

      {/* Navigation Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            title={f.desc}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div style={{ color: '#fca5a5', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Content list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#71717a', fontSize: 14 }}>Fetching items...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#52525b', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>📂</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#a1a1aa' }}>No {filter === 'all' ? 'posts' : filter} found</span>
            <p style={{ color: '#52525b', fontSize: 13, marginTop: 4 }}>This list is currently empty or does not contain any content.</p>
          </div>
        ) : (
          items.map((item: any) => {
            const mediaList = getMediaArray(item.mediaUrls);
            return (
              <div key={item.id} className="content-card">
                {/* User & Content Description */}
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: '#27272a', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      {item.author?.avatar ? (
                        <img src={item.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#71717a' }}>👤</div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{item.author?.name || 'Unknown User'}</div>
                      <div style={{ color: '#71717a', fontSize: 11 }}>{item.author?.email || 'No email'} · {new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    
                    {/* Badge types & status */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#1c1c1e', color: '#a1a1aa', border: '1px solid #27272a', textTransform: 'uppercase' }}>
                        {item.type === 'world_project' ? `WORLD ${item.projectType}` : item.type}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 20,
                        background: item.status === 'published' ? '#052e16' : item.status === 'rejected' ? '#450a0a' : '#451a03',
                        color: item.status === 'published' ? '#86efac' : item.status === 'rejected' ? '#fca5a5' : '#fcd34d'
                      }}>
                        {item.status || 'active'}
                      </span>
                    </div>
                  </div>

                  {/* For World Projects, render a clickable live link */}
                  {item.type === 'world_project' && (
                    <div style={{ padding: '8px 12px', background: '#18181b', borderRadius: 10, border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: '#71717a', fontSize: 11, fontWeight: 500 }}>Live Project URL:</span>
                      <a 
                        href={`/${item.projectType === 'BLOG' ? 'blog' : item.projectType === 'RESTAURANT' ? 'restaurant' : item.projectType === 'STORE' ? 'store' : 'micro-website'}/${item.projectSlug}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#22c55e', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        className="hover:underline"
                      >
                        🌐 {item.projectName} (/{item.projectType?.toLowerCase()}/{item.projectSlug})
                      </a>
                    </div>
                  )}

                  {/* Caption/Description */}
                  {item.caption && (
                    <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#141416', padding: '12px 16px', borderRadius: 10, border: '1px solid #1c1c1e' }}>
                      {item.caption}
                    </p>
                  )}

                  {/* Media Grid */}
                  {mediaList.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {mediaList.map((url: string, i: number) => (
                        <div key={i} style={{ width: 100, height: 100, background: '#18181b', borderRadius: 12, overflow: 'hidden', border: '1px solid #27272a', position: 'relative' }}>
                          {url.endsWith('.mp4') || url.includes('/video/') ? (
                            <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎥</div>
                          ) : (
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.src = 'https://placehold.co/100x100?text=Image'; }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats Footer */}
                  <div style={{ display: 'flex', gap: 16, color: '#52525b', fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                    <span>❤️ {item._count?.likes || 0} Likes</span>
                    <span>💬 {item._count?.comments || 0} Comments</span>
                    <span>👁️ {item._count?.views || 0} Views</span>
                  </div>
                </div>

                {/* Moderation Controls Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-start', minWidth: 160, width: '100%', maxWidth: 180 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#52525b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Moderation Options</div>
                  
                  {item.status !== 'rejected' ? (
                    <button
                      onClick={() => doAction(item.id, item.type, 'hide')}
                      disabled={actionLoading === item.id + 'hide'}
                      className="moderation-btn"
                      style={{ background: '#451a03', borderColor: '#b45309', color: '#fcd34d' }}
                    >
                      🙈 Hide Content
                    </button>
                  ) : (
                    <button
                      onClick={() => doAction(item.id, item.type, 'restore')}
                      disabled={actionLoading === item.id + 'restore'}
                      className="moderation-btn"
                      style={{ background: '#052e16', borderColor: '#15803d', color: '#86efac' }}
                    >
                      ✓ Restore Content
                    </button>
                  )}

                  {item.status === 'pending' && (
                    <button
                      onClick={() => doAction(item.id, item.type, 'approve')}
                      disabled={actionLoading === item.id + 'approve'}
                      className="moderation-btn"
                      style={{ background: '#1e3a8a', borderColor: '#1d4ed8', color: '#93c5fd' }}
                    >
                      ✓ Approve Content
                    </button>
                  )}

                  <button
                    onClick={() => doAction(item.id, item.type, 'delete')}
                    disabled={actionLoading === item.id + 'delete'}
                    className="moderation-btn"
                    style={{ background: '#450a0a', borderColor: '#991b1b', color: '#fca5a5', marginTop: 'auto' }}
                  >
                    🗑️ Delete Permanently
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {pages > 1 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#a1a1aa', padding: '8px 16px', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
          >
            ← Previous
          </button>
          <span style={{ color: '#71717a', fontSize: 13, fontWeight: 500 }}>
            Page <strong style={{ color: '#fff' }}>{page}</strong> of {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#a1a1aa', padding: '8px 16px', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeUp 0.15s ease'
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
                {confirmModal.action === 'delete' ? '⚠️' : 'ℹ️'}
              </span>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {confirmModal.action === 'delete' ? 'Confirm Permanent Deletion' : 'Confirm Action'}
              </h3>
            </div>
            
            <p style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {confirmModal.action === 'delete' ? (
                <span>
                  Are you absolutely sure you want to permanently delete this <strong>{confirmModal.itemType}</strong>? This action is irreversible and will erase it from the platform immediately.
                </span>
              ) : (
                <span>
                  Are you sure you want to perform the '{confirmModal.action}' action on this <strong>{confirmModal.itemType}</strong>?
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
                onClick={handleConfirmAction}
                style={{
                  flex: 1,
                  background: confirmModal.action === 'delete' 
                    ? 'linear-gradient(135deg, #dc2626, #ef4444)' 
                    : 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: confirmModal.action === 'delete'
                    ? '0 4px 16px rgba(239, 68, 68, 0.2)'
                    : '0 4px 16px rgba(34, 197, 94, 0.2)'
                }}
              >
                {confirmModal.action === 'delete' ? 'Yes, Delete' : 'Confirm'}
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
          animation: 'fadeUp 0.2s ease',
          fontFamily: 'Inter, sans-serif'
        }}>
          <span style={{ fontSize: 20 }}>
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {toast.type === 'success' ? 'Success' : 'Error'}
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
