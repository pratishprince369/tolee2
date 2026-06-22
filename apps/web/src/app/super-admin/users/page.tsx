'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalReal, setTotalReal] = useState(0);
  const [totalFake, setTotalFake] = useState(0);
  const [dataType, setDataType] = useState<'real' | 'fake'>('real');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Selected user for moderation modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Moderation state variables
  const [isSuspended, setIsSuspended] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [postingRestricted, setPostingRestricted] = useState(false);
  const [messagingRestricted, setMessagingRestricted] = useState(false);
  const [groupCreationRestricted, setGroupCreationRestricted] = useState(false);
  const [commentRestricted, setCommentRestricted] = useState(false);
  const [reelsRestricted, setReelsRestricted] = useState(false);
  const [marketplaceRestricted, setMarketplaceRestricted] = useState(false);
  const [expiryType, setExpiryType] = useState<'indefinite' | '1d' | '3d' | '7d' | '30d' | 'custom'>('indefinite');
  const [customExpiry, setCustomExpiry] = useState('');
  
  const [searchInput, setSearchInput] = useState('');

  const fetchUsers = async (search = q, f = filter, p = page, type = dataType) => {
    setLoading(true);
    setSelectedUserIds([]); // Clear selection when users list updates
    try {
      const res = await fetch(`/api/super-admin/users?q=${encodeURIComponent(search)}&filter=${f}&page=${p}&dataType=${type}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalReal(data.totalReal || 0);
      setTotalFake(data.totalFake || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(q, filter, page, dataType); }, [page, filter, dataType]);

  useEffect(() => {
    if (selectedUser) {
      setIsSuspended(!!selectedUser.isSuspended);
      setIsBanned(!!selectedUser.isBanned);
      setSuspensionReason(selectedUser.suspensionReason || '');
      setPostingRestricted(!!selectedUser.postingRestricted);
      setMessagingRestricted(!!selectedUser.messagingRestricted);
      setGroupCreationRestricted(!!selectedUser.groupCreationRestricted);
      setCommentRestricted(!!selectedUser.commentRestricted);
      setReelsRestricted(!!selectedUser.reelsRestricted);
      setMarketplaceRestricted(!!selectedUser.marketplaceRestricted);
      
      if (selectedUser.restrictionExpiresAt) {
         const expDate = new Date(selectedUser.restrictionExpiresAt);
         if (expDate > new Date()) {
           setExpiryType('custom');
           setCustomExpiry(expDate.toISOString().slice(0, 16));
         } else {
           setExpiryType('indefinite');
           setCustomExpiry('');
         }
      } else {
        setExpiryType('indefinite');
        setCustomExpiry('');
      }
    }
  }, [selectedUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput);
    fetchUsers(searchInput, filter, 1, dataType);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const currentPageIds = users.map(u => u.id);
    const allSelected = currentPageIds.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedUserIds(prev => {
        const newSelected = [...prev];
        currentPageIds.forEach(id => {
          if (!newSelected.includes(id)) newSelected.push(id);
        });
        return newSelected;
      });
    }
  };

  const handleBulkAction = async (action: 'bulk_ban' | 'bulk_delete') => {
    if (selectedUserIds.length === 0) return;
    const confirmMsg = action === 'bulk_delete'
      ? `⚠️ CRITICAL: Are you sure you want to PERMANENTLY DELETE all ${selectedUserIds.length} selected users? This action is irreversible.`
      : `Are you sure you want to BAN all ${selectedUserIds.length} selected users?`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds: selectedUserIds }),
      });
      if (res.ok) {
        setSelectedUserIds([]);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Bulk action failed');
      }
    } catch (err) {
      console.error('[Bulk Action Error]', err);
      alert('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const executeSimpleAction = async (userId: string, action: string) => {
    setActionLoading(userId + action);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchUsers();
        // If we verified/unverified in the modal, refresh the selectedUser
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser((prev: any) => ({
            ...prev,
            isVerified: action === 'verify' ? true : action === 'unverify' ? false : prev.isVerified
          }));
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveModeration = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id + 'moderation');
    
    let restrictionExpiresAt: string | null = null;
    if (expiryType !== 'indefinite') {
      const now = new Date();
      if (expiryType === '1d') {
        now.setDate(now.getDate() + 1);
        restrictionExpiresAt = now.toISOString();
      } else if (expiryType === '3d') {
        now.setDate(now.getDate() + 3);
        restrictionExpiresAt = now.toISOString();
      } else if (expiryType === '7d') {
        now.setDate(now.getDate() + 7);
        restrictionExpiresAt = now.toISOString();
      } else if (expiryType === '30d') {
        now.setDate(now.getDate() + 30);
        restrictionExpiresAt = now.toISOString();
      } else if (expiryType === 'custom' && customExpiry) {
        restrictionExpiresAt = new Date(customExpiry).toISOString();
      }
    }

    try {
      const res = await fetch(`/api/super-admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_moderation',
          isSuspended,
          isBanned,
          suspensionReason,
          postingRestricted,
          messagingRestricted,
          groupCreationRestricted,
          commentRestricted,
          reelsRestricted,
          marketplaceRestricted,
          restrictionExpiresAt
        }),
      });
      
      if (res.ok) {
        fetchUsers();
        setSelectedUser(null);
      } else {
        alert('Failed to save moderation settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save moderation settings.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnrestrictAll = () => {
    setPostingRestricted(false);
    setMessagingRestricted(false);
    setGroupCreationRestricted(false);
    setCommentRestricted(false);
    setReelsRestricted(false);
    setMarketplaceRestricted(false);
    setExpiryType('indefinite');
    setCustomExpiry('');
  };

  const filters = ['all', 'suspended', 'verified', 'restricted'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .action-btn { padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:6px; }
        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto; }
        .restrict-card { background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px;margin-bottom:16px; }
        .checkbox-container { display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background 0.15s; }
        .checkbox-container:hover { background:#27272a; }
        .checkbox-container input { cursor:pointer;width:16px;height:16px;accent-color:#22c55e; }
        .checkbox-label { color:#fff;font-size:13px;font-weight:500;user-select:none; }
      `}</style>

      <div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>User Management</h1>
        <p style={{ color: '#71717a', fontSize: 14 }}>{total.toLocaleString()} users shown</p>
      </div>

      {/* Real vs Fake Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1c1c1e', gap: 24, marginBottom: 10 }}>
        <button
          onClick={() => { setDataType('real'); setPage(1); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: dataType === 'real' ? '2px solid #22c55e' : '2px solid transparent',
            color: dataType === 'real' ? '#fff' : '#71717a',
            padding: '12px 6px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          👤 Real Users ({totalReal.toLocaleString()})
        </button>
        <button
          onClick={() => { setDataType('fake'); setPage(1); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: dataType === 'fake' ? '2px solid #22c55e' : '2px solid transparent',
            color: dataType === 'fake' ? '#fff' : '#71717a',
            padding: '12px 6px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          🤖 Simulated Users ({totalFake.toLocaleString()})
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name, email, username..."
            style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" style={{ background: '#22c55e', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>Search</button>
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); fetchUsers(q, f, 1, dataType); }}
              style={{ background: filter === f ? '#22c55e' : '#18181b', border: '1px solid', borderColor: filter === f ? '#22c55e' : '#27272a', borderRadius: 8, color: filter === f ? '#000' : '#a1a1aa', padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedUserIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px 16px',
          borderRadius: '12px',
          animation: 'fadeIn 0.2s ease',
          marginTop: -8,
          marginBottom: -8
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            Selected {selectedUserIds.length} users
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleBulkAction('bulk_ban')} style={{ background: '#7f1d1d', border: '1px solid #991b1b', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🚫 Bulk Ban Selected
            </button>
            <button onClick={() => handleBulkAction('bulk_delete')} style={{ background: '#b91c1c', border: '1px solid #dc2626', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🗑️ Bulk Delete Selected
            </button>
            <button onClick={() => setSelectedUserIds([])} style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#71717a', fontSize: 13 }}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#52525b', fontSize: 14 }}>No users found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c1c1e' }}>
                  <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={users.length > 0 && users.map(u => u.id).every(id => selectedUserIds.includes(id))}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#22c55e' }}
                    />
                  </th>
                  {['User', 'Status', 'Posts', 'Joined', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ color: '#71717a', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #18181b', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#18181b')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#22c55e' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, background: '#27272a', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                          {u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>👤</div>}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                          <div style={{ color: '#52525b', fontSize: 11 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '180px' }}>
                        {u.isSimulation ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', background: '#2e1065', border: '1px solid #581c87', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            🤖 Simulated
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: '#064e3b', border: '1px solid #065f46', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            👤 Real
                          </span>
                        )}
                        {u.isBanned && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#450a0a', border: '1px solid #7f1d1d', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            🛑 Banned
                          </span>
                        )}
                        {u.isSuspended && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171', background: '#450a0a', border: '1px solid #7f1d1d', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            🚫 Suspended
                          </span>
                        )}
                        {u.isVerified && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', background: '#1e3a8a', border: '1px solid #1d4ed8', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            ✓ Verified
                          </span>
                        )}
                        {(u.postingRestricted || u.messagingRestricted || u.groupCreationRestricted || u.commentRestricted || u.reelsRestricted || u.marketplaceRestricted) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: '#78350f', border: '1px solid #92400e', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }} title="Some actions are restricted">
                            ⛔ Restricted
                          </span>
                        )}
                        {!u.isSuspended && !u.isBanned && !(u.postingRestricted || u.messagingRestricted || u.groupCreationRestricted || u.commentRestricted || u.reelsRestricted || u.marketplaceRestricted) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: '#064e3b', border: '1px solid #065f46', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            ● Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a1a1aa', fontSize: 13 }}>{u._count?.posts || 0}</td>
                    <td style={{ padding: '12px 16px', color: '#71717a', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', color: '#71717a', fontSize: 12, whiteSpace: 'nowrap' }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => setSelectedUser(u)}
                        style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#a1a1aa', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid #18181b' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: page === 1 ? '#3f3f46' : '#a1a1aa', padding: '6px 12px', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}>
              ← Prev
            </button>
            <span style={{ color: '#71717a', fontSize: 13, display: 'flex', alignItems: 'center' }}>Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: page === pages ? '#3f3f46' : '#a1a1aa', padding: '6px 12px', cursor: page === pages ? 'default' : 'pointer', fontSize: 13 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Advanced Action Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedUser(null)}>
          <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, animation: 'fadeIn 0.2s ease', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid #1c1c1e', paddingBottom: 16 }}>
              <div style={{ width: 44, height: 44, background: '#18181b', borderRadius: '50%', overflow: 'hidden' }}>
                {selectedUser.avatar ? <img src={selectedUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 18 }}>👤</div>}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{selectedUser.name}</div>
                <div style={{ color: '#71717a', fontSize: 12 }}>{selectedUser.email} • @{selectedUser.username || 'user'}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {/* Moderation Status (Banned / Suspended / Active) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Account Status Controls</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                
                {/* Suspension Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isSuspended && !confirm('Are you sure you want to SUSPEND this user? They will be locked out of logging in.')) return;
                    setIsSuspended(!isSuspended);
                  }}
                  style={{
                    background: isSuspended ? '#7f1d1d' : '#18181b',
                    border: '1px solid',
                    borderColor: isSuspended ? '#ef4444' : '#27272a',
                    borderRadius: 10,
                    color: isSuspended ? '#fff' : '#a1a1aa',
                    padding: '10px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  🚫 {isSuspended ? 'Suspended' : 'Suspend Login'}
                </button>

                {/* Permanent Ban Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isBanned && !confirm('Are you sure you want to PERMANENTLY BAN this user? They will be completely blocked from the platform.')) return;
                    setIsBanned(!isBanned);
                  }}
                  style={{
                    background: isBanned ? '#7f1d1d' : '#18181b',
                    border: '1px solid',
                    borderColor: isBanned ? '#ef4444' : '#27272a',
                    borderRadius: 10,
                    color: isBanned ? '#fff' : '#a1a1aa',
                    padding: '10px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  🛑 {isBanned ? 'Banned Permanently' : 'Permanent Ban'}
                </button>
              </div>
            </div>

            {/* Granular Action-Based Restrictions */}
            <div className="restrict-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Granular Action Restrictions</label>
                <button onClick={handleUnrestrictAll} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Clear All</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <label className="checkbox-container">
                  <input type="checkbox" checked={postingRestricted} onChange={e => setPostingRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Posting</span>
                </label>

                <label className="checkbox-container">
                  <input type="checkbox" checked={reelsRestricted} onChange={e => setReelsRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Reels</span>
                </label>

                <label className="checkbox-container">
                  <input type="checkbox" checked={commentRestricted} onChange={e => setCommentRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Comments</span>
                </label>

                <label className="checkbox-container">
                  <input type="checkbox" checked={messagingRestricted} onChange={e => setMessagingRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Messaging</span>
                </label>

                <label className="checkbox-container">
                  <input type="checkbox" checked={groupCreationRestricted} onChange={e => setGroupCreationRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Groups</span>
                </label>

                <label className="checkbox-container">
                  <input type="checkbox" checked={marketplaceRestricted} onChange={e => setMarketplaceRestricted(e.target.checked)} />
                  <span className="checkbox-label">Restrict Marketplace</span>
                </label>
              </div>
            </div>

            {/* Restriction Duration & Expiry */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Restriction Expiry Duration</label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {['indefinite', '1d', '3d', '7d', '30d', 'custom'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setExpiryType(type as any)}
                    style={{
                      background: expiryType === type ? '#22c55e' : '#18181b',
                      border: '1px solid',
                      borderColor: expiryType === type ? '#22c55e' : '#27272a',
                      borderRadius: 8,
                      color: expiryType === type ? '#000' : '#a1a1aa',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {type === 'indefinite' ? 'Indefinite' : type === '1d' ? '1 Day' : type === '3d' ? '3 Days' : type === '7d' ? '7 Days' : type === '30d' ? '30 Days' : 'Custom Picker'}
                  </button>
                ))}
              </div>

              {expiryType === 'custom' && (
                <div style={{ animation: 'fadeIn 0.15s ease' }}>
                  <input
                    type="datetime-local"
                    value={customExpiry}
                    onChange={e => setCustomExpiry(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 10,
                      color: '#fff',
                      padding: '10px 14px',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Moderation Reason input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Moderation Reason</label>
              <input
                value={suspensionReason}
                onChange={e => setSuspensionReason(e.target.value)}
                placeholder="Reason for suspension or restrictions..."
                style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 13, outline: 'none' }}
              />
            </div>

            {/* Verification & Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #1c1c1e', paddingTop: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Verification Quick Control */}
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => executeSimpleAction(selectedUser.id, selectedUser.isVerified ? 'unverify' : 'verify')}
                  style={{
                    background: selectedUser.isVerified ? '#18181b' : '#1e3a8a',
                    borderColor: selectedUser.isVerified ? '#27272a' : '#1d4ed8',
                    color: selectedUser.isVerified ? '#a1a1aa' : '#93c5fd'
                  }}
                >
                  {selectedUser.isVerified ? '✗ Unverify Profile' : '✓ Verify Profile'}
                </button>

                {/* Save Moderation Settings */}
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleSaveModeration}
                  disabled={actionLoading !== null}
                  style={{
                    background: '#22c55e',
                    color: '#000',
                    fontWeight: 800
                  }}
                >
                  💾 Save Controls
                </button>
              </div>

              {/* Danger Zone: Delete Account */}
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  if (confirm(`⚠️ CRITICAL WARNING: Are you absolutely sure you want to DELETE the user "${selectedUser.name}" permanently? This deletes their account and all their data forever. This CANNOT be undone.`)) {
                    executeSimpleAction(selectedUser.id, 'delete');
                    setSelectedUser(null);
                  }
                }}
                style={{
                  background: '#7f1d1d',
                  borderColor: '#991b1b',
                  color: '#fff',
                  width: '100%',
                  marginTop: 6
                }}
              >
                🗑️ Delete Account Permanently
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
