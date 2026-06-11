'use client';

import { useEffect, useState } from 'react';

export default function GroupsPage() {
  const [tolees, setTolees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGroups = async (search = q, p = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/groups?q=${encodeURIComponent(search)}&page=${p}`);
      const data = await res.json();
      setTolees(data.tolees || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); setQ(searchInput);
    fetchGroups(searchInput, 1);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete community "${name}"? This will remove all its posts and members.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/super-admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to delete community');
      }
    } catch (err) {
      console.error(err);
      alert('Network error: Failed to delete community');
    } finally {
      setDeletingId(null);
      fetchGroups();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Group Management</h1>
        <p style={{ color: '#71717a', fontSize: 14 }}>{total.toLocaleString()} communities on the platform</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search communities..."
          style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 13, outline: 'none' }} />
        <button type="submit" style={{ background: '#22c55e', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>Search</button>
      </form>

      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : tolees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>No communities found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c1c1e' }}>
                  {['Community', 'Owner', 'Members', 'Posts', 'Created', 'Action'].map(h => (
                    <th key={h} style={{ color: '#71717a', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tolees.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #18181b' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#18181b')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, background: '#27272a', borderRadius: 10, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {t.avatar ? <img src={t.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏘️'}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                          <div style={{ color: '#52525b', fontSize: 11 }}>{t.id.slice(0, 12)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#a1a1aa', fontSize: 13 }}>{t.owner?.name || '—'}</div>
                      <div style={{ color: '#52525b', fontSize: 11 }}>{t.owner?.email || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#22c55e', fontSize: 13, fontWeight: 700 }}>{t._count?.members || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa', fontSize: 13 }}>{t._count?.posts || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#71717a', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button 
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={deletingId !== null}
                        style={{ 
                          background: deletingId === t.id ? '#1c1917' : '#450a0a', 
                          border: deletingId === t.id ? '1px solid #44403c' : '1px solid #7f1d1d', 
                          borderRadius: 8, 
                          color: deletingId === t.id ? '#a8a29e' : '#fca5a5', 
                          padding: '5px 10px', 
                          cursor: deletingId !== null ? 'not-allowed' : 'pointer', 
                          fontSize: 11, 
                          fontWeight: 700,
                          opacity: deletingId !== null && deletingId !== t.id ? 0.5 : 1,
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {deletingId === t.id ? '⏳ Deleting...' : '🗑️ Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid #18181b' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#a1a1aa', padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
            <span style={{ color: '#71717a', fontSize: 13, display: 'flex', alignItems: 'center' }}>Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#a1a1aa', padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
