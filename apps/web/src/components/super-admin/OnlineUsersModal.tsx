'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export interface OnlineUserItem {
  id?: string;
  userId?: string;
  socketId?: string;
  name: string;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  device?: string;
  location?: string;
  currentPage?: string;
  connectedAt?: string;
  lastActiveAt?: string;
  isRegistered?: boolean;
  source?: string;
}

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: OnlineUserItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function OnlineUsersModal({
  isOpen,
  onClose,
  users,
  loading = false,
  onRefresh,
}: OnlineUsersModalProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'registered' | 'guests'>('all');

  // Filter users based on tab and search
  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const isGuest = !u.isRegistered || u.name === 'Guest User' || !u.username;
      if (tab === 'registered' && isGuest) return false;
      if (tab === 'guests' && !isGuest) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.device?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q) ||
        u.currentPage?.toLowerCase().includes(q)
      );
    });
  }, [users, tab, search]);

  const registeredCount = useMemo(() => {
    return (users || []).filter((u) => u.isRegistered && u.name !== 'Guest User' && Boolean(u.username)).length;
  }, [users]);

  const guestCount = useMemo(() => {
    return (users || []).length - registeredCount;
  }, [users, registeredCount]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: '#0d0d0f',
          border: '1px solid #27272a',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1c1c1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #141416, #0d0d0f)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
                display: 'inline-block',
              }}
            />
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Users Online Now
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#22c55e',
                    backgroundColor: '#052e16',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    border: '1px solid #14532d',
                  }}
                >
                  {users.length} Active
                </span>
              </h3>
              <p style={{ margin: '4px 0 0', color: '#71717a', fontSize: '12px' }}>
                Real-time active visitors, authenticated members, and current navigation paths
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Refresh online list"
                style={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                  color: '#a1a1aa',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🔄</span>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #1c1c1e',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#0d0d0f',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                border: tab === 'all' ? '1px solid #22c55e' : '1px solid #27272a',
                background: tab === 'all' ? '#052e16' : '#18181b',
                color: tab === 'all' ? '#22c55e' : '#a1a1aa',
                cursor: 'pointer',
              }}
            >
              All Online ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('registered')}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                border: tab === 'registered' ? '1px solid #3b82f6' : '1px solid #27272a',
                background: tab === 'registered' ? '#082f49' : '#18181b',
                color: tab === 'registered' ? '#38bdf8' : '#a1a1aa',
                cursor: 'pointer',
              }}
            >
              Members ({registeredCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('guests')}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                border: tab === 'guests' ? '1px solid #a855f7' : '1px solid #27272a',
                background: tab === 'guests' ? '#3b0764' : '#18181b',
                color: tab === 'guests' ? '#c084fc' : '#a1a1aa',
                cursor: 'pointer',
              }}
            >
              Guests ({guestCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '300px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, location, page..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 30px',
                background: '#141416',
                border: '1px solid #27272a',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '12px', color: '#71717a' }}>🔍</span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '7px',
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* User List Content */}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: '60vh', padding: '12px 24px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#71717a' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🟢</span>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#a1a1aa' }}>
                {search ? 'No online users matching your search.' : 'No active users in this filter currently.'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Users actively browsing Tolee pages will appear here in real-time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map((user, idx) => {
                const isGuest = !user.isRegistered || user.name === 'Guest User' || !user.username;
                const deviceIcon = user.device?.includes('Mobile') ? '📱' : user.device?.includes('Tablet') ? '📟' : '💻';

                return (
                  <div
                    key={user.id || user.socketId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#141416',
                      border: '1px solid #1c1c1e',
                      borderRadius: '14px',
                      gap: '12px',
                      transition: 'border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#27272a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1c1c1e';
                    }}
                  >
                    {/* User Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px', flex: '1' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #27272a',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: isGuest ? '#1c1c1e' : '#14532d',
                              color: isGuest ? '#71717a' : '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 700,
                              border: isGuest ? '1px dashed #27272a' : '1px solid #22c55e44',
                            }}
                          >
                            {isGuest ? '👤' : user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Green presence indicator badge */}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            border: '2px solid #141416',
                          }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, truncate: 'true' }}>
                            {user.name}
                          </span>
                          {user.role === 'super_admin' && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', background: '#451a03', padding: '1px 6px', borderRadius: '4px' }}>
                              ADMIN
                            </span>
                          )}
                          {!isGuest && user.username && (
                            <span style={{ fontSize: '11px', color: '#71717a' }}>
                              @{user.username}
                            </span>
                          )}
                          {isGuest && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#a1a1aa', background: '#1c1c1e', padding: '1px 6px', borderRadius: '4px' }}>
                              GUEST
                            </span>
                          )}
                        </div>
                        {user.email && (
                          <span style={{ color: '#71717a', fontSize: '11px', display: 'block', marginTop: '1px' }}>
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Environment & Location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '150px' }}>
                      <span style={{ fontSize: '12px', color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{deviceIcon}</span>
                        <span>{user.device || 'Desktop Web'}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📍</span>
                        <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.location || 'India'}
                        </span>
                      </span>
                    </div>

                    {/* Active Navigation Page */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '130px' }}>
                      <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                        Active Page
                      </span>
                      <span
                        style={{
                          background: '#18181b',
                          border: '1px solid #27272a',
                          color: '#a78bfa',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          marginTop: '2px',
                        }}
                      >
                        {user.currentPage || '/feed'}
                      </span>
                    </div>

                    {/* Quick Profile / Inspect Action */}
                    <div style={{ minWidth: '100px', display: 'flex', justifyContent: 'flex-end' }}>
                      {!isGuest && user.username ? (
                        <Link
                          href={`/u/${user.username}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '6px 12px',
                            background: '#18181b',
                            border: '1px solid #27272a',
                            color: '#22c55e',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Profile ↗
                        </Link>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#22c55e',
                            background: '#052e16',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontWeight: 700,
                          }}
                        >
                          🟢 Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1c1c1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0d0d0f',
            fontSize: '12px',
            color: '#71717a',
          }}
        >
          <span>
            Showing <strong style={{ color: '#fff' }}>{filteredUsers.length}</strong> of{' '}
            <strong style={{ color: '#fff' }}>{users.length}</strong> active sessions
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
