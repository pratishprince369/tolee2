'use client';

import React, { useState } from 'react';

export interface ActiveMeetingItem {
  id: string;
  meetingCode: string;
  title: string;
  description?: string | null;
  type: string;
  visibility: string;
  startedAt?: string;
  createdAt?: string;
  isLocked: boolean;
  isRecording: boolean;
  participantCount?: number;
  host?: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatar?: string | null;
    image?: string | null;
  } | null;
}

interface ActiveMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: ActiveMeetingItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onMeetingEnded?: () => void;
}

export function ActiveMeetingsModal({
  isOpen,
  onClose,
  meetings,
  loading = false,
  onRefresh,
  onMeetingEnded,
}: ActiveMeetingsModalProps) {
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleEndMeeting = async (meetingId: string, title: string) => {
    const confirmed = window.confirm(`Kya aap meeting "${title}" ko band (terminate) karna chahte hain? Sabhi participants disconnect ho jayenge aur temp buffers clean ho jayenge.`);
    if (!confirmed) return;

    setTerminatingId(meetingId);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/super-admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, action: 'end' }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({ text: `✅ Meeting "${title}" ko band kar diya gaya hai!`, type: 'success' });
        if (onRefresh) onRefresh();
        if (onMeetingEnded) onMeetingEnded();
      } else {
        setStatusMessage({ text: `❌ Failed: ${data.error || 'Could not end meeting'}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `❌ Network error: ${err.message}`, type: 'error' });
    } finally {
      setTerminatingId(null);
    }
  };

  const handleEndAllMeetings = async () => {
    const confirmed = window.confirm(`Warning: Kya aap saari ${meetings.length} active meetings ko ek saath band karna chahte hain?`);
    if (!confirmed) return;

    setTerminatingAll(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/super-admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_all' }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({ text: `✅ Saari active meetings band kar di gayi hain!`, type: 'success' });
        if (onRefresh) onRefresh();
        if (onMeetingEnded) onMeetingEnded();
      } else {
        setStatusMessage({ text: `❌ Failed: ${data.error || 'Could not end all meetings'}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `❌ Network error: ${err.message}`, type: 'error' });
    } finally {
      setTerminatingAll(false);
    }
  };

  const formatElapsed = (dateStr?: string) => {
    if (!dateStr) return 'Active now';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just started';
    if (mins < 60) return `Running for ${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `Running for ${hrs}h ${remMins}m (Abandoned?)`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
          maxWidth: '760px',
          maxHeight: '90vh',
          backgroundColor: '#0d0d0f',
          border: '1px solid #27272a',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
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
                backgroundColor: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }}
            />
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Active Live Meetings
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ef4444',
                    backgroundColor: '#450a0a',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    border: '1px solid #7f1d1d',
                  }}
                >
                  {meetings.length} Live
                </span>
              </h3>
              <p style={{ margin: '4px 0 0', color: '#71717a', fontSize: '12px' }}>
                Super Admin emergency termination control for open or abandoned live video streams
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Refresh active meetings list"
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
                }}
              >
                <span>🔄</span>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}

            {meetings.length > 1 && (
              <button
                type="button"
                onClick={handleEndAllMeetings}
                disabled={terminatingAll}
                style={{
                  background: '#450a0a',
                  border: '1px solid #7f1d1d',
                  color: '#f87171',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: terminatingAll ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🛑</span>
                <span>{terminatingAll ? 'Terminating All...' : 'End All Meetings'}</span>
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
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: statusMessage.type === 'success' ? '#052e16' : '#450a0a',
              color: statusMessage.type === 'success' ? '#22c55e' : '#f87171',
              borderBottom: `1px solid ${statusMessage.type === 'success' ? '#14532d' : '#7f1d1d'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Meetings List */}
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: '60vh', padding: '16px 24px' }}>
          {meetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#71717a' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🟢</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#e4e4e7' }}>
                No Active Live Meetings
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                Sabhi live meetings band hain aur temporary WebRTC buffer storage free hai.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meetings.map((m) => {
                const isTerminating = terminatingId === m.id;
                const hostName = m.host?.name || m.host?.username || 'Host';

                return (
                  <div
                    key={m.id}
                    style={{
                      background: '#141416',
                      border: '1px solid #1c1c1e',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ef444455';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1c1c1e';
                    }}
                  >
                    {/* Meeting & Host Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#27272a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0,
                          border: '1px solid #3f3f46',
                        }}
                      >
                        📞
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 800 }}>
                            {m.title || 'Untitled Meeting'}
                          </h4>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#a78bfa',
                              background: '#2e1065',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #581c87',
                            }}
                          >
                            {m.meetingCode}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: '#38bdf8',
                              background: '#082f49',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {m.type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#71717a' }}>
                          <span>
                            Host: <strong style={{ color: '#e4e4e7' }}>{hostName}</strong>
                            {m.host?.email && <span style={{ color: '#52525b' }}> ({m.host.email})</span>}
                          </span>
                          <span>•</span>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            ⏳ {formatElapsed(m.startedAt || m.createdAt)}
                          </span>
                          <span>•</span>
                          <span>👥 {m.participantCount || 0} participants</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls: End Meeting Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleEndMeeting(m.id, m.title)}
                        disabled={isTerminating}
                        style={{
                          background: '#7f1d1d',
                          border: '1px solid #b91c1c',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '10px 18px',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: isTerminating ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#991b1b';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#7f1d1d';
                        }}
                      >
                        <span>🛑</span>
                        <span>{isTerminating ? 'Ending...' : 'End Meeting'}</span>
                      </button>
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
            Ending an active meeting immediately frees WebRTC memory buffers and updates dashboard counters.
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
